import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

export type AssignmentSubmissionPayload = {
  content: string;
  link?: string;
  submittedAt: string;
  updatedAt: string;
  userId: string;
  userName: string;
};

export type AssignmentPayload = {
  content: string;
  deadlineAt: string;
  id: string;
  isSubmitted: boolean;
  members: {
    id: string;
    lastReminderLabel?: string;
    name: string;
    submitted: boolean;
  }[];
  reminderAts: string[];
  reminderLabel?: string;
  submission?: AssignmentSubmissionPayload;
  submissionInstructions: string;
  submissions: AssignmentSubmissionPayload[];
  submittedCount: number;
  title: string;
  totalMemberCount: number;
};

export type CreateAssignmentInput = {
  content: string;
  deadlineAt: string;
  reminderAts: string[];
  submissionInstructions: string;
  title: string;
};

export type SubmitAssignmentInput = {
  content: string;
  link?: string;
};

export function subscribeToStudyAssignments(
  studyId: string,
  userId: string,
  onData: (assignments: AssignmentPayload[]) => void,
  onError: (error: Error) => void,
) {
  const firestore = getFirestore();
  let members: MemberRecord[] | undefined;
  let role: 'leader' | 'member' | undefined;
  let records: AssignmentRecord[] | undefined;
  let loadVersion = 0;

  const emit = async () => {
    if (!members || !role || !records) {
      return;
    }
    const version = ++loadVersion;
    try {
      const payloads = await Promise.all(records.map(async (record) => {
        const submissions = await loadSubmissions(
          studyId,
          record.id,
          userId,
          role!,
        );
        const submittedIds = new Set(record.submittedByUserIds);
        const currentSubmission = submissions.find(
          (submission) => submission.userId === userId,
        );
        return {
          content: record.content,
          deadlineAt: record.deadlineAt.toISOString(),
          id: record.id,
          isSubmitted: submittedIds.has(userId),
          members: members!.map((member) => ({
            ...member,
            lastReminderLabel: formatSentAt(
              record.lastReminderAtByUserId[member.id],
            ),
            submitted: submittedIds.has(member.id),
          })),
          reminderAts: record.reminderAts.map((date) => date.toISOString()),
          reminderLabel: record.reminderAt
            ? formatRemainingTime(record.reminderAt)
            : undefined,
          submission: currentSubmission,
          submissionInstructions: record.submissionInstructions,
          submissions,
          submittedCount: members!.filter((member) => submittedIds.has(member.id)).length,
          title: record.title,
          totalMemberCount: members!.length,
        } satisfies AssignmentPayload;
      }));
      if (version === loadVersion) {
        onData(payloads);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('과제 데이터를 불러오지 못했습니다.'));
    }
  };

  const unsubscribeMembers = onSnapshot(
    collection(firestore, 'studies', studyId, 'members'),
    (snapshot) => {
      const actor = snapshot.docs.find((document) => document.id === userId)?.data();
      role = actor?.role === 'leader' ? 'leader' : 'member';
      members = snapshot.docs.flatMap((document) => {
        const data = document.data();
        return data.status === 'active' && data.role !== 'leader' && typeof data.displayName === 'string'
          ? [{ id: document.id, name: data.displayName }]
          : [];
      });
      void emit();
    },
    onError,
  );
  const unsubscribeAssignments = onSnapshot(
    query(collection(firestore, 'studies', studyId, 'assignments'), orderBy('createdAt', 'desc')),
    (snapshot) => {
      records = snapshot.docs.flatMap((document) => {
        const data = document.data();
        const deadlineAt = toDate(data.deadlineAt);
        if (
          typeof data.title !== 'string' ||
          typeof data.content !== 'string' ||
          typeof data.submissionInstructions !== 'string' ||
          !deadlineAt
        ) {
          return [];
        }
        const submittedByUserIds = Array.isArray(data.submittedByUserIds)
          ? [...new Set(data.submittedByUserIds.filter((value): value is string => typeof value === 'string'))]
          : [];
        const reminderAts = Array.isArray(data.reminderAts)
          ? data.reminderAts.flatMap((value) => toDate(value) ?? [])
          : [];
        const rawLastReminders = isRecord(data.lastReminderAtByUserId)
          ? data.lastReminderAtByUserId
          : {};
        return [{
          content: data.content,
          deadlineAt,
          id: document.id,
          lastReminderAtByUserId: Object.fromEntries(
            Object.entries(rawLastReminders).flatMap(([id, value]) => {
              const date = toDate(value);
              return date ? [[id, date]] : [];
            }),
          ),
          reminderAt: toDate(data.reminderAt) ?? undefined,
          reminderAts,
          submissionInstructions: data.submissionInstructions,
          submittedByUserIds,
          title: data.title,
        }];
      });
      void emit();
    },
    onError,
  );

  return () => {
    loadVersion += 1;
    unsubscribeAssignments();
    unsubscribeMembers();
  };
}

