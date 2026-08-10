import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AuthProvider } from './types';

type LoginScreenProps = {
  provider: AuthProvider;
  onContinue: (provider: AuthProvider) => void;
};

const providerContent = {
  apple: {
    label: 'Apple로 계속하기',
  },
  google: {
    label: 'Google로 계속하기',
  },
} as const;

export function LoginScreen({ provider, onContinue }: LoginScreenProps) {
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
        <Pressable
          accessibilityHint={`${content.label} 로그인을 시작합니다`}
          accessibilityRole="button"
          onPress={() => onContinue(provider)}
          style={({ pressed }) => [
            styles.loginButton,
            isApple ? styles.appleButton : styles.googleButton,
            pressed && styles.pressedButton,
          ]}
        >
          {isApple ? (
            <Text style={styles.appleIcon} accessibilityElementsHidden>
              
            </Text>
          ) : (
            <Image
              accessibilityIgnoresInvertColors
              contentFit="contain"
              source={require('../../../assets/auth/google.svg')}
              style={styles.socialIcon}
            />
          )}
          <Text style={[styles.loginLabel, isApple && styles.appleLabel]}>
            {content.label}
          </Text>
        </Pressable>

        <Text style={styles.terms}>
          계속하면 서비스 이용약관과 개인정보 처리방침에 동의하게 됩니다.
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
  appleButton: {
    backgroundColor: '#000000',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: 'rgba(116, 119, 117, 0.7)',
    backgroundColor: '#FFFFFF',
  },
  pressedButton: {
    opacity: 0.72,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  appleIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
  },
  loginLabel: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  appleLabel: {
    color: '#FFFFFF',
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
});
