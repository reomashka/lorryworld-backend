import { Injectable } from '@nestjs/common'

@Injectable()
export class TelegramService {
	public async sendMessage(
		text: string,
		withButton = false,
		userId?: string
	) {
		try {
			const body: any = {
				chat_id: '-1002591901797',
				parse_mode: 'HTML',
				text
			}

			if (withButton && userId) {
				body.reply_markup = {
					inline_keyboard: [
						[
							{
								text: '✅ Подтвердить выдачу',
								url: `https://94b7-150-241-84-120.ngrok-free.app/api/item/confirm-issuance/${userId}`
								// url: `http://localhost:5173/api/item/confirm-issuance/${userId}`
							}
						]
					]
				}
			}

			await fetch(
				'https://api.telegram.org/bot7700733985:AAFoett9zwNs8qF0tpOP4yFP44Q3opqOwK0/sendMessage',
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
}
