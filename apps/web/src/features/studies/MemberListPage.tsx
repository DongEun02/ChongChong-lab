import { useEffect, useRef, useState } from 'react'

import backIcon from '../../assets/figma/back.svg'
import clipboardIcon from '../../assets/figma/clipboard.svg'
import crownIcon from '../../assets/figma/crown.svg'
import type { StudyMember } from './members'
import './MemberListPage.css'

type MemberListPageProps = {
  canRemoveMembers: boolean
  canDeleteStudy: boolean
  inviteUrl: string
  members: StudyMember[]
  onBack: () => void
  onCopyInviteLink: (inviteUrl: string) => void
  onDeleteStudy: () => void
  onRemoveMember: (member: StudyMember) => void
  status: 'error' | 'loading' | 'ready'
}

export function MemberListPage({
  canRemoveMembers,
  canDeleteStudy,
  inviteUrl,
  members,
  onBack,
  onCopyInviteLink,
  onDeleteStudy,
  onRemoveMember,
  status,
}: MemberListPageProps) {
  const [isCopied, setIsCopied] = useState(false)
  const copiedTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(copiedTimerRef.current), [])

  const copyInviteLink = () => {
    onCopyInviteLink(inviteUrl)
    setIsCopied(true)
    window.clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = window.setTimeout(() => setIsCopied(false), 2_000)
  }

  return (
    <main className="screen member-screen">
      <header className="member-header">
        <button
          aria-label="스터디 목록으로 돌아가기"
          className="icon-button"
          onClick={onBack}
          type="button"
        >
          <img alt="" src={backIcon} />
        </button>
        <h1>멤버</h1>
      </header>

      <section className="member-content">
        <h2>스터디 멤버</h2>
        {status === 'loading' ? (
          <p className="member-state">멤버 목록을 불러오고 있어요.</p>
        ) : status === 'error' ? (
          <p className="member-state is-error">
            멤버 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : members.length === 0 ? (
          <p className="member-state">아직 표시할 멤버가 없어요.</p>
        ) : (
          <ul className="member-list">
            {members.map((member) => (
              <li className="member-card" key={member.id}>
                <span aria-hidden="true" className="member-avatar">
                  {member.displayName.trim().slice(0, 1) || '?'}
                </span>
                <span className="member-name">{member.displayName}</span>
                {member.role === 'leader' ? (
                  <img alt="스터디 리드" className="leader-crown" src={crownIcon} />
                ) : canRemoveMembers ? (
                  <button
                    aria-label={`${member.displayName}님 방출하기`}
                    className="remove-member-button"
                    onClick={() => onRemoveMember(member)}
                    type="button"
                  >
                    방출하기
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="invite-section">
          <p aria-live="polite">
            {isCopied
              ? '초대 링크를 복사했어요'
              : '링크를 통해 새로운 스터디원을 초대해요'}
          </p>
          <button
            aria-label="스터디 초대 링크 복사"
            className="invite-link-card"
            onClick={copyInviteLink}
            type="button"
          >
            <span>{inviteUrl.replace(/^https?:\/\//, '')}</span>
            <img alt="" src={clipboardIcon} />
          </button>
        </div>

        {canDeleteStudy ? (
          <button
            className="delete-study-button"
            onClick={onDeleteStudy}
            type="button"
          >
            스터디 삭제하기
          </button>
        ) : null}
      </section>
    </main>
  )
}
