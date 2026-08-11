import { getApps, initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type DocumentReference,
} from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import {
  parseAssignmentReminderRequest,
  parseCreateAssignmentRequest,
  parseSubmitAssignmentRequest,
  resolveAssignmentReminderSchedule,
} from './assignments.js';

import {
  parseNoticeReminderRequest,
  resolveUnreadRecipients,
} from './noticeReminders.js';
import {
  parseCreateNoticeRequest,
  parseDeleteNoticeRequest,
  parseMarkNoticeReadRequest,
  parseUpdateNoticeRequest,
} from './notices.js';
import { parseReadNotificationRequest } from './notifications.js';

import {
  chunkTargets,
  getInvalidTokenReferences,
  parseNotificationJob,
  type PushTokenTarget,
} from './pushJobs.js';
import {
  parseCreateStudyRequest,
  parseDeleteStudyRequest,
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

export const deleteStudy = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 5,
    memory: '256MiB',
    region: 'us-central1',
    timeoutSeconds: 540,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    let input;
    try {
      input = parseDeleteStudyRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const studyReference = db.collection('studies').doc(input.studyId);
    const actorReference = studyReference
      .collection('members')
      .doc(request.auth.uid);

    const studyName = await db.runTransaction(async (transaction) => {
      const [studySnapshot, actorSnapshot] = await Promise.all([
        transaction.get(studyReference),
        transaction.get(actorReference),
      ]);
      if (!studySnapshot.exists) {
        throw new HttpsError('not-found', '삭제할 스터디를 찾을 수 없습니다.');
      }
      const status = studySnapshot.get('status');
      if (status !== 'active' && status !== 'deleting') {
        throw new HttpsError('not-found', '삭제할 스터디를 찾을 수 없습니다.');
      }
      if (
        studySnapshot.get('leaderId') !== request.auth!.uid ||
        actorSnapshot.get('status') !== 'active' ||
        actorSnapshot.get('role') !== 'leader'
      ) {
        throw new HttpsError(
          'permission-denied',
          '스터디 리드만 스터디를 삭제할 수 있습니다.',
        );
      }

      const name = studySnapshot.get('name');
      if (typeof name !== 'string') {
        throw new HttpsError(
          'failed-precondition',
          '스터디 정보가 올바르지 않습니다.',
        );
      }

      if (status === 'active') {
        transaction.update(studyReference, {
          deletingAt: FieldValue.serverTimestamp(),
          deletingBy: request.auth!.uid,
          status: 'deleting',
        });
      }

      return name;
    });

    const userStudySnapshots = await db
      .collectionGroup('studies')
      .where('studyId', '==', input.studyId)
      .get();

    await db.recursiveDelete(studyReference);

    const bulkWriter = db.bulkWriter();
    for (const userStudySnapshot of userStudySnapshots.docs) {
      bulkWriter.delete(userStudySnapshot.ref);
    }
    await bulkWriter.close();

    return { name: studyName };
  },
);

