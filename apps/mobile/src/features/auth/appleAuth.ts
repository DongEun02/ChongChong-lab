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

const APPLE_USER_STORAGE_KEY = '@chongchong/apple-user-id';

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
  await signInWithCredential(getAuth(), credential);
  await AsyncStorage.setItem(APPLE_USER_STORAGE_KEY, response.user);
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
