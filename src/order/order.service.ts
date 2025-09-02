import { BadRequestException, Injectable } from '@nestjs/common'
import { ItemStatus, Prisma } from '@prisma/__generated__'
import { PrismaClient } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class OrderService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async getNotIssued() {
		return this.prismaService.order.findMany({
			where: {
				isIssued: false
			},
			orderBy: {
				createdAt: 'desc'
			},
			include: {
				user: true,
				items: {
					include: {
						item: true
					}
				}
			}
		})
	}

	public async updateIssuedStatus(updates: { orderId: number }[]) {
		const ids = updates.map(u => u.orderId)

		await this.prismaService.$transaction(async prisma => {
			await prisma.userItem.updateMany({
				where: {
					status: ItemStatus.WITHDRAWN,
					isIssued: false,
					orderId: { in: ids }
				},
				data: {
					isIssued: true
				}
			})

			await prisma.order.updateMany({
				where: {
					id: { in: ids }
				},
				data: {
					isIssued: true,
					orderNumber: 0
				}
			})
		})
	}

	private async generateOrderNumber(prisma: Prisma.TransactionClient) {
		const usedNumbers = await prisma.order.findMany({
			select: { orderNumber: true },
			orderBy: { createdAt: 'desc' },
			take: 999
		})

		const usedSet = new Set(usedNumbers.map(o => o.orderNumber))
		for (let i = 1; i <= 999; i++) {
			if (!usedSet.has(i)) return i
		}

		throw new BadRequestException('All order numbers are currently in use')
	}

	public async createOrder(userId: string, prisma: Prisma.TransactionClient) {
		const orderNumber = await this.generateOrderNumber(prisma)

		return prisma.order.create({
			data: {
				userId,
				isIssued: false,
				orderNumber
			}
		})
	}

	public async getActiveOrders(userId: string) {
		return await this.prismaService.order.findMany({
			where: {
				userId,
				isIssued: false
			},
			orderBy: {
				createdAt: 'asc'
			},
			include: {
				items: {
					include: {
						item: true
					}
				}
			}
		})
	}
}
