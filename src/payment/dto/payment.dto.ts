import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class PaymentDto {
	@IsString({ message: 'userId должно быть строкой.' })
	@IsNotEmpty({ message: 'userId обязателен для заполнения.' })
	userId: string

	@IsNumber({}, { message: 'sum должно быть числом.' })
	@IsNotEmpty({ message: 'sum обязателен для заполнения.' })
	amount: number
}
