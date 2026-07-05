import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

export class CreateUserItemDto {
	@IsInt()
	@IsNotEmpty()
	@Min(1)
	quantity: number

	@IsString()
	@IsNotEmpty()
	userId: string

	@IsInt()
	@IsNotEmpty()
	@Min(1)
	itemId: number

	@IsOptional()
	@IsInt()
	@Min(0)
	amount?: number
}
