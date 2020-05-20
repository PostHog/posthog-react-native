import mockConsole, { RestoreConsole } from 'jest-mock-console'

import { PostHog } from '../posthog'
import Bridge from '../bridge'

jest.mock('../bridge')

const nextTick = () => new Promise(resolve => setImmediate(resolve))
const getBridgeStub = <K extends keyof typeof Bridge>(name: K): jest.Mock<(typeof Bridge)[K]> => (Bridge as any)[name]
let posthog: PostHog.Client = null!
let restoreConsole: RestoreConsole = null!

beforeEach(async () => {
	restoreConsole = mockConsole()
	posthog = new PostHog.Client()
	Object.keys(Bridge).forEach(key => getBridgeStub(key as any).mockClear())

	await posthog.setup('api key')
})

afterEach(() => {
	restoreConsole()
})

it('is ready', () => expect(posthog.ready).toBe(true))

it('catches bridge errors', async () => {
	const error = new Error('test-error')
	const onError = jest.fn()

	getBridgeStub('capture').mockImplementationOnce(() => Promise.reject(error) as any)
	posthog.catch(onError)
	posthog.capture('test')

	expect(onError).not.toHaveBeenCalled()
	await new Promise(resolve => setImmediate(resolve))
	expect(onError).toHaveBeenCalledWith(error)
})

it('waits for .setup()', async () => {
	const client = new PostHog.Client()

	client.capture('test 1')
	client.capture('test 2')

	expect(Bridge.capture).not.toHaveBeenCalled()
	await client.setup('key')

	expect(Bridge.capture).toHaveBeenNthCalledWith(1, 'test 1')
	expect(Bridge.capture).toHaveBeenNthCalledWith(2, 'test 2')
})

it('does .capture()', () => testCall('capture')('Added to cart', { productId: 'azertyuiop' }))

it('does .screen()', () => testCall('screen')('Shopping cart', { from: 'Product page' }))

it('does .identify()', () => testCall('identify')('sloth', { eats: 'leaves' }))

it('does .alias()', () => testCall('alias')('new alias'))

it('does .reset()', testCall('reset'))
it('does .flush()', testCall('flush'))
it('does .enable()', testCall('enable'))
it('does .disable()', testCall('disable'))

it('does .getAnonymousId()', testCall('getAnonymousId'))

it('logs uncaught bridge errors', async () => {
	const error = {
		message: 'test-error'
	}

	getBridgeStub('capture').mockImplementationOnce(() => Promise.reject(error) as any)

	expect(posthog.capture('test')).rejects.toBe(error)
	expect(console.error).not.toHaveBeenCalled()
	await nextTick()
	expect(console.error).toHaveBeenCalledWith('Uncaught PostHog error', error)
})

function testCall<K extends keyof typeof Bridge>(name: K) {
	return (async (...args: any[]) => {
		posthog.constructor.prototype[name].call(posthog, ...args)
		await nextTick()
		expect(Bridge[name]).toHaveBeenNthCalledWith(1, ...args)
	}) as (typeof Bridge)[K]
}

it('enables setting integrations from the middleware', async () => {
	const integrations = {
		'Google PostHog': false,
		Mixpanel: { foo: 'bar' }
	}

	posthog.middleware(async ({ next, context, data }) =>
		// @ts-ignore ts is expecting newId for some reasons
		next(context, { ...data, integrations })
	)

	const captureSpy = jest.fn()
	getBridgeStub('capture').mockImplementationOnce(captureSpy)
	posthog.capture('test')
	await nextTick()

	expect(captureSpy).toBeCalledWith('test')
})
