import { IsEmail, IsOptional, IsString } from 'class-validator'

export class UpdateUserDto {
	@IsString({ message: 'Имя должно быть строкой.' })
	@IsOptional()
	name?: string

	@IsString({ message: 'Email должен быть строкой.' })
	@IsEmail({}, { message: 'Некорректный формат email.' })
	@IsOptional()
	email?: string

	@IsString({ message: 'Контакт должен быть строкой.' })
	@IsOptional()
	contact?: string

	@IsString({ message: 'Социальная сеть должна быть строкой.' })
	@IsOptional()
	mediaContact?: string
}
