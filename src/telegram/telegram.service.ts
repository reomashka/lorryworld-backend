import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { LoggerService } from '@/logger/logger.service'
import { OrderService } from '@/order/order.service'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class TelegramService {
	public constructor(
		private readonly configService: ConfigService,
		private readonly prismaService: PrismaService,
		private readonly logger: LoggerService,
		private readonly orderService: OrderService
	) {}

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
				this.logger.error(`No chat ID configured for type: ${type}`)
				return
			}

			this.logger.log(`Отправка сообщения в чат: ${chatId}`)

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
								url: `${this.configService.getOrThrow<string>('PUBLIC_URL')}/api/item/confirm-issuance/${userId}/${type}`
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
			this.logger.error(
				`Telegram error: ${error.response?.data || error.message}`
			)
		}
	}

	public async withdrawMessage(text: string, type: string, orderId: number) {
		try {
			const chatId = this.chatMap[type]

			if (!chatId) {
				console.warn(`No chat ID configured for type: ${type}`)
				return
			}

			this.logger.log(`Отправка сообщения в чат: ${chatId}`)

			const body: any = {
				chat_id: chatId,
				parse_mode: 'HTML',
				text
			}

			if (orderId && type) {
				body.reply_markup = {
					inline_keyboard: [
						[
							{
								text: '✅ Подтвердить выдачу',
								callback_data: `confirm_issuance_${orderId}_${type}`
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
			this.logger.error(
				`Telegram error: ${error.response?.data || error.message}`
			)
		}
	}

	public async handleWebhook(payload: any) {
		const data = payload?.callback_query.data
		if (!data) {
			throw new BadRequestException('Invalid callback data')
		}
		const parts = data.split('_')
		const orderId = Number(parts[2])
		const type = parts[3]

		if (!orderId) {
			throw new BadRequestException('Order ID is required')
		}

		const order = await this.prismaService.order.findUnique({
			where: { id: orderId },
			include: {
				user: true,
				items: true
			}
		})

		if (!order || !order.user) {
			throw new NotFoundException('Order or user not found')
		}

		if (order.isIssued) {
			await this.sendMessage(
				`ℹ️ Заказ уже был закрыт ранее.\n\n` +
					`<b>ID пользователя:</b> ${order.user.id}\n` +
					`<b>Контакт:</b> ${order.user.contact}\n` +
					`<b>Ник на сайте:</b> ${order.user.displayName}\n` +
					`<b>Роблокс никнейм:</b> ${order.user.robloxUsername}\n`,
				false,
				type
			)
			return
		}

		this.orderService.updateIssuedStatus([{ orderId }])

		await this.sendMessage(
			`✅ Заказ успешно закрыт, все товары выданы.\n\n` +
				`<b>ID пользователя:</b> ${order.user.id}\n` +
				`<b>Контакт:</b> ${order.user.contact}\n` +
				`<b>Ник на сайте:</b> ${order.user.displayName}\n` +
				`<b>Роблокс никнейм:</b> ${order.user.robloxUsername}\n`,
			false,
			type
		)
	}
}
