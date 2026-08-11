import backIcon from '../../assets/figma/back.svg'
import bellIcon from '../../assets/figma/bell.svg'
import noticeIcon from '../../assets/figma/home-notice.svg'
import {
  formatNotificationTime,
  type AppNotification,
} from './notifications'
import './NotificationListPage.css'

type NotificationListPageProps = {
  notifications: AppNotification[]
  onBack: () => void
  onOpenNotification: (notification: AppNotification) => void
  status: 'error' | 'loading' | 'ready'
}

export function NotificationListPage({
  notifications,
  onBack,
  onOpenNotification,
  status,
}: NotificationListPageProps) {
  return (
    <main className="screen notification-screen">
      <header className="notification-header">
        <button
          aria-label="이전 화면으로 돌아가기"
          className="notification-back-button"
          onClick={onBack}
          type="button"
        >
          <img alt="" src={backIcon} />
        </button>
        <h1>알림</h1>
      </header>

      <section className="notification-list" aria-live="polite">
        {status === 'loading' ? (
          <p className="notification-state">알림을 불러오고 있어요.</p>
        ) : status === 'error' ? (
          <p className="notification-state is-error">
            알림을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : notifications.length === 0 ? (
          <p className="notification-state">아직 받은 알림이 없어요.</p>
        ) : (
          notifications.map((notification) => {
            const isReminder = notification.title.includes('확인') ||
              notification.title.includes('읽지 않은')

            return (
              <button
                className="notification-card"
                key={notification.id}
                onClick={() => onOpenNotification(notification)}
                type="button"
              >
                <span
                  className={isReminder
                    ? 'notification-icon is-reminder'
                    : 'notification-icon'}
                >
                  <img alt="" src={isReminder ? bellIcon : noticeIcon} />
                </span>
                <span className="notification-copy">
                  <strong>{notification.title}</strong>
                  <span>{notification.body}</span>
                  <small>{formatNotificationTime(notification.createdAt)}</small>
                </span>
                {!notification.isRead ? (
                  <span aria-label="읽지 않음" className="notification-unread" />
                ) : null}
              </button>
            )
          })
        )}
      </section>
    </main>
  )
}
