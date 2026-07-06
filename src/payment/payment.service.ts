import {
	BadRequestException,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PaymentStatus, PaymentType } from '@prisma/__generated__'
import { timingSafeEqual } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

import { LoggerService } from '@/logger/logger.service'
import { PrismaService } from '@/prisma/prisma.service'
import { TelegramService } from '@/telegram/telegram.service'

import { PaymentDto, type PaymentMethod } from './dto/payment.dto'
import {
	PaymentWebhookDto,
	PLATEGA_PAYMENT_METHODS,
	PLATEGA_PAYMENT_STATUSES,
	PlategaPaymentMethod,
	PlategaPaymentStatus
} from './dto/paymentWebhook.dto'

const PLATEGA_BASE_URL = 'https://app.platega.io'
const PLATEGA_PAYMENT_METHOD_BY_PAYMENT_METHOD = {
	sbp: 2,
	card: 11
} as const satisfies Record<PaymentMethod, PlategaPaymentMethod>
const PLATEGA_SUPPORTED_PAYMENT_METHODS = [
	PLATEGA_PAYMENT_METHOD_BY_PAYMENT_METHOD.sbp,
	PLATEGA_PAYMENT_METHOD_BY_PAYMENT_METHOD.card
] as const
const PLATEGA_DEFAULT_COMMISSION_PERCENT = 3.5

type SupportedPlategaPaymentMethod =
	(typeof PLATEGA_SUPPORTED_PAYMENT_METHODS)[number]

type PlategaCreateTransactionRequest = {
	paymentMethod: SupportedPlategaPaymentMethod
	paymentDetails: {
		amount: number
		currency: 'RUB'
	}
	description: string
	return?: string
	failedUrl?: string
	payload: string
	metadata: {
		userId: string
		userName?: string
	}
}

type PlategaCreateTransactionResponse = {
	paymentMethod?: string
	transactionId: string
	redirect?: string
	url?: string
	return?: string
	paymentDetails?: string
	status?: PlategaPaymentStatus
	expiresIn?: string
	merchantId?: string
	usdtRate?: number
	rate?: number
}

type PlategaTransactionStatusResponse = {
	id: string
	status: PlategaPaymentStatus
	paymentDetails: {
		amount: number
		currency: string
	}
	merchantName?: string
	merchantId?: string
	paymentMethod?: string
	expiresIn?: string
	return?: string
	qr?: string
	payformSuccessUrl?: string
	payload?: string
	externalId?: string
	description?: string
}

type PlategaApiError = {
	error?: unknown
	message?: unknown
	errors?: unknown
}

@Injectable()
export class PaymentService {
	public constructor(
		private readonly configService: ConfigService,
		private readonly prismaService: PrismaService,
		private readonly telegramService: TelegramService,
		private readonly logger: LoggerService
	) {}

	public async createPayment(dto: PaymentDto) {
		const amount = Number(dto.amount)
		const currency = dto.currency ?? 'RUB'

		if (!Number.isInteger(amount) || amount <= 0) {
			throw new BadRequestException('Некорректная сумма платежа')
		}

		const requestBody = this.buildCreateTransactionBody(
			dto,
			amount,
			currency
		)
		const orderId = uuidv4()

		try {
			const response = await fetch(
				`${PLATEGA_BASE_URL}/transaction/process`,
				{
					method: 'POST',
					headers: this.getPlategaHeaders(),
					body: JSON.stringify(requestBody)
				}
			)

			const result = await this.parsePlategaResponse<
				PlategaCreateTransactionResponse | PlategaApiError
			>(response)

			if (!response.ok) {
				this.logger.error(
					`Platega API error response: ${this.stringify(result)}`
				)
				throw new BadRequestException(
					`Platega HTTP error! status: ${response.status}`
				)
			}

			if (!this.isCreateTransactionResponse(result)) {
				this.logger.error(
					`Platega returned invalid transaction response: ${this.stringify(result)}`
				)
				throw new BadRequestException(
					'Platega API error: invalid transaction response'
				)
			}

			const payment = await this.prismaService.payment.create({
				data: {
					id: orderId,
					invoiceId: result.transactionId,
					userId: dto.userId,
					amount,
					status: PaymentStatus.PENDING,
					type: PaymentType.DEPOSIT,
					currency,
					createdAt: new Date()
				}
			})
			const paymentUrl = result.redirect ?? result.url

			return {
				resultPayment: {
					...result,
					data: {
						id: result.transactionId,
						url: paymentUrl,
						paymentUrl
					}
				},
				paymentInfo: payment,
				transactionId: result.transactionId,
				paymentUrl
			}
		} catch (error) {
			this.logger.error(this.stringify(error))
			throw error
		}
	}

