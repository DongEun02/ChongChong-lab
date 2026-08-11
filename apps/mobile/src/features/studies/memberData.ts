import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

export type StudyMemberPayload = {
  displayName: string;
  id: string;
  role: 'leader' | 'member';
};

export async function removeStudyMember(studyId: string, memberId: string) {
  const callable = httpsCallable<
    { memberId: string; studyId: string },
    { displayName?: string; memberCount: number }
  >(getFunctions(undefined, 'us-central1'), 'removeStudyMember');
  const response = await callable({ memberId, studyId });
  return response.data;
}

export async function transferStudyLeadership(studyId: string, memberId: string) {
  const callable = httpsCallable<
    { memberId: string; studyId: string },
    { displayName: string }
  >(getFunctions(undefined, 'us-central1'), 'transferStudyLeadership');
  return (await callable({ memberId, studyId })).data;
}

export function subscribeToStudyMembers(
  studyId: string,
  onData: (members: StudyMemberPayload[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(getFirestore(), 'studies', studyId, 'members'),
      orderBy('joinedAt', 'asc'),
    ),
    (snapshot) => {
      onData(
        snapshot.docs.flatMap((document) => {
          const member = parseStudyMember(document.id, document.data());
          return member ? [member] : [];
        }),
      );
    },
    onError,
  );
}

function parseStudyMember(
  id: string,
  data: Record<string, unknown>,
): StudyMemberPayload | null {
  if (
    data.status !== 'active' ||
    typeof data.displayName !== 'string' ||
    (data.role !== 'leader' && data.role !== 'member')
  ) {
    return null;
  }

  return {
    displayName: data.displayName,
    id,
    role: data.role,
  };
}
