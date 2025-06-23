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
		if (user.balance < item.price) {
			throw new BadRequestException('Недостаточно средств на балансе.')
		}

		return this.prismaService.$transaction([
			this.prismaService.user.update({
				where: {
					id: dto.userId
				},
				data: {
					balance: { decrement: item.price * dto.quantity }
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

		return await this.prismaService.userItem.updateMany({
			where: {
				userId: dto.userId,
				status: ItemStatus.PURCHASED
			},
			data: {
				status: ItemStatus.WITHDRAWN
			}
		})
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

	public async confirmIssuance(userId: string) {
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

			if (result.count === 0) {
				this.telegramService.sendMessage(
					`ℹ️ Все товары уже были подтверждены ранее или отсутствуют для выдачи.\nID пользователя: ${userId}`
				)
				return '<h2>ℹ️ Все товары уже были подтверждены ранее или отсутствуют для выдачи.</h2>'
			}

			await this.telegramService.sendMessage(
				`✅ Все товары успешно выданы для пользователя.\nID пользователя: ${userId}`
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
