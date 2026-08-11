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
import { SafeAreaView } from 'react-native-safe-area-context';

import type { UsePushNotificationsResult } from '../notifications/usePushNotifications';

type AuthenticatedScreenProps = {
  user: User;
  onClose?: () => void;
  onSignOut: () => void;
  pushNotifications: UsePushNotificationsResult;
};

export function AuthenticatedScreen({
  user,
  onClose,
  onSignOut,
  pushNotifications,
}: AuthenticatedScreenProps) {
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

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />

      {onClose ? (
        <Pressable
          accessibilityLabel="마이페이지 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeLabel}>닫기</Text>
        </Pressable>
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
  closeButton: {
    position: 'absolute',
    zIndex: 1,
    top: 16,
    right: 20,
    paddingVertical: 8,
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
