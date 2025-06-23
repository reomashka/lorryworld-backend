import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	Res
} from '@nestjs/common'
import { Request as ExpressRequest, Response as ExpressResponse } from 'express'

// <- импорт Response из express
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Controller('auth')
export class AuthController {
	public constructor(private readonly authService: AuthService) {}

	@Post('register')
	@HttpCode(HttpStatus.OK)
	public async register(
		@Req() req: ExpressRequest,
		@Body() dto: RegisterDto
	) {
		return await this.authService.register(req, dto)
	}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	public async login(@Req() req: ExpressRequest, @Body() dto: LoginDto) {
		return await this.authService.login(req, dto)
	}

	@Post('logout')
	@HttpCode(HttpStatus.OK)
	public async logout(
		@Req() req: ExpressRequest,
		@Res({ passthrough: true }) res: ExpressResponse
	) {
		return await this.authService.logout(req, res)
	}
}
