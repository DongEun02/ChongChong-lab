import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseAssignmentReminderRequest,
  parseCreateAssignmentRequest,
  parseDeleteAssignmentRequest,
  parseSubmitAssignmentRequest,
  parseUpdateAssignmentRequest,
  resolveAssignmentReminderSchedule,
} from './assignments.js';

const NOW = new Date('2026-08-11T00:00:00.000Z');

test('과제 생성 요청을 검증하고 리마인드를 정렬한다', () => {
  const result = parseCreateAssignmentRequest({
    content: ' 내용 ',
    deadlineAt: '2026-08-12T03:00:00.000Z',
    reminderAts: ['2026-08-12T02:00:00.000Z', '2026-08-12T01:00:00.000Z'],
    studyId: 'study-1',
    submissionInstructions: ' 링크 제출 ',
    title: ' 과제 ',
  }, NOW);
  assert.equal(result.title, '과제');
  assert.equal(result.reminderAts[0]?.toISOString(), '2026-08-12T01:00:00.000Z');
});

test('마감 이후 리마인드를 거부한다', () => {
  assert.throws(() => parseCreateAssignmentRequest({
    content: '내용',
    deadlineAt: '2026-08-12T01:00:00.000Z',
    reminderAts: ['2026-08-12T02:00:00.000Z'],
    studyId: 'study-1',
    submissionInstructions: '링크 제출',
    title: '과제',
  }, NOW), /마감 시각보다 빨라야/);
});

test('과제 생성 요청은 리마인드를 선택으로 처리하고 입력 길이를 검증한다', () => {
  const result = parseCreateAssignmentRequest({
    content: '내'.repeat(10_000),
    deadlineAt: '2026-08-12T03:00:00.000Z',
    reminderAts: [],
    studyId: 'study-1',
    submissionInstructions: '링크 제출',
    title: '제'.repeat(15),
  }, NOW);
  assert.deepEqual(result.reminderAts, []);
  assert.equal(result.content.length, 10_000);
  assert.throws(() => parseCreateAssignmentRequest({
    content: '내용',
    deadlineAt: '2026-08-12T03:00:00.000Z',
    reminderAts: [],
    studyId: 'study-1',
    submissionInstructions: '링크 제출',
    title: '제'.repeat(16),
  }, NOW), /과제 제목은 1자 이상 15자 이하/);
});

test('과제 제출 링크와 리마인드 수신자를 검증한다', () => {
  assert.equal(parseSubmitAssignmentRequest({
    assignmentId: 'assignment-1',
    content: '풀이 내용',
    link: 'https://github.com/example/pr/1',
    studyId: 'study-1',
  }).link, 'https://github.com/example/pr/1');
  assert.equal(parseSubmitAssignmentRequest({
    assignmentId: 'assignment-1',
    content: '내'.repeat(10_000),
    studyId: 'study-1',
  }).content.length, 10_000);
  assert.throws(() => parseSubmitAssignmentRequest({
    assignmentId: 'assignment-1',
    content: '내'.repeat(10_001),
    studyId: 'study-1',
  }), /제출 내용은 1자 이상 10000자 이하/);
  assert.deepEqual(parseAssignmentReminderRequest({
    assignmentId: 'assignment-1',
    recipientUserIds: ['member-1', 'member-1'],
    studyId: 'study-1',
  }).recipientUserIds, ['member-1']);
});

test('예약 리마인드의 현재 발송 시각과 다음 시각을 구한다', () => {
  const schedule = resolveAssignmentReminderSchedule([
    new Date('2026-08-10T23:00:00.000Z'),
    new Date('2026-08-11T01:00:00.000Z'),
    new Date('2026-08-11T02:00:00.000Z'),
  ], new Date('2026-08-11T01:30:00.000Z'));
  assert.equal(schedule.dueAt?.toISOString(), '2026-08-11T01:00:00.000Z');
  assert.equal(schedule.nextAt?.toISOString(), '2026-08-11T02:00:00.000Z');
});

test('과제 수정 요청은 과제 ID와 수정 내용을 검증한다', () => {
  const result = parseUpdateAssignmentRequest({
    assignmentId: 'assignment-1',
    content: '수정 내용',
    deadlineAt: '2026-08-12T03:00:00.000Z',
    reminderAts: ['2026-08-12T01:00:00.000Z'],
    studyId: 'study-1',
    submissionInstructions: '수정된 제출 방법',
    title: '수정 과제',
  }, NOW);
  assert.equal(result.assignmentId, 'assignment-1');
  assert.equal(result.title, '수정 과제');
});

test('과제 삭제 요청은 스터디와 과제 ID를 검증한다', () => {
  assert.deepEqual(parseDeleteAssignmentRequest({
    assignmentId: 'assignment-1',
    studyId: 'study-1',
  }), {
    assignmentId: 'assignment-1',
    studyId: 'study-1',
  });
  assert.throws(() => parseDeleteAssignmentRequest({
    assignmentId: 'assignments/assignment-1',
    studyId: 'study-1',
  }), /과제 정보/);
});
