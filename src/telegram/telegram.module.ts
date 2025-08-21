import { Module } from '@nestjs/common'

import { LoggerService } from '@/logger/logger.service'
import { OrderService } from '@/order/order.service'

import { TelegramController } from './telegram.controller'
import { TelegramService } from './telegram.service'

@Module({
	controllers: [TelegramController],
	providers: [TelegramService, OrderService, LoggerService],
	exports: [TelegramService]
})
export class TelegramModule {}
