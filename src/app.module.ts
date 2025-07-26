import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AuthModule } from './auth/auth.module'
import { EmailConfirmationModule } from './auth/email-confirmation/email-confirmation.module'
import { PasswordRecoveryModule } from './auth/password-recovery/password-recovery.module'
import { MailModule } from './libs/mail/mail.module'
import { PaymentModule } from './payment/payment.module'
import { PrismaModule } from './prisma/prisma.module'
import { UploadModule } from './upload/upload.module'
import { UserModule } from './user/user.module'
import { ItemModule } from './item/item.module';
import { TelegramModule } from './telegram/telegram.module';
import { AdminModule } from './admin/admin.module';
import { OrderModule } from './order/order.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: '.env'
		}),
		PrismaModule,
		AuthModule,
		UserModule,
		MailModule,
		EmailConfirmationModule,
		PasswordRecoveryModule,
		PaymentModule,
		UploadModule,
		ItemModule,
		TelegramModule,
		AdminModule,
		OrderModule
	]
})
export class AppModule {}
