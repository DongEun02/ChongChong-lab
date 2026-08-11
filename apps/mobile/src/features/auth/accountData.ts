import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

export async function deleteAccount() {
  const callable = httpsCallable<Record<string, never>, { deleted: boolean }>(
    getFunctions(undefined, 'us-central1'),
    'deleteAccount',
  );
  return (await callable({})).data;
}

export function getAccountErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message.replace(/^\[[^\]]+\]\s*/, '');
    }
  }
  return '잠시 후 다시 시도해 주세요.';
}
