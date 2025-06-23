import { Request } from 'express'
import 'express-session'

declare module 'express-session' {
	interface SessionData {
		userId?: string
	}
}

declare module 'express-serve-static-core' {
	interface Request {
		session: SessionData
	}
}
