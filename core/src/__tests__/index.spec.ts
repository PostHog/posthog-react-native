import posthog from '../index'
import { PostHog } from '../posthog'

jest.mock('../bridge')

it('exports an instance of PostHog.Client', () =>
	expect(posthog).toBeInstanceOf(PostHog.Client))
