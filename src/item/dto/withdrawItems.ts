import { IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class WithdrawItemsDto {
	@IsString()
	@IsUUID()
	@IsNotEmpty()
	userId: string
}
