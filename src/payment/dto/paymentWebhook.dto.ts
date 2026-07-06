export const PLATEGA_PAYMENT_STATUSES = [
	'PENDING',
	'CONFIRMED',
	'CANCELED',
	'CHARGEBACKED'
] as const

export const PLATEGA_PAYMENT_METHODS = [2, 3, 11, 12, 13] as const

export type PlategaPaymentStatus = (typeof PLATEGA_PAYMENT_STATUSES)[number]
export type PlategaPaymentMethod = (typeof PLATEGA_PAYMENT_METHODS)[number]

export type PaymentWebhookDto = {
	id: string
	amount?: number
	currency?: string
	status: PlategaPaymentStatus
	paymentMethod?: number
	payload?: string
}
