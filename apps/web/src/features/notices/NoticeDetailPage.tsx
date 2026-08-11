import { useState } from 'react'

import backIcon from '../../assets/figma/back.svg'
import deleteIcon from '../../assets/figma/delete.svg'
import editIcon from '../../assets/figma/edit.svg'
import noticeAvatarIcon from '../../assets/figma/notice-avatar.svg'
import readCheckIcon from '../../assets/figma/read-check.svg'
import sendIcon from '../../assets/figma/send.svg'
import unreadClockIcon from '../../assets/figma/unread-clock.svg'
import { getRelativeTime, type NoticeDetail } from './notices'
import './NoticeDetailPage.css'

type NoticeDetailPageProps = {
  notice: NoticeDetail
  onBack: () => void
  onDelete: (noticeId: string) => void
  onEdit: (noticeId: string) => void
  onSendReminder: (noticeId: string, memberIds: string[]) => void
}

export function NoticeDetailPage({
  notice,
  onBack,
  onDelete,
  onEdit,
  onSendReminder,
}: NoticeDetailPageProps) {
  const [lastReminderLabels, setLastReminderLabels] = useState<Record<string, string>>(
    () => Object.fromEntries(
      notice.members.flatMap((member) =>
        member.lastReminderLabel ? [[member.id, member.lastReminderLabel]] : [],
      ),
    ),
  )
  const [statusMessage, setStatusMessage] = useState('')
  const readMembers = notice.members.filter((member) => member.read)
  const unreadMembers = notice.members.filter((member) => !member.read)
  const readRatio = (readMembers.length / notice.members.length) * 100

  const sendReminder = (memberIds: string[]) => {
    const nowLabel = '방금 보냄'

    setLastReminderLabels((current) => ({
      ...current,
      ...Object.fromEntries(memberIds.map((memberId) => [memberId, nowLabel])),
    }))
    setStatusMessage(
      memberIds.length === 1
        ? '선택한 멤버에게 리마인드를 보냈어요.'
        : `미확인 ${memberIds.length}명에게 리마인드를 보냈어요.`,
    )
    onSendReminder(notice.id, memberIds)
  }

  return (
    <main className="screen notice-detail-screen">
      <header className="notice-detail-header">
        <button
          aria-label="공지 목록으로 돌아가기"
          className="notice-detail-back"
          onClick={onBack}
          type="button"
        >
          <img alt="" src={backIcon} />
        </button>
        <strong>공지</strong>
      </header>

      <div className="notice-detail-content">
        <section aria-labelledby="read-dashboard-title" className="read-dashboard">
          <div className="read-dashboard-heading">
            <strong id="read-dashboard-title">확인 현황</strong>
            <span>{notice.reminderAtLabel}</span>
          </div>
          <p className="read-count">
            <strong>{readMembers.length}</strong>
            <span>/ {notice.members.length}명</span>
          </p>
          <div
            aria-label={`전체 ${notice.members.length}명 중 ${readMembers.length}명 확인`}
            aria-valuemax={notice.members.length}
            aria-valuemin={0}
            aria-valuenow={readMembers.length}
            className="read-progress"
            role="progressbar"
          >
            <span style={{ width: `${readRatio}%` }} />
          </div>

          <div className="member-status-heading is-read">
            <img alt="" src={readCheckIcon} />
            <strong>확인 {readMembers.length}명</strong>
          </div>
          <div className="read-member-list">
            {readMembers.map((member) => (
              <span className="member-chip" key={member.id}>
                <img alt="" src={noticeAvatarIcon} />
                {member.name}
              </span>
            ))}
          </div>

          <div className="member-status-heading is-unread">
            <img alt="" src={unreadClockIcon} />
            <strong>미확인 {unreadMembers.length}명</strong>
          </div>
          <div className="unread-member-list">
            {unreadMembers.map((member) => (
              <div className="unread-member" key={member.id}>
                <img alt="" src={noticeAvatarIcon} />
                <span>
                  <strong>{member.name}</strong>
                  <small>{lastReminderLabels[member.id]}</small>
                </span>
                <button
                  onClick={() => sendReminder([member.id])}
                  type="button"
                >
                  <img alt="" src={sendIcon} />
                  보내기
                </button>
              </div>
            ))}
          </div>

          <button
            className="send-all-button"
            disabled={unreadMembers.length === 0}
            onClick={() => sendReminder(unreadMembers.map((member) => member.id))}
            type="button"
          >
            모두에게 보내기
          </button>
          <p aria-live="polite" className="visually-hidden">
            {statusMessage}
          </p>
        </section>

        <article className="notice-article">
          <h1>{notice.title}</h1>
          <div className="notice-author">
            <img alt="" src={noticeAvatarIcon} />
            <span>
              {notice.authorName} · {getRelativeTime(notice.publishedAt)}
            </span>
          </div>
          <p>{notice.body}</p>
        </article>

        <div className="notice-detail-actions">
          <button onClick={() => onEdit(notice.id)} type="button">
            <img alt="" src={editIcon} />
            수정
          </button>
          <button className="delete-button" onClick={() => onDelete(notice.id)} type="button">
            <img alt="" src={deleteIcon} />
            삭제
          </button>
        </div>
      </div>
    </main>
  )
}
