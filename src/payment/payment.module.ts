import { Module } from '@nestjs/common'

import { LoggerService } from '@/logger/logger.service'
import { OrderModule } from '@/order/order.module'
import { TelegramService } from '@/telegram/telegram.service'
import { UserModule } from '@/user/user.module'

import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'

@Module({
	imports: [UserModule, OrderModule],
	controllers: [PaymentController],
	providers: [PaymentService, TelegramService, LoggerService]
})
export class PaymentModule {}
