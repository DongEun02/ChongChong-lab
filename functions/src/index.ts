import { getApps, initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
  type DocumentReference,
} from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  parseNoticeReminderRequest,
  resolveUnreadRecipients,
} from './noticeReminders.js';

import {
  chunkTargets,
  getInvalidTokenReferences,
  parseNotificationJob,
  type PushTokenTarget,
} from './pushJobs.js';
import {
  parseCreateStudyRequest,
  parseJoinStudyRequest,
  parseRemoveStudyMemberRequest,
} from './studies.js';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const createStudy = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
    memory: '256MiB',
    region: 'us-central1',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    let input;
    try {
      input = parseCreateStudyRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const studyReference = db.collection('studies').doc();
    const memberReference = studyReference
      .collection('members')
      .doc(request.auth.uid);
    const userStudyReference = db
      .collection('users')
      .doc(request.auth.uid)
      .collection('studies')
      .doc(studyReference.id);
    const displayName = parseDisplayName(
      request.auth.token.name,
      request.auth.token.email,
    );

    await db.runTransaction(async (transaction) => {
      transaction.create(studyReference, {
        createdAt: FieldValue.serverTimestamp(),
        description: input.description,
        leaderId: request.auth!.uid,
        memberCount: 1,
        memberLimit: input.memberLimit,
        name: input.name,
        status: 'active',
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(memberReference, {
        displayName,
        joinedAt: FieldValue.serverTimestamp(),
        role: 'leader',
        status: 'active',
        userId: request.auth!.uid,
      });
      transaction.create(userStudyReference, {
        createdAt: FieldValue.serverTimestamp(),
        description: input.description,
        memberCount: 1,
        memberLimit: input.memberLimit,
        name: input.name,
        pendingAssignments: 0,
        role: 'leader',
        studyId: studyReference.id,
        unreadNotices: 0,
      });
    });

    return {
      study: {
        description: input.description,
        id: studyReference.id,
        memberCount: 1,
        memberLimit: input.memberLimit,
        name: input.name,
        role: 'leader',
      },
    };
  },
);

export const joinStudy = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
    memory: '256MiB',
    region: 'us-central1',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    let input;
    try {
      input = parseJoinStudyRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const userId = request.auth.uid;
    const studyReference = db.collection('studies').doc(input.studyId);
    const membersCollection = studyReference.collection('members');
    const memberReference = membersCollection.doc(userId);
    const userStudiesCollection = db
      .collection('users')
      .doc(userId)
      .collection('studies');
    const userStudyReference = userStudiesCollection.doc(input.studyId);
    const displayName = parseDisplayName(
      request.auth.token.name,
      request.auth.token.email,
    );

    const study = await db.runTransaction(async (transaction) => {
      const studySnapshot = await transaction.get(studyReference);
      if (!studySnapshot.exists || studySnapshot.get('status') !== 'active') {
        throw new HttpsError('not-found', '참여할 스터디를 찾을 수 없습니다.');
      }

      const memberSnapshot = await transaction.get(memberReference);
      if (memberSnapshot.get('status') === 'active') {
        throw new HttpsError('already-exists', '이미 참여 중인 스터디입니다.');
      }

      const [memberSnapshots, userStudySnapshots] = await Promise.all([
        transaction.get(membersCollection),
        transaction.get(userStudiesCollection),
      ]);
      const alreadyIndexed = userStudySnapshots.docs.some(
        (snapshot) => snapshot.id === input.studyId,
      );
      if (!alreadyIndexed && userStudySnapshots.size >= 50) {
        throw new HttpsError(
          'resource-exhausted',
          '참여할 수 있는 스터디는 최대 50개입니다.',
        );
      }

      const activeMembers = memberSnapshots.docs.filter(
        (snapshot) => snapshot.get('status') === 'active',
      );
      const memberLimit = studySnapshot.get('memberLimit');
      if (
        typeof memberLimit !== 'number' ||
        activeMembers.length >= memberLimit
      ) {
        throw new HttpsError('resource-exhausted', '스터디 정원이 가득 찼습니다.');
      }

      const memberCount = activeMembers.length + 1;
      const description = studySnapshot.get('description');
      const name = studySnapshot.get('name');
      if (typeof description !== 'string' || typeof name !== 'string') {
        throw new HttpsError(
          'failed-precondition',
          '스터디 정보가 올바르지 않습니다.',
        );
      }

      transaction.set(memberReference, {
        displayName,
        joinedAt: FieldValue.serverTimestamp(),
        role: 'member',
        status: 'active',
        userId,
      });
      transaction.set(userStudyReference, {
        createdAt: FieldValue.serverTimestamp(),
        description,
        memberCount,
        memberLimit,
        name,
        pendingAssignments: 0,
        role: 'member',
        studyId: input.studyId,
        unreadNotices: 0,
      });
      transaction.update(studyReference, {
        memberCount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      for (const activeMember of activeMembers) {
        transaction.set(
          db
            .collection('users')
            .doc(activeMember.id)
            .collection('studies')
            .doc(input.studyId),
          { memberCount },
          { merge: true },
        );
      }

      return {
        description,
        id: input.studyId,
        memberCount,
        memberLimit,
        name,
        role: 'member' as const,
      };
    });

    return { study };
  },
);

export const removeStudyMember = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
    memory: '256MiB',
    region: 'us-central1',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    let input;
    try {
      input = parseRemoveStudyMemberRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    if (input.memberId === request.auth.uid) {
      throw new HttpsError(
        'failed-precondition',
        '스터디 리드는 자신을 방출할 수 없습니다.',
      );
    }

    const studyReference = db.collection('studies').doc(input.studyId);
    const membersCollection = studyReference.collection('members');
    const actorReference = membersCollection.doc(request.auth.uid);
    const targetReference = membersCollection.doc(input.memberId);

    const result = await db.runTransaction(async (transaction) => {
      const [studySnapshot, actorSnapshot, targetSnapshot, memberSnapshots] =
        await Promise.all([
          transaction.get(studyReference),
          transaction.get(actorReference),
          transaction.get(targetReference),
          transaction.get(membersCollection),
        ]);

      if (!studySnapshot.exists || studySnapshot.get('status') !== 'active') {
        throw new HttpsError('not-found', '스터디를 찾을 수 없습니다.');
      }
      if (
        studySnapshot.get('leaderId') !== request.auth!.uid ||
        actorSnapshot.get('status') !== 'active' ||
        actorSnapshot.get('role') !== 'leader'
      ) {
        throw new HttpsError(
          'permission-denied',
          '스터디 리드만 멤버를 방출할 수 있습니다.',
        );
      }
      if (
        !targetSnapshot.exists ||
        targetSnapshot.get('status') !== 'active' ||
        targetSnapshot.get('role') !== 'member'
      ) {
        throw new HttpsError(
          'failed-precondition',
          '방출할 수 있는 스터디원을 찾지 못했습니다.',
        );
      }

      const activeMembers = memberSnapshots.docs.filter(
        (snapshot) => snapshot.get('status') === 'active',
      );
      const remainingMembers = activeMembers.filter(
        (snapshot) => snapshot.id !== input.memberId,
      );
      const memberCount = remainingMembers.length;

      transaction.update(targetReference, {
        removedAt: FieldValue.serverTimestamp(),
        removedBy: request.auth!.uid,
        status: 'removed',
      });
      transaction.delete(
        db
          .collection('users')
          .doc(input.memberId)
          .collection('studies')
          .doc(input.studyId),
      );
      transaction.update(studyReference, {
        memberCount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      for (const member of remainingMembers) {
        transaction.set(
          db
            .collection('users')
            .doc(member.id)
            .collection('studies')
            .doc(input.studyId),
          { memberCount },
          { merge: true },
        );
      }

      return {
        displayName: targetSnapshot.get('displayName'),
        memberCount,
      };
    });

    return result;
  },
);

export const sendNoticeReminder = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 10,
    memory: '256MiB',
    region: 'us-central1',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    let input;
    try {
      input = parseNoticeReminderRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const studyReference = db.collection('studies').doc(input.studyId);
    const studySnapshot = await studyReference.get();
    if (!studySnapshot.exists) {
      throw new HttpsError('not-found', '스터디를 찾을 수 없습니다.');
    }
    if (studySnapshot.get('leaderId') !== request.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        '스터디 리드만 리마인드를 보낼 수 있습니다.',
      );
    }

    const noticeReference = studyReference
      .collection('notices')
      .doc(input.noticeId);
    const [noticeSnapshot, memberSnapshots] = await Promise.all([
      noticeReference.get(),
      studyReference.collection('members').get(),
    ]);

    if (!noticeSnapshot.exists) {
      throw new HttpsError('not-found', '공지를 찾을 수 없습니다.');
    }

    const activeMemberIds = memberSnapshots.docs
      .filter((snapshot) => snapshot.get('status') === 'active')
      .map((snapshot) => snapshot.id);
    const rawReaders = noticeSnapshot.get('readByUserIds');
    const readByUserIds = Array.isArray(rawReaders)
      ? rawReaders.filter((userId): userId is string => typeof userId === 'string')
      : [];
    const recipientUserIds = resolveUnreadRecipients(
      input.recipientUserIds,
      activeMemberIds,
      readByUserIds,
    );

    if (recipientUserIds.length === 0) {
      throw new HttpsError(
        'failed-precondition',
        '리마인드를 받을 미확인 멤버가 없습니다.',
      );
    }

    const noticeTitle = noticeSnapshot.get('title');
    if (typeof noticeTitle !== 'string' || noticeTitle.trim().length === 0) {
      throw new HttpsError('failed-precondition', '공지 제목이 올바르지 않습니다.');
    }

    const jobReference = db.collection('notificationJobs').doc();
    await db.runTransaction(async (transaction) => {
      transaction.create(jobReference, {
        body: noticeTitle,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: request.auth!.uid,
        data: {
          noticeId: input.noticeId,
          screen: 'notice-detail',
          studyId: input.studyId,
        },
        recipientUserIds,
        status: 'pending',
        title: '읽지 않은 공지가 있어요',
      });

      transaction.update(
        noticeReference,
        Object.fromEntries(
          recipientUserIds.map((userId) => [
            `lastReminderAtByUserId.${userId}`,
            FieldValue.serverTimestamp(),
          ]),
        ),
      );
    });

    return { jobId: jobReference.id, targetCount: recipientUserIds.length };
  },
);

export const deliverPushNotification = onDocumentCreated(
  {
    document: 'notificationJobs/{jobId}',
    maxInstances: 10,
    memory: '256MiB',
    region: 'us-central1',
    retry: false,
    timeoutSeconds: 120,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    let job;
    try {
      job = parseNotificationJob(snapshot.data());
    } catch (error) {
      await snapshot.ref.update({
        errorMessage: getErrorMessage(error),
        finishedAt: FieldValue.serverTimestamp(),
        status: 'failed',
      });
      return;
    }

    const wasClaimed = await claimJob(snapshot.ref, event.id);
    if (!wasClaimed) {
      logger.info('이미 처리 중이거나 완료된 알림 작업입니다.', {
        jobId: snapshot.id,
      });
      return;
    }

    try {
      const targets = await getPushTokenTargets(job.recipientUserIds);
      let failureCount = 0;
      let successCount = 0;
      const invalidReferences: DocumentReference[] = [];

      for (const targetChunk of chunkTargets(targets)) {
        const response = await getMessaging().sendEachForMulticast({
          android: {
            notification: { channelId: 'general' },
            priority: 'high',
          },
          data: {
            ...job.data,
            notificationJobId: snapshot.id,
          },
          notification: {
            body: job.body,
            title: job.title,
          },
          tokens: targetChunk.map(({ token }) => token),
        });

        failureCount += response.failureCount;
        successCount += response.successCount;
        invalidReferences.push(
          ...getInvalidTokenReferences(targetChunk, response),
        );
      }

      await deleteInvalidTokens(invalidReferences);
      await snapshot.ref.update({
        failureCount,
        finishedAt: FieldValue.serverTimestamp(),
        invalidTokenCount: invalidReferences.length,
        status: 'sent',
        successCount,
        targetCount: targets.length,
      });
    } catch (error) {
      logger.error('푸시 알림 발송에 실패했습니다.', {
        error,
        jobId: snapshot.id,
      });
      await snapshot.ref.update({
        errorMessage: getErrorMessage(error),
        finishedAt: FieldValue.serverTimestamp(),
        status: 'failed',
      });
    }
  },
);

async function claimJob(
  reference: DocumentReference,
  eventId: string,
): Promise<boolean> {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.get('status') !== 'pending') {
      return false;
    }

    transaction.update(reference, {
      eventId,
      processingAt: FieldValue.serverTimestamp(),
      status: 'processing',
    });
    return true;
  });
}

async function getPushTokenTargets(
  recipientUserIds: string[],
): Promise<PushTokenTarget[]> {
  const snapshots = await Promise.all(
    recipientUserIds.map((userId) =>
      db.collection('users').doc(userId).collection('pushTokens').get(),
    ),
  );
  const targetsByToken = new Map<string, PushTokenTarget>();

  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) {
      const token = document.get('token');
      if (document.get('enabled') === true && typeof token === 'string') {
        targetsByToken.set(token, { reference: document.ref, token });
      }
    }
  }

  return [...targetsByToken.values()];
}

async function deleteInvalidTokens(
  references: DocumentReference[],
): Promise<void> {
  const uniqueReferences = new Map(
    references.map((reference) => [reference.path, reference]),
  );
  await Promise.all(
    [...uniqueReferences.values()].map((reference) => reference.delete()),
  );
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '알 수 없는 오류';
  return message.slice(0, 500);
}

function parseDisplayName(name: unknown, email: unknown) {
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim().slice(0, 30);
  }

  if (typeof email === 'string' && email.includes('@')) {
    return email.slice(0, email.indexOf('@')).slice(0, 30);
  }

  return '총총이';
}
