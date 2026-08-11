import assert from 'node:assert/strict';
import test from 'node:test';

import { parseReadNotificationRequest } from './notifications.js';

test('parseReadNotificationRequest은 알림 문서 ID를 검증한다', () => {
  assert.deepEqual(
    parseReadNotificationRequest({ notificationId: 'job_123-abc' }),
    { notificationId: 'job_123-abc' },
  );
});

test('parseReadNotificationRequest은 잘못된 요청을 거부한다', () => {
  assert.throws(
    () => parseReadNotificationRequest({ notificationId: '../secret' }),
    /알림 정보가 올바르지 않습니다/,
  );
  assert.throws(
    () => parseReadNotificationRequest(null),
    /알림 읽음 요청 형식이 올바르지 않습니다/,
  );
});
