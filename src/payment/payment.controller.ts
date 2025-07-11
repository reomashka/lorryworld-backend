import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post
} from '@nestjs/common'

import { PaymentDto } from './dto/payment.dto'
import { PaymentWebhookDto } from './dto/paymentWebhook.dto'
import { PaymentService } from './payment.service'

// ✅

@Controller('payment')
export class PaymentController {
	constructor(private readonly paymentService: PaymentService) {}

	@Post('create')
	public async createPayment(@Body() dto: PaymentDto) {
		return this.paymentService.createPayment(dto)
	}

	@Get('info/:invoiceId')
	public async getInfoPayment(@Param('invoiceId') invoiceId: string) {
		return this.paymentService.getInfoOfPayment(invoiceId)
	}

	@Get('get-payments/:userId')
	public async getPaymentsOfUser(@Param('userId') userId: string) {
		return this.paymentService.getPaymentsOfUser(userId)
	}

	@Post('webhook')
	@HttpCode(HttpStatus.OK)
	public async handle(@Body() payload: PaymentWebhookDto) {
		return await this.paymentService.handleWebhook(payload)
	}
}
