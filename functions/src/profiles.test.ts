import assert from 'node:assert/strict';
import test from 'node:test';

import { parseUpdateProfileRequest } from './profiles.js';

test('parseUpdateProfileRequest은 이름 앞뒤 공백을 제거한다', () => {
  assert.deepEqual(parseUpdateProfileRequest({ displayName: '  바니  ' }), {
    displayName: '바니',
  });
});

test('parseUpdateProfileRequest은 빈 이름을 거부한다', () => {
  assert.throws(
    () => parseUpdateProfileRequest({ displayName: '   ' }),
    /이름을 입력/,
  );
});

test('parseUpdateProfileRequest은 8글자를 넘는 이름을 거부한다', () => {
  assert.throws(
    () => parseUpdateProfileRequest({ displayName: '가'.repeat(9) }),
    /8글자 이하/,
  );
});
