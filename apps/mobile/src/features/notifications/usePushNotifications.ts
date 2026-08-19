import {
  getMessaging,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  disablePushNotifications,
  enablePushNotifications,
  persistPushToken,
  syncPushNotifications,
} from './pushNotifications';

export type PushNotificationStatus =
  | 'disabled'
  | 'enabled'
  | 'denied'
  | 'error'
  | 'initializing'
  | 'updating';

export type UsePushNotificationsResult = {
  status: PushNotificationStatus;
  isBusy: boolean;
  isEnabled: boolean;
  enable: () => Promise<'denied' | 'enabled' | 'error'>;
  disable: () => Promise<void>;
};

export function usePushNotifications(
  userId?: string,
): UsePushNotificationsResult {
  const [pushState, setPushState] = useState<{
    status: PushNotificationStatus;
    userId?: string;
  }>({ status: 'disabled' });
  const isEnabledRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      isEnabledRef.current = false;
      return;
    }

    let isActive = true;

    void syncPushNotifications(userId)
      .then((result) => {
        if (!isActive) {
          return;
        }

        isEnabledRef.current = result === 'enabled';
        setPushState({ status: result, userId });
      })
      .catch(() => {
        if (isActive) {
          setPushState({ status: 'error', userId });
        }
      });

    const unsubscribeTokenRefresh = onTokenRefresh(getMessaging(), (token) => {
      if (isEnabledRef.current) {
        void persistPushToken(userId, token).catch(() => {
          if (isActive) {
            setPushState({ status: 'error', userId });
          }
        });
      }
    });

    return () => {
      isActive = false;
      unsubscribeTokenRefresh();
    };
  }, [userId]);

  const enable = useCallback(async () => {
    if (!userId) {
      return 'error' as const;
    }

    setPushState({ status: 'updating', userId });

    try {
      const result = await enablePushNotifications(userId);
      isEnabledRef.current = result === 'enabled';
      setPushState({ status: result, userId });
      return result;
    } catch {
      isEnabledRef.current = false;
      setPushState({ status: 'error', userId });
      return 'error' as const;
    }
  }, [userId]);

  const disable = useCallback(async () => {
    if (!userId) {
      return;
    }

    setPushState({ status: 'updating', userId });

    try {
      await disablePushNotifications(userId);
      isEnabledRef.current = false;
      setPushState({ status: 'disabled', userId });
    } catch {
      setPushState({ status: 'error', userId });
    }
  }, [userId]);

  const status = !userId
    ? 'disabled'
    : pushState.userId === userId
      ? pushState.status
      : 'initializing';

  return {
    status,
    isBusy: status === 'initializing' || status === 'updating',
    isEnabled: status === 'enabled',
    enable,
    disable,
  };
}
