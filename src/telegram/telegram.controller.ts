import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'

import { TelegramService } from './telegram.service'

@Controller('telegram')
export class TelegramController {
	constructor(private readonly telegramService: TelegramService) {}

	@Post('send-msg')
	public async sendMessage(
		@Body()
		body: {
			text: string
			withButton: boolean
			type: string
			userId?: string
		}
	) {
		const { text, withButton, userId, type } = body
		return this.telegramService.sendMessage(text, withButton, userId, type)
	}

	@Post('webhook')
	@HttpCode(HttpStatus.OK)
	public async handle(@Body() payload: any) {
		return await this.telegramService.handleWebhook(payload)
	}
}
