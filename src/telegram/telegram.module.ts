import { Module } from '@nestjs/common'

import { OrderService } from '@/order/order.service'

import { TelegramController } from './telegram.controller'
import { TelegramService } from './telegram.service'

@Module({
	controllers: [TelegramController],
	providers: [TelegramService, OrderService],
	exports: [TelegramService]
})
export class TelegramModule {}
