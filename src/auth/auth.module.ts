import { forwardRef, Module } from '@nestjs/common'

import { LoggerService } from '@/logger/logger.service'

import { UserModule } from '../user/user.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { EmailConfirmationModule } from './email-confirmation/email-confirmation.module'

@Module({
	imports: [UserModule, forwardRef(() => EmailConfirmationModule)],
	controllers: [AuthController],
	providers: [AuthService, LoggerService],
	exports: [AuthService]
})
export class AuthModule {}
