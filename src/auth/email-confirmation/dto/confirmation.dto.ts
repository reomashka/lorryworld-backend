import { IsNotEmpty, IsString } from 'class-validator'

export class ConfirmationDto {
	@IsString({ message: 'Токен должен быть строкой' })
	@IsNotEmpty({ message: 'Токен не должен быть пустым' })
	token: string
}
