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

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

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
    const noticeReference = studyReference
      .collection('notices')
      .doc(input.noticeId);
    const [studySnapshot, noticeSnapshot, memberSnapshots] = await Promise.all([
      studyReference.get(),
      noticeReference.get(),
      studyReference.collection('members').get(),
    ]);

    if (!studySnapshot.exists || !noticeSnapshot.exists) {
      throw new HttpsError('not-found', '스터디 또는 공지를 찾을 수 없습니다.');
    }
    if (studySnapshot.get('leaderId') !== request.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        '스터디 리드만 리마인드를 보낼 수 있습니다.',
      );
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

    const jobReference = db.collection('notificationJobs').doc();
    await db.runTransaction(async (transaction) => {
      transaction.create(jobReference, {
        body: noticeSnapshot.get('title'),
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
