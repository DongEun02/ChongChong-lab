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
import { NoticeDetailPage } from './features/notices/NoticeDetailPage'
import { NoticeListPage } from './features/notices/NoticeListPage'
import {
  CreateStudyPage,
  type CreateStudyInput,
} from './features/studies/CreateStudyPage'
import {
  NOTICE_DETAILS,
  parseNoticePayloads,
  type NoticeDetail,
} from './features/notices/notices'
import './App.css'

type TabId = 'home' | 'notices' | 'assignments' | 'members'
type NoticeDataStatus = 'error' | 'loading' | 'ready'
type StudyDataStatus = 'error' | 'loading' | 'ready'
type StudySummary = {
  description: string
  id: string
  memberCount: number
  memberLimit: number
  name: string
  pendingAssignments: number
  role: 'leader' | 'member'
  unreadNotices: number
}
type NativeMessage =
  | { type: 'close-notice' }
  | { type: 'close-create-study' }
  | ({ type: 'create-study' } & CreateStudyInput)
  | { type: 'create-notice' }
  | { type: 'delete-notice'; noticeId: string }
  | { type: 'edit-notice'; noticeId: string }
  | { type: 'exit-study' }
  | { type: 'open-notice'; noticeId: string }
  | { type: 'open-create-study' }
  | { type: 'open-notifications' }
  | { type: 'open-profile' }
  | { type: 'send-notice-reminder'; memberIds: string[]; noticeId: string }
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
  memberCount: 5,
  memberLimit: 5,
  role: 'leader' as const,
  unreadNotices: 2,
  pendingAssignments: 1,
}

function postToNative(message: NativeMessage) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message))
}

