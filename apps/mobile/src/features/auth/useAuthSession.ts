import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import type { User } from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';

export function useAuthSession() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(() => getAuth().currentUser);

  useEffect(
    () =>
      onAuthStateChanged(getAuth(), (nextUser) => {
        setUser(nextUser);
        setIsInitializing(false);
      }),
    [],
  );

  return { isInitializing, user };
}
