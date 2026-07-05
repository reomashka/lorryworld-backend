import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException
} from '@nestjs/common'
import { ItemStatus } from '@prisma/__generated__'

import { LoggerService } from '@/logger/logger.service'
import { OrderService } from '@/order/order.service'
import { PrismaService } from '@/prisma/prisma.service'
import { TelegramService } from '@/telegram/telegram.service'

import { CreateUserItemDto } from './dto/createUserItem.dto'
import { WithdrawItemsDto } from './dto/withdrawItems'

@Injectable()
export class ItemService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly telegramService: TelegramService,
		private readonly orderService: OrderService,
		private readonly logger: LoggerService
	) {}

	public async getAllItems() {
		return await this.prismaService.item.findMany({
			where: { availability: true }
		})
	}

	public async getAllPurchasedItems(userId: string) {
		return await this.prismaService.userItem.findMany({
			where: {
				userId: userId
			},
			include: {
				item: true
			}
		})
	}

	public async buyItem(dto: CreateUserItemDto) {
		const result = await this.prismaService.$transaction(async prisma => {
			const item = await prisma.item.findUnique({
				where: {
					id: dto.itemId
				}
			})

			if (!item) {
				throw new NotFoundException('item not found')
			}

			if (!item.availability) {
				throw new BadRequestException('Товар недоступен для покупки.')
			}

			const priceToUse = (item.sale ?? 0) > 0 ? item.sale : item.price
			const totalPrice = priceToUse * dto.quantity

			if (!Number.isSafeInteger(totalPrice) || totalPrice <= 0) {
				throw new BadRequestException('Некорректная цена товара.')
			}

			const balanceUpdate = await prisma.user.updateMany({
				where: {
					id: dto.userId,
					balance: {
						gte: totalPrice
					}
				},
				data: {
					balance: { decrement: totalPrice }
				}
			})

			if (balanceUpdate.count === 0) {
				const userExists = await prisma.user.findUnique({
					where: {
						id: dto.userId
					},
					select: {
						id: true
					}
				})

				if (!userExists) {
					throw new NotFoundException('user not found')
				}

				throw new BadRequestException(
					'Недостаточно средств на балансе.'
				)
			}

			const userItem = await prisma.userItem.create({
				data: {
					userId: dto.userId,
					itemId: dto.itemId,
					quantity: dto.quantity,
					amount: totalPrice
				}
			})

			const user = await prisma.user.findUnique({
				where: {
					id: dto.userId
				}
			})

			if (!user) {
				throw new NotFoundException('user not found')
			}

			return { item, totalPrice, user, userItem }
		})

		await this.telegramService.sendMessage(
			`🛒 Пользователь ${result.user.displayName} купил предмет\n\n` +
				` <b>${result.item.name}</b> (${dto.quantity} шт.) на сумму ${result.totalPrice}₽\n` +
				` <b>ID пользователя:</b> ${result.user.id}\n` +
				` <b>Ник на сайте:</b> ${result.user.displayName}\n`,
			false,
			result.item.game
		)
		this.logger.log(
			`Покупка пользователем ${result.item.name} (${dto.quantity} шт.)[User ID: ${dto.userId}]`
		)

		return [result.user, result.userItem]
	}

	public async withdrawItem(dto: WithdrawItemsDto) {
		const user = await this.prismaService.user.findUnique({
			where: { id: dto.userId }
		})

		if (!user) {
			throw new NotFoundException('User not found')
		}

		try {
			const result = await this.prismaService.$transaction(
				async prisma => {
					// 1. Найти все купленные предметы без привязки к заказу
					const itemsToWithdraw = await prisma.userItem.findMany({
						where: {
							userId: dto.userId,
							status: ItemStatus.PURCHASED,
							orderId: null,
							item: { game: dto.game }
						}
					})

					if (itemsToWithdraw.length === 0) {
						throw new BadRequestException(
							'No items available for withdraw'
						)
					}

					// 2. Создать заказ
					const order = await this.orderService.createOrder(
						dto.userId,
						prisma
					)

					// 3. Обновить все userItem, добавив им orderId
					const itemIds = itemsToWithdraw.map(item => item.id)
					await prisma.userItem.updateMany({
						where: { id: { in: itemIds } },
						data: {
							status: ItemStatus.WITHDRAWN,
							orderId: order.id
						}
					})

					// 4. Получить заказ с предметами
					const orderWithItems = await prisma.order.findUnique({
						where: { id: order.id },
						include: { items: { include: { item: true } } }
					})

					const itemList = orderWithItems.items
						.map(
							it =>
								`🔹 <b>${it.item.name}${it.item.property ? ` (${it.item.property})` : ''}</b>\n` +
								`💰 Цена: ${it.item.price}₽` +
								(it.quantity > 1
									? ` (${it.item.price * it.quantity}₽)`
									: '') +
								`\n🎯 Тип: ${it.item.type}\n📦 Количество: ${it.quantity}\n🏷️ Редкость: ${it.item.rarity}`
						)
						.join('\n\n')

					const text =
						`<b>📤 Вывод предметов</b>\n\n` +
						`<b>📦 Номер заказа:</b> ${String(orderWithItems.orderNumber).padStart(3, '0')}\n` +
						`<b>♦️ Игра:</b> ${dto.game}\n` +
						`<b>👤 Пользователь:</b> ${user.displayName}\n` +
						`<b>🆔 ID:</b> ${user.id}\n` +
						`<b>📱 Тип связи:</b> ${user.mediaContact}\n` +
						`<b>📨 Контакт:</b> ${user.contact}\n\n` +
						`<b>🌕 Никнейм:</b> <code>${user.robloxUsername}</code>\n\n` +
						itemList

					await this.telegramService.withdrawMessage(
						text,
						dto.game,
						orderWithItems.id
					)

					this.logger.log(
						`Вывод предметов (${dto.game}). [UserID: ${user.id}]`
					)

					return { order, items: itemsToWithdraw }
				}
			)

			return result
		} catch (error) {
			this.logger.error(
				`Ошибка при выводе предметов (${dto.game}) для UserID ${dto.userId}. Stack: ${error.stack || error}`
			)

			if (error instanceof BadRequestException) {
				throw error
			}
			if (error instanceof NotFoundException) {
				throw error
			}

			throw new InternalServerErrorException('Failed to withdraw items')
		}
	}

	public async getAllRecentWithdrawnItems(userId: string) {
		const user = await this.prismaService.user.findUnique({
			where: {
				id: userId
			}
		})

		if (!user) {
			throw new NotFoundException('user not found')
		}

		return await this.prismaService.userItem.findMany({
			where: {
				userId: userId,
				status: ItemStatus.WITHDRAWN,
				updatedAt: {
					gte: new Date(Date.now() - 10000)
				}
			},
			include: {
				item: true
			}
		})
	}

	public async confirmIssuance(userId: string, type?: string) {
		if (!userId) {
			throw new BadRequestException('User ID is required')
		}

		try {
			const result = await this.prismaService.userItem.updateMany({
				where: {
					userId,
					status: ItemStatus.WITHDRAWN,
					isIssued: false,
					item: {
						game: type
					}
				},
				data: {
					isIssued: true
				}
			})

			const user = await this.prismaService.user.findUnique({
				where: {
					id: userId
				}
			})

			if (result.count === 0) {
				this.telegramService.sendMessage(
					`ℹ️ Все товары уже были подтверждены ранее или отсутствуют для выдачи.\n\n` +
						` <b>ID пользователя:</b> ${userId}\n` +
						` <b>Контакт:</b> ${user.contact}\n` +
						` <b>Ник на сайте:</b> ${user.displayName}\n` +
						` <b>Роблокс никнейм:</b> ${user.robloxUsername}\n`,
					false,
					type
				)

				return '<h2>ℹ️ Все товары уже были подтверждены ранее или отсутствуют для выдачи.</h2>'
			}

			await this.telegramService.sendMessage(
				`✅ Все товары успешно выданы для пользователя.\n\n` +
					` <b>ID пользователя:</b> ${userId}\n` +
					` <b>Контакт:</b> ${user.contact}\n` +
					` <b>Ник на сайте:</b> ${user.displayName}\n` +
					` <b>Роблокс никнейм:</b> ${user.robloxUsername}\n`,
				false,
				type
			)

			return '<h2>✅ Вывод подтверждён!</h2>'
		} catch (error) {
			this.logger.error(error)
			throw new InternalServerErrorException(
				'Ошибка при подтверждении вывода'
			)
		}
	}

	public async updateItemPrice(
		id: number,
		dto: { price?: number; sale?: number }
	) {
		return this.prismaService.item.update({
			where: { id },
			data: {
				...(dto.price !== undefined && { price: dto.price }),
				...(dto.sale !== undefined && { sale: dto.sale })
			}
		})
	}

	public async getActiveGamesByUser(userId: string) {
		const items = await this.prismaService.userItem.findMany({
			where: {
				userId,
				status: 'PURCHASED'
			},
			include: {
				item: true
			}
		})

		// Получаем уникальные игры
		const games = Array.from(new Set(items.map(i => i.item.game)))

		return { games }
	}
}
