const forceRequire = (): typeof import('../bridge') => {
	jest.resetModules()

	return require.requireActual('../bridge')
}

it('should throw an error if the core native module is not linked', () => {
	jest.setMock('react-native', {
		NativeModules: {}
	})

	expect(forceRequire).toThrow(/Failed to load PostHog native module./)
})

it('should export the core native module', () => {
	const RNPostHog = {}

	jest.setMock('react-native', {
		NativeModules: { RNPostHog }
	})

	expect(forceRequire().default).toBe(RNPostHog)
})
