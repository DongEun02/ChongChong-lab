import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseAssignmentReminderRequest,
  parseCreateAssignmentRequest,
  parseSubmitAssignmentRequest,
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

test('과제 제출 링크와 리마인드 수신자를 검증한다', () => {
  assert.equal(parseSubmitAssignmentRequest({
    attachment: {
      contentType: 'application/pdf',
      name: 'assignment.pdf',
      size: 1024,
      storagePath: 'assignment-submissions/study-1/assignment-1/member-1/file.pdf',
    },
    assignmentId: 'assignment-1',
    content: '풀이 내용',
    link: 'https://github.com/example/pr/1',
    studyId: 'study-1',
  }).link, 'https://github.com/example/pr/1');
  assert.deepEqual(parseAssignmentReminderRequest({
    assignmentId: 'assignment-1',
    recipientUserIds: ['member-1', 'member-1'],
    studyId: 'study-1',
  }).recipientUserIds, ['member-1']);
});

test('10MB를 넘거나 PDF가 아닌 첨부 파일을 거부한다', () => {
  assert.throws(() => parseSubmitAssignmentRequest({
    assignmentId: 'assignment-1',
    attachment: {
      contentType: 'image/png',
      name: 'image.png',
      size: 1024,
      storagePath: 'assignment-submissions/study-1/assignment-1/member-1/image.png',
    },
    content: '제출 내용',
    studyId: 'study-1',
  }), /PDF/);
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
