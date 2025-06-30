import { IsInt, IsNotEmpty, IsString } from 'class-validator'

export class CreateUserItemDto {
	@IsString()
	@IsNotEmpty()
	text: string
}
