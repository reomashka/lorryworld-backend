import { Body, Controller, Get, Post } from '@nestjs/common'

import { OrderService } from './order.service'

@Controller('order')
export class OrderController {
	constructor(private readonly orderService: OrderService) {}

	@Get('not-issued')
	public async getNotIssued() {
		return this.orderService.getNotIssued()
	}

	@Post('update-issued')
	public async updateIssued(@Body() body: { orderId: number }) {
		return this.orderService.updateIssuedStatus(body.orderId)
	}
}
