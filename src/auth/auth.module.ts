import { forwardRef, Module } from '@nestjs/common'

import { UserModule } from '../user/user.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { EmailConfirmationModule } from './email-confirmation/email-confirmation.module'

@Module({
	imports: [UserModule, forwardRef(() => EmailConfirmationModule)],
	controllers: [AuthController],
	providers: [AuthService],
	exports: [AuthService]
})
export class AuthModule {}
