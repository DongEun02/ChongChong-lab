import { useState, type FormEvent } from 'react'

import backIcon from '../../assets/figma/back.svg'
import reminderPlusIcon from '../../assets/figma/reminder-plus.svg'
import reminderRemoveIcon from '../../assets/figma/reminder-remove.svg'
import {
  ReminderDateTimePicker,
} from '../../components/ReminderDateTimePicker'
import { formatReminderDateTime } from '../../components/reminderDateTime'
import './CreateNoticePage.css'

export type CreateNoticeInput = {
  content: string
  reminderAts: string[]
  title: string
}

type CreateNoticePageProps = {
  errorMessage?: string
  initialValue?: CreateNoticeInput
  isSubmitting: boolean
  mode?: 'create' | 'edit'
  onBack: () => void
  onSubmit: (input: CreateNoticeInput) => void
}

const MAX_REMINDER_COUNT = 5
const MAX_TITLE_LENGTH = 15
const MAX_CONTENT_LENGTH = 10_000

export function CreateNoticePage({
  errorMessage,
  initialValue,
  isSubmitting,
  mode = 'create',
  onBack,
  onSubmit,
}: CreateNoticePageProps) {
  const [title, setTitle] = useState(initialValue?.title ?? '')
  const [content, setContent] = useState(initialValue?.content ?? '')
  const [reminderValues, setReminderValues] = useState(() =>
    (initialValue?.reminderAts ?? [])
      .filter((value) => new Date(value) > new Date())
      .map((value) => toLocalDateTime(new Date(value))),
  )
  const [activeReminderIndex, setActiveReminderIndex] = useState<number | 'new' | null>(null)
  const [minimumReminderValue] = useState(() => toLocalDateTime(new Date()))
  const areRemindersValid = reminderValues.every((value) => {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) && date > new Date()
  })
  const canSubmit =
    title.trim().length >= 1 &&
    title.trim().length <= MAX_TITLE_LENGTH &&
    content.trim().length >= 1 &&
    content.trim().length <= MAX_CONTENT_LENGTH &&
    areRemindersValid &&
    !isSubmitting

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    onSubmit({
      content,
      reminderAts: reminderValues.map((value) => new Date(value).toISOString()),
      title,
    })
  }

  const confirmReminder = (value: string) => {
    if (activeReminderIndex === 'new') {
      setReminderValues((current) => [...current, value])
    } else if (activeReminderIndex !== null) {
      setReminderValues((current) =>
        current.map((candidate, index) => index === activeReminderIndex ? value : candidate),
      )
    }
    setActiveReminderIndex(null)
  }

  return (
    <main className="screen create-notice-screen">
      <header className="create-notice-header">
        <button
          aria-label="공지 목록으로 돌아가기"
          className="icon-button"
          disabled={isSubmitting}
          onClick={onBack}
          type="button"
        >
          <img alt="" src={backIcon} />
        </button>
        <h1>공지</h1>
      </header>

      <form className="create-notice-form" onSubmit={handleSubmit}>
        <label className="create-notice-field">
          <span className="create-notice-label">제목 <b>*</b></span>
          <input
            aria-invalid={title.trim().length > MAX_TITLE_LENGTH}
            autoComplete="off"
            disabled={isSubmitting}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="공지 제목을 입력해주세요"
            value={title}
          />
        </label>

        <label className="create-notice-field">
          <span className="create-notice-label">내용 <b>*</b></span>
          <textarea
            disabled={isSubmitting}
            maxLength={MAX_CONTENT_LENGTH}
            onChange={(event) => setContent(event.target.value)}
            placeholder="설명을 입력해주세요"
            value={content}
          />
          <small>스터디원은 끝까지 읽어야 읽음 처리를 할 수 있어요</small>
        </label>

        <fieldset className="create-notice-reminders">
          <legend className="create-notice-label">리마인드 시각 <small>(선택)</small></legend>
          {reminderValues.map((value, index) => (
            <div className="reminder-input" key={`${value}-${index}`}>
              <button
                aria-label={`리마인드 시각 ${index + 1}`}
                className="reminder-value-button"
                disabled={isSubmitting}
                onClick={() => setActiveReminderIndex(index)}
                type="button"
              >
                {formatReminderDateTime(value)}
              </button>
              <button
                aria-label={`리마인드 시각 ${index + 1} 삭제`}
                className="reminder-remove-button"
                disabled={isSubmitting}
                onClick={() =>
                  setReminderValues((current) =>
                    current.filter((_, candidateIndex) => candidateIndex !== index),
                  )
                }
                type="button"
              >
                <img alt="" src={reminderRemoveIcon} />
              </button>
            </div>
          ))}
          {reminderValues.length < MAX_REMINDER_COUNT ? (
            <button
              aria-label="리마인드 시각 추가"
              className="add-reminder-button"
              disabled={isSubmitting}
              onClick={() => setActiveReminderIndex('new')}
              type="button"
            >
              <img alt="" src={reminderPlusIcon} />
            </button>
          ) : null}
          <small>설정한 시각마다 읽지 않은 스터디원에게 알림을 보내드릴게요</small>
        </fieldset>

        {errorMessage ? <p className="create-notice-error">{errorMessage}</p> : null}

        <button className="create-notice-submit" disabled={!canSubmit} type="submit">
          {isSubmitting
            ? mode === 'edit' ? '수정하는 중...' : '올리는 중...'
            : mode === 'edit' ? '공지 수정하기' : '공지 올리기'}
        </button>
      </form>

      {activeReminderIndex !== null ? (
        <ReminderDateTimePicker
          key={activeReminderIndex}
          min={minimumReminderValue}
          onClose={() => setActiveReminderIndex(null)}
          onConfirm={confirmReminder}
          value={typeof activeReminderIndex === 'number' ? reminderValues[activeReminderIndex] : undefined}
        />
      ) : null}
    </main>
  )
}

function toLocalDateTime(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}
