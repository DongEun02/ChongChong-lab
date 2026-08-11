import {
  collection,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import {
  getFunctions,
  httpsCallable,
} from '@react-native-firebase/functions';

export type NotificationPayload = {
  body: string;
  createdAt: string;
  id: string;
  isRead: boolean;
  noticeId?: string;
  screen?: string;
  studyId?: string;
  title: string;
};

export function subscribeToNotifications(
  userId: string,
  onData: (notifications: NotificationPayload[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(getFirestore(), 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50),
    ),
    (snapshot) => {
      onData(
        snapshot.docs.flatMap((document) => {
          const parsed = parseNotification(document.id, document.data());
          return parsed ? [parsed] : [];
        }),
      );
    },
    onError,
  );
}

export async function readNotification(notificationId: string) {
  const callable = httpsCallable<
    { notificationId: string },
    { notificationId: string }
  >(getFunctions(undefined, 'us-central1'), 'readNotification');
  const response = await callable({ notificationId });
  return response.data.notificationId;
}

function parseNotification(
  id: string,
  data: Record<string, unknown>,
): NotificationPayload | null {
  const createdAt = toDate(data.createdAt);
  if (
    typeof data.title !== 'string' ||
    typeof data.body !== 'string' ||
    !createdAt
  ) {
    return null;
  }

  const notificationData = isRecord(data.data) ? data.data : {};
  return {
    body: data.body,
    createdAt: createdAt.toISOString(),
    id,
    isRead: Boolean(data.readAt),
    noticeId: parseOptionalString(notificationData.noticeId),
    screen: parseOptionalString(notificationData.screen),
    studyId: parseOptionalString(notificationData.studyId),
    title: data.title,
  };
}

function parseOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function toDate(value: unknown): Date | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();
    return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
