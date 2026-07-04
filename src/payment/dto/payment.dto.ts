import {
	IsIn,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Min
} from 'class-validator'

export class PaymentDto {
	@IsString({ message: 'userId должно быть строкой.' })
	@IsNotEmpty({ message: 'userId обязателен для заполнения.' })
	userId: string

	@IsInt({ message: 'sum должно быть целым числом.' })
	@Min(1, { message: 'sum должно быть больше 0.' })
	@IsNotEmpty({ message: 'sum обязателен для заполнения.' })
	amount: number

	@IsIn(['RUB'], { message: 'currency должно быть RUB.' })
	@IsOptional()
	currency?: 'RUB'

	@IsString({ message: 'description должно быть строкой.' })
	@IsOptional()
	description?: string

	@IsString({ message: 'returnUrl должно быть строкой.' })
	@IsOptional()
	returnUrl?: string

	@IsString({ message: 'failedUrl должно быть строкой.' })
	@IsOptional()
	failedUrl?: string

	@IsString({ message: 'payload должно быть строкой.' })
	@IsOptional()
	payload?: string

	@IsString({ message: 'userName должно быть строкой.' })
	@IsOptional()
	userName?: string
}
