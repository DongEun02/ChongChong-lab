import type { User } from '@react-native-firebase/auth';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthenticatedScreenProps = {
  user: User;
  onSignOut: () => void;
};

export function AuthenticatedScreen({
  user,
  onSignOut,
}: AuthenticatedScreenProps) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>GOOGLE LOGIN</Text>
        <Text style={styles.title}>로그인했어요</Text>
        <Text style={styles.description}>
          {user.displayName ?? user.email ?? '총총 사용자'}님, 환영해요.
        </Text>
        <Text style={styles.guide}>
          다음 페이지 구현 전까지 Firebase 로그인 세션을 확인하는 화면이에요.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onSignOut}
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.pressedButton,
        ]}
      >
        <Text style={styles.signOutLabel}>로그아웃</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 12,
    color: '#172033',
    fontSize: 26,
    fontWeight: '700',
  },
  description: {
    marginTop: 10,
    color: '#334155',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  guide: {
    maxWidth: 280,
    marginTop: 24,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  signOutButton: {
    height: 52,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  pressedButton: {
    opacity: 0.72,
  },
  signOutLabel: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
});
