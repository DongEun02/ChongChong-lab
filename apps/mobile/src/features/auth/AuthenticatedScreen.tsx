import type { User } from '@react-native-firebase/auth';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ACCOUNT_DELETION_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL_URL,
  TERMS_OF_SERVICE_URL,
} from '../legal/legalLinks';
import type { UsePushNotificationsResult } from '../notifications/usePushNotifications';

type AuthenticatedScreenProps = {
  user: User;
  onClose?: () => void;
  onDeleteAccount: () => Promise<void>;
  onSignOut: () => void;
  pushNotifications: UsePushNotificationsResult;
};

export function AuthenticatedScreen({
  user,
  onClose,
  onDeleteAccount,
  onSignOut,
  pushNotifications,
}: AuthenticatedScreenProps) {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const handlePushNotificationChange = async (nextValue: boolean) => {
    if (nextValue) {
      const result = await pushNotifications.enable();

      if (result === 'denied') {
        Alert.alert(
          '알림 권한이 필요해요',
          '기기 설정에서 총총의 알림을 허용해 주세요.',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '설정 열기',
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        );
      }

      return;
    }

    await pushNotifications.disable();
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      '회원탈퇴를 진행할까요?',
      '계정과 개인 데이터가 삭제되며 복구할 수 없어요. 리드인 스터디가 있다면 먼저 다른 멤버에게 양도해야 해요.',
      [
        { style: 'cancel', text: '취소' },
        {
          onPress: () => {
            setIsDeletingAccount(true);
            void onDeleteAccount()
              .catch((error: unknown) => {
                Alert.alert(
                  '탈퇴하지 못했어요',
                  error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
                );
              })
              .finally(() => setIsDeletingAccount(false));
          },
          style: 'destructive',
          text: '탈퇴하기',
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />

      {onClose ? (
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="마이페이지 닫기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Text style={styles.closeLabel}>닫기</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.eyebrow}>MY PAGE</Text>
        <Text style={styles.title}>내 정보</Text>
        <Text style={styles.description}>
          {user.displayName ?? user.email ?? '총총 사용자'}님, 환영해요.
        </Text>
        <Text style={styles.guide}>로그인 계정과 알림 설정을 관리할 수 있어요.</Text>

        <View style={styles.pushSetting}>
          <View style={styles.pushCopy}>
            <Text style={styles.pushLabel}>푸시 알림</Text>
            <Text style={styles.pushDescription}>
              {getPushDescription(pushNotifications.status)}
            </Text>
          </View>
          <Switch
            accessibilityLabel="푸시 알림"
            disabled={pushNotifications.isBusy}
            onValueChange={(value) => {
              void handlePushNotificationChange(value);
            }}
            thumbColor="#FFFFFF"
            trackColor={{ false: '#CBD5E1', true: '#00C471' }}
            value={pushNotifications.isEnabled}
          />
        </View>

        <View style={styles.legalLinks}>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(TERMS_OF_SERVICE_URL)}
          >
            <Text style={styles.legalLinkLabel}>서비스 이용약관</Text>
          </Pressable>
          <Text style={styles.legalLinkDivider}>·</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <Text style={styles.legalLinkLabel}>개인정보처리방침</Text>
          </Pressable>
          <Text style={styles.legalLinkDivider}>·</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(SUPPORT_EMAIL_URL)}
          >
            <Text style={styles.legalLinkLabel}>문의하기</Text>
          </Pressable>
          <Text style={styles.legalLinkDivider}>·</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL)}
          >
            <Text style={styles.legalLinkLabel}>계정 삭제 안내</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isDeletingAccount}
        onPress={confirmDeleteAccount}
        style={({ pressed }) => [styles.deleteAccountButton, pressed && styles.pressedButton]}
      >
        <Text style={styles.deleteAccountLabel}>{isDeletingAccount ? '탈퇴 처리 중...' : '회원탈퇴'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={isDeletingAccount}
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
  header: {
    height: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  closeButton: {
    minWidth: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  closeLabel: {
    color: '#172033',
    fontSize: 16,
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
  pushSetting: {
    width: '100%',
    marginTop: 36,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  pushCopy: {
    flex: 1,
    paddingRight: 20,
  },
  pushLabel: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: -0.45,
    lineHeight: 28,
  },
  pushDescription: {
    marginTop: 2,
    color: 'rgba(15, 23, 42, 0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  legalLinks: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLinkLabel: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
  legalLinkDivider: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  signOutButton: {
    height: 52,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  deleteAccountButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountLabel: {
    color: '#DE5E56',
    fontSize: 14,
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

function getPushDescription(status: UsePushNotificationsResult['status']) {
  if (status === 'enabled') {
    return '공지와 리마인드 알림을 받을 수 있어요.';
  }

  if (status === 'denied') {
    return '기기 설정에서 알림 권한을 허용해 주세요.';
  }

  if (status === 'error') {
    return '알림 설정을 저장하지 못했어요. 다시 시도해 주세요.';
  }

  if (status === 'initializing' || status === 'updating') {
    return '알림 설정을 확인하고 있어요.';
  }

  return '공지와 리마인드 알림을 놓치지 마세요.';
}
