export type NoticeSummary = {
  content: string
  id: string
  isReadByCurrentUser: boolean
  publishedAt: Date
  readCount: number
  reminderLabel?: string
  title: string
  totalMemberCount: number
}

export type NoticeMember = {
  id: string
  lastReminderLabel?: string
  name: string
  read: boolean
}

export type NoticeDetail = NoticeSummary & {
  authorName: string
  body: string
  members: NoticeMember[]
  reminderAtLabel: string
  reminderAts: string[]
}

const FIVE_HOURS = 5 * 60 * 60 * 1000

export const NOTICE_SUMMARIES: NoticeSummary[] = [
  {
    id: 'notice-august-operation',
    isReadByCurrentUser: false,
    title: '8월 스터디 운영 방식이 바뀝니다',
    content:
      '8월부터 스터디 운영 방식을 조금 바꾸려고 합니다. 끝까지 읽고 읽음 버튼을 눌러주세요.',
    publishedAt: new Date(Date.now() - FIVE_HOURS),
    readCount: 2,
    reminderLabel: '1분 뒤 리마인드',
    totalMemberCount: 4,
  },
  {
    id: 'notice-presentation-order',
    isReadByCurrentUser: true,
    title: '3주차 발표 순서를 안내합니다',
    content:
      '3주차부터 풀이 발표를 돌아가면서 진행합니다. 발표 순서와 준비할 내용을 꼭 확인해 주세요.',
    publishedAt: new Date(Date.now() - FIVE_HOURS - 1_000),
    readCount: 4,
    totalMemberCount: 4,
  },
  {
    id: 'notice-review-guide',
    isReadByCurrentUser: true,
    title: '코드 리뷰 진행 방식을 공유합니다',
    content:
      '이번 주부터 코드 리뷰는 두 명씩 짝을 지어 진행합니다. 리뷰 마감 시간도 함께 확인해 주세요.',
    publishedAt: new Date(Date.now() - FIVE_HOURS - 2_000),
    readCount: 4,
    totalMemberCount: 4,
  },
]

export const NOTICE_DETAILS: NoticeDetail[] = NOTICE_SUMMARIES.map((notice) => ({
  ...notice,
  authorName: '바니',
  body:
    notice.id === 'notice-august-operation'
      ? `안녕하세요, 여러분!\n\n8월부터 스터디 운영 방식을 조금 바꾸려고 합니다. 끝까지 읽고 확인해 주세요.\n\n진행 방식\n매주 화요일 저녁 9시에 온라인으로 모여요. 한 명씩 돌아가며 준비한 주제를 발표하고, 발표가 끝난 뒤에는 자유롭게 질문과 의견을 나눕니다.\n\n과제 제출\n발표 자료와 과제는 모임 전날 자정까지 올려 주세요. 일정이 어려운 경우에는 미리 알려 주세요.\n\n리마인드는 설정한 시간에 아직 확인하지 않은 멤버에게만 전송됩니다. 모두 확인했다면 별도 알림은 가지 않아요.\n\n새로운 방식으로도 즐겁게 공부해 봐요!`
      : notice.content,
  members: [
    { id: 'member-dium', name: '디움' },
    { id: 'member-pizz', name: '피즈' },
    { id: 'member-antolini', name: '안톨리니' },
    { id: 'member-eden', name: '이든' },
  ].map((member, index) => ({
    ...member,
    lastReminderLabel:
      index < notice.readCount ? undefined : '8월 3일 21:02 보냄',
    read: index < notice.readCount,
  })),
  reminderAtLabel: '1분 뒤 리마인드 · 8월 5일 21:00',
  reminderAts: [new Date(Date.now() + FIVE_HOURS).toISOString()],
}))

export function getNoticeDetail(noticeId: string) {
  return NOTICE_DETAILS.find((notice) => notice.id === noticeId)
}

export function parseNoticePayloads(value: unknown): NoticeDetail[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const notices = value.map(parseNoticePayload)
  return notices.every((notice): notice is NoticeDetail => notice !== null)
    ? notices
    : null
}

function parseNoticePayload(value: unknown): NoticeDetail | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.members) ||
    !Array.isArray(value.reminderAts)
  ) {
    return null
  }
  const publishedAt = new Date(String(value.publishedAt))
  const members = value.members.map(parseNoticeMember)
  const reminderAts = value.reminderAts.filter(isString)
  if (
    !isString(value.authorName) ||
    !isString(value.body) ||
    !isString(value.content) ||
    !isString(value.id) ||
    typeof value.isReadByCurrentUser !== 'boolean' ||
    !isString(value.reminderAtLabel) ||
    !isString(value.title) ||
    !Number.isFinite(publishedAt.getTime()) ||
    !members.every((member): member is NoticeMember => member !== null) ||
    reminderAts.length !== value.reminderAts.length
  ) {
    return null
  }

  return {
    authorName: value.authorName,
    body: value.body,
    content: value.content,
    id: value.id,
    isReadByCurrentUser: value.isReadByCurrentUser,
    members,
    publishedAt,
    readCount: members.filter((member) => member.read).length,
    reminderAtLabel: value.reminderAtLabel,
    reminderAts,
    reminderLabel: isString(value.reminderLabel)
      ? value.reminderLabel
      : undefined,
    title: value.title,
    totalMemberCount: members.length,
  }
}

function parseNoticeMember(value: unknown): NoticeMember | null {
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !isString(value.name) ||
    typeof value.read !== 'boolean'
  ) {
    return null
  }
  return {
    id: value.id,
    lastReminderLabel: isString(value.lastReminderLabel)
      ? value.lastReminderLabel
      : undefined,
    name: value.name,
    read: value.read,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function getNoticePreview(content: string) {
  return Array.from(content).slice(0, 60).join('')
}

export function getRelativeTime(publishedAt: Date, now = new Date()) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((now.getTime() - publishedAt.getTime()) / (60 * 1000)),
  )

  if (elapsedMinutes < 1) {
    return '방금 전'
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}분 전`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) {
    return `${elapsedHours}시간 전`
  }

  return `${Math.floor(elapsedHours / 24)}일 전`
}
