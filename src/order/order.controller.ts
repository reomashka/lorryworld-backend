import { Body, Controller, Get, Post, Query } from '@nestjs/common'

import { OrderService } from './order.service'

@Controller('order')
export class OrderController {
	constructor(private readonly orderService: OrderService) {}

	@Get('not-issued')
	public async getNotIssued() {
		return this.orderService.getNotIssued()
	}

	@Post('update-issued')
	public async updateIssued(@Body() updates: { orderId: number }[]) {
		return this.orderService.updateIssuedStatus(updates)
	}

	@Get('active')
	public async getActiveOrders(@Query('userId') userId: string) {
		return this.orderService.getActiveOrders(userId)
	}

	@Get('active-for-bot')
	public async getActiveOrdersForBot() {
		return this.orderService.getActiveOrdersForBot()
	}
}
