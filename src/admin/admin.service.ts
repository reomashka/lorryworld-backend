import { Injectable } from '@nestjs/common'
import { ItemStatus, PaymentStatus } from '@prisma/__generated__'

import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class AdminService {
	public constructor(private readonly prismaService: PrismaService) {}

	private getEarningsDateRanges() {
		const now = new Date()
		const startOfToday = new Date(now.setHours(0, 0, 0, 0))
		const startOfYesterday = new Date(startOfToday)
		startOfYesterday.setDate(startOfYesterday.getDate() - 1)
		const startOfWeek = new Date(startOfToday)
		startOfWeek.setDate(startOfWeek.getDate() - 6)

		return {
			startOfToday,
			startOfYesterday,
			startOfWeek
		}
	}

	private async getAggregateSums(
		model: 'payment' | 'userItem',
		where: object
	) {
		const { startOfToday, startOfYesterday, startOfWeek } =
			this.getEarningsDateRanges()

		if (model === 'payment') {
			const [today, yesterday, week] = await Promise.all([
				this.prismaService.payment.aggregate({
					_sum: { amount: true },
					where: {
						...where,
						createdAt: { gte: startOfToday }
					}
				}),
				this.prismaService.payment.aggregate({
					_sum: { amount: true },
					where: {
						...where,
						createdAt: {
							gte: startOfYesterday,
							lt: startOfToday
						}
					}
				}),
				this.prismaService.payment.aggregate({
					_sum: { amount: true },
					where: {
						...where,
						createdAt: { gte: startOfWeek }
					}
				})
			])

			return {
				today: today._sum.amount || 0,
				yesterday: yesterday._sum.amount || 0,
				week: week._sum.amount || 0
			}
		} else {
			const [today, yesterday, week] = await Promise.all([
				this.prismaService.userItem.aggregate({
					_sum: { amount: true },
					where: {
						...where,
						createdAt: { gte: startOfToday }
					}
				}),
				this.prismaService.userItem.aggregate({
					_sum: { amount: true },
					where: {
						...where,
						createdAt: {
							gte: startOfYesterday,
							lt: startOfToday
						}
					}
				}),
				this.prismaService.userItem.aggregate({
					_sum: { amount: true },
					where: {
						...where,
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

	public async getDashboardStats() {
		const earnings = await this.getAggregateSums('payment', {
			status: PaymentStatus.SUCCESS
		})

		const items = await this.getAggregateSums('userItem', {
			status: ItemStatus.WITHDRAWN,
			isIssued: true
		})

		return { earnings, items }
	}
}