function App() {
  const [isStudyOpen, setIsStudyOpen] = useState(false)
  const [isCreateStudyOpen, setIsCreateStudyOpen] = useState(false)
  const [isCreatingStudy, setIsCreatingStudy] = useState(false)
  const [createStudyError, setCreateStudyError] = useState<string>()
  const [studies, setStudies] = useState<StudySummary[]>(
    window.ReactNativeWebView ? [] : [STUDY],
  )
  const [studyDataStatus, setStudyDataStatus] = useState<StudyDataStatus>(
    window.ReactNativeWebView ? 'loading' : 'ready',
  )
  const [selectedStudy, setSelectedStudy] = useState<StudySummary>(STUDY)
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null)
  const [notices, setNotices] = useState<NoticeDetail[]>(
    window.ReactNativeWebView ? [] : NOTICE_DETAILS,
  )
  const [noticeDataStatus, setNoticeDataStatus] = useState<NoticeDataStatus>(
    window.ReactNativeWebView ? 'loading' : 'ready',
  )
  const displayName = window.__CHONGCHONG_SESSION__?.displayName?.trim() || '바니'

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: TabId }>).detail

      if (detail?.tab) {
        setIsStudyOpen(true)
        setActiveTab(detail.tab)
        setSelectedNoticeId(null)
      }
    }

    window.addEventListener('chongchong:navigate', handleNavigation)
    const handleExitStudy = () => setIsStudyOpen(false)
    window.addEventListener('chongchong:exit-study', handleExitStudy)
    const handleCloseNotice = () => setSelectedNoticeId(null)
    window.addEventListener('chongchong:close-notice', handleCloseNotice)
    const handleCloseSubpage = () => {
      setSelectedNoticeId(null)
      setIsCreateStudyOpen(false)
      setIsCreatingStudy(false)
      setCreateStudyError(undefined)
    }
    window.addEventListener('chongchong:close-subpage', handleCloseSubpage)
    const handleNotices = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }
      if (detail.status === 'error') {
        setNotices(NOTICE_DETAILS)
        setNoticeDataStatus('error')
        return
      }
      if (detail.status === 'ready' && 'notices' in detail) {
        const parsedNotices = parseNoticePayloads(detail.notices)
        if (parsedNotices) {
          setNotices(parsedNotices)
          setNoticeDataStatus('ready')
        }
      }
    }
    window.addEventListener('chongchong:notices', handleNotices)
    const handleStudyCreateResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }

      if (detail.status === 'error') {
        setIsCreatingStudy(false)
        setCreateStudyError(
          'message' in detail && typeof detail.message === 'string'
            ? detail.message
            : '스터디를 만들지 못했어요. 다시 시도해 주세요.',
        )
        return
      }

      if (detail.status === 'success' && 'study' in detail) {
        const study = parseStudySummary(detail.study)
        if (study) {
          setStudies((current) => [study, ...current])
          setSelectedStudy(study)
          setIsCreatingStudy(false)
          setCreateStudyError(undefined)
          setIsCreateStudyOpen(false)
          setIsStudyOpen(true)
          setActiveTab('home')
        }
      }
    }
    window.addEventListener('chongchong:study-create-result', handleStudyCreateResult)
    const handleStudies = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }

      if (detail.status === 'error') {
        setStudyDataStatus('error')
        return
      }

      if (detail.status === 'ready' && 'studies' in detail) {
        const parsedStudies = parseStudySummaries(detail.studies)
        if (parsedStudies) {
          setStudies(parsedStudies)
          setStudyDataStatus('ready')
        }
      }
    }
    window.addEventListener('chongchong:studies', handleStudies)

    return () => {
      window.removeEventListener('chongchong:navigate', handleNavigation)
      window.removeEventListener('chongchong:exit-study', handleExitStudy)
      window.removeEventListener('chongchong:close-notice', handleCloseNotice)
      window.removeEventListener('chongchong:close-subpage', handleCloseSubpage)
      window.removeEventListener('chongchong:notices', handleNotices)
      window.removeEventListener('chongchong:study-create-result', handleStudyCreateResult)
      window.removeEventListener('chongchong:studies', handleStudies)
    }
  }, [])

  const openStudy = (study: StudySummary) => {
    setSelectedStudy(study)
    setIsStudyOpen(true)
    setActiveTab('home')
    postToNative({ type: 'study-selected', studyId: study.id })
  }

  const openCreateStudy = () => {
    setCreateStudyError(undefined)
    setIsCreateStudyOpen(true)
    postToNative({ type: 'open-create-study' })
  }

  const closeCreateStudy = () => {
    if (isCreatingStudy) {
      return
    }
    setIsCreateStudyOpen(false)
    setCreateStudyError(undefined)
    postToNative({ type: 'close-create-study' })
  }

  const createStudy = (input: CreateStudyInput) => {
    setIsCreatingStudy(true)
    setCreateStudyError(undefined)

    if (window.ReactNativeWebView) {
      postToNative({ type: 'create-study', ...input })
      return
    }

    window.dispatchEvent(
      new CustomEvent('chongchong:study-create-result', {
        detail: {
          status: 'success',
          study: {
            ...input,
            id: `preview-${Date.now()}`,
            memberCount: 1,
            role: 'leader',
          },
        },
      }),
    )
  }

  const closeStudy = () => {
    setIsStudyOpen(false)
    setSelectedNoticeId(null)
    postToNative({ type: 'exit-study' })
  }

  const openNotice = (noticeId: string) => {
    setSelectedNoticeId(noticeId)
    postToNative({ type: 'open-notice', noticeId })
  }

  const closeNotice = () => {
    setSelectedNoticeId(null)
    postToNative({ type: 'close-notice' })
  }

  if (isCreateStudyOpen) {
    return (
      <CreateStudyPage
        errorMessage={createStudyError}
        isSubmitting={isCreatingStudy}
        onBack={closeCreateStudy}
        onSubmit={createStudy}
      />
    )
  }

  if (!isStudyOpen) {
    return (
      <StudyList
        displayName={displayName}
        onCreateStudy={openCreateStudy}
        onOpenProfile={() => postToNative({ type: 'open-profile' })}
        onOpenStudy={openStudy}
        status={studyDataStatus}
        studies={studies}
      />
    )
  }

  const selectedNotice = notices.find((notice) => notice.id === selectedNoticeId)

  if (selectedNotice) {
    return (
      <NoticeDetailPage
        notice={selectedNotice}
        onBack={closeNotice}
        onDelete={(noticeId) => postToNative({ type: 'delete-notice', noticeId })}
        onEdit={(noticeId) => postToNative({ type: 'edit-notice', noticeId })}
        onSendReminder={(noticeId, memberIds) =>
          postToNative({ type: 'send-notice-reminder', memberIds, noticeId })
        }
      />
    )
  }

  return (
    <StudyPage
      activeTab={activeTab}
      displayName={displayName}
      noticeDataStatus={noticeDataStatus}
      notices={notices}
      study={selectedStudy}
      onBack={closeStudy}
      onOpenNotice={openNotice}
      onOpenNotifications={() => postToNative({ type: 'open-notifications' })}
    />
  )
}

type StudyListProps = {
  displayName: string
  onCreateStudy: () => void
  onOpenProfile: () => void
  onOpenStudy: (study: StudySummary) => void
  status: StudyDataStatus
  studies: StudySummary[]
}

