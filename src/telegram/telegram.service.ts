import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ItemStatus } from '@prisma/__generated__'

import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class TelegramService {
	public constructor(
		private readonly configService: ConfigService,
		private readonly prismaService: PrismaService
	) {}
	private readonly logger = new Logger(TelegramService.name)

	private chatMap: Record<string, string> = {
		MM: this.configService.getOrThrow<string>('TG_CHAT_ID_MM'),
		GAG: this.configService.getOrThrow<string>('TG_CHAT_ID_GAG'),
		topup: this.configService.getOrThrow<string>('TG_CHAT_ID_TOPUP')
	}

	public async sendMessage(
		text: string,
		withButton = false,
		type: string,
		userId?: string
	) {
		try {
			const chatId = this.chatMap[type]

			if (!chatId) {
				console.warn(`No chat ID configured for type: ${type}`)
				return
			}

			const body: any = {
				chat_id: chatId,
				parse_mode: 'HTML',
				text
			}

			if (withButton && userId) {
				body.reply_markup = {
					inline_keyboard: [
						[
							{
								text: '✅ Подтвердить выдачу',
								callback_data: `confirm_issuance_${userId}_${type}`
							}
						]
					]
				}
			}

			await fetch(
				`https://api.telegram.org/bot${this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN')}/sendMessage`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(body)
				}
			)
		} catch (error) {
			console.error(
				'Telegram error:',
				error.response?.data || error.message
			)
		}
	}

	public async handleWebhook(payload: any) {
		this.logger.debug('Telegram update received:', JSON.stringify(payload))

		const data = payload?.data
		const parts = data.split('_')
		const userId = parts[2]
		const type = parts[3]

		if (!userId) {
			throw new BadRequestException('User ID is required')
		}

		try {
			const result = await this.prismaService.userItem.updateMany({
				where: {
					userId,
					status: ItemStatus.WITHDRAWN,
					isIssued: false
				},
				data: {
					isIssued: true
				}
			})

			if (result.count === 0) {
				this.sendMessage(
					`ℹ️ Все товары уже были подтверждены ранее или отсутствуют для выдачи.\nНикнейм пользователя: ${userId}`,
					false,
					type
				)
				return
			}

			await this.sendMessage(
				`✅ Все товары успешно выданы для пользователя.\nНикнейм пользователя: ${userId}`,
				false,
				type
			)
		} catch (error) {
			console.error(error)
			throw new InternalServerErrorException(
				'Ошибка при подтверждении вывода'
			)
		}
	}
}
