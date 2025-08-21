import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { createLogger, format, transports } from 'winston'
import 'winston-daily-rotate-file'

@Injectable()
export class LoggerService implements NestLoggerService {
	private logger

	constructor() {
		const logDir = path.join(__dirname, '..', '..', 'logs')

		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir)
		}

		const transport = new transports.DailyRotateFile({
			filename: path.join(logDir, 'logs-%DATE%.log'),
			datePattern: 'YYYY-MM-DD',
			zippedArchive: false,
			maxSize: '20m',
			maxFiles: '7d'
		})

		this.logger = createLogger({
			level: 'info',
			format: format.combine(
				format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
				format.printf(
					({ timestamp, level, message }) =>
						`[${timestamp}] [${level.toUpperCase()}] ${message}`
				)
			),
			transports: [transport, new transports.Console()]
		})
	}

	log(message: string) {
		this.logger.info(message)
	}

	error(message: string) {
		this.logger.error(message)
	}

	warn(message: string) {
		this.logger.warn(message)
	}

	debug(message: string) {
		this.logger.debug(message)
	}
}
