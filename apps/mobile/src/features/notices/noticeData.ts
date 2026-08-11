import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import {
  getFunctions,
  httpsCallable,
} from '@react-native-firebase/functions';

export type NoticePayload = {
  authorName: string;
  body: string;
  content: string;
  id: string;
  members: {
    id: string;
    lastReminderLabel?: string;
    name: string;
    read: boolean;
  }[];
  publishedAt: string;
  readCount: number;
  reminderAtLabel: string;
  reminderLabel?: string;
  title: string;
  totalMemberCount: number;
};

type MemberRecord = {
  id: string;
  name: string;
};

type NoticeRecord = {
  authorName: string;
  body: string;
  id: string;
  lastReminderAtByUserId: Record<string, Date>;
  publishedAt: Date;
  readByUserIds: string[];
  reminderAt?: Date;
  title: string;
};

export function subscribeToStudyNotices(
  studyId: string,
  onData: (notices: NoticePayload[]) => void,
  onError: (error: Error) => void,
) {
  const firestore = getFirestore();
  let members: MemberRecord[] | undefined;
  let notices: NoticeRecord[] | undefined;

  const emit = () => {
    if (!members || !notices) {
      return;
    }

    onData(notices.map((notice) => createNoticePayload(notice, members!)));
  };

  const unsubscribeMembers = onSnapshot(
    collection(firestore, 'studies', studyId, 'members'),
    (snapshot) => {
      members = snapshot.docs.flatMap((document) => {
        const data = document.data();
        if (
          data.status !== 'active' ||
          data.role === 'leader' ||
          typeof data.displayName !== 'string'
        ) {
          return [];
        }
        return [{ id: document.id, name: data.displayName }];
      });
      emit();
    },
    (error) => onError(error),
  );
  const unsubscribeNotices = onSnapshot(
    query(
      collection(firestore, 'studies', studyId, 'notices'),
      orderBy('publishedAt', 'desc'),
    ),
    (snapshot) => {
      notices = snapshot.docs.flatMap((document) => {
        const parsed = parseNoticeRecord(document.id, document.data());
        return parsed ? [parsed] : [];
      });
      emit();
    },
    (error) => onError(error),
  );

  return () => {
    unsubscribeMembers();
    unsubscribeNotices();
  };
}

export async function requestNoticeReminder(
  studyId: string,
  noticeId: string,
  recipientUserIds: string[],
) {
  const callable = httpsCallable<
    { noticeId: string; recipientUserIds: string[]; studyId: string },
    { jobId: string; targetCount: number }
  >(getFunctions(undefined, 'us-central1'), 'sendNoticeReminder');
  const response = await callable({ noticeId, recipientUserIds, studyId });
  return response.data;
}

function createNoticePayload(
  notice: NoticeRecord,
  members: MemberRecord[],
): NoticePayload {
  const readers = new Set(notice.readByUserIds);
  const memberPayload = members.map((member) => ({
    ...member,
    lastReminderLabel: formatSentAt(
      notice.lastReminderAtByUserId[member.id],
    ),
    read: readers.has(member.id),
  }));
  const readCount = memberPayload.filter((member) => member.read).length;

  return {
    authorName: notice.authorName,
    body: notice.body,
    content: notice.body,
    id: notice.id,
    members: memberPayload,
    publishedAt: notice.publishedAt.toISOString(),
    readCount,
    reminderAtLabel: formatReminderAt(notice.reminderAt),
    reminderLabel: notice.reminderAt
      ? formatRemainingTime(notice.reminderAt)
      : undefined,
    title: notice.title,
    totalMemberCount: members.length,
  };
}

function parseNoticeRecord(
  id: string,
  data: Record<string, unknown>,
): NoticeRecord | null {
  const publishedAt = toDate(data.publishedAt);
  if (
    typeof data.title !== 'string' ||
    typeof data.content !== 'string' ||
    !publishedAt
  ) {
    return null;
  }

  const rawReaders = Array.isArray(data.readByUserIds)
    ? data.readByUserIds.filter(
        (userId): userId is string => typeof userId === 'string',
      )
    : [];
  const rawReminderTimes = isRecord(data.lastReminderAtByUserId)
    ? data.lastReminderAtByUserId
    : {};
  const lastReminderAtByUserId = Object.fromEntries(
    Object.entries(rawReminderTimes).flatMap(([userId, value]) => {
      const date = toDate(value);
      return date ? [[userId, date]] : [];
    }),
  );

  return {
    authorName:
      typeof data.authorName === 'string' ? data.authorName : '스터디 리드',
    body: data.content,
    id,
    lastReminderAtByUserId,
    publishedAt,
    readByUserIds: rawReaders,
    reminderAt: toDate(data.reminderAt) ?? undefined,
    title: data.title,
  };
}

function formatRemainingTime(date: Date) {
  const remainingMinutes = Math.ceil((date.getTime() - Date.now()) / 60_000);
  if (remainingMinutes <= 0) {
    return '리마인드 완료';
  }
  if (remainingMinutes < 60) {
    return `${remainingMinutes}분 뒤 리마인드`;
  }
  if (remainingMinutes < 24 * 60) {
    return `${Math.ceil(remainingMinutes / 60)}시간 뒤 리마인드`;
  }
  return `${Math.ceil(remainingMinutes / (24 * 60))}일 뒤 리마인드`;
}

function formatReminderAt(date?: Date) {
  if (!date) {
    return '리마인드 미설정';
  }
  return `${formatRemainingTime(date)} · ${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatSentAt(date?: Date) {
  if (!date) {
    return undefined;
  }
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())} 보냄`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toDate(value: unknown): Date | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate() as Date;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