export const createNotice = onCall(
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
      input = parseCreateNoticeRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const studyReference = db.collection('studies').doc(input.studyId);
    const actorReference = studyReference
      .collection('members')
      .doc(request.auth.uid);
    const noticeReference = studyReference.collection('notices').doc();
    const notificationJobReference = db.collection('notificationJobs').doc();

    const result = await db.runTransaction(async (transaction) => {
      const [studySnapshot, actorSnapshot, memberSnapshots] = await Promise.all([
        transaction.get(studyReference),
        transaction.get(actorReference),
        transaction.get(studyReference.collection('members')),
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
          '스터디 리드만 공지를 작성할 수 있습니다.',
        );
      }

      const displayName = actorSnapshot.get('displayName');
      const authorName =
        typeof displayName === 'string' && displayName.trim().length > 0
          ? displayName.trim()
          : parseDisplayName(
              request.auth!.token.name,
              request.auth!.token.email,
            );
      const activeMembers = memberSnapshots.docs.filter(
        (snapshot) => snapshot.get('status') === 'active',
      );
      const recipientUserIds = activeMembers
        .filter((snapshot) => snapshot.id !== request.auth!.uid)
        .map((snapshot) => snapshot.id);
      const reminderAts = input.reminderAts.map((date) =>
        Timestamp.fromDate(date),
      );

      transaction.create(noticeReference, {
        authorId: request.auth!.uid,
        authorName,
        content: input.content,
        lastReminderAtByUserId: {},
        nextReminderAt: reminderAts[0],
        publishedAt: FieldValue.serverTimestamp(),
        readByUserIds: [request.auth!.uid],
        reminderAt: reminderAts[0],
        reminderAts,
        title: input.title,
        updatedAt: FieldValue.serverTimestamp(),
      });

      for (const member of activeMembers) {
        if (member.id === request.auth!.uid) {
          continue;
        }
        transaction.set(
          db
            .collection('users')
            .doc(member.id)
            .collection('studies')
            .doc(input.studyId),
          { unreadNotices: FieldValue.increment(1) },
          { merge: true },
        );
      }

      if (recipientUserIds.length > 0) {
        transaction.create(notificationJobReference, {
          body: input.title,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: request.auth!.uid,
          data: {
            noticeId: noticeReference.id,
            screen: 'notice-detail',
            studyId: input.studyId,
          },
          recipientUserIds,
          status: 'pending',
          title: '새 공지가 올라왔어요',
        });
      }

      return { id: noticeReference.id, title: input.title };
    });

    return { notice: result };
  },
);

export const markNoticeRead = onCall(
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
      input = parseMarkNoticeReadRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const studyReference = db.collection('studies').doc(input.studyId);
    const memberReference = studyReference
      .collection('members')
      .doc(request.auth.uid);
    const noticeReference = studyReference
      .collection('notices')
      .doc(input.noticeId);
    const userStudyReference = db
      .collection('users')
      .doc(request.auth.uid)
      .collection('studies')
      .doc(input.studyId);
    const notificationJobReference = db.collection('notificationJobs').doc();

    const wasUpdated = await db.runTransaction(async (transaction) => {
      const [studySnapshot, memberSnapshot, noticeSnapshot] = await Promise.all([
        transaction.get(studyReference),
        transaction.get(memberReference),
        transaction.get(noticeReference),
      ]);

      if (
        !studySnapshot.exists ||
        studySnapshot.get('status') !== 'active' ||
        !noticeSnapshot.exists
      ) {
        throw new HttpsError('not-found', '공지를 찾을 수 없습니다.');
      }
      if (memberSnapshot.get('status') !== 'active') {
        throw new HttpsError(
          'permission-denied',
          '스터디 멤버만 공지를 확인할 수 있습니다.',
        );
      }

      const rawReaders = noticeSnapshot.get('readByUserIds');
      const readers = Array.isArray(rawReaders)
        ? rawReaders.filter(
            (userId): userId is string => typeof userId === 'string',
          )
        : [];
      if (readers.includes(request.auth!.uid)) {
        return false;
      }

      transaction.update(noticeReference, {
        [`readAtByUserId.${request.auth!.uid}`]: FieldValue.serverTimestamp(),
        readByUserIds: FieldValue.arrayUnion(request.auth!.uid),
      });
      transaction.set(
        userStudyReference,
        { unreadNotices: FieldValue.increment(-1) },
        { merge: true },
      );

      const leaderId = studySnapshot.get('leaderId');
      if (
        typeof leaderId === 'string' &&
        leaderId.length > 0 &&
        leaderId !== request.auth!.uid
      ) {
        const displayName = memberSnapshot.get('displayName');
        const memberName =
          typeof displayName === 'string' && displayName.trim().length > 0
            ? displayName.trim()
            : parseDisplayName(
                request.auth!.token.name,
                request.auth!.token.email,
              );
        const noticeTitle = noticeSnapshot.get('title');
        transaction.create(notificationJobReference, {
          body:
            typeof noticeTitle === 'string' && noticeTitle.trim().length > 0
              ? noticeTitle
              : '공지',
          createdAt: FieldValue.serverTimestamp(),
          createdBy: request.auth!.uid,
          data: {
            noticeId: input.noticeId,
            screen: 'notice-detail',
            studyId: input.studyId,
          },
          recipientUserIds: [leaderId],
          status: 'pending',
          title: `${memberName}님이 공지를 확인했어요`,
        });
      }

      return true;
    });

    return { noticeId: input.noticeId, wasUpdated };
  },
);