	public async getInfoOfPayment(invoiceId: string) {
		if (!invoiceId) {
			throw new BadRequestException('invoiceId обязателен')
		}

		try {
			const response = await fetch(
				`${PLATEGA_BASE_URL}/transaction/${encodeURIComponent(invoiceId)}`,
				{
					method: 'GET',
					headers: this.getPlategaHeaders()
				}
			)

			const result = await this.parsePlategaResponse<
				PlategaTransactionStatusResponse | PlategaApiError
			>(response)

			if (!response.ok) {
				this.logger.error(
					`Platega API error response: ${this.stringify(result)}`
				)

				throw new BadRequestException(
					`Platega HTTP error! status: ${response.status}`
				)
			}

			const payment = await this.prismaService.payment.findUnique({
				where: {
					invoiceId
				}
			})

			return { ...result, paymentInfo: payment }
		} catch (error) {
			this.logger.error(this.stringify(error))
			throw error
		}
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

	public async handleWebhook(
		rawPayload: Record<string, unknown>,
		merchantId?: string,
		secret?: string
	) {
		this.assertPlategaWebhookAuth(merchantId, secret)

		const payload = this.normalizeWebhookPayload(rawPayload)

		this.logger.log(
			`Platega webhook received: ${this.stringify({
				id: payload.id,
				amount: payload.amount,
				currency: payload.currency,
				status: payload.status,
				paymentMethod: payload.paymentMethod,
				payload: payload.payload
			})}`
		)

		if (!this.isSupportedPlategaPaymentMethod(payload.paymentMethod)) {
			throw new BadRequestException('Unsupported Platega payment method')
		}

		const statusPayment = this.mapPlategaStatus(payload.status)

		return await this.prismaService.$transaction(async tx => {
			const payment = await tx.payment.findUnique({
				where: { invoiceId: payload.id }
			})

			if (!payment) {
				this.logger.error(
					`Платеж Platega не найден, transactionId: ${payload.id}`
				)
				throw new BadRequestException(
					`Payment with transactionId ${payload.id} not found`
				)
			}

			if (
				statusPayment === PaymentStatus.SUCCESS &&
				!this.isConfirmedAmountValid(payload.amount, payment.amount)
			) {
				const allowedAmounts = this.getAllowedConfirmedAmounts(
					payment.amount
				)

				this.logger.error(
					`Platega amount mismatch for ${payload.id}: callback=${payload.amount}, allowed=${allowedAmounts.join(', ')}`
				)
				throw new BadRequestException('Payment amount mismatch')
			}

			if (
				statusPayment === PaymentStatus.SUCCESS &&
				payload.currency !== payment.currency
			) {
				this.logger.error(
					`Platega currency mismatch for ${payload.id}: callback=${payload.currency}, payment=${payment.currency}`
				)
				throw new BadRequestException('Payment currency mismatch')
			}

			if (payment.status === statusPayment) {
				return { statusPayment, data: payload, duplicate: true }
			}

			if (
				payment.status === PaymentStatus.SUCCESS &&
				(statusPayment === PaymentStatus.PENDING ||
					statusPayment === PaymentStatus.CANCELLATION)
			) {
				return {
					statusPayment: payment.status,
					data: payload,
					ignored: true
				}
			}

			await tx.payment.update({
				where: { invoiceId: payload.id },
				data: { status: statusPayment }
			})

			this.logger.log(
				`Статус платежа Platega (${payload.id}) - ${statusPayment}`
			)

			const shouldCreditBalance =
				statusPayment === PaymentStatus.SUCCESS &&
				payment.status !== PaymentStatus.SUCCESS &&
				payment.status !== PaymentStatus.REFUNDED

			if (shouldCreditBalance) {
				const user = await tx.user.findUnique({
					where: { id: payment.userId },
					select: { balance: true }
				})

				if (!user) {
					throw new BadRequestException(
						`User with id ${payment.userId} not found`
					)
				}

				await tx.user.update({
					where: { id: payment.userId },
					data: {
						balance: {
							increment: payment.amount
						}
					}
				})

				await this.telegramService.sendMessage(
					`<b>💳 Пополнение баланса</b>\n\n` +
						`👤 <b>Пользователь ID:</b> <code>${payment.userId}</code>\n` +
						`💰 <b>Сумма пополнения:</b> ${payment.amount}₽\n\n` +
						`📥 <b>Баланс после пополнения:</b> ${
							user.balance + payment.amount
						}₽\n`,
					false,
					'topup'
				)
			}

			return { statusPayment, data: payload }
		})
	}

	private normalizeWebhookPayload(
		rawPayload: Record<string, unknown>
	): PaymentWebhookDto {
		const id = this.readStringField(rawPayload, [
			'id',
			'Id',
			'transactionId',
			'TransactionId'
		])
		const amount = this.readNumberField(rawPayload.amount, 'amount')
		const currency = this.readStringField(rawPayload, [
			'currency',
			'Currency'
		]).toUpperCase()
		const status = this.readStringField(rawPayload, [
			'status',
			'Status'
		]).toUpperCase()
		const paymentMethod = this.readNumberField(
			rawPayload.paymentMethod ?? rawPayload.PaymentMethod,
			'paymentMethod'
		)

		if (currency !== 'RUB') {
			throw new BadRequestException('Unsupported Platega currency')
		}

		if (!this.isPlategaStatus(status)) {
			throw new BadRequestException('Unsupported Platega status')
		}

		if (!this.isPlategaPaymentMethod(paymentMethod)) {
			throw new BadRequestException('Unsupported Platega payment method')
		}

		return {
			id,
			amount,
			currency,
			status,
			paymentMethod,
			payload: this.readOptionalStringField(rawPayload.payload)
		}
	}

	private readStringField(
		payload: Record<string, unknown>,
		keys: string[]
	): string {
		for (const key of keys) {
			const value = payload[key]

			if (typeof value === 'string' && value.trim()) {
				return value.trim()
			}
		}

		throw new BadRequestException(`${keys[0]} is required`)
	}

	private readOptionalStringField(value: unknown): string | undefined {
		if (value === undefined || value === null) {
			return undefined
		}

		if (typeof value === 'string') {
			return value
		}

		return this.stringify(value)
	}

	private readNumberField(value: unknown, fieldName: string): number {
		const parsedValue =
			typeof value === 'number'
				? value
				: typeof value === 'string'
					? Number(value)
					: Number.NaN

		if (!Number.isFinite(parsedValue)) {
			throw new BadRequestException(`${fieldName} must be a number`)
		}

		return parsedValue
	}

	private isPlategaStatus(status: string): status is PlategaPaymentStatus {
		return (PLATEGA_PAYMENT_STATUSES as readonly string[]).includes(status)
	}

	private isPlategaPaymentMethod(
		paymentMethod: number
	): paymentMethod is PlategaPaymentMethod {
		return (
			Number.isInteger(paymentMethod) &&
			(PLATEGA_PAYMENT_METHODS as readonly number[]).includes(
				paymentMethod
			)
		)
	}

	private isSupportedPlategaPaymentMethod(
		paymentMethod: PlategaPaymentMethod
	): paymentMethod is SupportedPlategaPaymentMethod {
		return (
			paymentMethod === PLATEGA_PAYMENT_METHOD_BY_PAYMENT_METHOD.sbp ||
			paymentMethod === PLATEGA_PAYMENT_METHOD_BY_PAYMENT_METHOD.card
		)
	}

	private isConfirmedAmountValid(
		callbackAmount: number,
		paymentAmount: number
	): boolean {
		const callbackAmountKopecks = this.toKopecks(callbackAmount)

		return this.getAllowedConfirmedAmounts(paymentAmount)
			.map(amount => this.toKopecks(amount))
			.includes(callbackAmountKopecks)
	}

	private getAllowedConfirmedAmounts(paymentAmount: number): number[] {
		const amountWithCommission =
			paymentAmount * (1 + this.getPlategaCommissionPercent() / 100)
		const roundedAmountWithCommission =
			this.toKopecks(amountWithCommission) / 100

		if (roundedAmountWithCommission === paymentAmount) {
			return [paymentAmount]
		}

		return [paymentAmount, roundedAmountWithCommission]
	}

	private getPlategaCommissionPercent(): number {
		const rawCommissionPercent = this.configService.get<string | number>(
			'PLATEGA_COMMISSION_PERCENT'
		)

		if (rawCommissionPercent === undefined) {
			return PLATEGA_DEFAULT_COMMISSION_PERCENT
		}

		const commissionPercent = Number(
			String(rawCommissionPercent).replace(',', '.')
		)

		if (!Number.isFinite(commissionPercent) || commissionPercent < 0) {
			return PLATEGA_DEFAULT_COMMISSION_PERCENT
		}

		return commissionPercent
	}

	private toKopecks(amount: number): number {
		return Math.round(amount * 100)
	}

	private buildCreateTransactionBody(
		dto: PaymentDto,
		amount: number,
		currency: 'RUB'
	): PlategaCreateTransactionRequest {
		const requestBody: PlategaCreateTransactionRequest = {
			paymentMethod: this.getPlategaPaymentMethod(dto.paymentMethod),
			paymentDetails: {
				amount,
				currency
			},
			description:
				dto.description ??
				`Пополнение баланса пользователя ${dto.userId}`,
			payload: dto.payload ?? dto.userId,
			metadata: {
				userId: dto.userId
			}
		}

		const returnUrl =
			dto.returnUrl ??
			this.configService.get<string>('PLATEGA_RETURN_URL')
		const failedUrl =
			dto.failedUrl ??
			this.configService.get<string>('PLATEGA_FAILED_URL')

		if (returnUrl) {
			requestBody.return = returnUrl
		}

		if (failedUrl) {
			requestBody.failedUrl = failedUrl
		}

		if (dto.userName) {
			requestBody.metadata.userName = dto.userName
		}

		return requestBody
	}

	private getPlategaPaymentMethod(
		paymentMethod: PaymentMethod
	): SupportedPlategaPaymentMethod {
		return PLATEGA_PAYMENT_METHOD_BY_PAYMENT_METHOD[paymentMethod]
	}

	private mapPlategaStatus(status: PlategaPaymentStatus): PaymentStatus {
		switch (status) {
			case 'PENDING':
				return PaymentStatus.PENDING
			case 'CONFIRMED':
				return PaymentStatus.SUCCESS
			case 'CANCELED':
				return PaymentStatus.CANCELLATION
			case 'CHARGEBACKED':
				return PaymentStatus.REFUNDED
			default:
				return PaymentStatus.UNKNOWN
		}
	}

	private getPlategaHeaders(): Record<string, string> {
		return {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-MerchantId': this.configService.getOrThrow<string>(
				'PLATEGA_MERCHANT_ID'
			),
			'X-Secret': this.getPlategaSecret()
		}
	}

