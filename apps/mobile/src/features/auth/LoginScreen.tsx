import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '../legal/legalLinks';
import type { AuthProvider } from './types';

type LoginScreenProps = {
  provider: AuthProvider;
  onContinue: (provider: AuthProvider) => void;
  isLoading?: boolean;
  errorMessage?: string;
};

const providerContent = {
  apple: {
    label: 'Apple로 계속하기',
  },
  google: {
    label: 'Google로 계속하기',
  },
} as const;

export function LoginScreen({
  provider,
  onContinue,
  isLoading = false,
  errorMessage,
}: LoginScreenProps) {
  const content = providerContent[provider];
  const isApple = provider === 'apple';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.hero}>
        <Image
          accessibilityIgnoresInvertColors
          contentFit="contain"
          source={require('../../../assets/auth/login-mascot.png')}
          style={styles.mascot}
        />
        <Text style={styles.title}>총총에 오신 걸 환영해요</Text>
        <Text style={styles.description}>
          번거로운 스터디 운영, 이제 총총에게 맡기세요
        </Text>
      </View>

      <View style={styles.footer}>
        {isApple ? (
          <View
            accessibilityState={{ busy: isLoading, disabled: isLoading }}
            pointerEvents={isLoading ? 'none' : 'auto'}
            style={[
              styles.appleButtonContainer,
              isLoading && styles.disabledButton,
            ]}
          >
            <AppleAuthentication.AppleAuthenticationButton
              accessibilityHint="Apple로 계속하기 로그인을 시작합니다"
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
              }
              cornerRadius={12}
              onPress={() => onContinue(provider)}
              style={styles.appleNativeButton}
            />
            {isLoading ? (
              <View pointerEvents="none" style={styles.appleLoadingOverlay}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.appleLoadingLabel}>로그인 중...</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable
            accessibilityHint={`${content.label} 로그인을 시작합니다`}
            accessibilityRole="button"
            accessibilityState={{ busy: isLoading, disabled: isLoading }}
            disabled={isLoading}
            onPress={() => onContinue(provider)}
            style={({ pressed }) => [
              styles.loginButton,
              styles.googleButton,
              pressed && styles.pressedButton,
              isLoading && styles.disabledButton,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#111111" />
            ) : (
              <Image
                accessibilityIgnoresInvertColors
                contentFit="contain"
                source={require('../../../assets/auth/google.svg')}
                style={styles.socialIcon}
              />
            )}
            <Text style={styles.loginLabel}>
              {isLoading ? '로그인 중...' : content.label}
            </Text>
          </Pressable>
        )}

        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>
            {errorMessage}
          </Text>
        ) : null}

        <Text style={styles.terms}>
          계속하면{' '}
          <Text
            accessibilityRole="link"
            onPress={() => void Linking.openURL(TERMS_OF_SERVICE_URL)}
            style={styles.termsLink}
          >
            서비스 이용약관
          </Text>
          과{' '}
          <Text
            accessibilityRole="link"
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
            style={styles.termsLink}
          >
            개인정보처리방침
          </Text>
          에 동의하게 됩니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 82,
  },
  mascot: {
    width: 118,
    height: 118,
  },
  title: {
    marginTop: 18,
    color: '#172033',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.6,
    lineHeight: 34,
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    color: 'rgba(15, 23, 42, 0.7)',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.35,
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 18,
  },
  loginButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
  },
  appleButtonContainer: {
    height: 56,
  },
  appleNativeButton: {
    width: '100%',
    height: 56,
  },
  appleLoadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#000000',
  },
  appleLoadingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: 'rgba(116, 119, 117, 0.7)',
    backgroundColor: '#FFFFFF',
  },
  pressedButton: {
    opacity: 0.72,
  },
  disabledButton: {
    opacity: 0.6,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  loginLabel: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  errorMessage: {
    marginTop: 12,
    color: '#B42318',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  terms: {
    minHeight: 36,
    marginTop: 16,
    color: 'rgba(15, 23, 42, 0.7)',
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.325,
    lineHeight: 18,
    textAlign: 'center',
  },
  termsLink: {
    color: '#334155',
    textDecorationLine: 'underline',
  },
});
