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
  return onSnapshot(
    query(
      collection(getFirestore(), 'users', userId, 'studies'),
      orderBy('createdAt', 'desc'),
    ),
    (snapshot) => {
      onData(
        snapshot.docs.flatMap((document) => {
          const study = parseStudyListPayload(document.id, document.data());
          return study ? [study] : [];
        }),
      );
    },
    onError,
  );
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
