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

		switch (payload.status) {
			case 'success':
				if (payload.code === 1) {
					statusPayment = PaymentStatus.SUCCESS
				} else {
					statusPayment = PaymentStatus.UNKNOWN
				}
				break

			case 'fail':
				if (payload.code === 31 || payload.code === 32) {
					statusPayment = PaymentStatus.CANCELLATION
				} else {
					statusPayment = PaymentStatus.UNKNOWN
				}
				break

			case 'expired':
				statusPayment = PaymentStatus.EXPIRED
				break

			case 'refund':
				if (payload.code === 20) {
					statusPayment = PaymentStatus.REFUNDED
				} else {
					statusPayment = PaymentStatus.UNKNOWN
				}
				break

			default:
				statusPayment = PaymentStatus.UNKNOWN
				break
		}
		// Проверяем, есть ли платеж с таким invoiceId
		const payment = await this.prismaService.payment.findUnique({
			where: {
				invoiceId: payload.invoice_id
			}
		})

		if (!payment) {
			// Если платежа нет — можно выбросить ошибку или вернуть
			throw new Error(
				`Payment with invoiceId ${payload.invoice_id} not found`
			)
		}

		// Обновляем статус платежа
		await this.prismaService.payment.update({
			where: {
				invoiceId: payload.invoice_id
			},
			data: {
				status: statusPayment
			}
		})

		// Если успешная оплата — обновляем баланс пользователя
		if (statusPayment === PaymentStatus.SUCCESS) {
			// Предполагаем, что в payment есть поле userId (если нет — надо получить пользователя из custom_fields)
			const userId = payment.userId

			if (userId) {
				// Увеличиваем баланс пользователя на сумму платежа (предполагается, что amount — строка с числом)
				const amountNumber = Number(payload.amount)

				if (isNaN(amountNumber)) {
					throw new Error(`Invalid amount value: ${payload.amount}`)
				}

				await this.prismaService.user.update({
					where: {
						id: userId
					},
					data: {
						balance: {
							increment: amountNumber
						}
					}
				})
			}
		}

		return {
			statusPayment,
			data: payload
		}
	}
}
