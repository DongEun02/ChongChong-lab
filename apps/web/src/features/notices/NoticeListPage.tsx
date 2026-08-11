import clockIcon from '../../assets/figma/clock.svg'
import {
  getNoticePreview,
  getRelativeTime,
  type NoticeSummary,
} from './notices'
import './NoticeListPage.css'

type NoticeListPageProps = {
  dataStatus: 'error' | 'loading' | 'ready'
  notices: NoticeSummary[]
  onCreateNotice: () => void
  onOpenNotice: (noticeId: string) => void
  role: 'leader' | 'member'
}

export function NoticeListPage({
  dataStatus,
  notices,
  onCreateNotice,
  onOpenNotice,
  role,
}: NoticeListPageProps) {
  const sortedNotices = [...notices].sort(
    (left, right) => right.publishedAt.getTime() - left.publishedAt.getTime(),
  )

  return (
    <section className="notice-list-page">
      {dataStatus === 'loading' ? (
        <p className="notice-data-state">공지 데이터를 불러오고 있어요.</p>
      ) : dataStatus === 'error' ? (
        <p className="notice-data-state is-error">
          Firestore 연결을 확인하지 못해 미리보기 데이터를 표시해요.
        </p>
      ) : notices.length === 0 ? (
        <p className="notice-data-state">아직 작성된 공지가 없어요.</p>
      ) : null}
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
                <span
                  className={`read-badge ${
                    role === 'leader'
                      ? isAllRead ? 'is-complete' : ''
                      : notice.isReadByCurrentUser ? 'is-complete' : ''
                  }`}
                >
                  {role === 'leader'
                    ? isAllRead
                      ? '모두 읽음'
                      : `${notice.readCount}/${notice.totalMemberCount} 읽음`
                    : notice.isReadByCurrentUser
                      ? '읽음'
                      : '미확인'}
                </span>
                {role === 'leader' && notice.reminderLabel ? (
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

      {role === 'leader' ? (
        <button className="create-notice-button" onClick={onCreateNotice} type="button">
          공지 작성하기
        </button>
      ) : null}
    </section>
  )
}