export const updateNotice = onCall(
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
      input = parseUpdateNoticeRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const studyReference = db.collection('studies').doc(input.studyId);
    const actorReference = studyReference
      .collection('members')
      .doc(request.auth.uid);
    const noticeReference = studyReference
      .collection('notices')
      .doc(input.noticeId);

    await db.runTransaction(async (transaction) => {
      const [studySnapshot, actorSnapshot, noticeSnapshot] = await Promise.all([
        transaction.get(studyReference),
        transaction.get(actorReference),
        transaction.get(noticeReference),
      ]);

      if (!studySnapshot.exists || studySnapshot.get('status') !== 'active') {
        throw new HttpsError('not-found', '스터디를 찾을 수 없습니다.');
      }
      if (!noticeSnapshot.exists) {
        throw new HttpsError('not-found', '수정할 공지를 찾을 수 없습니다.');
      }
      if (
        studySnapshot.get('leaderId') !== request.auth!.uid ||
        actorSnapshot.get('status') !== 'active' ||
        actorSnapshot.get('role') !== 'leader'
      ) {
        throw new HttpsError(
          'permission-denied',
          '스터디 리드만 공지를 수정할 수 있습니다.',
        );
      }

      const reminderAts = input.reminderAts.map((date) =>
        Timestamp.fromDate(date),
      );
      transaction.update(noticeReference, {
        content: input.content,
        nextReminderAt: reminderAts[0],
        reminderAt: reminderAts[0],
        reminderAts,
        title: input.title,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return { notice: { id: input.noticeId, title: input.title } };
  },
);

export const deleteNotice = onCall(
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
      input = parseDeleteNoticeRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const studyReference = db.collection('studies').doc(input.studyId);
    const actorReference = studyReference
      .collection('members')
      .doc(request.auth.uid);
    const noticeReference = studyReference
      .collection('notices')
      .doc(input.noticeId);

    const title = await db.runTransaction(async (transaction) => {
      const [studySnapshot, actorSnapshot, noticeSnapshot, memberSnapshots] =
        await Promise.all([
          transaction.get(studyReference),
          transaction.get(actorReference),
          transaction.get(noticeReference),
          transaction.get(studyReference.collection('members')),
        ]);

      if (!studySnapshot.exists || studySnapshot.get('status') !== 'active') {
        throw new HttpsError('not-found', '스터디를 찾을 수 없습니다.');
      }
      if (!noticeSnapshot.exists) {
        throw new HttpsError('not-found', '삭제할 공지를 찾을 수 없습니다.');
      }
      if (
        studySnapshot.get('leaderId') !== request.auth!.uid ||
        actorSnapshot.get('status') !== 'active' ||
        actorSnapshot.get('role') !== 'leader'
      ) {
        throw new HttpsError(
          'permission-denied',
          '스터디 리드만 공지를 삭제할 수 있습니다.',
        );
      }

      const rawReaders = noticeSnapshot.get('readByUserIds');
      const readers = new Set(
        Array.isArray(rawReaders)
          ? rawReaders.filter(
              (userId): userId is string => typeof userId === 'string',
            )
          : [],
      );
      for (const member of memberSnapshots.docs) {
        if (
          member.get('status') !== 'active' ||
          member.get('role') === 'leader' ||
          readers.has(member.id)
        ) {
          continue;
        }
        transaction.set(
          db
            .collection('users')
            .doc(member.id)
            .collection('studies')
            .doc(input.studyId),
          { unreadNotices: FieldValue.increment(-1) },
          { merge: true },
        );
      }

      transaction.delete(noticeReference);
      const noticeTitle = noticeSnapshot.get('title');
      return typeof noticeTitle === 'string' ? noticeTitle : '';
    });

    return { notice: { id: input.noticeId, title } };
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

export const createAssignment = onCall(
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
      input = parseCreateAssignmentRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const studyReference = db.collection('studies').doc(input.studyId);
    const assignmentReference = studyReference.collection('assignments').doc();
    const notificationJobReference = db.collection('notificationJobs').doc();
    const result = await db.runTransaction(async (transaction) => {
      const [studySnapshot, actorSnapshot, memberSnapshots] = await Promise.all([
        transaction.get(studyReference),
        transaction.get(studyReference.collection('members').doc(request.auth!.uid)),
        transaction.get(studyReference.collection('members')),
      ]);
      if (!studySnapshot.exists || studySnapshot.get('status') !== 'active') {
        throw new HttpsError('not-found', '스터디를 찾을 수 없습니다.');
      }
      if (
        studySnapshot.get('leaderId') !== request.auth!.uid ||
        actorSnapshot.get('status') !== 'active' ||
        actorSnapshot.get('role') !== 'leader'
      ) {
        throw new HttpsError('permission-denied', '스터디 리드만 과제를 작성할 수 있습니다.');
      }

      const members = memberSnapshots.docs.filter((member) =>
        member.get('status') === 'active' && member.get('role') !== 'leader'
      );
      const reminderAts = input.reminderAts.map((date) =>
        Timestamp.fromDate(date),
      );
      transaction.create(assignmentReference, {
        authorId: request.auth!.uid,
        content: input.content,
        createdAt: FieldValue.serverTimestamp(),
        deadlineAt: Timestamp.fromDate(input.deadlineAt),
        lastReminderAtByUserId: {},
        nextReminderAt: reminderAts[0],
        reminderAt: reminderAts[0],
        reminderAts,
        submissionInstructions: input.submissionInstructions,
        submittedByUserIds: [],
        title: input.title,
        updatedAt: FieldValue.serverTimestamp(),
      });
      for (const member of members) {
        transaction.set(
          db.collection('users').doc(member.id).collection('studies').doc(input.studyId),
          { pendingAssignments: FieldValue.increment(1) },
          { merge: true },
        );
      }
      if (members.length > 0) {
        transaction.create(notificationJobReference, {
          body: input.title,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: request.auth!.uid,
          data: {
            assignmentId: assignmentReference.id,
            screen: 'assignment-detail',
            studyId: input.studyId,
          },
          recipientUserIds: members.map((member) => member.id),
          status: 'pending',
          title: '새 과제가 올라왔어요',
        });
      }
      return { id: assignmentReference.id, title: input.title };
    });
    return { assignment: result };
  },
);

export const submitAssignment = onCall(
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
      input = parseSubmitAssignmentRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }
    const studyReference = db.collection('studies').doc(input.studyId);
    const assignmentReference = studyReference.collection('assignments').doc(input.assignmentId);
    const memberReference = studyReference.collection('members').doc(request.auth.uid);
    const submissionReference = assignmentReference.collection('submissions').doc(request.auth.uid);
    const result = await db.runTransaction(async (transaction) => {
      const [studySnapshot, assignmentSnapshot, memberSnapshot, submissionSnapshot] = await Promise.all([
        transaction.get(studyReference),
        transaction.get(assignmentReference),
        transaction.get(memberReference),
        transaction.get(submissionReference),
      ]);
      if (!studySnapshot.exists || studySnapshot.get('status') !== 'active' || !assignmentSnapshot.exists) {
        throw new HttpsError('not-found', '과제를 찾을 수 없습니다.');
      }
      if (memberSnapshot.get('status') !== 'active' || memberSnapshot.get('role') === 'leader') {
        throw new HttpsError('permission-denied', '스터디원만 과제를 제출할 수 있습니다.');
      }
      const isFirstSubmission = !submissionSnapshot.exists;
      const originalSubmittedAt = submissionSnapshot.get('submittedAt');
      transaction.set(submissionReference, {
        content: input.content,
        link: input.link ?? null,
        submittedAt: isFirstSubmission
          ? FieldValue.serverTimestamp()
          : originalSubmittedAt instanceof Timestamp
            ? originalSubmittedAt
            : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        userId: request.auth!.uid,
        userName: memberSnapshot.get('displayName') ?? '스터디원',
      });
      if (isFirstSubmission) {
        transaction.update(assignmentReference, {
          submittedByUserIds: FieldValue.arrayUnion(request.auth!.uid),
        });
        transaction.set(
          db.collection('users').doc(request.auth!.uid).collection('studies').doc(input.studyId),
          { pendingAssignments: FieldValue.increment(-1) },
          { merge: true },
        );
      }
      transaction.update(assignmentReference, {
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: input.assignmentId, submittedAt: new Date().toISOString() };
    });
    return { submission: result };
  },
);

export const sendAssignmentReminder = onCall(
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
      input = parseAssignmentReminderRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }
    const studyReference = db.collection('studies').doc(input.studyId);
    const assignmentReference = studyReference.collection('assignments').doc(input.assignmentId);
    const [studySnapshot, assignmentSnapshot, memberSnapshots] = await Promise.all([
      studyReference.get(),
      assignmentReference.get(),
      studyReference.collection('members').get(),
    ]);
    if (!studySnapshot.exists || !assignmentSnapshot.exists) {
      throw new HttpsError('not-found', '과제를 찾을 수 없습니다.');
    }
    if (studySnapshot.get('leaderId') !== request.auth.uid) {
      throw new HttpsError('permission-denied', '스터디 리드만 리마인드를 보낼 수 있습니다.');
    }
    const submittedByUserIds = assignmentSnapshot.get('submittedByUserIds');
    const submittedIds = new Set<string>(
      Array.isArray(submittedByUserIds)
        ? submittedByUserIds.filter((id): id is string => typeof id === 'string')
        : [],
    );
    const activeIds = new Set(memberSnapshots.docs.filter((member) =>
      member.get('status') === 'active' && member.get('role') !== 'leader'
    ).map((member) => member.id));
    const recipients = input.recipientUserIds.filter((id) => activeIds.has(id) && !submittedIds.has(id));
    if (recipients.length === 0) {
      throw new HttpsError('failed-precondition', '리마인드를 받을 미제출 멤버가 없습니다.');
    }
    const jobReference = db.collection('notificationJobs').doc();
    await db.runTransaction(async (transaction) => {
      transaction.create(jobReference, {
        body: assignmentSnapshot.get('title'),
        createdAt: FieldValue.serverTimestamp(),
        createdBy: request.auth!.uid,
        data: { assignmentId: input.assignmentId, screen: 'assignment-detail', studyId: input.studyId },
        recipientUserIds: recipients,
        status: 'pending',
        title: '제출하지 않은 과제가 있어요',
      });
      transaction.update(assignmentReference, Object.fromEntries(recipients.map((id) => [
        `lastReminderAtByUserId.${id}`,
        FieldValue.serverTimestamp(),
      ])));
    });
    return { jobId: jobReference.id, targetCount: recipients.length };
  },
);

