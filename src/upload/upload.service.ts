import { Injectable } from '@nestjs/common'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

import { writeFile } from 'fs/promises'

@Injectable()
export class UploadService {
	public async saveImage(file: Express.Multer.File): Promise<string> {
		const uploadDir = join(__dirname, '../../uploads')

		if (!existsSync(uploadDir)) {
			mkdirSync(uploadDir, { recursive: true })
		}

		const filePath = join(uploadDir, file.originalname)
		await writeFile(filePath, file.buffer)
		return `/uploads/${file.originalname}`
	}
}
