import { useState, type FormEvent } from 'react'

import brandMark from '../../assets/figma/brand-mark.png'
import './JoinStudyPage.css'

type JoinStudyPageProps = {
  errorMessage?: string
  isSubmitting: boolean
  onOpenProfile: () => void
  onSubmit: (inviteUrl: string) => void
}

export function JoinStudyPage({
  errorMessage,
  isSubmitting,
  onOpenProfile,
  onSubmit,
}: JoinStudyPageProps) {
  const [inviteUrl, setInviteUrl] = useState('')
  const canSubmit = inviteUrl.trim().length > 0 && !isSubmitting

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (canSubmit) {
      onSubmit(inviteUrl)
    }
  }

  return (
    <main className="screen join-study-screen">
      <header className="brand-header">
        <img alt="총총" className="brand-mark" src={brandMark} />
        <button className="text-button" onClick={onOpenProfile} type="button">
          My
        </button>
      </header>

      <form className="join-study-form" onSubmit={handleSubmit}>
        <h1>스터디 참여하기</h1>
        <p>스터디 리드에게 받은 초대 링크를 붙여넣어 주세요</p>
        <input
          aria-invalid={Boolean(errorMessage)}
          autoCapitalize="none"
          autoComplete="off"
          disabled={isSubmitting}
          inputMode="url"
          onChange={(event) => setInviteUrl(event.target.value)}
          placeholder="chongchong.app/join/S1"
          spellCheck={false}
          value={inviteUrl}
        />
        <small className={errorMessage ? 'is-error' : ''}>
          {errorMessage ?? '총총에서 발급된 초대 링크만 사용할 수 있어요'}
        </small>
        <button disabled={!canSubmit} type="submit">
          {isSubmitting ? '참여하는 중...' : '스터디 참여하기'}
        </button>
      </form>
    </main>
  )
}
