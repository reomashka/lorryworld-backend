import { Controller, Get } from '@nestjs/common'

import { AdminService } from './admin.service'

@Controller('admin')
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	@Get('stats')
	public async getAllEarnings() {
		return this.adminService.getDashboardStats()
	}
}
