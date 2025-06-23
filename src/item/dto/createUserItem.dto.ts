import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class CreateUserItemDto {
	@IsInt()
	@IsNotEmpty()
	quantity: number

	@IsString()
	@IsUUID()
	@IsNotEmpty()
	userId: string

	@IsInt()
	@IsNotEmpty()
	itemId: number

	@IsInt()
	@IsNotEmpty()
	amount: number
}
