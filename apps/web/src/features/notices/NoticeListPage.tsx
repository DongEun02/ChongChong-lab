import clockIcon from '../../assets/figma/clock.svg'
import {
  getNoticePreview,
  getRelativeTime,
  type NoticeSummary,
} from './notices'
import './NoticeListPage.css'

type NoticeListPageProps = {
  notices: NoticeSummary[]
  onCreateNotice: () => void
  onOpenNotice: (noticeId: string) => void
}

export function NoticeListPage({
  notices,
  onCreateNotice,
  onOpenNotice,
}: NoticeListPageProps) {
  const sortedNotices = [...notices].sort(
    (left, right) => right.publishedAt.getTime() - left.publishedAt.getTime(),
  )

  return (
    <section className="notice-list-page">
      <div className="notice-list" aria-label="공지 목록">
        {sortedNotices.map((notice) => {
          const isAllRead = notice.readCount === notice.totalMemberCount

          return (
            <button
              className="notice-card"
              key={notice.id}
              onClick={() => onOpenNotice(notice.id)}
              type="button"
            >
              <span className="notice-badges">
                <span className={`read-badge ${isAllRead ? 'is-complete' : ''}`}>
                  {isAllRead
                    ? '모두 읽음'
                    : `${notice.readCount}/${notice.totalMemberCount} 읽음`}
                </span>
                {notice.reminderLabel ? (
                  <span className="reminder-badge">
                    <img alt="" src={clockIcon} />
                    {notice.reminderLabel}
                  </span>
                ) : null}
              </span>
              <strong>{notice.title}</strong>
              <span className="notice-preview">
                {getNoticePreview(notice.content)}
              </span>
              <small>{getRelativeTime(notice.publishedAt)}</small>
            </button>
          )
        })}
      </div>

      <button className="create-notice-button" onClick={onCreateNotice} type="button">
        공지 작성하기
      </button>
    </section>
  )
}
