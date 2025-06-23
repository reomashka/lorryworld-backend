import { IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class PaymentDto {
	@IsString({ message: 'userId должно быть строкой.' })
	@IsNotEmpty({ message: 'userId обязателен для заполнения.' })
	userId: string

	@IsNumber({}, { message: 'amount должно быть числом.' })
	@IsNotEmpty({ message: 'amount обязателен для заполнения.' })
	amount: number
}
