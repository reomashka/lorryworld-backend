export type PaymentStatus = 'success' | 'fail' | 'expired' | 'refund'

export class PaymentWebhookDto {
	invoice_id: string
	status: PaymentStatus
	amount: string
	currency: string
	order_id: string
	custom_fields: string
	type: number
	code: number

	// Optional fields
	credited?: number
	pay_time?: string
	pay_service?: string
	payer_details?: string
	reject_time?: string
	refund_amount?: string
	refund_reason?: string | null
	refund_time?: string
}
