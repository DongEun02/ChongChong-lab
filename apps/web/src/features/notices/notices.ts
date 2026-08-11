export type NoticeSummary = {
  content: string
  id: string
  publishedAt: Date
  readCount: number
  reminderLabel?: string
  title: string
  totalMemberCount: number
}

const FIVE_HOURS = 5 * 60 * 60 * 1000

export const NOTICE_SUMMARIES: NoticeSummary[] = [
  {
    id: 'notice-august-operation',
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
    title: '3주차 발표 순서를 안내합니다',
    content:
      '3주차부터 풀이 발표를 돌아가면서 진행합니다. 발표 순서와 준비할 내용을 꼭 확인해 주세요.',
    publishedAt: new Date(Date.now() - FIVE_HOURS - 1_000),
    readCount: 4,
    totalMemberCount: 4,
  },
  {
    id: 'notice-review-guide',
    title: '코드 리뷰 진행 방식을 공유합니다',
    content:
      '이번 주부터 코드 리뷰는 두 명씩 짝을 지어 진행합니다. 리뷰 마감 시간도 함께 확인해 주세요.',
    publishedAt: new Date(Date.now() - FIVE_HOURS - 2_000),
    readCount: 4,
    totalMemberCount: 4,
  },
]

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
