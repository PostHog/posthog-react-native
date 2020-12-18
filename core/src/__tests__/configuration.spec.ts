import { configure } from '../configuration'

const apiKey = 'test-api-key'

function withIntegrity<T extends {}>(config: T): T & { json: string } {
	const json = JSON.stringify(config)

	return {
		...(config as any),
		json
	}
}

it('uses the default configuration', async () => {
	expect(await configure(apiKey, {})).toEqual(
		withIntegrity({
			apiKey,
			captureApplicationLifecycleEvents: false,
			captureDeepLinks: false,
			debug: false,
			flushAt: 20,
			flushInterval: 30,
			host: 'https://app.posthog.com',
			recordScreenViews: false,

			android: {
				collectDeviceId: true
			},
			ios: {
				captureInAppPurchases: false,
				capturePushNotifications: false,
				maxQueueSize: 1000,
				shouldUseBluetooth: false,
				shouldUseLocationServices: false
			}
		})
	)
})

it('produces a valid configuration', async () => {
	const config = await configure(apiKey, {
		captureApplicationLifecycleEvents: true,
		debug: true,
		flushAt: 42,
		flushInterval: 72,
		recordScreenViews: true,

		android: {
			collectDeviceId: false
		},
		ios: {
			capturePushNotifications: true
		}
	})

	expect(config).toEqual(
		withIntegrity({
			apiKey,
			captureApplicationLifecycleEvents: true,
			captureDeepLinks: false,
			debug: true,
			flushAt: 42,
			flushInterval: 72,
			host: 'https://app.posthog.com',
			recordScreenViews: true,

			android: {
				collectDeviceId: false
			},
			ios: {
				captureInAppPurchases: false,
				capturePushNotifications: true,
				maxQueueSize: 1000,
				shouldUseBluetooth: false,
				shouldUseLocationServices: false
			}
		})
	)
})