export const deliverAssignmentReminders = onSchedule(
  {
    maxInstances: 1,
    region: 'us-central1',
    schedule: 'every 1 minutes',
    timeZone: 'Asia/Seoul',
    timeoutSeconds: 120,
  },
  async () => {
    const now = Timestamp.now();
    const dueAssignments = await db
      .collectionGroup('assignments')
      .where('nextReminderAt', '<=', now)
      .limit(100)
      .get();

    await Promise.all(dueAssignments.docs.map(async (candidate) => {
      const studyReference = candidate.ref.parent.parent;
      if (!studyReference) {
        return;
      }
      await db.runTransaction(async (transaction) => {
        const [assignmentSnapshot, studySnapshot, memberSnapshots] = await Promise.all([
          transaction.get(candidate.ref),
          transaction.get(studyReference),
          transaction.get(studyReference.collection('members')),
        ]);
        const nextReminderAt = assignmentSnapshot.get('nextReminderAt');
        if (
          !assignmentSnapshot.exists ||
          !studySnapshot.exists ||
          studySnapshot.get('status') !== 'active' ||
          !(nextReminderAt instanceof Timestamp) ||
          nextReminderAt.toMillis() > now.toMillis()
        ) {
          return;
        }

        const reminderAtsValue = assignmentSnapshot.get('reminderAts');
        const reminderDates = Array.isArray(reminderAtsValue)
          ? reminderAtsValue
              .filter((value): value is Timestamp => value instanceof Timestamp)
              .map((value) => value.toDate())
          : [];
        const schedule = resolveAssignmentReminderSchedule(
          reminderDates,
          now.toDate(),
        );
        const submittedByUserIds = assignmentSnapshot.get('submittedByUserIds');
        const submittedIds = new Set<string>(
          Array.isArray(submittedByUserIds)
            ? submittedByUserIds.filter((id): id is string => typeof id === 'string')
            : [],
        );
        const recipientUserIds = memberSnapshots.docs
          .filter((member) =>
            member.get('status') === 'active' &&
            member.get('role') !== 'leader' &&
            !submittedIds.has(member.id)
          )
          .map((member) => member.id);

        transaction.update(candidate.ref, {
          nextReminderAt: schedule.nextAt
            ? Timestamp.fromDate(schedule.nextAt)
            : FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(recipientUserIds.length > 0
            ? Object.fromEntries(recipientUserIds.map((id) => [
                `lastReminderAtByUserId.${id}`,
                FieldValue.serverTimestamp(),
              ]))
            : {}),
        });
        if (!schedule.dueAt || recipientUserIds.length === 0) {
          return;
        }

        const title = assignmentSnapshot.get('title');
        const jobId = [
          'assignment',
          studyReference.id,
          candidate.id,
          schedule.dueAt.getTime(),
        ].join('-');
        transaction.create(db.collection('notificationJobs').doc(jobId), {
          body: typeof title === 'string' ? title : '과제를 확인해 주세요.',
          createdAt: FieldValue.serverTimestamp(),
          createdBy: 'scheduler',
          data: {
            assignmentId: candidate.id,
            screen: 'assignment-detail',
            studyId: studyReference.id,
          },
          recipientUserIds,
          status: 'pending',
          title: '제출하지 않은 과제가 있어요',
        });
      });
    }));
  },
);

export const readNotification = onCall(
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
      input = parseReadNotificationRequest(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', getErrorMessage(error));
    }

    const notificationReference = db
      .collection('users')
      .doc(request.auth.uid)
      .collection('notifications')
      .doc(input.notificationId);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(notificationReference);
      if (!snapshot.exists) {
        throw new HttpsError('not-found', '알림을 찾을 수 없습니다.');
      }
      if (!snapshot.get('readAt')) {
        transaction.update(notificationReference, {
          readAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return { notificationId: input.notificationId };
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
      await persistInAppNotifications(
        snapshot.id,
        job,
        snapshot.get('createdAt'),
      );
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

async function persistInAppNotifications(
  jobId: string,
  job: ReturnType<typeof parseNotificationJob>,
  createdAt: unknown,
) {
  const batch = db.batch();
  for (const userId of job.recipientUserIds) {
    const notificationReference = db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(jobId);
    batch.set(notificationReference, {
      body: job.body,
      createdAt:
        createdAt instanceof Timestamp
          ? createdAt
          : FieldValue.serverTimestamp(),
      data: job.data,
      readAt: null,
      title: job.title,
    });
  }
  await batch.commit();
}

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