function StudyList({
  displayName,
  onCreateStudy,
  onOpenProfile,
  onOpenStudy,
  status,
  studies,
}: StudyListProps) {
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
        {status === 'loading' ? (
          <p className="study-list-state">스터디 목록을 불러오고 있어요.</p>
        ) : status === 'error' ? (
          <p className="study-list-state is-error">
            스터디 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : studies.length === 0 ? (
          <p className="study-list-state">아직 참여한 스터디가 없어요.</p>
        ) : null}
        {studies.map((study) => (
          <button
            className="study-card"
            key={study.id}
            onClick={() => onOpenStudy(study)}
            type="button"
          >
            <span className="role-badge">
              {study.role === 'leader' ? '스터디 리드' : '스터디원'}
            </span>
            <span className="study-title-row">
              <strong>{study.name}</strong>
              <span className="member-count">
                <img alt="" src={membersIcon} /> {study.memberCount}명
              </span>
              <img alt="" className="chevron" src={chevronRightIcon} />
            </span>
            <span className="study-description">
              {study.description || '스터디 설명이 아직 없어요.'}
            </span>
            <span className="study-counts">
              <span>
                <img alt="" src={noticesIcon} /> 공지 {study.unreadNotices}
              </span>
              <span>
                <img alt="" src={assignmentsIcon} /> 과제 {study.pendingAssignments}
              </span>
            </span>
          </button>
        ))}

        <button className="primary-button" onClick={onCreateStudy} type="button">스터디 만들기</button>
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
  noticeDataStatus: NoticeDataStatus
  notices: NoticeDetail[]
  study: StudySummary
  onBack: () => void
  onOpenNotice: (noticeId: string) => void
  onOpenNotifications: () => void
}

function StudyPage({
  activeTab,
  displayName,
  noticeDataStatus,
  notices,
  study,
  onBack,
  onOpenNotice,
  onOpenNotifications,
}: StudyPageProps) {
  return (
    <main className="screen study-screen">
      <header className="study-header">
        <button aria-label="스터디 목록으로 돌아가기" className="icon-button" onClick={onBack} type="button">
          <img alt="" src={backIcon} />
        </button>
        <span className="study-header-copy">
          <strong>{study.name}</strong>
          <small>
            {displayName} · {study.role === 'leader' ? '리드' : '스터디원'}
          </small>
        </span>
        <button aria-label="알림 열기" className="icon-button" onClick={onOpenNotifications} type="button">
          <img alt="" src={bellIcon} />
        </button>
      </header>

      {activeTab === 'home' ? (
        <StudyHome displayName={displayName} study={study} />
      ) : activeTab === 'notices' ? (
        <NoticeListPage
          dataStatus={noticeDataStatus}
          notices={notices}
          onCreateNotice={() => postToNative({ type: 'create-notice' })}
          onOpenNotice={onOpenNotice}
        />
      ) : (
        <PageScaffold activeTab={activeTab} />
      )}
    </main>
  )
}

function StudyHome({
  displayName,
  study,
}: {
  displayName: string
  study: StudySummary
}) {
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
          <strong>{study.unreadNotices}</strong>
          <span>공지</span>
          <small>읽음 {study.id === STUDY.id ? 6 : 0}건</small>
        </button>
        <button className="status-card" type="button">
          <img alt="" src={homeAssignmentIcon} />
          <strong>{study.pendingAssignments}</strong>
          <span>과제</span>
          <small>제출 {study.id === STUDY.id ? 1 : 0}건</small>
        </button>
      </div>

      {study.id === STUDY.id ? (
        <>
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
        </>
      ) : null}
    </section>
  )
}

function parseStudySummary(value: unknown): StudySummary | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const study = value as Record<string, unknown>
  if (
    typeof study.id !== 'string' ||
    typeof study.name !== 'string' ||
    typeof study.description !== 'string' ||
    typeof study.memberCount !== 'number' ||
    typeof study.memberLimit !== 'number' ||
    study.role !== 'leader' && study.role !== 'member'
  ) {
    return null
  }

  return {
    description: study.description,
    id: study.id,
    memberCount: study.memberCount,
    memberLimit: study.memberLimit,
    name: study.name,
    pendingAssignments:
      typeof study.pendingAssignments === 'number'
        ? study.pendingAssignments
        : 0,
    role: study.role,
    unreadNotices:
      typeof study.unreadNotices === 'number' ? study.unreadNotices : 0,
  }
}

function parseStudySummaries(value: unknown): StudySummary[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const studies = value.map(parseStudySummary)
  return studies.every((study) => study !== null)
    ? (studies as StudySummary[])
    : null
}

const TAB_TITLES: Record<Exclude<TabId, 'home' | 'notices'>, string> = {
  assignments: '과제',
  members: '멤버',
}

function PageScaffold({
  activeTab,
}: {
  activeTab: Exclude<TabId, 'home' | 'notices'>
}) {
  return (
    <section className="page-scaffold">
      <h1>{TAB_TITLES[activeTab]}</h1>
      <p>선택한 스터디의 {TAB_TITLES[activeTab]} 화면이에요.</p>
    </section>
  )
}

export default App
