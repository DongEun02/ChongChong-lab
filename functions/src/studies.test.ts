import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCreateStudyRequest } from './studies.js';

test('parseCreateStudyRequest은 입력 앞뒤 공백을 제거한다', () => {
  assert.deepEqual(
    parseCreateStudyRequest({
      description: '  매주 화요일 저녁 9시  ',
      memberLimit: 5,
      name: '  우테코 8기 FE 스터디  ',
    }),
    {
      description: '매주 화요일 저녁 9시',
      memberLimit: 5,
      name: '우테코 8기 FE 스터디',
    },
  );
});

test('parseCreateStudyRequest은 선택 설명을 빈 문자열로 정규화한다', () => {
  assert.equal(
    parseCreateStudyRequest({ memberLimit: 2, name: '총총 스터디' })
      .description,
    '',
  );
});

test('parseCreateStudyRequest은 15자를 넘는 이름을 거부한다', () => {
  assert.throws(
    () =>
      parseCreateStudyRequest({
        memberLimit: 5,
        name: '가'.repeat(16),
      }),
    /15자 이하/,
  );
});

test('parseCreateStudyRequest은 범위를 벗어난 인원을 거부한다', () => {
  assert.throws(
    () => parseCreateStudyRequest({ memberLimit: 31, name: '총총 스터디' }),
    /2명 이상 30명 이하/,
  );
});
