import { Context, Options, JsonMap } from './bridge'
import { assertNever } from './utils'
import { NativeWrapper } from './wrapper'

export interface MiddlewarePayload<T extends string, D extends {}> {
	type: T
	data: D
	context: Context
	next(context?: Partial<Context>): void
	// tslint:disable-next-line:unified-signatures
	next(context?: Partial<Context>, data?: D): void
}

export interface CapturePayload
	extends MiddlewarePayload<
		'capture',
		{
			event: string
			properties: JsonMap
		}
	> {}

export interface ScreenPayload
	extends MiddlewarePayload<
		'screen',
		{
			screen: string
			properties: JsonMap
		}
	> {}

export interface IdentifyPayload
	extends MiddlewarePayload<
		'identify',
		{
			distinctId: string | null
			properties: JsonMap
		}
	> {}

export interface AliasPayload
	extends MiddlewarePayload<
		'alias',
		{
			alias: string
		}
	> {}

export type Payload = CapturePayload | IdentifyPayload | ScreenPayload | AliasPayload

export type Middleware = (payload: Payload) => void | Promise<void>
export type PayloadFromType<T> = Extract<Payload, { type: T }>

export class MiddlewareChain {
	private readonly middlewares: Middleware[] = []

	constructor(private readonly wrapper: NativeWrapper<any>) {}

	public add(middleware: Middleware) {
		this.middlewares.push(middleware)
	}

	public async run<T extends Payload['type'], P extends PayloadFromType<T>>(type: T, data: P['data']) {
		const payload: Payload = await this.exec(type, data)

		switch (payload.type) {
			case 'alias':
				return this.wrapper.run('alias', alias => alias(payload.data.alias))
			case 'identify':
				return this.wrapper.run('identify', identify => identify(payload.data.distinctId, payload.data.properties))
			case 'screen':
				return this.wrapper.run('screen', screen => screen(payload.data.screen, payload.data.properties))
			case 'capture':
				return this.wrapper.run('capture', capture => capture(payload.data.event, payload.data.properties))
			default:
				return assertNever(payload)
		}
	}

	private async exec<T extends Payload['type'], P extends PayloadFromType<T>>(
		type: T,
		data: P['data'],
		index = 0
	): Promise<P> {
		const { middlewares } = this
		const middleware = middlewares[index]
		const ctx = {}

		if (index >= middlewares.length || !middleware) {
			return makePayload(type, data)
		}

		let called = false

		return new Promise<P>((resolve, reject) =>
			Promise.resolve(
				middleware.call(
					middleware,
					makePayload(type, data, (nextProps = data) => {
						if (called) {
							throw new Error('middleware.payload.next() can only be called one time')
						}

						called = true
						this.exec(type, nextProps, index + 1)
							.then(resolve)
							.catch(reject)
					})
				)
			).catch(reject)
		)
	}
}

const notImplemented = (name: string) => () => {
	throw new Error(`.${name}() not implemented`)
}

const makePayload = <T extends Payload['type'], P extends PayloadFromType<T>>(
	type: T,
	data: P['data'],
	next: (data?: P['data']) => void = notImplemented('next')
) =>
	({
		data,
		next,
		type
	} as P)
