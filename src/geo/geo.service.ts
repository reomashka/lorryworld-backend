import { Injectable } from '@nestjs/common'
import maxmind, { Reader } from 'maxmind'

@Injectable()
export class GeoService {
	private reader!: Reader<any>

	async onModuleInit() {
		this.reader = await maxmind.open('/countries.mmdb')
	}

	getCountry(ip: string): string | null {
		try {
			const data = this.reader.get(ip)
			return data?.country?.iso_code ?? null
		} catch {
			return null
		}
	}

	detectLanguage(ip: string): 'ru' | 'en' {
		const country = this.getCountry(ip)

		const ruCountries = ['RU', 'BY', 'KZ', 'UA']
		return ruCountries.includes(country ?? '') ? 'ru' : 'en'
	}
}
