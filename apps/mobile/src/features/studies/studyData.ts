import {
  getFunctions,
  httpsCallable,
} from '@react-native-firebase/functions';
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';

export type CreateStudyInput = {
  description: string;
  memberLimit: number;
  name: string;
};

export type StudyPayload = {
  description: string;
  id: string;
  memberCount: number;
  memberLimit: number;
  name: string;
  role: 'leader' | 'member';
};

export type StudyListPayload = Omit<StudyPayload, 'role'> & {
  pendingAssignments: number;
  role: 'leader' | 'member';
  unreadNotices: number;
};

export async function createStudy(input: CreateStudyInput) {
  const callable = httpsCallable<
    CreateStudyInput,
    { study: StudyPayload }
  >(getFunctions(undefined, 'us-central1'), 'createStudy');
  const response = await callable(input);
  return response.data.study;
}

export async function joinStudy(inviteUrl: string) {
  const callable = httpsCallable<
    { inviteUrl: string },
    { study: StudyPayload }
  >(getFunctions(undefined, 'us-central1'), 'joinStudy');
  const response = await callable({ inviteUrl });
  return response.data.study;
}

export async function deleteStudy(studyId: string) {
  const callable = httpsCallable<
    { studyId: string },
    { name: string }
  >(getFunctions(undefined, 'us-central1'), 'deleteStudy');
  const response = await callable({ studyId });
  return response.data;
}

export function subscribeToUserStudies(
  userId: string,
  onData: (studies: StudyListPayload[]) => void,
  onError: (error: Error) => void,
) {
  let studies: StudyListPayload[] = [];
  const leaderProgress = new Map<string, LeaderProgress>();
  const leaderSubscriptions = new Map<string, (() => void)[]>();

  const emit = () => {
    onData(
      studies.map((study) => {
        if (study.role !== 'leader') {
          return study;
        }

        const progress = leaderProgress.get(study.id);
        if (!progress || !isLeaderProgressReady(progress)) {
          return study;
        }

        return {
          ...study,
          pendingAssignments: countIncompleteItems(
            progress.memberIds,
            progress.assignments,
          ),
          unreadNotices: countIncompleteItems(
            progress.memberIds,
            progress.notices,
          ),
        };
      }),
    );
  };

  const subscribeToLeaderProgress = (studyId: string) => {
    const progress: LeaderProgress = {};
    leaderProgress.set(studyId, progress);

    const updateAndEmit = (update: Partial<LeaderProgress>) => {
      Object.assign(progress, update);
      emit();
    };
    const reportError = (error: Error) => onError(error);

    const unsubscribeMembers = onSnapshot(
      collection(getFirestore(), 'studies', studyId, 'members'),
      (snapshot) => {
        updateAndEmit({
          memberIds: snapshot.docs.flatMap((document) => {
            const data = document.data();
            return data.status === 'active' && data.role !== 'leader'
              ? [document.id]
              : [];
          }),
        });
      },
      reportError,
    );
    const unsubscribeNotices = onSnapshot(
      collection(getFirestore(), 'studies', studyId, 'notices'),
      (snapshot) => {
        updateAndEmit({
          notices: snapshot.docs.map((document) =>
            parseCompletedUserIds(document.data().readByUserIds),
          ),
        });
      },
      reportError,
    );
    const unsubscribeAssignments = onSnapshot(
      collection(getFirestore(), 'studies', studyId, 'assignments'),
      (snapshot) => {
        updateAndEmit({
          assignments: snapshot.docs.map((document) =>
            parseCompletedUserIds(document.data().submittedByUserIds),
          ),
        });
      },
      reportError,
    );

    leaderSubscriptions.set(studyId, [
      unsubscribeAssignments,
      unsubscribeMembers,
      unsubscribeNotices,
    ]);
  };

  const unsubscribeStudies = onSnapshot(
    query(
      collection(getFirestore(), 'users', userId, 'studies'),
      orderBy('createdAt', 'desc'),
    ),
    (snapshot) => {
      studies = snapshot.docs.flatMap((document) => {
        const study = parseStudyListPayload(document.id, document.data());
        return study ? [study] : [];
      });

      const leaderStudyIds = new Set(
        studies
          .filter((study) => study.role === 'leader')
          .map((study) => study.id),
      );

      for (const [studyId, subscriptions] of leaderSubscriptions) {
        if (leaderStudyIds.has(studyId)) {
          continue;
        }
        subscriptions.forEach((unsubscribe) => unsubscribe());
        leaderSubscriptions.delete(studyId);
        leaderProgress.delete(studyId);
      }
      for (const studyId of leaderStudyIds) {
        if (!leaderSubscriptions.has(studyId)) {
          subscribeToLeaderProgress(studyId);
        }
      }

      emit();
    },
    onError,
  );

  return () => {
    unsubscribeStudies();
    for (const subscriptions of leaderSubscriptions.values()) {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    }
    leaderSubscriptions.clear();
    leaderProgress.clear();
  };
}

type LeaderProgress = {
  assignments?: Set<string>[];
  memberIds?: string[];
  notices?: Set<string>[];
};

function isLeaderProgressReady(
  progress: LeaderProgress,
): progress is Required<LeaderProgress> {
  return Boolean(progress.assignments && progress.memberIds && progress.notices);
}

function parseCompletedUserIds(value: unknown) {
  return new Set(
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [],
  );
}

function countIncompleteItems(
  memberIds: string[],
  completedUserIdsByItem: Set<string>[],
) {
  if (memberIds.length === 0) {
    return 0;
  }

  return completedUserIdsByItem.filter((completedUserIds) =>
    memberIds.some((memberId) => !completedUserIds.has(memberId)),
  ).length;
}

function parseStudyListPayload(
  id: string,
  data: Record<string, unknown>,
): StudyListPayload | null {
  if (
    typeof data.name !== 'string' ||
    typeof data.description !== 'string' ||
    typeof data.memberCount !== 'number' ||
    typeof data.memberLimit !== 'number' ||
    (data.role !== 'leader' && data.role !== 'member')
  ) {
    return null;
  }

  return {
    description: data.description,
    id,
    memberCount: data.memberCount,
    memberLimit: data.memberLimit,
    name: data.name,
    pendingAssignments:
      typeof data.pendingAssignments === 'number'
        ? data.pendingAssignments
        : 0,
    role: data.role,
    unreadNotices:
      typeof data.unreadNotices === 'number' ? data.unreadNotices : 0,
  };
}
