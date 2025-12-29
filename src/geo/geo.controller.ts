import { Controller, Get, Ip } from '@nestjs/common'

import { GeoService } from './geo.service'

@Controller('geo')
export class GeoController {
	constructor(private readonly geoService: GeoService) {}

	private detectLanguage(countryCode?: string): 'ru' | 'en' {
		const ruCountries = ['RU', 'BY', 'KZ', 'UA']

		if (!countryCode) return 'en'

		return ruCountries.includes(countryCode) ? 'ru' : 'en'
	}

	@Get()
	async getMyIp(@Ip() ip: string) {
		const cleanIp = ip.replace(/^::ffff:/, '')

		const res = await fetch(`https://ipapi.co/${cleanIp}/json/`)
		const geo = await res.json()

		const language = this.detectLanguage(geo.country_code)

		console.log(
			`[GEO] IP=${cleanIp} COUNTRY=${geo.country_name} LANG=${language}`
		)

		return {
			ip: cleanIp,
			country: geo.country_name,
			language
		}
	}
}
