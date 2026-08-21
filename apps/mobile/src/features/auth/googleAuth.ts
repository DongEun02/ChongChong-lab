import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from 'react-native-nitro-google-signin';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from '@react-native-firebase/auth';

let isConfigured = false;

class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'GoogleSignInCancelledError';
  }
}

function configureGoogleAuth() {
  if (isConfigured) {
    return;
  }

  GoogleOneTapSignIn.configure({
    webClientId: 'autoDetect',
    autoSelectOnSignIn: false,
  });
  isConfigured = true;
}

export async function signInWithGoogle(): Promise<void> {
  configureGoogleAuth();
  await GoogleOneTapSignIn.checkPlayServices();

  const response = await GoogleOneTapSignIn.presentExplicitSignIn();

  if (isCancelledResponse(response)) {
    throw new GoogleSignInCancelledError();
  }

  if (!isSuccessResponse(response)) {
    throw new Error('Google 계정 정보를 가져오지 못했어요.');
  }

  const credential = GoogleAuthProvider.credential(response.data.idToken);
  await signInWithCredential(getAuth(), credential);
}

export async function signOutFromGoogle(): Promise<void> {
  await Promise.all([GoogleOneTapSignIn.signOut(), signOut(getAuth())]);
}

export function getGoogleAuthErrorMessage(error: unknown): string {
  if (error instanceof GoogleSignInCancelledError) {
    return '로그인이 취소됐어요.';
  }

  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return '로그인이 취소됐어요.';
    }

    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play 서비스를 업데이트한 뒤 다시 시도해 주세요.';
    }

    if (error.code === statusCodes.IN_PROGRESS) {
      return '이미 로그인을 진행 중이에요.';
    }

    if (error.code === statusCodes.DEVELOPER_ERROR) {
      return 'Google 로그인 설정을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.';
    }
  }

  if (hasErrorCode(error)) {
    if (error.code === 'auth/network-request-failed') {
      return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
    }

    if (error.code === 'auth/account-exists-with-different-credential') {
      return '같은 이메일로 가입한 다른 로그인 방식이 있어요.';
    }
  }

  return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

function hasErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  );
}
