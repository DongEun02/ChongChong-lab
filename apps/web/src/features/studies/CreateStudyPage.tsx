import { useState, type FormEvent } from 'react'

import backIcon from '../../assets/figma/back.svg'
import chevronDownIcon from '../../assets/figma/chevron-down.svg'
import createStudyMascot from '../../assets/figma/create-study-mascot.png'
import './CreateStudyPage.css'

export type CreateStudyInput = {
  description: string
  memberLimit: number
  name: string
}

type CreateStudyPageProps = {
  errorMessage?: string
  isSubmitting: boolean
  onBack: () => void
  onSubmit: (input: CreateStudyInput) => void
}

const MEMBER_LIMIT_OPTIONS = Array.from(
  { length: 29 },
  (_, index) => index + 2,
)

export function CreateStudyPage({
  errorMessage,
  isSubmitting,
  onBack,
  onSubmit,
}: CreateStudyPageProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [memberLimit, setMemberLimit] = useState('')
  const isNameValid = name.trim().length >= 1 && name.trim().length <= 15
  const canSubmit = isNameValid && memberLimit !== '' && !isSubmitting

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) {
      return
    }

    onSubmit({
      description,
      memberLimit: Number(memberLimit),
      name,
    })
  }

  return (
    <main className="screen create-study-screen">
      <header className="create-study-header">
        <button
          aria-label="스터디 목록으로 돌아가기"
          className="icon-button"
          disabled={isSubmitting}
          onClick={onBack}
          type="button"
        >
          <img alt="" src={backIcon} />
        </button>
        <h1>스터디 만들기</h1>
      </header>

      <img alt="" className="create-study-mascot" src={createStudyMascot} />

      <form className="create-study-form" onSubmit={handleSubmit}>
        <label className="create-study-field">
          <span className="create-study-label">
            스터디 이름 <b>*</b>
          </span>
          <input
            aria-invalid={name.trim().length > 15}
            autoComplete="off"
            disabled={isSubmitting}
            onChange={(event) => setName(event.target.value)}
            placeholder="스터디 이름을 입력해주세요"
            value={name}
          />
          <small className={name.trim().length > 15 ? 'field-error' : ''}>
            {name.trim().length > 15
              ? '스터디 이름은 15자 이하로 입력할 수 있어요'
              : '스터디원에게 그대로 보여요'}
          </small>
        </label>

        <label className="create-study-field">
          <span className="create-study-label">어떤 스터디인가요?</span>
          <textarea
            disabled={isSubmitting}
            maxLength={30}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="모이는 요일, 시간과 활동을 적어주세요"
            value={description}
          />
          <small>모이는 요일과 시간을 적어두면 초대할 때 설명이 줄어들어요</small>
        </label>

        <label className="create-study-field">
          <span className="create-study-label">
            스터디 인원 <b>*</b>
          </span>
          <span className="member-limit-select">
            <select
              disabled={isSubmitting}
              onChange={(event) => setMemberLimit(event.target.value)}
              value={memberLimit}
            >
              <option disabled value="">스터디 인원을 선택해주세요</option>
              {MEMBER_LIMIT_OPTIONS.map((memberCount) => (
                  <option key={memberCount} value={memberCount}>
                    {memberCount}명
                  </option>
                ))}
            </select>
            <img alt="" src={chevronDownIcon} />
          </span>
          <small>최대 30인까지 가능해요</small>
        </label>

        {errorMessage ? <p className="create-study-error">{errorMessage}</p> : null}

        <button className="create-study-submit" disabled={!canSubmit} type="submit">
          {isSubmitting ? '만드는 중...' : '스터디 만들기'}
        </button>
      </form>
    </main>
  )
}
