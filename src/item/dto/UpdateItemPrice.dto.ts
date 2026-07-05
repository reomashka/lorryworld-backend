import { IsInt, IsOptional, Min } from 'class-validator'

export class UpdateItemPriceDto {
	@IsOptional()
	@IsInt()
	@Min(0)
	price?: number

	@IsOptional()
	@IsInt()
	@Min(0)
	sale?: number
}
