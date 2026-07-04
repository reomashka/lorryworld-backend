import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator'

export const PLATEGA_PAYMENT_STATUSES = [
	'PENDING',
	'CONFIRMED',
	'CANCELED',
	'CHARGEBACKED'
] as const

export const PLATEGA_PAYMENT_METHODS = [2, 3, 11, 12, 13] as const

export type PlategaPaymentStatus = (typeof PLATEGA_PAYMENT_STATUSES)[number]
export type PlategaPaymentMethod = (typeof PLATEGA_PAYMENT_METHODS)[number]

export class PaymentWebhookDto {
	@IsString({ message: 'id должно быть строкой.' })
	@IsNotEmpty({ message: 'id обязателен для заполнения.' })
	id: string

	@IsNumber({}, { message: 'amount должно быть числом.' })
	amount: number

	@IsIn(['RUB'], { message: 'currency должно быть RUB.' })
	@IsNotEmpty({ message: 'currency обязательна для заполнения.' })
	currency: 'RUB'

	@IsIn(PLATEGA_PAYMENT_STATUSES, {
		message: 'status должен быть статусом Platega.'
	})
	status: PlategaPaymentStatus

	@IsIn(PLATEGA_PAYMENT_METHODS, {
		message: 'paymentMethod должен быть методом оплаты Platega.'
	})
	paymentMethod: PlategaPaymentMethod
}
