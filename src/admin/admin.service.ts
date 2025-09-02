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

	private async getDashboardAggregates(
		model: 'payment' | 'userItem' | 'user',
		where: object
	) {
		const { startOfToday, startOfYesterday, startOfWeek } =
			this.getEarningsDateRanges()

		if (model === 'payment') {
			const [today, yesterday, week] = await Promise.all([
				this.prismaService.payment.aggregate({
					_sum: { amount: true },
					where: { ...where, createdAt: { gte: startOfToday } }
				}),
				this.prismaService.payment.aggregate({
					_sum: { amount: true },
					where: {
						...where,
						createdAt: { gte: startOfYesterday, lt: startOfToday }
					}
				}),
				this.prismaService.payment.aggregate({
					_sum: { amount: true },
					where: { ...where, createdAt: { gte: startOfWeek } }
				})
			])

			return {
				today: today._sum.amount || 0,
				yesterday: yesterday._sum.amount || 0,
				week: week._sum.amount || 0
			}
		}

		if (model === 'userItem') {
			const [todayCount, yesterdayCount, weekCount] = await Promise.all([
				this.prismaService.userItem.aggregate({
					_count: true,
					where: { ...where, createdAt: { gte: startOfToday } }
				}),
				this.prismaService.userItem.aggregate({
					_count: true,
					where: {
						...where,
						createdAt: { gte: startOfYesterday, lt: startOfToday }
					}
				}),
				this.prismaService.userItem.aggregate({
					_count: true,
					where: { ...where, createdAt: { gte: startOfWeek } }
				})
			])

			return {
				today: todayCount._count || 0,
				yesterday: yesterdayCount._count || 0,
				week: weekCount._count || 0
			}
		}

		// model === 'user'
		const [todayCount, yesterdayCount, weekCount] = await Promise.all([
			this.prismaService.user.aggregate({
				_count: true,
				where: { ...where, createdAt: { gte: startOfToday } }
			}),
			this.prismaService.user.aggregate({
				_count: true,
				where: {
					...where,
					createdAt: { gte: startOfYesterday, lt: startOfToday }
				}
			}),
			this.prismaService.user.aggregate({
				_count: true,
				where: { ...where, createdAt: { gte: startOfWeek } }
			})
		])

		return {
			today: todayCount._count || 0,
			yesterday: yesterdayCount._count || 0,
			week: weekCount._count || 0
		}
	}

	public async getDashboardStats() {
		const earnings = await this.getDashboardAggregates('payment', {
			status: PaymentStatus.SUCCESS
		})

		const items = await this.getDashboardAggregates('userItem', {
			status: ItemStatus.WITHDRAWN,
			isIssued: true
		})

		const registrations = await this.getDashboardAggregates('user', {})

		return { earnings, items, registrations }
	}

	public async getStatsRegistrations(from: Date, to: Date) {
		const nextDay = new Date(to)
		nextDay.setDate(nextDay.getDate() + 1)

		return this.prismaService.user.findMany({
			where: {
				createdAt: {
					gte: from,
					lt: nextDay
				}
			},
			select: {
				id: true,
				createdAt: true
			},
			orderBy: {
				createdAt: 'asc'
			}
		})
	}

	public async getStatsAllPurchasedItems(period: 'day' | 'week' | 'all') {
		let dateFrom: Date | undefined

		if (period === 'day') {
			const now = new Date()
			dateFrom = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() - 1
			)
		} else if (period === 'week') {
			const now = new Date()
			dateFrom = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() - 7
			)
		}

		// Группируем по itemId и суммируем количество
		const stats = await this.prismaService.userItem.groupBy({
			by: ['itemId'],
			_sum: { quantity: true },
			where: dateFrom ? { createdAt: { gte: dateFrom } } : undefined
		})

		// Берём все itemId, чтобы подтянуть данные об айтемах за один запрос
		const itemIds = stats.map(s => s.itemId)

		const items = await this.prismaService.item.findMany({
			where: { id: { in: itemIds } }
		})

		// Формируем итоговый результат
		return stats.map(stat => {
			const item = items.find(i => i.id === stat.itemId)
			return {
				itemId: stat.itemId,
				itemName: item?.name || 'Unknown',
				totalQuantity: stat._sum.quantity,
				game: item?.game || 'Unknown'
			}
		})
	}
}
