import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';

export type AssignmentPayload = {
  content: string;
  deadlineAt: string;
  id: string;
  isSubmitted: boolean;
  reminderLabel?: string;
  submittedCount: number;
  submissionType: 'link';
  title: string;
  totalMemberCount: number;
};

export function subscribeToStudyAssignments(
  studyId: string,
  userId: string,
  onData: (assignments: AssignmentPayload[]) => void,
  onError: (error: Error) => void,
) {
  let activeMemberIds: Set<string> | undefined;
  let records: AssignmentRecord[] | undefined;

  const emit = () => {
    if (!activeMemberIds || !records) {
      return;
    }

    onData(
      records.map((record) => ({
        ...record,
        isSubmitted: record.submittedByUserIds.includes(userId),
        reminderLabel: record.reminderAt
          ? formatRemainingTime(record.reminderAt)
          : undefined,
        submittedCount: record.submittedByUserIds.filter((memberId) =>
          activeMemberIds!.has(memberId),
        ).length,
        totalMemberCount: activeMemberIds!.size,
      })),
    );
  };

  const unsubscribeMembers = onSnapshot(
    collection(getFirestore(), 'studies', studyId, 'members'),
    (snapshot) => {
      activeMemberIds = new Set(
        snapshot.docs.flatMap((document) => {
          const data = document.data();
          return data.status === 'active' && data.role !== 'leader'
            ? [document.id]
            : [];
        }),
      );
      emit();
    },
    onError,
  );
  const unsubscribeAssignments = onSnapshot(
    query(
      collection(getFirestore(), 'studies', studyId, 'assignments'),
      orderBy('createdAt', 'desc'),
    ),
    (snapshot) => {
      records = snapshot.docs.flatMap((document) => {
          const data = document.data();
          const deadlineAt = toDate(data.deadlineAt);
          if (
            typeof data.title !== 'string' ||
            typeof data.content !== 'string' ||
            !deadlineAt
          ) {
            return [];
          }

          const submittedByUserIds = Array.isArray(data.submittedByUserIds)
            ? [...new Set(data.submittedByUserIds.filter(
                (candidate): candidate is string =>
                  typeof candidate === 'string',
              ))]
            : [];

          return [{
            content: data.content,
            deadlineAt: deadlineAt.toISOString(),
            id: document.id,
            reminderAt: toDate(data.reminderAt) ?? undefined,
            submittedByUserIds,
            submissionType: 'link' as const,
            title: data.title,
          }];
        });
      emit();
    },
    onError,
  );

  return () => {
    unsubscribeAssignments();
    unsubscribeMembers();
  };
}

type AssignmentRecord = Omit<
  AssignmentPayload,
  'isSubmitted' | 'reminderLabel' | 'submittedCount' | 'totalMemberCount'
> & {
  reminderAt?: Date;
  submittedByUserIds: string[];
};

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

function formatRemainingTime(target: Date) {
  const remainingMinutes = Math.max(
    0,
    Math.ceil((target.getTime() - Date.now()) / (60 * 1000)),
  );
  if (remainingMinutes < 60) {
    return `${remainingMinutes}분 뒤 리마인드`;
  }

  const remainingHours = Math.ceil(remainingMinutes / 60);
  if (remainingHours < 24) {
    return `${remainingHours}시간 뒤 리마인드`;
  }

  return `${Math.ceil(remainingHours / 24)}일 뒤 리마인드`;
}
