import {
	Body,
	Controller,
	Get,
	Headers,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Req,
	Res
} from '@nestjs/common'
import { Request, Response } from 'express'

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

	// @Post('webhook')
	// public async handleWebhook(
	// 	@Headers('x-api-sha256-signature') signature: string,
	// 	@Body() payload: any
	// ) {
	// 	return this.paymentService.updatePaymentStatus(payload)
	// }

	@Get('get-payments/:userId')
	public async getPaymentsOfUser(@Param('userId') userId: string) {
		return this.paymentService.getPaymentsOfUser(userId)
	}

	@Post('webhook')
	@HttpCode(HttpStatus.OK)
	public async handle(
		@Body() payload: PaymentWebhookDto
		// @Headers('x-api-sha256-signature') signature: string
	) {
		console.log('Webhook received:', payload)
		return await this.paymentService.handleWebhook(payload)
	}
}
