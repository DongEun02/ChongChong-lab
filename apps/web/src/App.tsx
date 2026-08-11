import { useEffect, useState } from 'react'

import assignmentsIcon from './assets/figma/assignments.svg'
import backIcon from './assets/figma/back.svg'
import bellIcon from './assets/figma/bell.svg'
import brandMark from './assets/figma/brand-mark.png'
import chevronRightIcon from './assets/figma/chevron-right.svg'
import homeAssignmentIcon from './assets/figma/home-assignment.svg'
import homeNoticeIcon from './assets/figma/home-notice.svg'
import leadHomeMascot from './assets/figma/lead-home-mascot.png'
import membersIcon from './assets/figma/members.svg'
import noticesIcon from './assets/figma/notices.svg'
import reminderMascot from './assets/figma/reminder-mascot.png'
import './App.css'

type TabId = 'home' | 'notices' | 'assignments' | 'members'
type NativeMessage =
  | { type: 'exit-study' }
  | { type: 'open-notifications' }
  | { type: 'open-profile' }
  | { type: 'study-selected'; studyId: string }

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void }
    __CHONGCHONG_SESSION__?: { displayName?: string | null }
  }
}

const STUDY = {
  id: 'woowacourse-fe-8',
  name: '우테코 8기 FE 스터디',
  description: '매주 화요일 저녁 9시, 프론트엔드 CS와 코드 리뷰',
  members: 5,
  unreadNotices: 2,
  pendingAssignments: 1,
}

function postToNative(message: NativeMessage) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message))
}

function App() {
  const [isStudyOpen, setIsStudyOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const displayName = window.__CHONGCHONG_SESSION__?.displayName?.trim() || '바니'

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: TabId }>).detail

      if (detail?.tab) {
        setIsStudyOpen(true)
        setActiveTab(detail.tab)
      }
    }

    window.addEventListener('chongchong:navigate', handleNavigation)
    const handleExitStudy = () => setIsStudyOpen(false)
    window.addEventListener('chongchong:exit-study', handleExitStudy)

    return () => {
      window.removeEventListener('chongchong:navigate', handleNavigation)
      window.removeEventListener('chongchong:exit-study', handleExitStudy)
    }
  }, [])

  const openStudy = () => {
    setIsStudyOpen(true)
    setActiveTab('home')
    postToNative({ type: 'study-selected', studyId: STUDY.id })
  }

  const closeStudy = () => {
    setIsStudyOpen(false)
    postToNative({ type: 'exit-study' })
  }

  if (!isStudyOpen) {
    return (
      <StudyList
        displayName={displayName}
        onOpenProfile={() => postToNative({ type: 'open-profile' })}
        onOpenStudy={openStudy}
      />
    )
  }

  return (
    <StudyPage
      activeTab={activeTab}
      displayName={displayName}
      onBack={closeStudy}
      onOpenNotifications={() => postToNative({ type: 'open-notifications' })}
    />
  )
}

type StudyListProps = {
  displayName: string
  onOpenProfile: () => void
  onOpenStudy: () => void
}

function StudyList({ displayName, onOpenProfile, onOpenStudy }: StudyListProps) {
  return (
    <main className="screen study-list-screen">
      <header className="brand-header">
        <img alt="총총" className="brand-mark" src={brandMark} />
        <button className="text-button" onClick={onOpenProfile} type="button">
          My
        </button>
      </header>

      <section className="study-list-content">
        <h1 className="section-title">내 스터디</h1>
        <button className="study-card" onClick={onOpenStudy} type="button">
          <span className="role-badge">스터디 리드</span>
          <span className="study-title-row">
            <strong>{STUDY.name}</strong>
            <span className="member-count">
              <img alt="" src={membersIcon} /> {STUDY.members}명
            </span>
            <img alt="" className="chevron" src={chevronRightIcon} />
          </span>
          <span className="study-description">{STUDY.description}</span>
          <span className="study-counts">
            <span>
              <img alt="" src={noticesIcon} /> 공지 {STUDY.unreadNotices}
            </span>
            <span>
              <img alt="" src={assignmentsIcon} /> 과제 {STUDY.pendingAssignments}
            </span>
          </span>
        </button>

        <button className="primary-button" type="button">스터디 만들기</button>
        <button className="secondary-button" type="button">스터디 참여하기</button>

        <aside className="reminder-card">
          <img alt="" src={reminderMascot} />
          <span>
            <strong>리마인드는 총총이 보낼게요</strong>
            <small>정해둔 시각에 미확인자, 미제출자에게 알림을 보내요</small>
          </span>
        </aside>
        <p className="signed-in-copy">{displayName}님 계정으로 로그인했어요.</p>
      </section>
    </main>
  )
}

type StudyPageProps = {
  activeTab: TabId
  displayName: string
  onBack: () => void
  onOpenNotifications: () => void
}

function StudyPage({
  activeTab,
  displayName,
  onBack,
  onOpenNotifications,
}: StudyPageProps) {
  return (
    <main className="screen study-screen">
      <header className="study-header">
        <button aria-label="스터디 목록으로 돌아가기" className="icon-button" onClick={onBack} type="button">
          <img alt="" src={backIcon} />
        </button>
        <span className="study-header-copy">
          <strong>{STUDY.name}</strong>
          <small>{displayName} · 리드</small>
        </span>
        <button aria-label="알림 열기" className="icon-button" onClick={onOpenNotifications} type="button">
          <img alt="" src={bellIcon} />
        </button>
      </header>

      {activeTab === 'home' ? (
        <StudyHome displayName={displayName} />
      ) : (
        <PageScaffold activeTab={activeTab} />
      )}
    </main>
  )
}

function StudyHome({ displayName }: { displayName: string }) {
  return (
    <section className="study-home-content">
      <div className="today-card">
        <strong>{displayName}님, 오늘도 화이팅!</strong>
        <span>리마인드는 총총이 대신 보낼게요</span>
        <img alt="" src={leadHomeMascot} />
      </div>

      <p className="subsection-title">스터디 현황</p>
      <div className="status-cards">
        <button className="status-card" type="button">
          <img alt="" src={homeNoticeIcon} />
          <strong>2</strong>
          <span>공지</span>
          <small>읽음 6건</small>
        </button>
        <button className="status-card" type="button">
          <img alt="" src={homeAssignmentIcon} />
          <strong>1</strong>
          <span>과제</span>
          <small>제출 1건</small>
        </button>
      </div>

      <button className="todo-card" type="button">
        <img alt="" src={homeNoticeIcon} />
        <span>8월 스터디 운영 방식이 바뀝니다</span>
        <small>2/4 읽음</small>
      </button>

      <button className="todo-card" type="button">
        <img alt="" src={homeAssignmentIcon} />
        <span>리액트 렌더링 최적화 정리</span>
        <small>1/4 제출</small>
      </button>
    </section>
  )
}

const TAB_TITLES: Record<Exclude<TabId, 'home'>, string> = {
  notices: '공지',
  assignments: '과제',
  members: '멤버',
}

function PageScaffold({ activeTab }: { activeTab: Exclude<TabId, 'home'> }) {
  return (
    <section className="page-scaffold">
      <h1>{TAB_TITLES[activeTab]}</h1>
      <p>선택한 스터디의 {TAB_TITLES[activeTab]} 화면이에요.</p>
    </section>
  )
}

export default App
