import { Controller, Get, Ip, Req } from '@nestjs/common'

import { GeoService } from './geo.service'

@Controller('geo')
export class GeoController {
	constructor(private readonly geoService: GeoService) {}

	@Get('')
	getMyIp(@Ip() ip: string) {
		const clean = ip.replace(/^::ffff:/, '')
		return { ip: clean }
	}
}
