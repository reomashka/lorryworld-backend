import { ItemStatus, PaymentStatus } from '@prisma/__generated__'

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
		const prismaModel =
			model === 'payment'
				? this.prismaService.payment
				: this.prismaService.userItem

		const { startOfToday, startOfYesterday, startOfWeek } =
			this.getEarningsDateRanges()

		const [today, yesterday, week] = await Promise.all([
			prismaModel.aggregate({
				_sum: { amount: true },
				where: {
					...where,
					createdAt: { gte: startOfToday }
				}
			}),
			prismaModel.aggregate({
				_sum: { amount: true },
				where: {
					...where,
					createdAt: {
						gte: startOfYesterday,
						lt: startOfToday
					}
				}
			}),
			prismaModel.aggregate({
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
