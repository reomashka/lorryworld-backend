import { BadRequestException, Injectable } from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PaymentStatus, PaymentType } from '@prisma/__generated__'
import { v4 as uuidv4 } from 'uuid'

import { PrismaService } from '@/prisma/prisma.service'

// ✅
import { PaymentDto } from './dto/payment.dto'
import { PaymentWebhookDto } from './dto/paymentWebhook.dto'

@Injectable()
export class PaymentService {
	public constructor(
		private readonly configService: ConfigService,
		private readonly prismaService: PrismaService
	) {}
	private readonly logger = new Logger(PaymentService.name)

	public async createPayment(dto: PaymentDto) {
		const PAYMENT_URL = 'https://api.morune.com/invoice/create'
		const MoruneShopId =
			this.configService.getOrThrow<string>('MORUNE_SHOP_ID')

		if (!dto.amount) {
			throw new BadRequestException()
		}

		const formattedAmount = Number(dto.amount).toFixed(2)
		const orderId = uuidv4()

		const params = {
			shop_id: MoruneShopId,
			amount: formattedAmount,
			order_id: orderId
		}

		try {
			const response = await fetch(PAYMENT_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key':
						this.configService.getOrThrow<string>('MORUNE_API_KEY')
				},
				body: JSON.stringify({ ...params })
			})

			const result = await response.json()

			if (!response.ok) {
				console.error('API Error Response:', result)
				throw new BadRequestException(
					`HTTP error! status: ${response.status}`
				)
			}
			const amountInt = Math.floor(Number(dto.amount))

			const payment = await this.prismaService.payment.create({
				data: {
					id: orderId,
					invoiceId: result.data.id,
					userId: dto.userId,
					amount: amountInt,
					status: PaymentStatus.PENDING,
					type: PaymentType.DEPOSIT,
					currency: 'RUB',
					createdAt: new Date(Date.now())
				}
			})

			return {
				resultPayment: result,
				paymentInfo: payment
			}
		} catch (err) {
			console.error(err)
			throw err
		}
	}

	public async getInfoOfPayment(invoiceId: string) {
		const PAYMENT_URL = 'https://api.morune.com/invoice/info'

		if (!invoiceId) {
			throw new BadRequestException()
		}

		const queryParams = new URLSearchParams({
			shop_id: this.configService.getOrThrow<string>('MORUNE_SHOP_ID'),
			invoice_id: invoiceId
		}).toString()

		const urlWithParams = `${PAYMENT_URL}?${queryParams}`
		this.logger.log(urlWithParams)

		try {
			const response = await fetch(urlWithParams, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key':
						this.configService.getOrThrow<string>('MORUNE_API_KEY')
				}
			})

			const result = await response.json()

			if (!response.ok) {
				console.error('API Error Response:', result)
				throw new BadRequestException(
					`HTTP error! status: ${response.status}`
				)
			}

			const payment = await this.prismaService.payment.findUnique({
				where: {
					invoiceId: invoiceId
				}
			})

			return { ...result }
		} catch (err) {
			console.error(err)
			throw err
		}
	}

	async updatePaymentStatus(payload) {
		this.logger.log(`Payload received: ${JSON.stringify(payload)}`)
		if (payload.code === 1) {
			const paymentUpdate = await this.prismaService.payment.update({
				where: {
					invoiceId: payload.invoice_id
				},

				data: {
					status: PaymentStatus.SUCCESS
				}
			})
			return paymentUpdate
		}

		return { msg: 'Не удалось получить данные с платежной системы.' }
	}

	public async getPaymentsOfUser(userId: string) {
		const userWithPayments = await this.prismaService.user.findUnique({
			where: {
				id: userId
			},
			include: {
				payments: true
			}
		})

		return userWithPayments?.payments || []
	}

	// webhook
	public async handleWebhook(payload: PaymentWebhookDto) {
		let statusPayment: PaymentStatus

		switch (payload.status) {
			case 'success':
				statusPayment =
					payload.code === 1
						? PaymentStatus.SUCCESS
						: PaymentStatus.UNKNOWN
				break
			case 'fail':
				statusPayment = [31, 32].includes(payload.code)
					? PaymentStatus.CANCELLATION
					: PaymentStatus.UNKNOWN
				break
			case 'expired':
				statusPayment = PaymentStatus.EXPIRED
				break
			case 'refund':
				statusPayment =
					payload.code === 20
						? PaymentStatus.REFUNDED
						: PaymentStatus.UNKNOWN
				break
			default:
				statusPayment = PaymentStatus.UNKNOWN
		}

		// Вся логика в транзакции
		return await this.prismaService.$transaction(async tx => {
			const payment = await tx.payment.findUnique({
				where: { invoiceId: payload.invoice_id }
			})

			if (!payment) {
				this.logger.error(
					`❌ Payment not found in tx: ${payload.invoice_id}`
				)
				throw new Error(
					`Payment with invoiceId ${payload.invoice_id} not found`
				)
			}

			// 🧾 Обновляем статус платежа
			await tx.payment.update({
				where: { invoiceId: payload.invoice_id },
				data: { status: statusPayment }
			})
			this.logger.log(`✅ Payment status updated to ${statusPayment}`)

			// 💰 Если платеж успешен — пополняем баланс
			if (statusPayment === PaymentStatus.SUCCESS) {
				const user = await tx.user.findUnique({
					where: { id: payment.userId },
					select: { balance: true }
				})

				this.logger.log(
					`🔢 Current balance: ${user?.balance}, adding: ${payment.amount}`
				)

				await tx.user.update({
					where: { id: payment.userId },
					data: {
						balance: {
							increment: payment.amount
						}
					}
				})
			}

			return { statusPayment, data: payload }
		})
	}
}
