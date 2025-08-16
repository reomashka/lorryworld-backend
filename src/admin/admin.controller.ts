import { BadRequestException, Controller, Get, Query } from '@nestjs/common'

import { AdminService } from './admin.service'

@Controller('admin')
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	@Get('stats')
	public async getAllEarnings() {
		return this.adminService.getDashboardStats()
	}

	@Get('registrations')
	async getStatsRegistrations(
		@Query('from') from: string,
		@Query('to') to: string
	) {
		if (!from || !to) {
			throw new BadRequestException('Параметры from и to обязательны')
		}

		const fromDate = new Date(from)
		const toDate = new Date(to)

		if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
			throw new BadRequestException('Неверный формат даты')
		}

		return this.adminService.getStatsRegistrations(fromDate, toDate)
	}

	@Get('stats/items')
	public async getStatsAllWithdrawnItems(
		@Query('period') period: 'day' | 'week' | 'all'
	) {
		return this.adminService.getStatsAllPurchasedItems(period)
	}
}
