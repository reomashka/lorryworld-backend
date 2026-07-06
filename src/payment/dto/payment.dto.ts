import {
	IsIn,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Min
} from 'class-validator'

export const PAYMENT_METHODS = ['sbp', 'card'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export class PaymentDto {
	@IsString({ message: 'userId должно быть строкой.' })
	@IsNotEmpty({ message: 'userId обязателен для заполнения.' })
	userId: string

	@IsInt({ message: 'sum должно быть целым числом.' })
	@Min(1, { message: 'sum должно быть больше 0.' })
	@IsNotEmpty({ message: 'sum обязателен для заполнения.' })
	amount: number

	@IsIn(PAYMENT_METHODS, { message: 'method должно быть sbp или card.' })
	@IsNotEmpty({ message: 'method обязателен для заполнения.' })
	paymentMethod: PaymentMethod

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
