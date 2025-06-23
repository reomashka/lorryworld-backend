import { Body, Controller, Post } from '@nestjs/common'

import { TelegramService } from './telegram.service'

@Controller('telegram')
export class TelegramController {
	constructor(private readonly telegramService: TelegramService) {}

	@Post('send-msg')
	public async sendMessage(
		@Body() body: { text: string; withButton: boolean; userId: string }
	) {
		const { text, withButton, userId } = body
		return this.telegramService.sendMessage(text, withButton, userId)
	}
}
