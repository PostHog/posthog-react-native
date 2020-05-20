import { Configuration } from './bridge'
import { PostHog } from './posthog'

const defaults = {
	android: ({ collectDeviceId = true }: Partial<Configuration['android']>) => ({
		collectDeviceId
	}),
	ios: ({
		enableAdvertisingCapturing = true,
		capturePushNotifications = false,
		captureInAppPurchases = false,
		shouldUseBluetooth = false,
		shouldUseLocationServices = false,
		maxQueueSize = 1000
	}: Partial<Configuration['ios']>) => ({
		captureInAppPurchases,
		capturePushNotifications,
		enableAdvertisingCapturing,
		maxQueueSize,
		shouldUseBluetooth,
		shouldUseLocationServices
	})
}

export const configure = async (
	apiKey: string,
	{
		flushAt = 20,
		flushInterval = 30,
		debug = false,
		recordScreenViews = false,
		captureApplicationLifecycleEvents = false,
		captureDeepLinks = false,
		host = 'https://app.posthog.com',
		ios = {},
		android = {}
	}: PostHog.Configuration
): Promise<Configuration> => {
	const config = {
		apiKey,
		captureApplicationLifecycleEvents,
		captureDeepLinks,
		debug,
		flushAt,
		flushInterval,
		host,
		recordScreenViews,

		context: {
			$lib: 'posthog-react-native',
			$lib_version: require('../package.json').version
		},

		android: defaults.android(android),
		ios: defaults.ios(ios)
	}
	const json = JSON.stringify(config)

	return {
		...config,
		json
	}
}