export async function createAssignment(studyId: string, input: CreateAssignmentInput) {
  const callable = httpsCallable<
    CreateAssignmentInput & { studyId: string },
    { assignment: { id: string; title: string } }
  >(getFunctions(undefined, 'us-central1'), 'createAssignment');
  return (await callable({ ...input, studyId })).data.assignment;
}

export async function submitAssignment(
  studyId: string,
  assignmentId: string,
  input: SubmitAssignmentInput,
) {
  const callable = httpsCallable<
    SubmitAssignmentInput & { assignmentId: string; studyId: string },
    { submission: { id: string; submittedAt: string } }
  >(getFunctions(undefined, 'us-central1'), 'submitAssignment');
  return (await callable({ ...input, assignmentId, studyId })).data.submission;
}

export async function requestAssignmentReminder(
  studyId: string,
  assignmentId: string,
  recipientUserIds: string[],
) {
  const callable = httpsCallable<
    { assignmentId: string; recipientUserIds: string[]; studyId: string },
    { jobId: string; targetCount: number }
  >(getFunctions(undefined, 'us-central1'), 'sendAssignmentReminder');
  return (await callable({ assignmentId, recipientUserIds, studyId })).data;
}

type MemberRecord = { id: string; name: string };
type AssignmentRecord = {
  content: string;
  deadlineAt: Date;
  id: string;
  lastReminderAtByUserId: Record<string, Date>;
  reminderAt?: Date;
  reminderAts: Date[];
  submissionInstructions: string;
  submittedByUserIds: string[];
  title: string;
};

async function loadSubmissions(
  studyId: string,
  assignmentId: string,
  userId: string,
  role: 'leader' | 'member',
) {
  const firestore = getFirestore();
  const reference = collection(
    firestore,
    'studies',
    studyId,
    'assignments',
    assignmentId,
    'submissions',
  );
  const documents = role === 'leader'
    ? (await getDocs(reference)).docs
    : [await getDoc(doc(reference, userId))].filter((snapshot) => snapshot.exists());
  return documents.flatMap((document) => {
    const data = document.data();
    const submittedAt = toDate(data.submittedAt);
    const updatedAt = toDate(data.updatedAt);
    if (typeof data.content !== 'string' || typeof data.userName !== 'string' || !submittedAt || !updatedAt) {
      return [];
    }
    return [{
      content: data.content,
      link: typeof data.link === 'string' ? data.link : undefined,
      submittedAt: submittedAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      userId: document.id,
      userName: data.userName,
    }];
  });
}

function toDate(value: unknown): Date | null {
  if (isRecord(value) && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function formatRemainingTime(target: Date) {
  const minutes = Math.max(0, Math.ceil((target.getTime() - Date.now()) / 60_000));
  if (minutes < 60) return `${minutes}분 뒤 리마인드`;
  const hours = Math.ceil(minutes / 60);
  return hours < 24 ? `${hours}시간 뒤 리마인드` : `${Math.ceil(hours / 24)}일 뒤 리마인드`;
}

function formatSentAt(date?: Date) {
  if (!date) return undefined;
  return new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric', hour: '2-digit', hour12: false, minute: '2-digit', month: 'long', timeZone: 'Asia/Seoul',
  }).format(date) + ' 보냄';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
