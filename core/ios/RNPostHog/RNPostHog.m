#import "RNPostHog.h"

#import <PostHog/PHGPostHog.h>
#import <React/RCTBridge.h>

@implementation RNPostHog

+(void)initialize {
    [super initialize];
}

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

static NSString* singletonJsonConfig = nil;

RCT_EXPORT_METHOD(
     setup:(NSDictionary*)options
          :(RCTPromiseResolveBlock)resolver
          :(RCTPromiseRejectBlock)rejecter
) {
    NSString* json = options[@"json"];

    if(singletonJsonConfig != nil) {
        if([json isEqualToString:singletonJsonConfig]) {
            return resolver(nil);
        }
        else {
            #if DEBUG
                return resolver(self);
            #else
                return rejecter(@"E_POSTHOG_RECONFIGURED", @"PostHog Client was allocated multiple times, please check your environment.", nil);
            #endif
        }
    }

    PHGPostHogConfiguration* config = [PHGPostHogConfiguration configurationWithApiKey:options[@"apiKey"] host:options[@"host"]];
    
    config.recordScreenViews = [options[@"recordScreenViews"] boolValue];
    config.captureApplicationLifecycleEvents = [options[@"captureApplicationLifecycleEvents"] boolValue];
    config.captureDeepLinks = [options[@"captureDeepLinks"] boolValue];
    config.flushAt = [options[@"flushAt"] integerValue];
    config.flushInterval = [options[@"flushInterval"] integerValue];

    config.enableAdvertisingCapturing = [options[@"ios"][@"enableAdvertisingCapturing"] boolValue];
    config.capturePushNotifications = [options[@"ios"][@"capturePushNotifications"] boolValue];
    config.captureInAppPurchases = [options[@"ios"][@"captureInAppPurchases"] boolValue];
    config.shouldUseBluetooth = [options[@"ios"][@"shouldUseBluetooth"] boolValue];
    config.shouldUseLocationServices = [options[@"ios"][@"shouldUseLocationServices"] boolValue];
    config.maxQueueSize = [options[@"ios"][@"maxQueueSize"] integerValue];

    config.libraryName = options[@"context"][@"$lib"];
    config.libraryVersion = options[@"context"][@"$lib_version"];

    [PHGPostHog debug:[options[@"debug"] boolValue]];

    @try {
        [PHGPostHog setupWithConfiguration:config];
    }
    @catch(NSError* error) {
        return rejecter(@"E_POSTHOG_ERROR", @"Unexpected native Analtyics error", error);
    }
    
    // On iOS we use method swizzling to intercept lifecycle events
    // However, React-Native calls our library after applicationDidFinishLaunchingWithOptions: is called
    // We fix this by manually calling this method at setup-time
    if(config.captureApplicationLifecycleEvents) {
        SEL selector = @selector(_applicationDidFinishLaunchingWithOptions:);
        
        if ([PHGPostHog.sharedPostHog respondsToSelector:selector]) {
            [PHGPostHog.sharedPostHog performSelector:selector
                                               withObject:_bridge.launchOptions];
        }
    }

    singletonJsonConfig = json;
    return resolver(nil);
}

- (NSDictionary*)withContextAndIntegrations :(NSDictionary*)context :(NSDictionary*)integrations {
    return @{ @"context": context, @"integrations": integrations ?: @{}};
}


RCT_EXPORT_METHOD(capture:(NSString*)event :(NSDictionary*)properties) {
    [PHGPostHog.sharedPostHog capture:event
                             properties:properties];
}

RCT_EXPORT_METHOD(screen:(NSString*)screenTitle :(NSDictionary*)properties) {
    [PHGPostHog.sharedPostHog screen:screenTitle
                              properties:properties];
}

RCT_EXPORT_METHOD(identify:(NSString*)distinctId :(NSDictionary*)properties) {
    [PHGPostHog.sharedPostHog identify:distinctId
                                    properties:properties];
}

RCT_EXPORT_METHOD(alias:(NSString*)alias) {
    [PHGPostHog.sharedPostHog alias:alias];
}

RCT_EXPORT_METHOD(reset) {
    [PHGPostHog.sharedPostHog reset];
}

RCT_EXPORT_METHOD(flush) {
    [PHGPostHog.sharedPostHog flush];
}

RCT_EXPORT_METHOD(enable) {
    [PHGPostHog.sharedPostHog enable];
}

RCT_EXPORT_METHOD(disable) {
    [PHGPostHog.sharedPostHog disable];
}

RCT_EXPORT_METHOD(
    getAnonymousId:(RCTPromiseResolveBlock)resolver
                  :(RCTPromiseRejectBlock)rejecter)
{
  NSString *anonymousId = [PHGPostHog.sharedPostHog getAnonymousId];
  resolver(anonymousId);
}

@end
