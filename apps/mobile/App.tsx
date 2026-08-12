import { useEffect, useState } from 'react';
import { Alert, Modal, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthenticatedScreen } from './src/features/auth/AuthenticatedScreen';
import { deleteAccount, getAccountErrorMessage } from './src/features/auth/accountData';
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
import { AppWebViewScreen } from './src/features/webview/AppWebViewScreen';

const SPLASH_DURATION_MS = 1_500;

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [shouldEnablePushAfterSignIn, setShouldEnablePushAfterSignIn] =
    useState(false);
  const [loginError, setLoginError] = useState<string>();
  const { isInitializing, user } = useAuthSession();
  const pushNotifications = usePushNotifications(user?.uid);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      Platform.OS !== 'android' ||
      !shouldEnablePushAfterSignIn ||
      !user ||
      pushNotifications.isBusy
    ) {
      return;
    }

    setShouldEnablePushAfterSignIn(false);

    void pushNotifications.enable().then((result) => {
      if (result === 'denied') {
        Alert.alert(
          '알림 권한이 필요해요',
          '공지와 과제 리마인드를 받으려면 마이페이지에서 알림을 허용해 주세요.',
        );
      }
    });
  }, [
    pushNotifications.enable,
    pushNotifications.isBusy,
    shouldEnablePushAfterSignIn,
    user,
  ]);

  const handleContinue = async (provider: AuthProvider) => {
    if (provider === 'apple') {
      Alert.alert('Apple 로그인', 'iOS Firebase 설정과 함께 연결할게요.');
      return;
    }

    setIsSigningIn(true);
    setLoginError(undefined);

    try {
      await signInWithGoogle();
      setShouldEnablePushAfterSignIn(true);
    } catch (error) {
      setLoginError(getGoogleAuthErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutFromGoogle();
      setShouldEnablePushAfterSignIn(false);
      setIsProfileVisible(false);
    } catch (error) {
      Alert.alert('로그아웃 실패', getGoogleAuthErrorMessage(error));
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      await signOutFromGoogle();
      setIsProfileVisible(false);
    } catch (error) {
      throw new Error(getAccountErrorMessage(error));
    }
  };

  const shouldShowSplash = isSplashVisible || isInitializing;

  return (
    <SafeAreaProvider>
      {shouldShowSplash ? (
        <SplashScreen />
      ) : user ? (
        <>
          <AppWebViewScreen
            onOpenProfile={() => setIsProfileVisible(true)}
            user={user}
          />
          <Modal
            animationType="slide"
            onRequestClose={() => setIsProfileVisible(false)}
            presentationStyle="fullScreen"
            visible={isProfileVisible}
          >
            <AuthenticatedScreen
              onDeleteAccount={handleDeleteAccount}
              onClose={() => setIsProfileVisible(false)}
              onSignOut={handleSignOut}
              pushNotifications={pushNotifications}
              user={user}
            />
          </Modal>
        </>
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
