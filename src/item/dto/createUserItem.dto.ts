import { IsInt, IsNotEmpty, IsString } from 'class-validator'

export class CreateUserItemDto {
	@IsInt()
	@IsNotEmpty()
	quantity: number

	@IsString()
	@IsNotEmpty()
	userId: string

	@IsInt()
	@IsNotEmpty()
	itemId: number

	@IsInt()
	@IsNotEmpty()
	amount: number
}
