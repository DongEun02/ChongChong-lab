import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoginScreen } from './src/features/auth/LoginScreen';
import { SplashScreen } from './src/features/auth/SplashScreen';
import type { AuthProvider } from './src/features/auth/types';

const SPLASH_DURATION_MS = 1_500;

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = (provider: AuthProvider) => {
    const providerName = provider === 'apple' ? 'Apple' : 'Google';

    Alert.alert(
      `${providerName} 로그인`,
      'Firebase 인증 설정을 연결한 다음 PR에서 로그인을 활성화할게요.',
    );
  };

  return (
    <SafeAreaProvider>
      {isSplashVisible ? (
        <SplashScreen />
      ) : (
        <LoginScreen
          onContinue={handleContinue}
          provider={Platform.OS === 'ios' ? 'apple' : 'google'}
        />
      )}
    </SafeAreaProvider>
  );
}
