import { Module } from '@nestjs/common'

import { OrderService } from '@/order/order.service'
import { TelegramService } from '@/telegram/telegram.service'

import { ItemController } from './item.controller'
import { ItemService } from './item.service'

@Module({
	controllers: [ItemController],
	providers: [ItemService, TelegramService, OrderService]
})
export class ItemModule {}
