export type AssignmentSummary = {
  content: string
  deadlineAt: Date
  id: string
  isSubmitted: boolean
  reminderLabel?: string
  submittedCount: number
  submissionType: 'link'
  title: string
  totalMemberCount: number
}

export const ASSIGNMENT_PREVIEW: AssignmentSummary[] = [
  {
    content: '오늘의 과제는 디자인 완성하고 디자인 시스템 정리하기입니다',
    deadlineAt: new Date('2026-11-21T23:59:00+09:00'),
    id: 'preview-assignment-complete',
    isSubmitted: true,
    reminderLabel: '1분 뒤 리마인드',
    submittedCount: 2,
    submissionType: 'link',
    title: '디자인 완성하고 제출하기',
    totalMemberCount: 4,
  },
  {
    content: '오늘의 과제는 디자인 완성하고 디자인 시스템 정리하기입니다',
    deadlineAt: new Date('2026-11-24T23:59:00+09:00'),
    id: 'preview-assignment-pending',
    isSubmitted: false,
    reminderLabel: '1분 뒤 리마인드',
    submittedCount: 2,
    submissionType: 'link',
    title: '디자인 완성하고 제출하기',
    totalMemberCount: 4,
  },
]

export function parseAssignmentPayloads(value: unknown): AssignmentSummary[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const assignments = value.map(parseAssignmentPayload)
  return assignments.every(
    (assignment): assignment is AssignmentSummary => assignment !== null,
  )
    ? assignments
    : null
}

export function getAssignmentPreview(content: string) {
  return Array.from(content).slice(0, 60).join('')
}

export function formatAssignmentDeadline(deadlineAt: Date) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: 'long',
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).formatToParts(deadlineAt)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${value('year')}년 ${value('month')} ${value('day')}일 ${value('hour')}:${value('minute')} 마감`
}

function parseAssignmentPayload(value: unknown): AssignmentSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const deadlineAt = new Date(String(value.deadlineAt))
  if (
    typeof value.content !== 'string' ||
    typeof value.id !== 'string' ||
    typeof value.isSubmitted !== 'boolean' ||
    typeof value.submittedCount !== 'number' ||
    value.submissionType !== 'link' ||
    typeof value.title !== 'string' ||
    typeof value.totalMemberCount !== 'number' ||
    !Number.isFinite(deadlineAt.getTime())
  ) {
    return null
  }

  return {
    content: value.content,
    deadlineAt,
    id: value.id,
    isSubmitted: value.isSubmitted,
    reminderLabel:
      typeof value.reminderLabel === 'string' ? value.reminderLabel : undefined,
    submittedCount: value.submittedCount,
    submissionType: value.submissionType,
    title: value.title,
    totalMemberCount: value.totalMemberCount,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
