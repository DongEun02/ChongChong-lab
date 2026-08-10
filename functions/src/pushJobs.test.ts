import assert from 'node:assert/strict';
import test from 'node:test';

import type { DocumentReference } from 'firebase-admin/firestore';
import type { BatchResponse } from 'firebase-admin/messaging';

import {
  chunkTargets,
  getInvalidTokenReferences,
  parseNotificationJob,
  type PushTokenTarget,
} from './pushJobs.js';

test('parseNotificationJob은 중복 수신자를 제거하고 문자열 데이터를 보존한다', () => {
  assert.deepEqual(
    parseNotificationJob({
      body: '새 공지가 등록됐어요.',
      data: { path: '/notices/notice-1' },
      recipientUserIds: ['user-1', 'user-1', 'user-2'],
      status: 'pending',
      title: '총총',
    }),
    {
      body: '새 공지가 등록됐어요.',
      data: { path: '/notices/notice-1' },
      recipientUserIds: ['user-1', 'user-2'],
      title: '총총',
    },
  );
});

test('parseNotificationJob은 클라이언트가 만든 잘못된 작업을 거부한다', () => {
  assert.throws(
    () =>
      parseNotificationJob({
        body: '본문',
        recipientUserIds: [],
        status: 'pending',
        title: '제목',
      }),
    /recipientUserIds/,
  );
  assert.throws(
    () =>
      parseNotificationJob({
        body: '본문',
        data: { count: 1 },
        recipientUserIds: ['user-1'],
        status: 'pending',
        title: '제목',
      }),
    /data/,
  );
});

test('chunkTargets는 FCM 제한에 맞춰 대상을 나눈다', () => {
  const targets = Array.from({ length: 5 }, (_, index) =>
    createTarget(`token-${index}`),
  );
  assert.deepEqual(
    chunkTargets(targets, 2).map((chunk) => chunk.length),
    [2, 2, 1],
  );
});

test('getInvalidTokenReferences는 만료된 토큰 문서만 반환한다', () => {
  const targets = [createTarget('valid'), createTarget('expired')];
  const response = {
    failureCount: 1,
    responses: [
      { success: true },
      {
        error: { code: 'messaging/registration-token-not-registered' },
        success: false,
      },
    ],
    successCount: 1,
  } as BatchResponse;

  assert.deepEqual(getInvalidTokenReferences(targets, response), [
    targets[1]?.reference,
  ]);
});

function createTarget(token: string): PushTokenTarget {
  return {
    reference: { path: `users/user-1/pushTokens/${token}` } as DocumentReference,
    token,
  };
}
