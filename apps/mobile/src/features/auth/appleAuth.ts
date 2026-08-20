import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppleAuthProvider,
  getAuth,
  revokeToken,
  signInWithCredential,
  signOut,
} from '@react-native-firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { updateDisplayName } from './profileData';

const APPLE_USER_STORAGE_KEY = '@chongchong/apple-user-id';
const APPLE_NAME_NORMALIZED_STORAGE_KEY_PREFIX =
  '@chongchong/apple-name-normalized';
const HANGUL_NAME_PATTERN = /^[가-힣]+$/u;
const TWO_SYLLABLE_KOREAN_FAMILY_NAMES = new Set([
  '남궁',
  '독고',
  '동방',
  '사공',
  '서문',
  '선우',
  '제갈',
  '황보',
]);

export async function signInWithApple(): Promise<void> {
  const rawNonce = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const response = await AppleAuthentication.signInAsync({
    nonce: hashedNonce,
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!response.identityToken) {
    throw new Error('Apple 계정 정보를 가져오지 못했어요.');
  }

  const credential = AppleAuthProvider.credential(
    response.identityToken,
    rawNonce,
    response.fullName ?? undefined,
  );
  const userCredential = await signInWithCredential(getAuth(), credential);
  await AsyncStorage.setItem(APPLE_USER_STORAGE_KEY, response.user);
  await syncKoreanAppleDisplayName(
    response.user,
    response.fullName,
    userCredential.user.displayName,
  );
}

export async function signOutFromApple(): Promise<void> {
  await signOut(getAuth());
}

export async function revokeAppleAuthorization(): Promise<void> {
  const storedUserId = await AsyncStorage.getItem(APPLE_USER_STORAGE_KEY);
  const response = storedUserId
    ? await AppleAuthentication.refreshAsync({ user: storedUserId })
    : await AppleAuthentication.signInAsync();

  if (!response.authorizationCode) {
    throw new Error('Apple 계정 연결을 해제하지 못했어요.');
  }

  await revokeToken(getAuth(), response.authorizationCode);
  await AsyncStorage.removeItem(APPLE_USER_STORAGE_KEY);
  if (storedUserId) {
    await AsyncStorage.removeItem(getAppleNameNormalizedStorageKey(storedUserId));
  }
}

export function getAppleAuthErrorMessage(error: unknown): string {
  if (hasErrorCode(error)) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return '로그인이 취소됐어요.';
    }

    if (error.code === 'auth/network-request-failed') {
      return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
    }

    if (error.code === 'auth/account-exists-with-different-credential') {
      return '같은 이메일로 가입한 다른 로그인 방식이 있어요.';
    }

    if (error.code === 'auth/missing-or-invalid-nonce') {
      return 'Apple 로그인 요청을 확인하지 못했어요. 다시 시도해 주세요.';
    }
  }

  return 'Apple로 로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

function hasErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  );
}

async function syncKoreanAppleDisplayName(
  appleUserId: string,
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
  currentDisplayName: string | null,
): Promise<void> {
  const storageKey = getAppleNameNormalizedStorageKey(appleUserId);
  const wasNormalized = await AsyncStorage.getItem(storageKey);
  if (wasNormalized) {
    return;
  }

  const normalizedDisplayName = resolveKoreanAppleDisplayName(
    fullName,
    currentDisplayName,
  );

  if (!normalizedDisplayName || normalizedDisplayName === currentDisplayName) {
    await AsyncStorage.setItem(storageKey, 'true');
    return;
  }

  try {
    await updateDisplayName(normalizedDisplayName);
    await AsyncStorage.setItem(storageKey, 'true');
  } catch (error) {
    console.warn('Apple 로그인 이름 순서를 정리하지 못했어요.', error);
  }
}

function resolveKoreanAppleDisplayName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
  currentDisplayName: string | null,
): string | null {
  const familyName = fullName?.familyName?.trim();
  const givenName = fullName?.givenName?.trim();

  if (
    familyName &&
    givenName &&
    HANGUL_NAME_PATTERN.test(familyName) &&
    HANGUL_NAME_PATTERN.test(givenName)
  ) {
    return `${familyName}${givenName}`;
  }

  const nameParts = currentDisplayName?.trim().split(/\s+/u) ?? [];
  if (nameParts.length !== 2) {
    return null;
  }

  const [givenNamePart, familyNamePart] = nameParts;
  if (
    !HANGUL_NAME_PATTERN.test(givenNamePart) ||
    !isKoreanFamilyName(familyNamePart)
  ) {
    return null;
  }

  return `${familyNamePart}${givenNamePart}`;
}

function isKoreanFamilyName(value: string): boolean {
  return (
    Array.from(value).length === 1 ||
    TWO_SYLLABLE_KOREAN_FAMILY_NAMES.has(value)
  );
}

function getAppleNameNormalizedStorageKey(appleUserId: string): string {
  return `${APPLE_NAME_NORMALIZED_STORAGE_KEY_PREFIX}:${appleUserId}`;
}
