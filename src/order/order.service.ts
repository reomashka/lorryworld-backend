import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class OrderService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async getNotIssued() {
		return this.prismaService.order.findMany({
			where: {
				isIssued: false
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

	public async updateIssuedStatus(orderId: number) {
		return this.prismaService.order.updateMany({
			where: { id: orderId },
			data: { isIssued: true }
		})
	}
}
