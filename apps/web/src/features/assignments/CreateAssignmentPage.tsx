import { useState, type FormEvent } from 'react'

import backIcon from '../../assets/figma/back.svg'
import reminderPlusIcon from '../../assets/figma/reminder-plus.svg'
import reminderRemoveIcon from '../../assets/figma/reminder-remove.svg'
import './CreateAssignmentPage.css'

export type CreateAssignmentInput = {
  content: string
  deadlineAt: string
  reminderAts: string[]
  submissionInstructions: string
  title: string
}

type Props = {
  errorMessage?: string
  initialValue?: CreateAssignmentInput
  isSubmitting: boolean
  mode?: 'create' | 'edit'
  onBack: () => void
  onSubmit: (input: CreateAssignmentInput) => void
}

const MAX_TITLE_LENGTH = 15
const MAX_CONTENT_LENGTH = 10_000

export function CreateAssignmentPage({ errorMessage, initialValue, isSubmitting, mode = 'create', onBack, onSubmit }: Props) {
  const [title, setTitle] = useState(initialValue?.title ?? '')
  const [content, setContent] = useState(initialValue?.content ?? '')
  const [submissionInstructions, setSubmissionInstructions] = useState(initialValue?.submissionInstructions ?? '')
  const [deadline, setDeadline] = useState(() => initialValue ? toLocalDateTime(new Date(initialValue.deadlineAt)) : '')
  const [reminders, setReminders] = useState(() => {
    const futureReminders = (initialValue?.reminderAts ?? [])
      .map((value) => new Date(value))
      .filter((date) => date > new Date())
      .map(toLocalDateTime)
    return futureReminders
  })
  const minimum = toLocalDateTime(new Date())
  const deadlineDate = new Date(deadline)
  const validDates = deadline !== '' && deadlineDate > new Date() && reminders.every((value) => {
    const date = new Date(value)
    return value !== '' && date > new Date() && date < deadlineDate
  })
  const canSubmit = title.trim().length > 0 && title.trim().length <= MAX_TITLE_LENGTH &&
    content.trim().length > 0 && content.trim().length <= MAX_CONTENT_LENGTH &&
    submissionInstructions.trim().length > 0 && validDates && !isSubmitting

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({
      content,
      deadlineAt: deadlineDate.toISOString(),
      reminderAts: reminders.map((value) => new Date(value).toISOString()),
      submissionInstructions,
      title,
    })
  }

  return (
    <main className="screen create-assignment-screen">
      <header className="assignment-subpage-header">
        <button aria-label="과제 목록으로 돌아가기" className="icon-button" disabled={isSubmitting} onClick={onBack} type="button"><img alt="" src={backIcon} /></button>
        <h1>과제</h1>
      </header>
      <form className="create-assignment-form" onSubmit={submit}>
        <Field label="제목" required><input maxLength={MAX_TITLE_LENGTH} onChange={(event) => setTitle(event.target.value)} placeholder="과제 제목을 입력해주세요" value={title} /></Field>
        <Field label="내용" required><textarea maxLength={MAX_CONTENT_LENGTH} onChange={(event) => setContent(event.target.value)} placeholder="설명을 입력해주세요" value={content} /></Field>
        <Field label="제출 방법" required><textarea className="is-short" maxLength={1000} onChange={(event) => setSubmissionInstructions(event.target.value)} placeholder="링크 등 제출 방법을 입력해주세요" value={submissionInstructions} /></Field>
        <Field label="마감 시각" required><input min={minimum} onChange={(event) => setDeadline(event.target.value)} type="datetime-local" value={deadline} /></Field>
        <fieldset className="assignment-reminders">
          <legend>리마인드 시각 <small>(선택)</small></legend>
          {reminders.map((value, index) => (
            <label className="assignment-date-input" key={index}>
              <input aria-label={`리마인드 시각 ${index + 1}`} max={deadline || undefined} min={minimum} onChange={(event) => setReminders((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} type="datetime-local" value={value} />
              {reminders.length > 0 ? <button aria-label={`리마인드 ${index + 1} 삭제`} onClick={() => setReminders((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><img alt="" src={reminderRemoveIcon} /></button> : null}
            </label>
          ))}
          {reminders.length < 5 ? <button aria-label="리마인드 추가" className="assignment-add-reminder" onClick={() => setReminders((current) => [...current, ''])} type="button"><img alt="" src={reminderPlusIcon} /></button> : null}
          <small>설정한 시각마다 제출하지 않은 스터디원에게 알림을 보내드릴게요</small>
        </fieldset>
        {errorMessage ? <p className="assignment-form-error">{errorMessage}</p> : null}
        <button className="assignment-primary-action" disabled={!canSubmit} type="submit">
          {isSubmitting
            ? mode === 'edit' ? '수정하는 중...' : '올리는 중...'
            : mode === 'edit' ? '수정 완료' : '과제 올리기'}
        </button>
      </form>
    </main>
  )
}

function Field({ children, label, required }: { children: React.ReactNode; label: string; required?: boolean }) {
  return <label className="assignment-form-field"><span>{label}{required ? <b> *</b> : null}</span>{children}</label>
}

function toLocalDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
