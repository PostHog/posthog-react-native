require 'json'
package = JSON.parse(File.read('./package.json'))

Pod::Spec.new do |s|
  s.name                = 'RNPostHog'
  s.version             = package['version']
  s.summary             = package['description']
  s.description         = "PostHog for iOS"
  s.homepage            = 'http://posthog.com/'
  s.social_media_url    = 'https://twitter.com/posthoghq'
  s.license             = { :type => 'MIT' }
  s.author              = { 'PostHog' => 'hey@posthog.com' }
  s.source              = { :git => 'https://github.com/PostHog/posthog-react-native.git', :tag => s.version.to_s }

  s.platform            = :ios, '9.0'
  s.source_files        = 'ios/**/*.{m,h}'
  s.static_framework    = true

  s.dependency          'PostHog', '~> 1.2.3'
  s.dependency          'React'
end
