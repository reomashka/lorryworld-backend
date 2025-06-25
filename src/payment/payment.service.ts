import {
	BadRequestException,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PaymentStatus, PaymentType } from '@prisma/__generated__'
import * as crypto from 'crypto'
import { Request, Response } from 'express'
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
	private readonly secret =
		this.configService.getOrThrow<string>('MORUNE_SECRET_KEY') ?? ''

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

			console.log(result.expiresIn)

			const payment = await this.prismaService.payment.create({
				data: {
					id: orderId,
					invoiceId: result.data.id,
					userId: dto.userId,
					amount: dto.amount,
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
		console.log(urlWithParams)

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

		console.log(payload)

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
				break
		}

		const payment = await this.prismaService.payment.findUnique({
			where: { invoiceId: payload.invoice_id }
		})

		if (!payment) {
			console.error(`❌ Payment not found: ${payload.invoice_id}`)
			throw new Error(
				`Payment with invoiceId ${payload.invoice_id} not found`
			)
		}

		await this.prismaService.payment.update({
			where: { invoiceId: payload.invoice_id },
			data: { status: statusPayment }
		})

		if (statusPayment === PaymentStatus.SUCCESS) {
			const userId = payment.userId

			if (!userId) {
				console.warn(`❌ No userId for payment ${payload.invoice_id}`)
				return { statusPayment, data: payload }
			}

			const rawAmount = payload.amount?.replace(',', '.')
			const amountNumber = Number(rawAmount)

			if (!rawAmount || isNaN(amountNumber)) {
				console.error(`❌ Invalid amount: ${payload.amount}`)
				return { statusPayment, data: payload }
			}

			try {
				const updated = await this.prismaService.user.update({
					where: { id: userId },
					data: { balance: { increment: amountNumber } }
				})
				console.log(
					`✅ Баланс пользователя ${userId} пополнен на ${amountNumber}`,
					updated
				)
			} catch (e) {
				console.error(
					`❌ Ошибка обновления баланса user #${userId}:`,
					e
				)
			}
		}

		return { statusPayment, data: payload }
	}
}
