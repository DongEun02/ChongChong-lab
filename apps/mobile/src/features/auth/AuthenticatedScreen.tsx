import Ionicons from '@expo/vector-icons/Ionicons';
import type { User } from '@react-native-firebase/auth';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAlertModal } from '../../components/AlertModal';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL_URL } from '../legal/legalLinks';
import type { UsePushNotificationsResult } from '../notifications/usePushNotifications';

type AuthenticatedScreenProps = {
  currentDisplayName?: string | null;
  user: User;
  onClose?: () => void;
  onDeleteAccount: () => Promise<void>;
  onSignOut: () => void;
  onUpdateDisplayName: (displayName: string) => Promise<string>;
  pushNotifications: UsePushNotificationsResult;
};

const MAX_DISPLAY_NAME_LENGTH = 8;

export function AuthenticatedScreen({
  currentDisplayName,
  user,
  onClose,
  onDeleteAccount,
  onSignOut,
  onUpdateDisplayName,
  pushNotifications,
}: AuthenticatedScreenProps) {
  const initialDisplayName = useMemo(
    () => currentDisplayName?.trim() || getDisplayName(user),
    [currentDisplayName, user],
  );
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [savedDisplayName, setSavedDisplayName] = useState(initialDisplayName);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { showAlert } = useAlertModal();
  const normalizedDisplayName = displayName.trim();
  const isDisplayNameTooLong = Array.from(normalizedDisplayName).length > MAX_DISPLAY_NAME_LENGTH;
  const canUpdateProfile =
    normalizedDisplayName.length > 0 &&
    !isDisplayNameTooLong &&
    normalizedDisplayName !== savedDisplayName &&
    !isUpdatingProfile;

  const handleUpdateProfile = async () => {
    if (!canUpdateProfile) return;

    setIsUpdatingProfile(true);
    try {
      const nextDisplayName = await onUpdateDisplayName(normalizedDisplayName);
      setDisplayName(nextDisplayName);
      setSavedDisplayName(nextDisplayName);
      showAlert(
        '프로필을 수정했어요',
        `${nextDisplayName} 이름으로 표시돼요.`,
      );
    } catch (error) {
      showAlert(
        '프로필을 수정하지 못했어요',
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePushNotificationChange = async (nextValue: boolean) => {
    if (nextValue) {
      const result = await pushNotifications.enable();
      if (result === 'denied') {
        showAlert(
          '알림 권한이 필요해요',
          '기기 설정에서 총총의 알림을 허용해 주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정 열기', onPress: () => void Linking.openSettings() },
          ],
        );
      }
      return;
    }

    await pushNotifications.disable();
  };

  const confirmDeleteAccount = () => {
    showAlert(
      '회원 탈퇴를 진행할까요?',
      '계정과 개인 데이터가 삭제되며 복구할 수 없어요. 리드인 스터디가 있다면 먼저 다른 멤버에게 양도해야 해요.',
      [
        { style: 'cancel', text: '취소' },
        {
          onPress: () => {
            setIsDeletingAccount(true);
            void onDeleteAccount()
              .catch((error: unknown) => {
                showAlert(
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
      <View style={styles.header}>
        <Text style={styles.brand}>총총</Text>
        {onClose ? (
          <Pressable
            accessibilityLabel="마이페이지 닫기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressedButton]}
          >
            <Ionicons color="#111111" name="close-outline" size={34} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatar}>
          <Ionicons color="#FFFFFF" name="person" size={47} />
        </View>

        <View style={styles.profileForm}>
          <Text style={styles.inputLabel}>이름</Text>
          <TextInput
            accessibilityLabel="프로필 이름"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isUpdatingProfile}
            maxLength={20}
            onChangeText={setDisplayName}
            returnKeyType="done"
            style={[styles.nameInput, isDisplayNameTooLong && styles.invalidInput]}
            value={displayName}
          />
          <Text style={[styles.inputGuide, isDisplayNameTooLong && styles.inputError]}>
            {isDisplayNameTooLong
              ? '이름은 8글자 이하로 입력할 수 있어요'
              : '다른 사람에게도 표시되는 이름이에요'}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!canUpdateProfile}
            onPress={() => void handleUpdateProfile()}
            style={({ pressed }) => [
              styles.updateButton,
              !canUpdateProfile && styles.disabledButton,
              pressed && styles.pressedButton,
            ]}
          >
            {isUpdatingProfile ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.updateButtonLabel}>프로필 수정하기</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.settings}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>푸시 알림</Text>
            <Switch
              accessibilityLabel="푸시 알림"
              disabled={pushNotifications.isBusy}
              onValueChange={(value) => void handlePushNotificationChange(value)}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#CBD5E1', true: '#00C471' }}
              value={pushNotifications.isEnabled}
            />
          </View>
          <ProfileAction color="#FF6B61" label="로그아웃" onPress={onSignOut} />
          <ProfileAction label="개인정보처리방침" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} />
          <ProfileAction label="지원" onPress={() => void Linking.openURL(SUPPORT_EMAIL_URL)} />
          <ProfileAction
            color="rgba(15, 23, 42, 0.45)"
            disabled={isDeletingAccount}
            label={isDeletingAccount ? '탈퇴 처리 중...' : '회원 탈퇴'}
            onPress={confirmDeleteAccount}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileAction({
  color = '#111111',
  disabled = false,
  label,
  onPress,
}: {
  color?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressedButton]}
    >
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function getDisplayName(user: User) {
  if (user.displayName?.trim()) return user.displayName.trim();
  if (user.email?.includes('@')) return user.email.slice(0, user.email.indexOf('@')).slice(0, 8);
  return '총총이';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#00C471',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.4,
    lineHeight: 36,
  },
  closeButton: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  avatar: {
    width: 70,
    height: 70,
    marginTop: 16,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
    backgroundColor: '#858B97',
  },
  profileForm: { marginTop: 29 },
  inputLabel: { color: '#111111', fontSize: 16, lineHeight: 28, letterSpacing: -0.4 },
  nameInput: {
    height: 54,
    marginTop: 2,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#00C471',
    borderRadius: 12,
    color: '#172033',
    fontSize: 14,
    lineHeight: 20,
  },
  invalidInput: { borderColor: '#FF6B61' },
  inputGuide: {
    marginTop: 6,
    color: 'rgba(15, 23, 42, 0.45)',
    fontSize: 12,
    lineHeight: 18,
  },
  inputError: { color: '#FF6B61' },
  updateButton: {
    height: 52,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#00C471',
  },
  disabledButton: { backgroundColor: '#A9ADB7' },
  updateButtonLabel: { color: '#FFFFFF', fontSize: 16, lineHeight: 24, letterSpacing: -0.4 },
  settings: { marginTop: 70 },
  settingRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: { color: '#111111', fontSize: 16, lineHeight: 28, letterSpacing: -0.4 },
  actionRow: { minHeight: 44, justifyContent: 'center' },
  actionLabel: { fontSize: 16, lineHeight: 28, letterSpacing: -0.4 },
  pressedButton: { opacity: 0.65 },
});
