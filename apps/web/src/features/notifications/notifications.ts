export type AppNotification = {
  body: string
  createdAt: string
  id: string
  isRead: boolean
  noticeId?: string
  screen?: string
  studyId?: string
  title: string
}

const THREE_HOURS = 3 * 60 * 60 * 1_000

export const NOTIFICATION_PREVIEW: AppNotification[] = [
  {
    body: '3주차부터 풀이 발표를 돌아가면서 합니다',
    createdAt: new Date(Date.now() - THREE_HOURS).toISOString(),
    id: 'preview-reminder',
    isRead: false,
    noticeId: 'notice-august-operation',
    screen: 'notice-detail',
    studyId: 'woowacourse-fe-8',
    title: '공지를 확인해주세요',
  },
  {
    body: '3주차부터 풀이 발표를 돌아가면서 합니다',
    createdAt: new Date(Date.now() - THREE_HOURS).toISOString(),
    id: 'preview-new-notice',
    isRead: false,
    noticeId: 'notice-august-operation',
    screen: 'notice-detail',
    studyId: 'woowacourse-fe-8',
    title: '새 공지가 올라왔어요',
  },
  {
    body: '3주차부터 풀이 발표를 돌아가면서 합니다',
    createdAt: new Date(Date.now() - THREE_HOURS).toISOString(),
    id: 'preview-read-notice',
    isRead: true,
    noticeId: 'notice-august-operation',
    screen: 'notice-detail',
    studyId: 'woowacourse-fe-8',
    title: '새 공지가 올라왔어요',
  },
]

export function parseNotifications(value: unknown): AppNotification[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const parsed = value.map(parseNotification)
  return parsed.every((notification) => notification !== null)
    ? (parsed as AppNotification[])
    : null
}

export function formatNotificationTime(createdAt: string) {
  const createdTime = new Date(createdAt).getTime()
  if (!Number.isFinite(createdTime)) {
    return ''
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - createdTime) / 60_000),
  )
  if (elapsedMinutes < 1) {
    return '방금 전'
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}분 전`
  }
  if (elapsedMinutes < 24 * 60) {
    return `${Math.floor(elapsedMinutes / 60)}시간 전`
  }
  if (elapsedMinutes < 7 * 24 * 60) {
    return `${Math.floor(elapsedMinutes / (24 * 60))}일 전`
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(createdAt))
}

function parseNotification(value: unknown): AppNotification | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const notification = value as Record<string, unknown>
  if (
    typeof notification.id !== 'string' ||
    typeof notification.title !== 'string' ||
    typeof notification.body !== 'string' ||
    typeof notification.createdAt !== 'string' ||
    !Number.isFinite(new Date(notification.createdAt).getTime()) ||
    typeof notification.isRead !== 'boolean'
  ) {
    return null
  }

  return {
    body: notification.body,
    createdAt: notification.createdAt,
    id: notification.id,
    isRead: notification.isRead,
    noticeId: optionalString(notification.noticeId),
    screen: optionalString(notification.screen),
    studyId: optionalString(notification.studyId),
    title: notification.title,
  }
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}
