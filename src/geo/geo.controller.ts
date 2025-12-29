import { Controller, Get, Ip } from '@nestjs/common'

import { GeoService } from './geo.service'

@Controller('geo')
export class GeoController {
	constructor(private readonly geoService: GeoService) {}

	@Get()
	getMyIp(@Ip() ip: string) {
		const cleanIp = ip.replace(/^::ffff:/, '')

		const language = this.geoService.detectLanguage(cleanIp)

		console.log(`[GEO] IP=${cleanIp} LANG=${language}`)

		return {
			ip: cleanIp,
			language
		}
	}
}
