/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 Segment, Inc.
 *
 * Copyright (c) 2020 Hiberly Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

package com.posthog.reactnative.core

import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import com.facebook.react.bridge.*
import com.posthog.android.PostHog
import com.posthog.android.Options
import com.posthog.android.Properties
import com.posthog.android.Traits
import com.posthog.android.ValueMap
import com.posthog.android.internal.Utils.getPostHogSharedPreferences
import java.util.concurrent.TimeUnit
import com.facebook.react.bridge.ReadableMap



class RNPostHogModule(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
    override fun getName() = "RNPostHog"

    private val posthog
        get() = PostHog.with(reactApplicationContext)

    companion object {
        private var singletonJsonConfig: String? = null
        private var versionKey = "version"
        private var buildKey = "build"
    }

    private fun getPackageInfo(): PackageInfo {
        val packageManager = reactApplicationContext.packageManager
        try {
            return packageManager.getPackageInfo(reactApplicationContext.packageName, 0)
        } catch (e: PackageManager.NameNotFoundException) {
            throw AssertionError("Package not found: " + reactApplicationContext.packageName)
        }
    }

    /**
     * Tracks application lifecycle events - Application Installed, Application Updated and Application Opened
     * This is built to exactly mirror the application lifecycle captureing in posthog-android
     */
    private fun captureApplicationLifecycleEvents(apiKey: String?) {
        // Get the current version.
        var packageInfo = this.getPackageInfo()
        val currentVersion = packageInfo.versionName
        val currentBuild = packageInfo.versionCode

        // Get the previous recorded version.
        val sharedPreferences = getPostHogSharedPreferences(reactApplicationContext, apiKey)
        val previousVersion = sharedPreferences.getString(versionKey, null)
        val previousBuild = sharedPreferences.getInt(buildKey, -1)

        // Check and capture Application Installed or Application Updated.
        if (previousBuild == -1) {
            var installedProperties = Properties()
            installedProperties[versionKey] = currentVersion
            installedProperties[buildKey] = currentBuild
            posthog.capture("Application Installed", installedProperties)
        } else if (currentBuild != previousBuild) {
            var updatedProperties = Properties()
            updatedProperties[versionKey] = currentVersion
            updatedProperties[buildKey] = currentBuild
            updatedProperties["previous_$versionKey"] = previousVersion
            updatedProperties["previous_$buildKey"] = previousBuild
            posthog.capture("Application Updated", updatedProperties)
        }

        // Capture Application Opened.
        var appOpenedProperties = Properties()
        appOpenedProperties[versionKey] = currentVersion
        appOpenedProperties[buildKey] = currentBuild
        posthog.capture("Application Opened", appOpenedProperties)

        // Update the recorded version.
        val editor = sharedPreferences.edit()
        editor.putString(versionKey, currentVersion)
        editor.putInt(buildKey, currentBuild)
        editor.apply()
    }

    @ReactMethod
    fun setup(options: ReadableMap, promise: Promise) {
        val json = options.getString("json")
        val apiKey = options.getString("apiKey")

        if(singletonJsonConfig != null) {
            if(json == singletonJsonConfig) {
                return promise.resolve(null)
            }
            else {
                if (BuildConfig.DEBUG) {
                    return promise.resolve(null)
                }
                else {
                    return promise.reject("E_POSTHOG_RECONFIGURED", "PostHog Client was allocated multiple times, please check your environment.")
                }
            }
        }

        val builder = PostHog
                .Builder(reactApplicationContext, apiKey, options.getString("host"))

        if (options.hasKey("context")) {
            builder.defaultOptions(optionsFrom(options.getMap("context")))
        }

        if(options.getBoolean("recordScreenViews")) {
            builder.recordScreenViews()
        }

        if(options.getBoolean("captureDeepLinks")) {
            builder.captureDeepLinks()
        }

        if(options.hasKey("android")) {
            val androidMap = options.getMap("android")
            if (androidMap != null && androidMap.hasKey("collectDeviceId")) {
                builder.collectDeviceId(androidMap.getBoolean("collectDeviceId"))
            }
        }

        if(options.hasKey("flushInterval")) {
            builder.flushInterval(
                    options.getInt("flushInterval").toLong(),
                    TimeUnit.SECONDS
            )
        }

        if(options.hasKey("flushAt")) {
            builder.flushQueueSize(options.getInt("flushAt"))
        }

        if(options.getBoolean("debug")) {
            builder.logLevel(PostHog.LogLevel.VERBOSE)
        }

        if(options.getBoolean("captureApplicationLifecycleEvents")) {
            builder.captureApplicationLifecycleEvents()
        }

        try {
            PostHog.setSingletonInstance(builder.build())
        } catch(e2: IllegalStateException) {
            // pass if the error is due to calling setSingletonInstance multiple times

            // if you created singleton in native code already,
            // you need to promise.resolve for RN to properly operate
        } catch(e: Exception) {
            return promise.reject("E_POSTHOG_ERROR", e)
        }

        if(options.getBoolean("captureApplicationLifecycleEvents")) {
            this.captureApplicationLifecycleEvents(apiKey)
        }

        singletonJsonConfig = json
        promise.resolve(null)
    }

    @ReactMethod
    fun capture(event: String, properties: ReadableMap?) =
            posthog.capture(
                    event,
                    Properties() from properties
            )

    @ReactMethod
    fun screen(screen: String?, properties: ReadableMap?) =
            posthog.screen(
                    screen,
                    Properties() from properties
            )

    @ReactMethod
    fun identify(distinctId: String?, properties: ReadableMap?) =
            posthog.identify(
                    distinctId,
                    Properties() from properties,
                    null
            )

    @ReactMethod
    fun alias(alias: String) =
            posthog.alias(
                    alias
            )

    @ReactMethod
    fun reset() =
            posthog.reset()

    @ReactMethod()
    fun flush() =
            posthog.flush()

    @ReactMethod
    fun enable() =
            posthog.optOut(false)

    @ReactMethod
    fun disable() =
            posthog.optOut(true)

    @ReactMethod
    fun getAnonymousId(promise: Promise) =
            promise.resolve(posthog.getAnonymousId())
}

private fun optionsFrom(context: ReadableMap?): Options {
    var options = Options()

    context?.toHashMap()?.forEach { (key, value) ->
        options.putContext(key, value)
    }

    return options
}

private infix fun<T: ValueMap> T.from(source: ReadableMap?): T {
    if (source != null) {
        putAll(source.toHashMap())
    }

    return this
}
