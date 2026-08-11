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
  deleteError?: string
  isDeleting: boolean
  notice: NoticeDetail
  onBack: () => void
  onDelete: (noticeId: string) => void
  onEdit: (noticeId: string) => void
  onSendReminder: (noticeId: string, memberIds: string[]) => void
}

export function NoticeDetailPage({
  deleteError,
  isDeleting,
  notice,
  onBack,
  onDelete,
  onEdit,
  onSendReminder,
}: NoticeDetailPageProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [hasRequestedDelete, setHasRequestedDelete] = useState(false)
  const readMembers = notice.members.filter((member) => member.read)
  const unreadMembers = notice.members.filter((member) => !member.read)
  const readRatio = (readMembers.length / notice.members.length) * 100

  const sendReminder = (memberIds: string[]) => {
    onSendReminder(notice.id, memberIds)
  }

  const openDeleteDialog = () => {
    setHasRequestedDelete(false)
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setIsDeleteDialogOpen(false)
    }
  }

  const confirmDelete = () => {
    setHasRequestedDelete(true)
    onDelete(notice.id)
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
                  <small>{member.lastReminderLabel}</small>
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
          <button className="delete-button" onClick={openDeleteDialog} type="button">
            <img alt="" src={deleteIcon} />
            삭제
          </button>
        </div>
      </div>

      {isDeleteDialogOpen ? (
        <div className="notice-delete-overlay">
          <section
            aria-describedby="notice-delete-description"
            aria-labelledby="notice-delete-title"
            aria-modal="true"
            className="notice-delete-dialog"
            role="alertdialog"
          >
            <div className="notice-delete-copy">
              <h2 id="notice-delete-title">공지를 삭제할까요?</h2>
              <p id="notice-delete-description">
                삭제한 공지는 다시 복구할 수 없어요.<br />
                정말 삭제하시겠어요?
              </p>
              {hasRequestedDelete && deleteError ? (
                <small role="alert">{deleteError}</small>
              ) : null}
            </div>
            <div className="notice-delete-actions">
              <button
                autoFocus
                disabled={isDeleting}
                onClick={closeDeleteDialog}
                type="button"
              >
                취소
              </button>
              <button
                className="confirm-delete"
                disabled={isDeleting}
                onClick={confirmDelete}
                type="button"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
