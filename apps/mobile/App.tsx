import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthenticatedScreen } from './src/features/auth/AuthenticatedScreen';
import {
  getGoogleAuthErrorMessage,
  signInWithGoogle,
  signOutFromGoogle,
} from './src/features/auth/googleAuth';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { SplashScreen } from './src/features/auth/SplashScreen';
import type { AuthProvider } from './src/features/auth/types';
import { useAuthSession } from './src/features/auth/useAuthSession';
import { usePushNotifications } from './src/features/notifications/usePushNotifications';

const SPLASH_DURATION_MS = 1_500;

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string>();
  const { isInitializing, user } = useAuthSession();
  const pushNotifications = usePushNotifications(user?.uid);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = async (provider: AuthProvider) => {
    if (provider === 'apple') {
      Alert.alert('Apple 로그인', 'iOS Firebase 설정과 함께 연결할게요.');
      return;
    }

    setIsSigningIn(true);
    setLoginError(undefined);

    try {
      await signInWithGoogle();
    } catch (error) {
      setLoginError(getGoogleAuthErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutFromGoogle();
    } catch (error) {
      Alert.alert('로그아웃 실패', getGoogleAuthErrorMessage(error));
    }
  };

  const shouldShowSplash = isSplashVisible || isInitializing;

  return (
    <SafeAreaProvider>
      {shouldShowSplash ? (
        <SplashScreen />
      ) : user ? (
        <AuthenticatedScreen
          onSignOut={handleSignOut}
          pushNotifications={pushNotifications}
          user={user}
        />
      ) : (
        <LoginScreen
          errorMessage={loginError}
          isLoading={isSigningIn}
          onContinue={handleContinue}
          provider={Platform.OS === 'ios' ? 'apple' : 'google'}
        />
      )}
    </SafeAreaProvider>
  );
}
