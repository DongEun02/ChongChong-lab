import { getAuth, updateProfile as updateFirebaseProfile } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

export async function updateDisplayName(displayName: string) {
  const callable = httpsCallable<
    { displayName: string },
    { displayName: string }
  >(getFunctions(undefined, 'us-central1'), 'updateProfile');
  const response = await callable({ displayName });
  const user = getAuth().currentUser;

  if (user) {
    await updateFirebaseProfile(user, {
      displayName: response.data.displayName,
    });
  }

  return response.data.displayName;
}
