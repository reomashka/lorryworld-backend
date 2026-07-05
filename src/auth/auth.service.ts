import {
	BadRequestException,
	ConflictException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthMethod, User } from '@prisma/__generated__'
import { verify } from 'argon2'
import { Request, Response } from 'express'

import { LoggerService } from '@/logger/logger.service'
import { UserService } from '@/user/user.service'

import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { EmailConfirmationService } from './email-confirmation/email-confirmation.service'

@Injectable()
export class AuthService {
	public constructor(
		private readonly userService: UserService,
		private readonly configService: ConfigService,
		private readonly logger: LoggerService,
		private readonly emailConfirmationService: EmailConfirmationService
	) {}

	public async register(req: Request, dto: RegisterDto) {
		const isEmailExists = await this.userService.findByEmail(dto.email)
		if (isEmailExists) {
			throw new ConflictException(
				'Регистрация не удалась. Пользователь с таким email уже существует. Пожалуйста, используйте другой email или войдите в систему.'
			)
		}

		const isNameExists = await this.userService.findByDisplayName(dto.name)
		if (isNameExists) {
			throw new ConflictException(
				'Регистрация не удалась. Пользователь с таким именем уже существует. Пожалуйста, выберите другое имя.'
			)
		}

		const newUser = await this.userService.create(
			dto.email,
			dto.password,
			dto.name,
			'',
			AuthMethod.CREDENTIALS,
			false
		)

		const ip =
			(req.headers['x-forwarded-for'] as string) ||
			req.socket.remoteAddress?.replace('::ffff:', '') ||
			req.ip?.replace('::ffff:', '')

		this.logger.log(
			`[IP: ${ip}] Пользователь ${newUser.displayName} был зарегистрирован`
		)

		// this.emailConfirmationService.sendVerificationToken(newUser)
		return this.saveSession(req, newUser)

		return {
			message:
				'Вы успешно зарегистрировались. Пожалуйста, подтвердите ваш email. Сообщение было отправлено на ваш почтовый адрес.'
		}
	}

	public async login(req: Request, dto: LoginDto) {
		const identifier = this.getLoginIdentifier(dto)
		const user = await this.userService.findByEmailOrDisplayName(identifier)

		if (!user || !user.password) {
			throw new NotFoundException(
				'Пользователь не найден. Проверьте корректность данных.'
			)
		}

		if (!(await this.isValidPassword(user.password, dto.password))) {
			throw new UnauthorizedException('Неверный пароль.')
		}

		// if (!user.isVerified) {
		// 	// await this.emailConfirmationService.sendVerificationToken(user)
		// 	throw new UnauthorizedException(
		// 		'Ваш email не подтвержден. Пожалуйста, проверьте почту и подтвердите адрес'
		// 	)
		// }

		return this.saveSession(req, user)
	}

	private getLoginIdentifier(dto: LoginDto): string {
		const identifier =
			dto.identifier ?? dto.email ?? dto.name ?? dto.displayName

		if (typeof identifier !== 'string' || !identifier.trim()) {
			throw new BadRequestException('Укажите email или имя пользователя.')
		}

		return identifier.trim()
	}

	private async isValidPassword(
		userPassword: string,
		inputPassword: string
	): Promise<boolean> {
		try {
			return userPassword.startsWith('$')
				? await verify(userPassword, inputPassword)
				: userPassword === inputPassword
		} catch {
			return false
		}
	}

	public async logout(req: Request, res: Response): Promise<void> {
		return new Promise((resolve, reject) => {
			req.session.destroy(err => {
				if (err) {
					return reject(
						new InternalServerErrorException(
							'Не удалось завершить сессию. Возможно, возникла проблема с сервером или сессия уже была завершена.'
						)
					)
				}
				res.clearCookie(
					this.configService.getOrThrow<string>('SESSION_NAME')
				)
				resolve()
			})
		})
	}

	public async saveSession(req: Request, user: User) {
		return new Promise((resolve, reject) => {
			req.session.userId = user.id

			req.session.save(err => {
				if (err) {
					return reject(
						new InternalServerErrorException(
							'Не удалось сохранить сессию. Проверьте корректность настройки сессии.'
						)
					)
				}

				resolve({ user })
			})
		})
	}
}
