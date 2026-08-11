import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseCreateStudyRequest,
  parseDeleteStudyRequest,
  parseJoinStudyRequest,
  parseRemoveStudyMemberRequest,
  parseTransferStudyLeadershipRequest,
} from './studies.js';

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

test('parseJoinStudyRequest은 총총 초대 링크에서 스터디 ID를 추출한다', () => {
  assert.deepEqual(
    parseJoinStudyRequest({ inviteUrl: 'chongchong.app/join/study-1' }),
    { studyId: 'study-1' },
  );
  assert.deepEqual(
    parseJoinStudyRequest({
      inviteUrl: 'https://chongchong.app/join/study_2',
    }),
    { studyId: 'study_2' },
  );
});

test('parseJoinStudyRequest은 외부 도메인과 잘못된 경로를 거부한다', () => {
  assert.throws(
    () =>
      parseJoinStudyRequest({
        inviteUrl: 'https://example.com/join/study-1',
      }),
    /총총에서 발급된/,
  );
  assert.throws(
    () => parseJoinStudyRequest({ inviteUrl: 'chongchong.app/study-1' }),
    /총총에서 발급된/,
  );
});

test('parseRemoveStudyMemberRequest은 스터디와 멤버 ID를 검증한다', () => {
  assert.deepEqual(
    parseRemoveStudyMemberRequest({ memberId: 'member_1', studyId: 'study-1' }),
    { memberId: 'member_1', studyId: 'study-1' },
  );
  assert.throws(
    () =>
      parseRemoveStudyMemberRequest({
        memberId: 'members/member-1',
        studyId: 'study-1',
      }),
    /멤버 정보가 올바르지/,
  );
});

test('parseDeleteStudyRequest은 스터디 ID를 검증한다', () => {
  assert.deepEqual(parseDeleteStudyRequest({ studyId: 'study-1' }), {
    studyId: 'study-1',
  });
  assert.throws(
    () => parseDeleteStudyRequest({ studyId: 'studies/study-1' }),
    /스터디 정보가 올바르지/,
  );
});

test('parseTransferStudyLeadershipRequest은 양도 대상과 스터디를 검증한다', () => {
  assert.deepEqual(parseTransferStudyLeadershipRequest({
    memberId: 'member-1',
    studyId: 'study-1',
  }), { memberId: 'member-1', studyId: 'study-1' });
});
