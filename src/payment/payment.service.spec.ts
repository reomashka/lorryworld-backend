import { ConfigService } from '@nestjs/config'
import { PaymentStatus } from '@prisma/__generated__'

import { LoggerService } from '@/logger/logger.service'
import { PrismaService } from '@/prisma/prisma.service'
import { TelegramService } from '@/telegram/telegram.service'

import { PaymentService } from './payment.service'

type PrismaTransactionMock = {
	payment: {
		findUnique: jest.Mock
		update: jest.Mock
	}
	user: {
		findUnique: jest.Mock
		update: jest.Mock
	}
}

const createConfigMock = () =>
	({
		get: jest.fn((key: string) =>
			key === 'PLATEGA_SECRET' ? 'secret-1' : undefined
		),
		getOrThrow: jest.fn((key: string) => {
			if (key === 'PLATEGA_MERCHANT_ID') {
				return 'merchant-1'
			}

			throw new Error(`Missing config ${key}`)
		})
	}) as unknown as ConfigService

const createPrismaMock = (tx: PrismaTransactionMock) =>
	({
		$transaction: jest.fn(
			(callback: (prisma: PrismaTransactionMock) => Promise<unknown>) =>
				callback(tx)
		)
	}) as unknown as PrismaService

describe('PaymentService', () => {
	const telegramService = {
		sendMessage: jest.fn()
	} as unknown as TelegramService

	const logger = {
		log: jest.fn(),
		error: jest.fn()
	} as unknown as LoggerService

	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('handleWebhook', () => {
		it('confirms payment by headers and invoice id without validating callback amount', async () => {
			const tx: PrismaTransactionMock = {
				payment: {
					findUnique: jest.fn().mockResolvedValue({
						invoiceId: 'platega-transaction-1',
						userId: 'user-1',
						amount: 100,
						currency: 'RUB',
						status: PaymentStatus.PENDING
					}),
					update: jest.fn()
				},
				user: {
					findUnique: jest.fn().mockResolvedValue({ balance: 50 }),
					update: jest.fn()
				}
			}
			const service = new PaymentService(
				createConfigMock(),
				createPrismaMock(tx),
				telegramService,
				logger
			)

			const result = await service.handleWebhook(
				{
					transactionId: 'platega-transaction-1',
					amount: 'not-a-number',
					currency: 'USD',
					status: 'CONFIRMED',
					paymentMethod: 13
				},
				'merchant-1',
				'secret-1'
			)

			expect(tx.payment.findUnique).toHaveBeenCalledWith({
				where: { invoiceId: 'platega-transaction-1' }
			})
			expect(tx.payment.update).toHaveBeenCalledWith({
				where: { invoiceId: 'platega-transaction-1' },
				data: { status: PaymentStatus.SUCCESS }
			})
			expect(tx.user.update).toHaveBeenCalledWith({
				where: { id: 'user-1' },
				data: {
					balance: {
						increment: 100
					}
				}
			})
			expect(result).toEqual({
				statusPayment: PaymentStatus.SUCCESS,
				data: expect.objectContaining({
					id: 'platega-transaction-1',
					amount: undefined,
					currency: 'USD',
					paymentMethod: 13
				})
			})
		})
	})
})
