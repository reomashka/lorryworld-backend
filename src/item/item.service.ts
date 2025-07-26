import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException
} from '@nestjs/common'
import { ItemStatus } from '@prisma/__generated__'

import { PrismaService } from '@/prisma/prisma.service'
import { TelegramService } from '@/telegram/telegram.service'

import { CreateUserItemDto } from './dto/createUserItem.dto'
import { WithdrawItemsDto } from './dto/withdrawItems'

@Injectable()
export class ItemService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly telegramService: TelegramService
	) {}

	public async getAllItems() {
		return await this.prismaService.item.findMany()
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
		const item = await this.prismaService.item.findUnique({
			where: {
				id: dto.itemId
			}
		})

		const user = await this.prismaService.user.findUnique({
			where: {
				id: dto.userId
			}
		})

		if (!item || !user) {
			throw new NotFoundException('user or item not found')
		}

		const priceToUse = item.sale > 0 ? item.sale : item.price
		const totalPrice = priceToUse * dto.quantity

		if (user.balance < totalPrice) {
			throw new BadRequestException('Недостаточно средств на балансе.')
		}

		const result = await this.prismaService.$transaction([
			this.prismaService.user.update({
				where: {
					id: dto.userId
				},
				data: {
					balance: { decrement: totalPrice }
				}
			}),

			this.prismaService.userItem.create({
				data: {
					userId: dto.userId,
					itemId: dto.itemId,
					quantity: dto.quantity,
					amount: dto.amount
				}
			})
		])

		await this.telegramService.sendMessage(
			`🛒 Пользователь ${user.displayName} купил предмет: <b>${item.name}</b> (${dto.quantity} шт.) на сумму ${totalPrice}₽`,
			false,
			item.game
		)

		return result
	}

	public async withdrawItem(dto: WithdrawItemsDto) {
		const user = await this.prismaService.user.findUnique({
			where: {
				id: dto.userId
			}
		})

		if (!user) {
			throw new NotFoundException('user not found')
		}

		const result = this.prismaService.$transaction(async prisma => {
			const order = await prisma.order.create({
				data: {
					userId: dto.userId,
					isIssued: false
				},
				include: {
					items: true
				}
			})

			const userItem = await prisma.userItem.updateMany({
				where: {
					userId: dto.userId,
					status: ItemStatus.PURCHASED,
					orderId: null
				},
				data: {
					status: ItemStatus.WITHDRAWN,
					orderId: order.id
				}
			})

			return { userItem, order }
		})
		return result
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

	public async confirmIssuance(userId: string, type: string) {
		if (!userId) {
			throw new BadRequestException('User ID is required')
		}

		try {
			const result = await this.prismaService.userItem.updateMany({
				where: {
					userId,
					status: ItemStatus.WITHDRAWN,
					isIssued: false
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
					`⚠️ <b>Информация о подтверждении выдачи</b> ⚠️\n\n` +
						`▪️ <b>Статус:</b> Все товары уже подтверждены или отсутствуют\n` +
						`▪️ <b>Пользователь:</b>\n` +
						`   👤 <i>Имя:</i> ${user.displayName || 'Не указано'}\n` +
						`   🆔 <i>ID:</i> ${userId}\n` +
						`▪️ <b>Игра:</b> ${type}\n`,
					false,
					type
				)

				return '<h2>ℹ️ Все товары уже были подтверждены ранее или отсутствуют для выдачи.</h2>'
			}

			await this.telegramService.sendMessage(
				`🎉 <b>Успешная выдача товаров</b> 🎉\n\n` +
					`▪️ <b>Статус:</b> Все товары уже подтверждены или отсутствуют\n` +
					`▪️ <b>Пользователь:</b>\n` +
					`   👤 <i>Имя:</i> ${user.displayName || 'Не указано'}\n` +
					`   🆔 <i>ID:</i> ${userId}\n` +
					`▪️ <b>Игра:</b> ${type}\n` +
					`✅ <b>Операция завершена успешно</b>`,
				false,
				type
			)

			return '<h2>✅ Вывод подтверждён!</h2>'
		} catch (error) {
			console.error(error)

			throw new InternalServerErrorException(
				'Ошибка при подтверждении вывода'
			)
		}
	}
}
