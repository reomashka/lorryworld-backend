import { Injectable, NotFoundException } from '@nestjs/common'
import { AuthMethod, User } from '@prisma/__generated__'
import { hash } from 'argon2'

import { PrismaService } from '@/prisma/prisma.service'

import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UserService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async findById(id: string) {
		const user = await this.prismaService.user.findUnique({
			where: {
				id
			}
		})

		if (!user) {
			throw new NotFoundException(
				'Пользователь не найден. Пожалуйста, проверьте введенные данные.'
			)
		}

		return user
	}

	public async findByEmail(email: string) {
		return this.prismaService.user.findUnique({
			where: {
				email
			}
		})
	}

	public async findByDisplayName(displayName: string) {
		return this.prismaService.user.findUnique({ where: { displayName } })
	}

	async findByEmailOrDisplayName(identifier: string) {
		return this.prismaService.user.findFirst({
			where: {
				OR: [{ email: identifier }, { displayName: identifier }]
			}
		})
	}

	public async create(
		email: string,
		password: string,
		displayName: string,
		picture: string,
		method: AuthMethod,
		isVerified: boolean
	) {
		const user = await this.prismaService.user.create({
			data: {
				email,
				password: password ? await hash(password) : '',
				displayName,
				method,
				isVerified
			}
		})

		return user
	}

	public async update(userId: string, dto: UpdateUserDto) {
		const user = await this.findById(userId)

		const dataToUpdate: any = {}

		if (dto.email !== undefined) dataToUpdate.email = dto.email
		if (dto.name !== undefined) dataToUpdate.displayName = dto.name
		if (dto.mediaContact !== undefined)
			dataToUpdate.mediaContact = dto.mediaContact
		if (dto.contact !== undefined) dataToUpdate.contact = dto.contact

		const updatedUser = await this.prismaService.user.update({
			where: {
				id: user.id
			},
			data: dataToUpdate
		})

		return updatedUser
	}
}
