import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import backIcon from '../../assets/figma/back.svg'
import clipboardIcon from '../../assets/figma/clipboard.svg'
import sendIcon from '../../assets/figma/send.svg'
import submissionLinkIcon from '../../assets/figma/submission-link.svg'
import { formatDateTime, type AssignmentAttachment, type AssignmentSummary } from './assignments'
import './AssignmentDetailPage.css'

type Props = {
  assignment: AssignmentSummary
  errorMessage?: string
  isSubmitting: boolean
  onBack: () => void
  onPickAttachment: () => void
  onReminder: (memberIds: string[]) => void
  onSubmit: (content: string, link?: string, attachment?: EditableAttachment, previousStoragePath?: string) => void
  role: 'leader' | 'member'
}

export type EditableAttachment = Omit<AssignmentAttachment, 'storagePath' | 'url'> & {
  storagePath?: string
  uri?: string
  url?: string
}

export function AssignmentDetailPage({ assignment, errorMessage, isSubmitting, onBack, onPickAttachment, onReminder, onSubmit, role }: Props) {
  const [isEditing, setIsEditing] = useState(!assignment.submission)
  const [content, setContent] = useState(assignment.submission?.content ?? '')
  const [link, setLink] = useState(assignment.submission?.link ?? '')
  const [attachment, setAttachment] = useState<EditableAttachment | undefined>(assignment.submission?.attachment)
  const [attachmentError, setAttachmentError] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const handleAttachmentResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) return
      if (detail.status === 'error') {
        setAttachmentError('message' in detail && typeof detail.message === 'string' ? detail.message : '파일을 선택하지 못했어요.')
        return
      }
      if (detail.status === 'success' && 'attachment' in detail && isEditableAttachment(detail.attachment)) {
        setAttachment(detail.attachment)
        setAttachmentError(undefined)
      }
    }
    window.addEventListener('chongchong:assignment-attachment-result', handleAttachmentResult)
    return () => window.removeEventListener('chongchong:assignment-attachment-result', handleAttachmentResult)
  }, [])
  const validLink = link.trim() === '' || /^https?:\/\//i.test(link.trim())
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim() || !validLink || isSubmitting) return
    onSubmit(content, link.trim() || undefined, attachment, assignment.submission?.attachment?.storagePath)
  }
  const pickAttachment = () => {
    setAttachmentError(undefined)
    if (window.ReactNativeWebView) onPickAttachment()
    else fileInputRef.current?.click()
  }
  const selectBrowserFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf') || file.size > 10 * 1024 * 1024) {
      setAttachmentError('10MB 이하의 PDF 파일만 첨부할 수 있어요.')
      return
    }
    setAttachment({ contentType: 'application/pdf', name: file.name, size: file.size })
    setAttachmentError(undefined)
  }

  const unsubmitted = assignment.members.filter((member) => !member.submitted)
  return (
    <main className="screen assignment-detail-screen">
      <header className="assignment-subpage-header">
        <button aria-label="과제 목록으로 돌아가기" className="icon-button" onClick={onBack} type="button"><img alt="" src={backIcon} /></button>
        <h1>과제</h1>
      </header>
      <div className="assignment-detail-content">
        {role === 'leader' ? (
          <section className="assignment-progress-card">
            <div className="assignment-progress-header"><span>제출 현황</span><small>{assignment.reminderLabel}</small></div>
            <p><strong>{assignment.submittedCount}</strong> / {assignment.totalMemberCount}명</p>
            <div className="assignment-progress-track"><i style={{ width: `${assignment.totalMemberCount ? assignment.submittedCount / assignment.totalMemberCount * 100 : 0}%` }} /></div>
            <span className="assignment-progress-label">✓ 제출 {assignment.submittedCount}명</span>
            <div className="submitted-member-chips">{assignment.members.filter((member) => member.submitted).map((member) => <span key={member.id}>{member.name}</span>)}</div>
            <span className="assignment-progress-label is-muted">◷ 미제출 {unsubmitted.length}명</span>
            {unsubmitted.map((member) => (
              <div className="unsubmitted-member" key={member.id}><span><b>{member.name}</b><small>{member.lastReminderLabel ?? '아직 보내지 않음'}</small></span><button onClick={() => onReminder([member.id])} type="button"><img alt="" src={sendIcon} />보내기</button></div>
            ))}
            {unsubmitted.length ? <button className="remind-all-button" onClick={() => onReminder(unsubmitted.map((member) => member.id))} type="button">모두에게 보내기</button> : null}
          </section>
        ) : null}

        <h2>{assignment.title}</h2>
        <InfoCard label="과제 내용">{assignment.content}</InfoCard>
        <InfoCard label="제출 방법">{assignment.submissionInstructions}</InfoCard>

        {role === 'member' ? (
          <section className="my-submission">
            <h3>내 제출</h3>
            {assignment.submission && !isEditing ? (
              <>
                <small>{formatDateTime(assignment.submission.submittedAt)} 제출</small>
                <InfoCard label="내용">{assignment.submission.content}</InfoCard>
                {assignment.submission.link ? <InfoCard icon="link" label="링크"><a href={assignment.submission.link} rel="noreferrer" target="_blank">{assignment.submission.link}</a></InfoCard> : null}
                {assignment.submission.attachment ? <AttachmentCard attachment={assignment.submission.attachment} /> : null}
                <button className="assignment-primary-action" onClick={() => setIsEditing(true)} type="button">편집하기</button>
              </>
            ) : (
              <form className="assignment-submit-form" onSubmit={submit}>
                <label>내용 <b>*</b><textarea maxLength={3000} onChange={(event) => setContent(event.target.value)} value={content} /></label>
                <label>링크<input aria-invalid={!validLink} maxLength={2000} onChange={(event) => setLink(event.target.value)} placeholder="https://" value={link} /></label>
                <div className="assignment-attachment-field">
                  <span>파일 <small>PDF · 최대 10MB</small></span>
                  <input accept="application/pdf,.pdf" onChange={selectBrowserFile} ref={fileInputRef} type="file" />
                  {attachment ? <div className="assignment-attachment-selected"><span>{attachment.name}<small>{formatFileSize(attachment.size)}</small></span><button aria-label="첨부 파일 제거" onClick={() => setAttachment(undefined)} type="button">삭제</button></div> : <button className="assignment-attachment-button" onClick={pickAttachment} type="button">PDF 파일 첨부하기</button>}
                </div>
                {attachmentError ? <small className="assignment-link-error">{attachmentError}</small> : null}
                {!validLink ? <small className="assignment-link-error">주소가 올바르지 않아요</small> : null}
                {errorMessage ? <p className="assignment-form-error">{errorMessage}</p> : null}
                <button className="assignment-primary-action" disabled={!content.trim() || !validLink || isSubmitting} type="submit">{isSubmitting ? '제출하는 중...' : assignment.submission ? '수정 완료' : '제출하기'}</button>
              </form>
            )}
          </section>
        ) : (
          <section className="leader-submissions">
            <h3>제출 내역</h3>
            {assignment.submissions.length ? assignment.submissions.map((submission) => <div className="leader-submission" key={submission.userId}><InfoCard label={`${submission.userName} · ${formatDateTime(submission.submittedAt)}`}>{submission.content}{submission.link ? <><br /><a href={submission.link} rel="noreferrer" target="_blank">{submission.link}</a></> : null}</InfoCard>{submission.attachment ? <AttachmentCard attachment={submission.attachment} /> : null}</div>) : <p>아직 제출 내역이 없어요.</p>}
          </section>
        )}
      </div>
    </main>
  )
}

function AttachmentCard({ attachment }: { attachment: AssignmentAttachment }) {
  return <a className="assignment-attachment-card" href={attachment.url} rel="noreferrer" target="_blank"><img alt="" src={clipboardIcon} /><span>{attachment.name}<small>{formatFileSize(attachment.size)}</small></span><b>열기</b></a>
}

function formatFileSize(size: number) {
  return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(size / 1024)}KB`
}

function isEditableAttachment(value: unknown): value is EditableAttachment {
  return typeof value === 'object' && value !== null &&
    'contentType' in value && value.contentType === 'application/pdf' &&
    'name' in value && typeof value.name === 'string' &&
    'size' in value && typeof value.size === 'number' &&
    (!('uri' in value) || typeof value.uri === 'string')
}

function InfoCard({ children, icon, label }: { children: React.ReactNode; icon?: 'link'; label: string }) {
  return <section className="assignment-info-card"><strong><img alt="" src={icon === 'link' ? submissionLinkIcon : clipboardIcon} /> {label}</strong><p>{children}</p></section>
}
