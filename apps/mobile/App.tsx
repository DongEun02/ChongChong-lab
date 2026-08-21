import { useEffect, useState } from 'react';
import { Modal, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AlertModalProvider,
  useAlertModal,
} from './src/components/AlertModal';
import { AuthenticatedScreen } from './src/features/auth/AuthenticatedScreen';
import { deleteAccount, getAccountErrorMessage } from './src/features/auth/accountData';
import {
  getAppleAuthErrorMessage,
  revokeAppleAuthorization,
  signInWithApple,
  signOutFromApple,
} from './src/features/auth/appleAuth';
import {
  getGoogleAuthErrorMessage,
  signInWithGoogle,
  signOutFromGoogle,
} from './src/features/auth/googleAuth';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { updateDisplayName } from './src/features/auth/profileData';
import { SplashScreen } from './src/features/auth/SplashScreen';
import type { AuthProvider } from './src/features/auth/types';
import { useAuthSession } from './src/features/auth/useAuthSession';
import { usePushNotifications } from './src/features/notifications/usePushNotifications';
import {
  identifyMonitoringUser,
  reportError,
  trackEvent,
  trackScreen,
} from './src/features/monitoring/monitoring';
import { AppWebViewScreen } from './src/features/webview/AppWebViewScreen';

const SPLASH_DURATION_MS = 1_500;

export default function App() {
  return (
    <SafeAreaProvider>
      <AlertModalProvider>
        <AppContent />
      </AlertModalProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [shouldEnablePushAfterSignIn, setShouldEnablePushAfterSignIn] =
    useState(false);
  const [loginError, setLoginError] = useState<string>();
  const [profileOverride, setProfileOverride] = useState<{
    displayName: string;
    uid: string;
  }>();
  const { isInitializing, user } = useAuthSession();
  const pushNotifications = usePushNotifications(user?.uid);
  const { showAlert } = useAlertModal();

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    void identifyMonitoringUser(user?.uid).catch(() => undefined);
    void trackScreen(user ? 'study_list' : 'login').catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (
      !shouldEnablePushAfterSignIn ||
      !user ||
      pushNotifications.isBusy
    ) {
      return;
    }

    setShouldEnablePushAfterSignIn(false);

    void pushNotifications.enable().then((result) => {
      if (result === 'denied') {
        showAlert(
          '알림 권한이 필요해요',
          '공지와 과제 리마인드를 받으려면 마이페이지에서 알림을 허용해 주세요.',
        );
      }
    });
  }, [
    pushNotifications.enable,
    pushNotifications.isBusy,
    shouldEnablePushAfterSignIn,
    showAlert,
    user,
  ]);

  const handleContinue = async (provider: AuthProvider) => {
    setIsSigningIn(true);
    setLoginError(undefined);

    try {
      if (provider === 'apple') {
        await signInWithApple();
      } else {
        await signInWithGoogle();
      }
      void trackEvent('login_succeeded', { provider }).catch(() => undefined);
      setShouldEnablePushAfterSignIn(true);
    } catch (error) {
      void trackEvent('login_failed', { provider }).catch(() => undefined);
      setLoginError(
        provider === 'apple'
          ? getAppleAuthErrorMessage(error)
          : getGoogleAuthErrorMessage(error),
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (user?.providerData.some(({ providerId }) => providerId === 'apple.com')) {
        await signOutFromApple();
      } else {
        await signOutFromGoogle();
      }
      setShouldEnablePushAfterSignIn(false);
      setProfileOverride(undefined);
      setIsProfileVisible(false);
      void trackEvent('logout_succeeded').catch(() => undefined);
    } catch (error) {
      reportError(error, 'logout_failed');
      showAlert('로그아웃 실패', getGoogleAuthErrorMessage(error));
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const isAppleUser = user?.providerData.some(
        ({ providerId }) => providerId === 'apple.com',
      );
      if (isAppleUser) {
        await revokeAppleAuthorization();
      }
      await deleteAccount();
      if (isAppleUser) {
        await signOutFromApple();
      } else {
        await signOutFromGoogle();
      }
      setIsProfileVisible(false);
      void trackEvent('account_deleted').catch(() => undefined);
    } catch (error) {
      reportError(error, 'account_delete_failed');
      throw new Error(getAccountErrorMessage(error));
    }
  };

  const handleUpdateDisplayName = async (displayName: string) => {
    const nextDisplayName = await updateDisplayName(displayName);

    if (user) {
      setProfileOverride({ displayName: nextDisplayName, uid: user.uid });
    }

    void trackEvent('profile_name_updated').catch(() => undefined);

    return nextDisplayName;
  };

  const shouldShowSplash = isSplashVisible || isInitializing;
  const currentDisplayName =
    profileOverride && profileOverride.uid === user?.uid
      ? profileOverride.displayName
      : user?.displayName;

  return (
    <>
      {shouldShowSplash ? (
        <SplashScreen />
      ) : user ? (
        <>
          <AppWebViewScreen
            displayName={currentDisplayName}
            onOpenProfile={() => setIsProfileVisible(true)}
            user={user}
          />
          <Modal
            animationType="slide"
            onRequestClose={() => setIsProfileVisible(false)}
            presentationStyle="fullScreen"
            visible={isProfileVisible}
          >
            <SafeAreaProvider>
              <AuthenticatedScreen
                currentDisplayName={currentDisplayName}
                key={user.uid}
                onDeleteAccount={handleDeleteAccount}
                onClose={() => setIsProfileVisible(false)}
                onSignOut={handleSignOut}
                onUpdateDisplayName={handleUpdateDisplayName}
                pushNotifications={pushNotifications}
                user={user}
              />
            </SafeAreaProvider>
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
    </>
  );
}
