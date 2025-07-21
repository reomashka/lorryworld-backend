import { Module } from '@nestjs/common'

import { TelegramService } from '@/telegram/telegram.service'
import { UserModule } from '@/user/user.module'

import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'

@Module({
	imports: [UserModule],
	controllers: [PaymentController],
	providers: [PaymentService, TelegramService]
})
export class PaymentModule {}
