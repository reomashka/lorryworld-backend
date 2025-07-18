export type PaymentStatus = 'success' | 'pending' | 'cancel' | 'error'

export class PaymentWebhookDto {
	invoice_id: string
	order_id: string
	status: PaymentStatus
	pay_time: string
	amount: string
	credited: number

	pay_service?: string
	payer_details?: string

	// Optional fields
	reject_time?: string
	refund_amount?: string
	refund_reason?: string | null
	refund_time?: string
	currency?: string
	custom_fields?: string
	type?: number
	code?: number
}
