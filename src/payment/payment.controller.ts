import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Header,
	Headers,
	Param,
	Post
} from '@nestjs/common'
import * as crypto from 'crypto'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { PaymentDto } from './dto/payment.dto'
import { PaymentService } from './payment.service'

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

	@Post('webhook')
	public async handleWebhook(
		@Headers('x-api-sha256-signature') signature: string,
		@Body() payload: any
	) {
		return this.paymentService.updatePaymentStatus(payload)
	}

	@Get('get-payments/:userId')
	public async getPaymentsOfUser(@Param('userId') userId: string) {
		return this.paymentService.getPaymentsOfUser(userId)
	}
}
