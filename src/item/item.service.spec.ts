import { BadRequestException } from '@nestjs/common'

import { LoggerService } from '@/logger/logger.service'
import { OrderService } from '@/order/order.service'
import { PrismaService } from '@/prisma/prisma.service'
import { TelegramService } from '@/telegram/telegram.service'

import { ItemService } from './item.service'

type PrismaTransactionMock = {
	item: {
		findUnique: jest.Mock
	}
	user: {
		updateMany: jest.Mock
		findUnique: jest.Mock
	}
	userItem: {
		create: jest.Mock
	}
}

const createPrismaMock = (tx: PrismaTransactionMock) =>
	({
		$transaction: jest.fn(
			(callback: (prisma: PrismaTransactionMock) => Promise<unknown>) =>
				callback(tx)
		)
	}) as unknown as PrismaService

describe('ItemService', () => {
	const telegramService = {
		sendMessage: jest.fn()
	} as unknown as TelegramService

	const orderService = {} as OrderService

	const logger = {
		log: jest.fn(),
		error: jest.fn()
	} as unknown as LoggerService

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('buyItem', () => {
		it('does not create a purchase when atomic balance decrement fails', async () => {
			const tx: PrismaTransactionMock = {
				item: {
					findUnique: jest.fn().mockResolvedValue({
						id: 10,
						name: 'Test item',
						price: 100,
						sale: 0,
						availability: true,
						game: 'MM'
					})
				},
				user: {
					updateMany: jest.fn().mockResolvedValue({ count: 0 }),
					findUnique: jest.fn().mockResolvedValue({ id: 'user-1' })
				},
				userItem: {
					create: jest.fn()
				}
			}

			const service = new ItemService(
				createPrismaMock(tx),
				telegramService,
				orderService,
				logger
			)

			await expect(
				service.buyItem({
					userId: 'user-1',
					itemId: 10,
					quantity: 2,
					amount: 200
				})
			).rejects.toBeInstanceOf(BadRequestException)

			expect(tx.user.updateMany).toHaveBeenCalledWith({
				where: {
					id: 'user-1',
					balance: {
						gte: 200
					}
				},
				data: {
					balance: { decrement: 200 }
				}
			})
			expect(tx.userItem.create).not.toHaveBeenCalled()
			expect(telegramService.sendMessage).not.toHaveBeenCalled()
		})

		it('stores server-calculated purchase amount after successful decrement', async () => {
			const tx: PrismaTransactionMock = {
				item: {
					findUnique: jest.fn().mockResolvedValue({
						id: 10,
						name: 'Test item',
						price: 100,
						sale: 80,
						availability: true,
						game: 'MM'
					})
				},
				user: {
					updateMany: jest.fn().mockResolvedValue({ count: 1 }),
					findUnique: jest.fn().mockResolvedValue({
						id: 'user-1',
						displayName: 'User',
						balance: 40
					})
				},
				userItem: {
					create: jest.fn().mockResolvedValue({
						id: 'purchase-1',
						userId: 'user-1',
						itemId: 10,
						quantity: 2,
						amount: 160
					})
				}
			}

			const service = new ItemService(
				createPrismaMock(tx),
				telegramService,
				orderService,
				logger
			)

			await service.buyItem({
				userId: 'user-1',
				itemId: 10,
				quantity: 2,
				amount: 1
			})

			expect(tx.userItem.create).toHaveBeenCalledWith({
				data: {
					userId: 'user-1',
					itemId: 10,
					quantity: 2,
					amount: 160
				}
			})
		})
	})
})
