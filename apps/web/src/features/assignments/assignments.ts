export type AssignmentMember = {
  id: string
  lastReminderLabel?: string
  name: string
  submitted: boolean
}

export type AssignmentSubmission = {
  content: string
  link?: string
  submittedAt: Date
  updatedAt: Date
  userId: string
  userName: string
}

export type AssignmentSummary = {
  content: string
  deadlineAt: Date
  id: string
  isSubmitted: boolean
  members: AssignmentMember[]
  reminderAts: string[]
  reminderLabel?: string
  submission?: AssignmentSubmission
  submissionInstructions: string
  submissions: AssignmentSubmission[]
  submittedCount: number
  title: string
  totalMemberCount: number
}

const PREVIEW_MEMBERS: AssignmentMember[] = [
  { id: 'member-dium', name: '디움', submitted: true },
  { id: 'member-pizz', name: '피즈', submitted: true },
  { id: 'member-antolini', lastReminderLabel: '8월 3일 21:02 보냄', name: '안톨리니', submitted: false },
  { id: 'member-eden', lastReminderLabel: '8월 3일 21:02 보냄', name: '이든', submitted: false },
]

const PREVIEW_SUBMISSION: AssignmentSubmission = {
  content: '그리디 문제집에서 원하는 세 문제를 풀고 풀이 과정을 정리했습니다.',
  link: 'https://github.com/antoliny/algo-week3',
  submittedAt: new Date('2026-08-03T18:20:00+09:00'),
  updatedAt: new Date('2026-08-03T18:20:00+09:00'),
  userId: 'member-dium',
  userName: '디움',
}

const SECOND_PREVIEW_SUBMISSION: AssignmentSubmission = {
  content: '동적 계획법 문제 세 개를 풀고 풀이와 시간 복잡도를 정리했습니다.',
  submittedAt: new Date('2026-08-03T20:10:00+09:00'),
  updatedAt: new Date('2026-08-03T20:10:00+09:00'),
  userId: 'member-pizz',
  userName: '피즈',
}

export const ASSIGNMENT_PREVIEW: AssignmentSummary[] = [
  {
    content: '백준에서 문제 푸시고 링크 올려주시면 됩니다.\n그리디 문제집에서 원하는 세 문제를 풀고 올려주세요.',
    deadlineAt: new Date('2026-11-21T23:59:00+09:00'),
    id: 'preview-assignment-complete',
    isSubmitted: true,
    members: PREVIEW_MEMBERS,
    reminderAts: [new Date(Date.now() + 60_000).toISOString()],
    reminderLabel: '1분 뒤 리마인드',
    submission: PREVIEW_SUBMISSION,
    submissionInstructions: 'GitHub 저장소에 문제 번호로 폴더를 만들어 올린 뒤, 저장소나 PR 링크를 제출해주세요.',
    submissions: [PREVIEW_SUBMISSION, SECOND_PREVIEW_SUBMISSION],
    submittedCount: 2,
    title: '이번주 그리디 3문제 풀이',
    totalMemberCount: 4,
  },
  {
    content: '오늘의 과제는 디자인 완성하고 디자인 시스템 정리하기입니다',
    deadlineAt: new Date('2026-11-24T23:59:00+09:00'),
    id: 'preview-assignment-pending',
    isSubmitted: false,
    members: PREVIEW_MEMBERS,
    reminderAts: [new Date(Date.now() + 60_000).toISOString()],
    reminderLabel: '1분 뒤 리마인드',
    submissionInstructions: '정리 글 링크를 제출해주세요.',
    submissions: [PREVIEW_SUBMISSION, SECOND_PREVIEW_SUBMISSION],
    submittedCount: 2,
    title: '디자인 완성하고 제출하기',
    totalMemberCount: 4,
  },
]

export function parseAssignmentPayloads(value: unknown): AssignmentSummary[] | null {
  if (!Array.isArray(value)) return null
  const assignments = value.map(parseAssignmentPayload)
  return assignments.every((item): item is AssignmentSummary => item !== null)
    ? assignments
    : null
}

function parseAssignmentPayload(value: unknown): AssignmentSummary | null {
  if (!isRecord(value) || !Array.isArray(value.members) || !Array.isArray(value.submissions) || !Array.isArray(value.reminderAts)) return null
  const deadlineAt = new Date(String(value.deadlineAt))
  const members = value.members.map(parseMember)
  const submissions = value.submissions.map(parseSubmission)
  const submission = value.submission ? parseSubmission(value.submission) : undefined
  if (
    typeof value.content !== 'string' || typeof value.id !== 'string' ||
    typeof value.isSubmitted !== 'boolean' || typeof value.submittedCount !== 'number' ||
    typeof value.submissionInstructions !== 'string' || typeof value.title !== 'string' ||
    typeof value.totalMemberCount !== 'number' || !Number.isFinite(deadlineAt.getTime()) ||
    members.some((item) => !item) || submissions.some((item) => !item) ||
    (value.submission && !submission)
  ) return null
  return {
    content: value.content,
    deadlineAt,
    id: value.id,
    isSubmitted: value.isSubmitted,
    members: members as AssignmentMember[],
    reminderAts: value.reminderAts.filter((item): item is string => typeof item === 'string'),
    reminderLabel: typeof value.reminderLabel === 'string' ? value.reminderLabel : undefined,
    submission: submission ?? undefined,
    submissionInstructions: value.submissionInstructions,
    submissions: submissions as AssignmentSubmission[],
    submittedCount: value.submittedCount,
    title: value.title,
    totalMemberCount: value.totalMemberCount,
  }
}

function parseMember(value: unknown): AssignmentMember | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.submitted !== 'boolean') return null
  return { id: value.id, lastReminderLabel: typeof value.lastReminderLabel === 'string' ? value.lastReminderLabel : undefined, name: value.name, submitted: value.submitted }
}

function parseSubmission(value: unknown): AssignmentSubmission | null {
  if (!isRecord(value)) return null
  const submittedAt = new Date(String(value.submittedAt))
  const updatedAt = new Date(String(value.updatedAt))
  if (typeof value.content !== 'string' || typeof value.userId !== 'string' || typeof value.userName !== 'string' || !Number.isFinite(submittedAt.getTime()) || !Number.isFinite(updatedAt.getTime())) return null
  return { content: value.content, link: typeof value.link === 'string' ? value.link : undefined, submittedAt, updatedAt, userId: value.userId, userName: value.userName }
}

export function getAssignmentPreview(content: string) {
  return Array.from(content).slice(0, 60).join('')
}

export function formatAssignmentDeadline(deadlineAt: Date) {
  return `${formatDateTime(deadlineAt)} 마감`
}

export function formatDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat('ko-KR', { day: 'numeric', hour: '2-digit', hour12: false, minute: '2-digit', month: 'long', timeZone: 'Asia/Seoul', year: 'numeric' }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}년 ${part('month')} ${part('day')}일 ${part('hour')}:${part('minute')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
