// Встроенные и внешние модули
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import RedisStore from 'connect-redis'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as session from 'express-session'
import IORedis from 'ioredis'
import { join } from 'path'

// Локальные импорты
import { AppModule } from './app.module'
import { ms, StringValue } from './libs/common/utils/ms.util'
import { parseBoolean } from './libs/common/utils/parse-boolean.util'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	const config = app.get(ConfigService)
	const redis = new IORedis(config.getOrThrow<string>('REDIS_URI'))

	// Swagger
	const configSwagger = new DocumentBuilder().setTitle('LW Server').build()
	const documentFactory = () =>
		SwaggerModule.createDocument(app, configSwagger)
	SwaggerModule.setup('api', app, documentFactory)

	app.use(cookieParser(config.getOrThrow<string>('COOKIES_SECRET')))

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true
		})
	)

	app.enableCors({
		origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
		credentials: true,
		exposedHeaders: ['set-cookie']
	})

	app.use(
		session({
			secret: config.getOrThrow<string>('SESSION_SECRET'),
			name: config.getOrThrow<string>('SESSION_NAME'),
			resave: true,
			saveUninitialized: false,
			cookie: {
				// domain: config.getOrThrow<string>('SESSION_DOMAIN'),
				maxAge: ms(config.getOrThrow<StringValue>('SESSION_MAX_AGE')),
				httpOnly: parseBoolean(
					config.getOrThrow<string>('SESSION_HTTP_ONLY')
				),
				secure: parseBoolean(
					config.getOrThrow<string>('SESSION_SECURE')
				),
				sameSite: 'lax'
			},
			store: new RedisStore({
				client: redis,
				prefix: config.getOrThrow<string>('SESSION_FOLDER')
			})
		})
	)
	app.setGlobalPrefix('api')
	app.use('/uploads', express.static(join(__dirname, '..', 'uploads')))

	await app.listen(config.getOrThrow<number>('APPLICATION_PORT'))
}
bootstrap()
