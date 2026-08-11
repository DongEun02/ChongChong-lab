import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseNoticeReminderRequest,
  resolveUnreadRecipients,
} from './noticeReminders.js';

test('parseNoticeReminderRequest은 문서 ID를 검증하고 수신자를 중복 제거한다', () => {
  assert.deepEqual(
    parseNoticeReminderRequest({
      noticeId: 'notice-1',
      recipientUserIds: ['user-a', 'user-a', 'user-b'],
      studyId: 'study-1',
    }),
    {
      noticeId: 'notice-1',
      recipientUserIds: ['user-a', 'user-b'],
      studyId: 'study-1',
    },
  );
});

test('parseNoticeReminderRequest은 비어 있거나 잘못된 요청을 거부한다', () => {
  assert.throws(
    () =>
      parseNoticeReminderRequest({
        noticeId: 'notice/1',
        recipientUserIds: [],
        studyId: 'study-1',
      }),
    /공지 ID/,
  );
});

test('resolveUnreadRecipients는 활성 멤버 중 미확인자만 반환한다', () => {
  assert.deepEqual(
    resolveUnreadRecipients(
      ['reader', 'unread', 'former-member'],
      ['reader', 'unread'],
      ['reader'],
    ),
    ['unread'],
  );
});
