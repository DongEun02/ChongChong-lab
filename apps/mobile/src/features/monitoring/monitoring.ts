import {
  getAnalytics,
  logEvent,
  logScreenView,
  setUserId as setAnalyticsUserId,
} from '@react-native-firebase/analytics';
import {
  getCrashlytics,
  log as logCrashlytics,
  recordError,
  setUserId as setCrashlyticsUserId,
} from '@react-native-firebase/crashlytics';

type EventParameters = Record<string, number | string>;

const analytics = getAnalytics();
const crashlytics = getCrashlytics();

export async function identifyMonitoringUser(userId?: string) {
  await Promise.all([
    setAnalyticsUserId(analytics, userId ?? null),
    setCrashlyticsUserId(crashlytics, userId ?? ''),
  ]);
}

export async function trackEvent(name: string, parameters?: EventParameters) {
  await logEvent(analytics, name, parameters);
}

export async function trackScreen(screenName: string) {
  await logScreenView(analytics, {
    screen_class: screenName,
    screen_name: screenName,
  });
}

export function reportError(error: unknown, context: string) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  logCrashlytics(crashlytics, context);
  recordError(crashlytics, normalizedError);
}
