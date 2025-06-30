import { IsNotEmpty, IsString } from 'class-validator'

export class WithdrawItemsDto {
	@IsString()
	@IsNotEmpty()
	userId: string
}
