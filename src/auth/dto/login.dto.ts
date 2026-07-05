import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	MinLength
} from 'class-validator'

export class LoginDto {
	@IsOptional()
	@IsString({ message: 'Логин должен быть строкой.' })
	identifier?: string

	@IsOptional()
	@IsString({ message: 'Email должен быть строкой.' })
	@IsEmail({}, { message: 'Некорректный формат email.' })
	email?: string

	@IsOptional()
	@IsString({ message: 'displayName должен быть строкой.' })
	name?: string

	@IsOptional()
	@IsString({ message: 'displayName должен быть строкой.' })
	displayName?: string

	@IsString({ message: 'Пароль должен быть строкой.' })
	@IsNotEmpty({ message: 'Поле пароль не может быть пустым.' })
	@MinLength(6, { message: 'Пароль должен содержать не менее 6 символов.' })
	password: string
}
