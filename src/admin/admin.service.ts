import { Injectable } from '@nestjs/common'
import { PaymentStatus } from '@prisma/__generated__'

import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class AdminService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async getAllEarnings() {
		const now = new Date()
		const startOfToday = new Date(now.setHours(0, 0, 0, 0))
		const startOfYesterday = new Date(startOfToday)
		startOfYesterday.setDate(startOfYesterday.getDate() - 1)
		const startOfWeek = new Date(startOfToday)
		startOfWeek.setDate(startOfWeek.getDate() - 6)
		const [today, yesterday, week] = await Promise.all([
			this.prismaService.payment.aggregate({
				_sum: { amount: true },
				where: {
					status: PaymentStatus.SUCCESS,
					createdAt: { gte: startOfToday }
				}
			}),
			this.prismaService.payment.aggregate({
				_sum: { amount: true },
				where: {
					status: PaymentStatus.SUCCESS,
					createdAt: {
						gte: startOfYesterday,
						lt: startOfToday
					}
				}
			}),
			this.prismaService.payment.aggregate({
				_sum: { amount: true },
				where: {
					status: PaymentStatus.SUCCESS,
					createdAt: { gte: startOfWeek }
				}
			})
		])

		return {
			today: today._sum.amount || 0,
			yesterday: yesterday._sum.amount || 0,
			week: week._sum.amount || 0
		}
	}
}