	private getPlategaSecret(): string {
		const secret =
			this.configService.get<string>('PLATEGA_SECRET') ??
			this.configService.get<string>('PLATEGA_API_KEY') ??
			this.configService.get<string>('PLATEGA_API')

		if (!secret) {
			throw new Error(
				'PLATEGA_SECRET, PLATEGA_API_KEY or PLATEGA_API is not configured'
			)
		}

		return secret
	}

	private assertPlategaWebhookAuth(
		merchantId?: string,
		secret?: string
	): void {
		const validMerchantId = this.safeCompare(
			merchantId,
			this.configService.getOrThrow<string>('PLATEGA_MERCHANT_ID')
		)
		const validSecret = this.safeCompare(secret, this.getPlategaSecret())

		if (!validMerchantId || !validSecret) {
			throw new UnauthorizedException('Invalid Platega webhook headers')
		}
	}

	private safeCompare(actual?: string, expected?: string): boolean {
		if (!actual || !expected) {
			return false
		}

		const actualBuffer = Buffer.from(actual)
		const expectedBuffer = Buffer.from(expected)

		if (actualBuffer.length !== expectedBuffer.length) {
			return false
		}

		return timingSafeEqual(actualBuffer, expectedBuffer)
	}

	private isCreateTransactionResponse(
		result: PlategaCreateTransactionResponse | PlategaApiError
	): result is PlategaCreateTransactionResponse {
		return (
			'transactionId' in result &&
			typeof result.transactionId === 'string'
		)
	}

	private async parsePlategaResponse<T>(response: Response): Promise<T> {
		const text = await response.text()

		if (!text) {
			return {} as T
		}

		try {
			return JSON.parse(text) as T
		} catch {
			throw new BadRequestException('Invalid Platega JSON response')
		}
	}

	private stringify(value: unknown): string {
		if (value instanceof Error) {
			return value.stack ?? value.message
		}

		if (typeof value === 'string') {
			return value
		}

		try {
			return JSON.stringify(value)
		} catch {
			return String(value)
		}
	}
}
