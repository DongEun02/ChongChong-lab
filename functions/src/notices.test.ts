import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseCreateNoticeRequest,
  parseDeleteNoticeRequest,
  parseMarkNoticeReadRequest,
  parseUpdateNoticeRequest,
} from './notices.js';

const NOW = new Date('2026-08-11T00:00:00.000Z');

test('parseCreateNoticeRequest은 입력을 정리하고 리마인드를 정렬한다', () => {
  assert.deepEqual(
    parseCreateNoticeRequest(
      {
        content: '  공지 내용  ',
        reminderAts: [
          '2026-08-11T02:00:00.000Z',
          '2026-08-11T01:00:00.000Z',
        ],
        studyId: 'study-1',
        title: '  공지 제목  ',
      },
      NOW,
    ),
    {
      content: '공지 내용',
      reminderAts: [
        new Date('2026-08-11T01:00:00.000Z'),
        new Date('2026-08-11T02:00:00.000Z'),
      ],
      studyId: 'study-1',
      title: '공지 제목',
    },
  );
});

test('parseCreateNoticeRequest은 과거와 중복 리마인드를 거부한다', () => {
  assert.throws(
    () =>
      parseCreateNoticeRequest(
        {
          content: '내용',
          reminderAts: ['2026-08-10T23:59:00.000Z'],
          studyId: 'study-1',
          title: '제목',
        },
        NOW,
      ),
    /현재부터 1년 이내/,
  );
  assert.throws(
    () =>
      parseCreateNoticeRequest(
        {
          content: '내용',
          reminderAts: [
            '2026-08-11T01:00:00.000Z',
            '2026-08-11T01:00:00.000Z',
          ],
          studyId: 'study-1',
          title: '제목',
        },
        NOW,
      ),
    /중복/,
  );
});

test('parseCreateNoticeRequest은 필수값과 길이를 검증한다', () => {
  assert.throws(
    () =>
      parseCreateNoticeRequest(
        {
          content: '',
          reminderAts: ['2026-08-11T01:00:00.000Z'],
          studyId: 'study-1',
          title: '제목',
        },
        NOW,
      ),
    /공지 내용/,
  );
  assert.throws(
    () =>
      parseCreateNoticeRequest(
        {
          content: '내용',
          reminderAts: ['2026-08-11T01:00:00.000Z'],
          studyId: 'studies/study-1',
          title: '제목',
        },
        NOW,
      ),
    /스터디 정보/,
  );
  assert.throws(
    () =>
      parseCreateNoticeRequest(
        {
          content: '내용',
          reminderAts: [],
          studyId: 'study-1',
          title: '제'.repeat(16),
        },
        NOW,
      ),
    /공지 제목은 1자 이상 15자 이하/,
  );
  assert.throws(
    () =>
      parseCreateNoticeRequest(
        {
          content: '내'.repeat(10_001),
          reminderAts: [],
          studyId: 'study-1',
          title: '제목',
        },
        NOW,
      ),
    /공지 내용은 1자 이상 10000자 이하/,
  );
});

test('parseCreateNoticeRequest은 리마인드 없이 공지를 생성할 수 있다', () => {
  const result = parseCreateNoticeRequest(
    {
      content: '내'.repeat(10_000),
      reminderAts: [],
      studyId: 'study-1',
      title: '제'.repeat(15),
    },
    NOW,
  );

  assert.equal(result.title.length, 15);
  assert.equal(result.content.length, 10_000);
  assert.deepEqual(result.reminderAts, []);
});

test('parseUpdateNoticeRequest은 공지 ID와 수정 내용을 검증한다', () => {
  assert.deepEqual(
    parseUpdateNoticeRequest(
      {
        content: '수정 내용',
        noticeId: 'notice-1',
        reminderAts: ['2026-08-11T01:00:00.000Z'],
        studyId: 'study-1',
        title: '수정 제목',
      },
      NOW,
    ),
    {
      content: '수정 내용',
      noticeId: 'notice-1',
      reminderAts: [new Date('2026-08-11T01:00:00.000Z')],
      studyId: 'study-1',
      title: '수정 제목',
    },
  );
  assert.throws(
    () =>
      parseUpdateNoticeRequest(
        {
          content: '수정 내용',
          noticeId: 'notices/notice-1',
          reminderAts: ['2026-08-11T01:00:00.000Z'],
          studyId: 'study-1',
          title: '수정 제목',
        },
        NOW,
      ),
    /공지 정보/,
  );
});

test('parseDeleteNoticeRequest은 스터디와 공지 ID를 검증한다', () => {
  assert.deepEqual(
    parseDeleteNoticeRequest({ noticeId: 'notice-1', studyId: 'study-1' }),
    { noticeId: 'notice-1', studyId: 'study-1' },
  );
  assert.throws(
    () =>
      parseDeleteNoticeRequest({
        noticeId: 'notices/notice-1',
        studyId: 'study-1',
      }),
    /공지 정보/,
  );
});

test('parseMarkNoticeReadRequest은 스터디와 공지 ID를 검증한다', () => {
  assert.deepEqual(
    parseMarkNoticeReadRequest({ noticeId: 'notice-1', studyId: 'study-1' }),
    { noticeId: 'notice-1', studyId: 'study-1' },
  );
  assert.throws(
    () =>
      parseMarkNoticeReadRequest({
        noticeId: 'notices/notice-1',
        studyId: 'study-1',
      }),
    /공지 정보/,
  );
});
