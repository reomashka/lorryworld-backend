import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res
} from '@nestjs/common'

import { CreateUserItemDto } from './dto/createUserItem.dto'
import { WithdrawItemsDto } from './dto/withdrawItems'
import { ItemService } from './item.service'

@Controller('item')
export class ItemController {
	constructor(private readonly itemService: ItemService) {}

	@Get('get-all')
	public async getAllItems() {
		return this.itemService.getAllItems()
	}

	@Get('get-all-purchased/:id')
	public async getAllPurchasedItems(@Param('id') id: string) {
		return this.itemService.getAllPurchasedItems(id)
	}

	// Получение выведеных ТОЛЬКО ЧТО
	@Get('get-all-recent-withdrawn/:userId')
	public async getAllRecentWithdrawnItems(@Param('userId') userId: string) {
		return this.itemService.getAllRecentWithdrawnItems(userId)
	}

	@Post('buy')
	public async buyItem(@Body() dto: CreateUserItemDto) {
		return this.itemService.buyItem(dto)
	}

	@Post('withdraw')
	public async withdrawtem(@Body() dto: WithdrawItemsDto) {
		return this.itemService.withdrawItem(dto)
	}

	@Get('confirm-issuance/:userId')
	async confirmIssuance(@Param('userId') userId: string) {
		return this.itemService.confirmIssuance(userId)
	}
}
