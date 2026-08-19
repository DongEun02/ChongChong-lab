import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteDoc,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import {
  deleteToken,
  getMessaging,
  getToken,
  registerDeviceForRemoteMessages,
  unregisterDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const GENERAL_CHANNEL_ID = 'general';
const STORAGE_KEY_PREFIX = '@chongchong/push-notifications/';

type StoredPushPreferences = {
  enabled: true;
  tokenDocumentId: string;
};

export type PushSyncResult = 'disabled' | 'enabled' | 'denied';

export async function enablePushNotifications(
  userId: string,
): Promise<Exclude<PushSyncResult, 'disabled'>> {
  await ensureNotificationChannel();

  const currentPermission = await Notifications.getPermissionsAsync();
  const permission = hasNotificationPermission(currentPermission)
    ? currentPermission
    : await Notifications.requestPermissionsAsync();

  if (!hasNotificationPermission(permission)) {
    return 'denied';
  }

  const token = await getFcmToken();
  await persistPushToken(userId, token);

  return 'enabled';
}

export async function syncPushNotifications(
  userId: string,
): Promise<PushSyncResult> {
  const preferences = await readPreferences(userId);
  if (!preferences?.enabled) {
    return 'disabled';
  }

  await ensureNotificationChannel();
  const permission = await Notifications.getPermissionsAsync();

  if (!hasNotificationPermission(permission)) {
    await removeStoredToken(userId, preferences.tokenDocumentId);
    await AsyncStorage.removeItem(getStorageKey(userId));
    return 'denied';
  }

  const token = await getFcmToken();
  await persistPushToken(userId, token);

  return 'enabled';
}

export async function disablePushNotifications(userId: string): Promise<void> {
  const preferences = await readPreferences(userId);
  if (preferences) {
    await removeStoredToken(userId, preferences.tokenDocumentId);
  }

  const messaging = getMessaging();
  await deleteToken(messaging);

  if (Platform.OS === 'ios') {
    await unregisterDeviceForRemoteMessages(messaging);
  }

  await AsyncStorage.removeItem(getStorageKey(userId));
}

export async function persistPushToken(
  userId: string,
  token: string,
): Promise<void> {
  const tokenDocumentId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    token,
  );
  const previousPreferences = await readPreferences(userId);
  const tokenReference = doc(
    getFirestore(),
    'users',
    userId,
    'pushTokens',
    tokenDocumentId,
  );

  await setDoc(
    tokenReference,
    {
      enabled: true,
      platform: Platform.OS,
      provider: 'fcm',
      token,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (
    previousPreferences &&
    previousPreferences.tokenDocumentId !== tokenDocumentId
  ) {
    await removeStoredToken(userId, previousPreferences.tokenDocumentId);
  }

  await AsyncStorage.setItem(
    getStorageKey(userId),
    JSON.stringify({ enabled: true, tokenDocumentId }),
  );
}

async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(GENERAL_CHANNEL_ID, {
    name: '공지 및 리마인드',
    description: '스터디 공지와 마감 리마인드를 알려드려요.',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#00C471',
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function getFcmToken(): Promise<string> {
  const messaging = getMessaging();
  await registerDeviceForRemoteMessages(messaging);
  return getToken(messaging);
}

function hasNotificationPermission(
  permission: Notifications.NotificationPermissionsStatus,
): boolean {
  if (Platform.OS !== 'ios') {
    return permission.granted;
  }

  const iosStatus = permission.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

async function removeStoredToken(
  userId: string,
  tokenDocumentId: string,
): Promise<void> {
  await deleteDoc(
    doc(
      getFirestore(),
      'users',
      userId,
      'pushTokens',
      tokenDocumentId,
    ),
  );
}

async function readPreferences(
  userId: string,
): Promise<StoredPushPreferences | null> {
  const storedValue = await AsyncStorage.getItem(getStorageKey(userId));
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    return isStoredPushPreferences(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function isStoredPushPreferences(
  value: unknown,
): value is StoredPushPreferences {
  return (
    typeof value === 'object' &&
    value !== null &&
    'enabled' in value &&
    value.enabled === true &&
    'tokenDocumentId' in value &&
    typeof value.tokenDocumentId === 'string'
  );
}

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}
