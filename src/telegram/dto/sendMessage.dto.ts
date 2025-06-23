import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class CreateUserItemDto {
	@IsString()
	@IsNotEmpty()
	text: string
}
