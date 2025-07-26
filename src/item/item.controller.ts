import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import {
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'

import { CreateUserItemDto } from './dto/createUserItem.dto'
import { WithdrawItemsDto } from './dto/withdrawItems'
import { ItemService } from './item.service'

@ApiTags('item')
@Controller('item')
export class ItemController {
	constructor(private readonly itemService: ItemService) {}

	@ApiOperation({ summary: 'Получить все товары' })
	@ApiResponse({ status: 200, description: 'Список всех товаров' })
	@Get('get-all')
	public async getAllItems() {
		return this.itemService.getAllItems()
	}

	@ApiOperation({ summary: 'Получить все купленные товары пользователя' })
	@ApiParam({ name: 'id', description: 'ID пользователя' })
	@ApiResponse({ status: 200, description: 'Список купленных товаров' })
	@Get('get-all-purchased/:id')
	public async getAllPurchasedItems(@Param('id') id: string) {
		return this.itemService.getAllPurchasedItems(id)
	}

	@ApiOperation({
		summary: 'Получить недавно выведенные товары пользователя'
	})
	@ApiParam({ name: 'userId', description: 'ID пользователя' })
	@ApiResponse({
		status: 200,
		description: 'Список недавно выведенных товаров'
	})
	@Get('get-all-recent-withdrawn/:userId')
	public async getAllRecentWithdrawnItems(@Param('userId') userId: string) {
		return this.itemService.getAllRecentWithdrawnItems(userId)
	}

	@ApiOperation({ summary: 'Купить товар' })
	@ApiBody({ type: CreateUserItemDto })
	@ApiResponse({ status: 201, description: 'Покупка успешно завершена' })
	@Post('buy')
	public async buyItem(@Body() dto: CreateUserItemDto) {
		return this.itemService.buyItem(dto)
	}

	@ApiOperation({ summary: 'Вывести товар' })
	@ApiBody({ type: WithdrawItemsDto })
	@ApiResponse({ status: 201, description: 'Вывод успешно завершён' })
	@Post('withdraw')
	public async withdrawtem(@Body() dto: WithdrawItemsDto) {
		return this.itemService.withdrawItem(dto)
	}
}
