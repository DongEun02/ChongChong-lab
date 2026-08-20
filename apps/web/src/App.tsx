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
import { AssignmentListPage } from './features/assignments/AssignmentListPage'
import { AssignmentDetailPage } from './features/assignments/AssignmentDetailPage'
import {
  CreateAssignmentPage,
  type CreateAssignmentInput,
} from './features/assignments/CreateAssignmentPage'
import {
  ASSIGNMENT_PREVIEW,
  parseAssignmentPayloads,
  type AssignmentSummary,
} from './features/assignments/assignments'
import { NotificationListPage } from './features/notifications/NotificationListPage'
import {
  NOTIFICATION_PREVIEW,
  parseNotifications,
  type AppNotification,
} from './features/notifications/notifications'
import { NoticeDetailPage } from './features/notices/NoticeDetailPage'
import { NoticeListPage } from './features/notices/NoticeListPage'
import {
  CreateNoticePage,
  type CreateNoticeInput,
} from './features/notices/CreateNoticePage'
import {
  CreateStudyPage,
  type CreateStudyInput,
} from './features/studies/CreateStudyPage'
import { JoinStudyPage } from './features/studies/JoinStudyPage'
import { MemberListPage } from './features/studies/MemberListPage'
import {
  parseStudyMembers,
  type StudyMember,
} from './features/studies/members'
import {
  NOTICE_DETAILS,
  parseNoticePayloads,
  type NoticeDetail,
} from './features/notices/notices'
import './App.css'

type TabId = 'home' | 'notices' | 'assignments' | 'members'
type NoticeDataStatus = 'error' | 'loading' | 'ready'
type AssignmentDataStatus = 'error' | 'loading' | 'ready'
type NotificationDataStatus = 'error' | 'loading' | 'ready'
type StudyDataStatus = 'error' | 'loading' | 'ready'
type MemberDataStatus = 'error' | 'loading' | 'ready'
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
  | { type: 'web-ready' }
  | { type: 'close-notifications' }
  | { type: 'close-assignment' }
  | { type: 'close-create-assignment' }
  | { type: 'close-notice' }
  | { type: 'close-create-study' }
  | { type: 'close-create-notice' }
  | { type: 'close-join-study' }
  | { type: 'copy-invite-link'; inviteUrl: string }
  | ({ type: 'create-study' } & CreateStudyInput)
  | ({ type: 'create-notice' } & CreateNoticeInput)
  | ({ type: 'create-assignment' } & CreateAssignmentInput)
  | { type: 'delete-assignment'; assignmentId: string }
  | { type: 'delete-notice'; noticeId: string }
  | { type: 'delete-study'; studyName: string }
  | { type: 'edit-notice'; noticeId: string }
  | { type: 'edit-assignment'; assignmentId: string }
  | { type: 'exit-study' }
  | { type: 'join-study'; inviteUrl: string }
  | { type: 'mark-notice-read'; noticeId: string }
  | { type: 'navigate-study-tab'; tab: TabId }
  | { type: 'open-notice'; noticeId: string }
  | { type: 'open-assignment'; assignmentId: string }
  | { type: 'open-create-assignment' }
  | { type: 'open-create-study' }
  | { type: 'open-create-notice' }
  | { type: 'open-join-study' }
  | { type: 'open-notifications' }
  | {
      type: 'open-notification'
      assignmentId?: string
      notificationId: string
      noticeId?: string
      studyId?: string
    }
  | { type: 'open-profile' }
  | { type: 'remove-study-member'; displayName: string; memberId: string }
  | { type: 'send-notice-reminder'; memberIds: string[]; noticeId: string }
  | { type: 'send-assignment-reminder'; assignmentId: string; memberIds: string[] }
  | { type: 'study-selected'; studyId: string }
  | { type: 'submit-assignment'; assignmentId: string; content: string; link?: string }
  | { type: 'transfer-study-leadership'; displayName: string; memberId: string }
  | ({ type: 'update-assignment'; assignmentId: string } & CreateAssignmentInput)
  | ({ type: 'update-notice'; noticeId: string } & CreateNoticeInput)

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

const PREVIEW_MEMBERS: StudyMember[] = [
  { displayName: '김동은', id: 'preview-leader', role: 'leader' },
  { displayName: '이총총', id: 'preview-member-1', role: 'member' },
  { displayName: '박바니', id: 'preview-member-2', role: 'member' },
  { displayName: '최토끼', id: 'preview-member-3', role: 'member' },
  { displayName: '정총총', id: 'preview-member-4', role: 'member' },
]

const PAGE_PREVIEW = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null

function postToNative(message: NativeMessage) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message))
}

function App() {
  const [isStudyOpen, setIsStudyOpen] = useState(
    ['assignments', 'assignment-detail', 'assignment-submit', 'create-assignment', 'edit-assignment', 'delete-assignment', 'delete-notice'].includes(PAGE_PREVIEW ?? ''),
  )
  const [isCreateStudyOpen, setIsCreateStudyOpen] = useState(false)
  const [isCreatingStudy, setIsCreatingStudy] = useState(false)
  const [createStudyError, setCreateStudyError] = useState<string>()
  const [isJoinStudyOpen, setIsJoinStudyOpen] = useState(false)
  const [isJoiningStudy, setIsJoiningStudy] = useState(false)
  const [joinStudyError, setJoinStudyError] = useState<string>()
  const [isCreateNoticeOpen, setIsCreateNoticeOpen] = useState(
    PAGE_PREVIEW === 'create-notice' || PAGE_PREVIEW === 'edit-notice',
  )
  const [isCreatingNotice, setIsCreatingNotice] = useState(false)
  const [createNoticeError, setCreateNoticeError] = useState<string>()
  const [deletingNoticeId, setDeletingNoticeId] = useState<string>()
  const [deleteNoticeError, setDeleteNoticeError] = useState<string>()
  const [editingNoticeId, setEditingNoticeId] = useState<string | undefined>(
    PAGE_PREVIEW === 'edit-notice' ? NOTICE_DETAILS[0]?.id : undefined,
  )
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(
    PAGE_PREVIEW === 'notifications',
  )
  const [notifications, setNotifications] = useState<AppNotification[]>(
    window.ReactNativeWebView ? [] : NOTIFICATION_PREVIEW,
  )
  const [notificationDataStatus, setNotificationDataStatus] =
    useState<NotificationDataStatus>(
      window.ReactNativeWebView ? 'loading' : 'ready',
    )
  const [studies, setStudies] = useState<StudySummary[]>(
    window.ReactNativeWebView ? [] : [STUDY],
  )
  const [studyDataStatus, setStudyDataStatus] = useState<StudyDataStatus>(
    window.ReactNativeWebView ? 'loading' : 'ready',
  )
  const [selectedStudy, setSelectedStudy] = useState<StudySummary>(
    PAGE_PREVIEW === 'assignment-submit' ? { ...STUDY, role: 'member' } : STUDY,
  )
  const [activeTab, setActiveTab] = useState<TabId>(
    PAGE_PREVIEW?.startsWith('assignment') || PAGE_PREVIEW === 'create-assignment' ? 'assignments' : 'home',
  )
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(
    PAGE_PREVIEW === 'delete-notice' ? NOTICE_DETAILS[0]?.id ?? null : null,
  )
  const [notices, setNotices] = useState<NoticeDetail[]>(
    window.ReactNativeWebView ? [] : NOTICE_DETAILS,
  )
  const [noticeDataStatus, setNoticeDataStatus] = useState<NoticeDataStatus>(
    window.ReactNativeWebView ? 'loading' : 'ready',
  )
  const [assignments, setAssignments] = useState<AssignmentSummary[]>(
    window.ReactNativeWebView ? [] : ASSIGNMENT_PREVIEW,
  )
  const [assignmentDataStatus, setAssignmentDataStatus] =
    useState<AssignmentDataStatus>(
      window.ReactNativeWebView ? 'loading' : 'ready',
    )
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    ['assignment-detail', 'edit-assignment', 'delete-assignment'].includes(PAGE_PREVIEW ?? '')
      ? ASSIGNMENT_PREVIEW[0]?.id ?? null
      : PAGE_PREVIEW === 'assignment-submit'
        ? ASSIGNMENT_PREVIEW[1]?.id ?? null
        : null,
  )
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(
    PAGE_PREVIEW === 'create-assignment' || PAGE_PREVIEW === 'edit-assignment',
  )
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [assignmentActionError, setAssignmentActionError] = useState<string>()
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | undefined>(
    PAGE_PREVIEW === 'edit-assignment' ? ASSIGNMENT_PREVIEW[0]?.id : undefined,
  )
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string>()
  const [assignmentDeleteError, setAssignmentDeleteError] = useState<string>()
  const [members, setMembers] = useState<StudyMember[]>(
    window.ReactNativeWebView ? [] : PREVIEW_MEMBERS,
  )
  const [memberDataStatus, setMemberDataStatus] = useState<MemberDataStatus>(
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
        setSelectedAssignmentId(null)
      }
    }

    window.addEventListener('chongchong:navigate', handleNavigation)
    const handleExitStudy = () => setIsStudyOpen(false)
    window.addEventListener('chongchong:exit-study', handleExitStudy)
    const handleCloseNotice = () => setSelectedNoticeId(null)
    window.addEventListener('chongchong:close-notice', handleCloseNotice)
    const handleCloseSubpage = () => {
      setSelectedNoticeId(null)
      setSelectedAssignmentId(null)
      setIsCreateAssignmentOpen(false)
      setIsSavingAssignment(false)
      setAssignmentActionError(undefined)
      setEditingAssignmentId(undefined)
      setDeletingAssignmentId(undefined)
      setAssignmentDeleteError(undefined)
      setIsCreateStudyOpen(false)
      setIsCreatingStudy(false)
      setCreateStudyError(undefined)
      setIsJoinStudyOpen(false)
      setIsJoiningStudy(false)
      setJoinStudyError(undefined)
      setIsCreateNoticeOpen(false)
      setIsCreatingNotice(false)
      setCreateNoticeError(undefined)
      setEditingNoticeId(undefined)
      setDeletingNoticeId(undefined)
      setDeleteNoticeError(undefined)
      setIsNotificationsOpen(false)
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
    const handleAssignments = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }

      if (detail.status === 'error') {
        setAssignmentDataStatus('error')
        return
      }

      if (detail.status === 'ready' && 'assignments' in detail) {
        const parsedAssignments = parseAssignmentPayloads(detail.assignments)
        if (parsedAssignments) {
          setAssignments(parsedAssignments)
          setAssignmentDataStatus('ready')
        }
      }
    }
    window.addEventListener('chongchong:assignments', handleAssignments)
    const handleAssignmentCreateResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) return
      if (detail.status === 'error') {
        setIsSavingAssignment(false)
        setAssignmentActionError('message' in detail && typeof detail.message === 'string' ? detail.message : '과제를 올리지 못했어요.')
        return
      }
      setIsSavingAssignment(false)
      setAssignmentActionError(undefined)
      setIsCreateAssignmentOpen(false)
      setActiveTab('assignments')
    }
    const handleAssignmentSubmitResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) return
      if (detail.status === 'error') {
        setIsSavingAssignment(false)
        setAssignmentActionError('message' in detail && typeof detail.message === 'string' ? detail.message : '과제를 제출하지 못했어요.')
        return
      }
      setIsSavingAssignment(false)
      setAssignmentActionError(undefined)
    }
    const handleAssignmentUpdateResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) return
      if (detail.status === 'error') {
        setIsSavingAssignment(false)
        setAssignmentActionError('message' in detail && typeof detail.message === 'string' ? detail.message : '과제를 수정하지 못했어요.')
        return
      }
      setIsSavingAssignment(false)
      setAssignmentActionError(undefined)
      setIsCreateAssignmentOpen(false)
      setEditingAssignmentId(undefined)
    }
    const handleAssignmentDeleteResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) return
      if (detail.status === 'error') {
        setDeletingAssignmentId(undefined)
        setAssignmentDeleteError('message' in detail && typeof detail.message === 'string' ? detail.message : '과제를 삭제하지 못했어요.')
        return
      }
      if (
        detail.status === 'success' &&
        'assignment' in detail &&
        detail.assignment &&
        typeof detail.assignment === 'object' &&
        'id' in detail.assignment &&
        typeof detail.assignment.id === 'string'
      ) {
        const deletedAssignmentId = detail.assignment.id
        setAssignments((current) => current.filter((assignment) => assignment.id !== deletedAssignmentId))
        setDeletingAssignmentId(undefined)
        setAssignmentDeleteError(undefined)
        setSelectedAssignmentId(null)
        setActiveTab('assignments')
      }
    }
    window.addEventListener('chongchong:assignment-create-result', handleAssignmentCreateResult)
    window.addEventListener('chongchong:assignment-submit-result', handleAssignmentSubmitResult)
    window.addEventListener('chongchong:assignment-update-result', handleAssignmentUpdateResult)
    window.addEventListener('chongchong:assignment-delete-result', handleAssignmentDeleteResult)
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
          setStudies((current) => [
            study,
            ...current.filter((candidate) => candidate.id !== study.id),
          ])
          setSelectedStudy(study)
          setIsCreatingStudy(false)
          setCreateStudyError(undefined)
          setIsCreateStudyOpen(false)
          setIsStudyOpen(true)
          setActiveTab('home')
          setMembers([])
          setMemberDataStatus('loading')
        }
      }
    }
    window.addEventListener('chongchong:study-create-result', handleStudyCreateResult)
    const handleStudyJoinResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }

      if (detail.status === 'error') {
        setIsJoiningStudy(false)
        setJoinStudyError(
          'message' in detail && typeof detail.message === 'string'
            ? detail.message
            : '스터디에 참여하지 못했어요. 다시 시도해 주세요.',
        )
        return
      }

      if (detail.status === 'success' && 'study' in detail) {
        const study = parseStudySummary(detail.study)
        if (study) {
          setStudies((current) => [
            study,
            ...current.filter((candidate) => candidate.id !== study.id),
          ])
          setSelectedStudy(study)
          setIsJoiningStudy(false)
          setJoinStudyError(undefined)
          setIsJoinStudyOpen(false)
          setIsStudyOpen(true)
          setActiveTab('home')
          setMembers([])
          setMemberDataStatus('loading')
        }
      }
    }
    window.addEventListener('chongchong:study-join-result', handleStudyJoinResult)
    const handleNoticeCreateResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }

      if (detail.status === 'error') {
        setIsCreatingNotice(false)
        setCreateNoticeError(
          'message' in detail && typeof detail.message === 'string'
            ? detail.message
            : '공지를 올리지 못했어요. 다시 시도해 주세요.',
        )
        return
      }

      if (detail.status === 'success') {
        setIsCreatingNotice(false)
        setCreateNoticeError(undefined)
        setIsCreateNoticeOpen(false)
        setActiveTab('notices')
      }
    }
    window.addEventListener('chongchong:notice-create-result', handleNoticeCreateResult)
    const handleNoticeUpdateResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }

      if (detail.status === 'error') {
        setIsCreatingNotice(false)
        setCreateNoticeError(
          'message' in detail && typeof detail.message === 'string'
            ? detail.message
            : '공지를 수정하지 못했어요. 다시 시도해 주세요.',
        )
        return
      }

      if (detail.status === 'success') {
        setIsCreatingNotice(false)
        setCreateNoticeError(undefined)
        setIsCreateNoticeOpen(false)
        setEditingNoticeId(undefined)
      }
    }
    window.addEventListener('chongchong:notice-update-result', handleNoticeUpdateResult)
    const handleNoticeDeleteResult = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }

      if (detail.status === 'error') {
        setDeletingNoticeId(undefined)
        setDeleteNoticeError(
          'message' in detail && typeof detail.message === 'string'
            ? detail.message
            : '공지를 삭제하지 못했어요. 다시 시도해 주세요.',
        )
        return
      }

      if (
        detail.status === 'success' &&
        'notice' in detail &&
        detail.notice &&
        typeof detail.notice === 'object' &&
        'id' in detail.notice &&
        typeof detail.notice.id === 'string'
      ) {
        const deletedNoticeId = detail.notice.id
        setNotices((current) =>
          current.filter((notice) => notice.id !== deletedNoticeId),
        )
        setDeletingNoticeId(undefined)
        setDeleteNoticeError(undefined)
        setSelectedNoticeId(null)
        setActiveTab('notices')
      }
    }
    window.addEventListener('chongchong:notice-delete-result', handleNoticeDeleteResult)
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
          setSelectedStudy((current) =>
            parsedStudies.find((study) => study.id === current.id) ?? current,
          )
          setStudyDataStatus('ready')
        }
      }
    }
    window.addEventListener('chongchong:studies', handleStudies)
    const handleMembers = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }

      if (detail.status === 'error') {
        setMemberDataStatus('error')
        return
      }

      if (detail.status === 'ready' && 'members' in detail) {
        const parsedMembers = parseStudyMembers(detail.members)
        if (parsedMembers) {
          setMembers(parsedMembers)
          setMemberDataStatus('ready')
        }
      }
    }
    window.addEventListener('chongchong:members', handleMembers)
    const handleNotifications = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object' || !('status' in detail)) {
        return
      }

      if (detail.status === 'error') {
        setNotificationDataStatus('error')
        return
      }

      if (detail.status === 'ready' && 'notifications' in detail) {
        const parsedNotifications = parseNotifications(detail.notifications)
        if (parsedNotifications) {
          setNotifications(parsedNotifications)
          setNotificationDataStatus('ready')
        }
      }
    }
    window.addEventListener('chongchong:notifications', handleNotifications)

    postToNative({ type: 'web-ready' })

    return () => {
      window.removeEventListener('chongchong:navigate', handleNavigation)
      window.removeEventListener('chongchong:exit-study', handleExitStudy)
      window.removeEventListener('chongchong:close-notice', handleCloseNotice)
      window.removeEventListener('chongchong:close-subpage', handleCloseSubpage)
      window.removeEventListener('chongchong:notices', handleNotices)
      window.removeEventListener('chongchong:assignments', handleAssignments)
      window.removeEventListener('chongchong:assignment-create-result', handleAssignmentCreateResult)
      window.removeEventListener('chongchong:assignment-submit-result', handleAssignmentSubmitResult)
      window.removeEventListener('chongchong:assignment-update-result', handleAssignmentUpdateResult)
      window.removeEventListener('chongchong:assignment-delete-result', handleAssignmentDeleteResult)
      window.removeEventListener('chongchong:study-create-result', handleStudyCreateResult)
      window.removeEventListener('chongchong:study-join-result', handleStudyJoinResult)
      window.removeEventListener('chongchong:notice-create-result', handleNoticeCreateResult)
      window.removeEventListener('chongchong:notice-update-result', handleNoticeUpdateResult)
      window.removeEventListener('chongchong:notice-delete-result', handleNoticeDeleteResult)
      window.removeEventListener('chongchong:studies', handleStudies)
      window.removeEventListener('chongchong:members', handleMembers)
      window.removeEventListener('chongchong:notifications', handleNotifications)
    }
  }, [])

  useEffect(() => {
    if (!window.ReactNativeWebView || studyDataStatus !== 'loading') {
      return
    }

    const retryIds = [250, 1000, 3000].map((delay) =>
      window.setTimeout(() => postToNative({ type: 'web-ready' }), delay),
    )

    return () => retryIds.forEach((retryId) => window.clearTimeout(retryId))
  }, [studyDataStatus])

  const openStudy = (study: StudySummary) => {
    setSelectedStudy(study)
    setIsStudyOpen(true)
    setActiveTab('home')
    setMembers(window.ReactNativeWebView ? [] : PREVIEW_MEMBERS)
    setMemberDataStatus(window.ReactNativeWebView ? 'loading' : 'ready')
    setNotices(window.ReactNativeWebView ? [] : NOTICE_DETAILS)
    setNoticeDataStatus(window.ReactNativeWebView ? 'loading' : 'ready')
    setAssignments(window.ReactNativeWebView ? [] : ASSIGNMENT_PREVIEW)
    setAssignmentDataStatus(window.ReactNativeWebView ? 'loading' : 'ready')
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

  const openJoinStudy = () => {
    setJoinStudyError(undefined)
    setIsJoinStudyOpen(true)
    postToNative({ type: 'open-join-study' })
  }

  const closeJoinStudy = () => {
    if (isJoiningStudy) {
      return
    }
    setIsJoinStudyOpen(false)
    setJoinStudyError(undefined)
    postToNative({ type: 'close-join-study' })
  }

  const joinStudy = (inviteUrl: string) => {
    setIsJoiningStudy(true)
    setJoinStudyError(undefined)

    if (window.ReactNativeWebView) {
      postToNative({ inviteUrl, type: 'join-study' })
      return
    }

    window.dispatchEvent(
      new CustomEvent('chongchong:study-join-result', {
        detail: {
          status: 'success',
          study: {
            description: '새로 참여한 스터디예요.',
            id: `joined-${Date.now()}`,
            memberCount: 2,
            memberLimit: 5,
            name: '총총 참여 테스트',
            role: 'member',
          },
        },
      }),
    )
  }

  const openCreateNotice = () => {
    setCreateNoticeError(undefined)
    setEditingNoticeId(undefined)
    setIsCreateNoticeOpen(true)
    postToNative({ type: 'open-create-notice' })
  }

  const openCreateAssignment = () => {
    setAssignmentActionError(undefined)
    setEditingAssignmentId(undefined)
    setIsCreateAssignmentOpen(true)
    postToNative({ type: 'open-create-assignment' })
  }

  const closeCreateAssignment = () => {
    if (isSavingAssignment) return
    const wasEditing = Boolean(editingAssignmentId)
    setIsCreateAssignmentOpen(false)
    setAssignmentActionError(undefined)
    setEditingAssignmentId(undefined)
    if (!wasEditing) {
      postToNative({ type: 'close-create-assignment' })
    }
  }

  const createAssignment = (input: CreateAssignmentInput) => {
    setIsSavingAssignment(true)
    setAssignmentActionError(undefined)
    if (window.ReactNativeWebView) {
      postToNative({ ...input, type: 'create-assignment' })
      return
    }
    const assignment = {
      ...ASSIGNMENT_PREVIEW[0],
      ...input,
      deadlineAt: new Date(input.deadlineAt),
      id: `preview-assignment-${Date.now()}`,
      isSubmitted: false,
      submission: undefined,
      submissions: [],
      submittedCount: 0,
    }
    setAssignments((current) => [assignment, ...current])
    setIsSavingAssignment(false)
    setIsCreateAssignmentOpen(false)
    setActiveTab('assignments')
  }

  const openAssignment = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId)
    setAssignmentActionError(undefined)
    setAssignmentDeleteError(undefined)
    postToNative({ assignmentId, type: 'open-assignment' })
  }

  const openEditAssignment = (assignmentId: string) => {
    setAssignmentActionError(undefined)
    setEditingAssignmentId(assignmentId)
    setIsCreateAssignmentOpen(true)
    postToNative({ assignmentId, type: 'edit-assignment' })
  }

  const updateAssignment = (input: CreateAssignmentInput) => {
    if (!editingAssignmentId) return
    setIsSavingAssignment(true)
    setAssignmentActionError(undefined)
    if (window.ReactNativeWebView) {
      postToNative({ ...input, assignmentId: editingAssignmentId, type: 'update-assignment' })
      return
    }
    setAssignments((current) => current.map((assignment) => assignment.id === editingAssignmentId ? {
      ...assignment,
      ...input,
      deadlineAt: new Date(input.deadlineAt),
    } : assignment))
    window.dispatchEvent(new CustomEvent('chongchong:assignment-update-result', { detail: { status: 'success' } }))
  }

  const deleteAssignment = (assignmentId: string) => {
    setDeletingAssignmentId(assignmentId)
    setAssignmentDeleteError(undefined)
    if (window.ReactNativeWebView) {
      postToNative({ assignmentId, type: 'delete-assignment' })
      return
    }
    window.dispatchEvent(new CustomEvent('chongchong:assignment-delete-result', {
      detail: { assignment: { id: assignmentId, title: '' }, status: 'success' },
    }))
  }

  const closeAssignment = () => {
    if (isSavingAssignment) return
    setSelectedAssignmentId(null)
    setAssignmentActionError(undefined)
    setAssignmentDeleteError(undefined)
    postToNative({ type: 'close-assignment' })
  }

  const submitSelectedAssignment = (content: string, link?: string) => {
    if (!selectedAssignmentId) return
    setIsSavingAssignment(true)
    setAssignmentActionError(undefined)
    if (window.ReactNativeWebView) {
      postToNative({ assignmentId: selectedAssignmentId, content, link, type: 'submit-assignment' })
      return
    }
    const submittedAt = new Date()
    setAssignments((current) => current.map((assignment) => assignment.id === selectedAssignmentId ? {
      ...assignment,
      isSubmitted: true,
      submission: { content, link, submittedAt, updatedAt: submittedAt, userId: 'preview-member', userName: displayName },
    } : assignment))
    setIsSavingAssignment(false)
  }

  const closeCreateNotice = () => {
    if (isCreatingNotice) {
      return
    }
    const wasEditing = Boolean(editingNoticeId)
    setIsCreateNoticeOpen(false)
    setCreateNoticeError(undefined)
    setEditingNoticeId(undefined)
    if (!wasEditing) {
      postToNative({ type: 'close-create-notice' })
    }
  }

  const createNotice = (input: CreateNoticeInput) => {
    setIsCreatingNotice(true)
    setCreateNoticeError(undefined)

    if (window.ReactNativeWebView) {
      postToNative({ ...input, type: 'create-notice' })
      return
    }

    window.dispatchEvent(
      new CustomEvent('chongchong:notice-create-result', {
        detail: { status: 'success' },
      }),
    )
  }

  const openEditNotice = (noticeId: string) => {
    setCreateNoticeError(undefined)
    setEditingNoticeId(noticeId)
    setIsCreateNoticeOpen(true)
    postToNative({ noticeId, type: 'edit-notice' })
  }

  const updateNotice = (input: CreateNoticeInput) => {
    if (!editingNoticeId) {
      return
    }
    setIsCreatingNotice(true)
    setCreateNoticeError(undefined)

    if (window.ReactNativeWebView) {
      postToNative({ ...input, noticeId: editingNoticeId, type: 'update-notice' })
      return
    }

    setNotices((current) =>
      current.map((notice) =>
        notice.id === editingNoticeId
          ? {
              ...notice,
              body: input.content,
              content: input.content,
              reminderAts: input.reminderAts,
              title: input.title,
            }
          : notice,
      ),
    )
    window.dispatchEvent(
      new CustomEvent('chongchong:notice-update-result', {
        detail: { status: 'success' },
      }),
    )
  }

  const closeStudy = () => {
    setIsStudyOpen(false)
    setSelectedNoticeId(null)
    postToNative({ type: 'exit-study' })
  }

  const copyInviteLink = (inviteUrl: string) => {
    if (window.ReactNativeWebView) {
      postToNative({ inviteUrl, type: 'copy-invite-link' })
      return
    }

    void navigator.clipboard?.writeText(inviteUrl)
  }

  const removeMember = (member: StudyMember) => {
    if (window.ReactNativeWebView) {
      postToNative({
        displayName: member.displayName,
        memberId: member.id,
        type: 'remove-study-member',
      })
      return
    }

    setMembers((current) =>
      current.filter((candidate) => candidate.id !== member.id),
    )
  }

  const transferLeadership = (member: StudyMember) => {
    postToNative({
      displayName: member.displayName,
      memberId: member.id,
      type: 'transfer-study-leadership',
    })
  }

  const deleteSelectedStudy = () => {
    if (window.ReactNativeWebView) {
      postToNative({ studyName: selectedStudy.name, type: 'delete-study' })
      return
    }

    setStudies((current) =>
      current.filter((study) => study.id !== selectedStudy.id),
    )
    setIsStudyOpen(false)
    setActiveTab('home')
  }

  const openNotice = (noticeId: string) => {
    setSelectedNoticeId(noticeId)
    postToNative({ type: 'open-notice', noticeId })
  }

  const navigateToStudyTab = (tab: TabId) => {
    setActiveTab(tab)
    setSelectedNoticeId(null)
    setSelectedAssignmentId(null)
    postToNative({ tab, type: 'navigate-study-tab' })
  }

  const closeNotice = () => {
    setSelectedNoticeId(null)
    postToNative({ type: 'close-notice' })
  }

  const openNotifications = () => {
    setIsNotificationsOpen(true)
    postToNative({ type: 'open-notifications' })
  }

  const closeNotifications = () => {
    setIsNotificationsOpen(false)
    postToNative({ type: 'close-notifications' })
  }

  const openNotification = (notification: AppNotification) => {
    setNotifications((current) =>
      current.map((candidate) =>
        candidate.id === notification.id
          ? { ...candidate, isRead: true }
          : candidate,
      ),
    )
    postToNative({
      assignmentId: notification.assignmentId,
      notificationId: notification.id,
      noticeId: notification.noticeId,
      studyId: notification.studyId,
      type: 'open-notification',
    })

    if (
      !notification.studyId ||
      (!notification.noticeId && !notification.assignmentId)
    ) {
      return
    }
    const targetStudy = studies.find(
      (study) => study.id === notification.studyId,
    )
    if (!targetStudy) {
      return
    }

    setSelectedStudy(targetStudy)
    setIsStudyOpen(true)
    setIsNotificationsOpen(false)
    if (notification.assignmentId) {
      setActiveTab('assignments')
      setSelectedAssignmentId(notification.assignmentId)
      setSelectedNoticeId(null)
    } else if (notification.noticeId) {
      setActiveTab('notices')
      setSelectedNoticeId(notification.noticeId)
      setSelectedAssignmentId(null)
    }
  }

  const deleteNotice = (noticeId: string) => {
    setDeletingNoticeId(noticeId)
    setDeleteNoticeError(undefined)

    if (window.ReactNativeWebView) {
      postToNative({ noticeId, type: 'delete-notice' })
      return
    }

    window.dispatchEvent(
      new CustomEvent('chongchong:notice-delete-result', {
        detail: {
          notice: { id: noticeId, title: '' },
          status: 'success',
        },
      }),
    )
  }

  const editingAssignment = editingAssignmentId
    ? assignments.find((assignment) => assignment.id === editingAssignmentId)
    : undefined

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

  if (isJoinStudyOpen) {
    return (
      <JoinStudyPage
        errorMessage={joinStudyError}
        isSubmitting={isJoiningStudy}
        onBack={closeJoinStudy}
        onOpenProfile={() => postToNative({ type: 'open-profile' })}
        onSubmit={joinStudy}
      />
    )
  }

  if (isCreateAssignmentOpen) {
    return (
      <CreateAssignmentPage
        errorMessage={assignmentActionError}
        initialValue={editingAssignment ? {
          content: editingAssignment.content,
          deadlineAt: editingAssignment.deadlineAt.toISOString(),
          reminderAts: editingAssignment.reminderAts,
          submissionInstructions: editingAssignment.submissionInstructions,
          title: editingAssignment.title,
        } : undefined}
        isSubmitting={isSavingAssignment}
        key={editingAssignmentId ?? 'create'}
        mode={editingAssignment ? 'edit' : 'create'}
        onBack={closeCreateAssignment}
        onSubmit={editingAssignment ? updateAssignment : createAssignment}
      />
    )
  }

  const editingNotice = editingNoticeId
    ? notices.find((notice) => notice.id === editingNoticeId)
    : undefined

  if (isCreateNoticeOpen) {
    return (
      <CreateNoticePage
        errorMessage={createNoticeError}
        initialValue={
          editingNotice
            ? {
                content: editingNotice.body,
                reminderAts: editingNotice.reminderAts,
                title: editingNotice.title,
              }
            : undefined
        }
        isSubmitting={isCreatingNotice}
        key={editingNoticeId ?? 'create'}
        mode={editingNotice ? 'edit' : 'create'}
        onBack={closeCreateNotice}
        onSubmit={editingNotice ? updateNotice : createNotice}
      />
    )
  }

  if (isNotificationsOpen) {
    return (
      <NotificationListPage
        notifications={notifications}
        onBack={closeNotifications}
        onOpenNotification={openNotification}
        status={notificationDataStatus}
      />
    )
  }

  if (!isStudyOpen) {
    return (
      <StudyList
        onCreateStudy={openCreateStudy}
        onOpenProfile={() => postToNative({ type: 'open-profile' })}
        onJoinStudy={openJoinStudy}
        onOpenStudy={openStudy}
        status={studyDataStatus}
        studies={studies}
      />
    )
  }

  const selectedNotice = notices.find((notice) => notice.id === selectedNoticeId)
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId)

  if (selectedAssignment) {
    return (
      <AssignmentDetailPage
        assignment={selectedAssignment}
        deleteError={assignmentDeleteError}
        errorMessage={assignmentActionError}
        isDeleting={deletingAssignmentId === selectedAssignment.id}
        isSubmitting={isSavingAssignment}
        key={`${selectedAssignment.id}-${selectedAssignment.submission?.updatedAt.getTime() ?? 'pending'}`}
        onBack={closeAssignment}
        onDelete={deleteAssignment}
        onEdit={openEditAssignment}
        onReminder={(memberIds) => postToNative({ assignmentId: selectedAssignment.id, memberIds, type: 'send-assignment-reminder' })}
        onSubmit={submitSelectedAssignment}
        role={selectedStudy.role}
      />
    )
  }

  if (selectedNotice) {
    return (
      <NoticeDetailPage
        deleteError={deleteNoticeError}
        isDeleting={deletingNoticeId === selectedNotice.id}
        notice={selectedNotice}
        onBack={closeNotice}
        onDelete={deleteNotice}
        onEdit={openEditNotice}
        onRead={(noticeId) => postToNative({ noticeId, type: 'mark-notice-read' })}
        onSendReminder={(noticeId, memberIds) =>
          postToNative({ type: 'send-notice-reminder', memberIds, noticeId })
        }
        role={selectedStudy.role}
      />
    )
  }

  return (
    <StudyPage
      activeTab={activeTab}
      assignmentDataStatus={assignmentDataStatus}
      assignments={assignments}
      displayName={displayName}
      memberDataStatus={memberDataStatus}
      members={members}
      noticeDataStatus={noticeDataStatus}
      notices={notices}
      study={selectedStudy}
      onBack={closeStudy}
      onCopyInviteLink={copyInviteLink}
      onDeleteStudy={deleteSelectedStudy}
      onRemoveMember={removeMember}
      onTransferLeadership={transferLeadership}
      onOpenNotice={openNotice}
      onCreateNotice={openCreateNotice}
      onCreateAssignment={openCreateAssignment}
      onOpenAssignment={openAssignment}
      onOpenNotifications={openNotifications}
      onNavigateToTab={navigateToStudyTab}
    />
  )
}

type StudyListProps = {
  onCreateStudy: () => void
  onJoinStudy: () => void
  onOpenProfile: () => void
  onOpenStudy: (study: StudySummary) => void
  status: StudyDataStatus
  studies: StudySummary[]
}

function StudyList({
  onCreateStudy,
  onJoinStudy,
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
        <button className="secondary-button" onClick={onJoinStudy} type="button">
          스터디 참여하기
        </button>

        <aside className="reminder-card">
          <img alt="" src={reminderMascot} />
          <span>
            <strong>리마인드는 총총이 보낼게요</strong>
            <small>정해둔 시각에 미확인자, 미제출자에게 알림을 보내요</small>
          </span>
        </aside>
      </section>
    </main>
  )
}

type StudyPageProps = {
  activeTab: TabId
  assignmentDataStatus: AssignmentDataStatus
  assignments: AssignmentSummary[]
  displayName: string
  memberDataStatus: MemberDataStatus
  members: StudyMember[]
  noticeDataStatus: NoticeDataStatus
  notices: NoticeDetail[]
  study: StudySummary
  onBack: () => void
  onCopyInviteLink: (inviteUrl: string) => void
  onDeleteStudy: () => void
  onRemoveMember: (member: StudyMember) => void
  onTransferLeadership: (member: StudyMember) => void
  onOpenNotice: (noticeId: string) => void
  onCreateNotice: () => void
  onCreateAssignment: () => void
  onOpenAssignment: (assignmentId: string) => void
  onOpenNotifications: () => void
  onNavigateToTab: (tab: TabId) => void
}

function StudyPage({
  activeTab,
  assignmentDataStatus,
  assignments,
  displayName,
  memberDataStatus,
  members,
  noticeDataStatus,
  notices,
  study,
  onBack,
  onCopyInviteLink,
  onDeleteStudy,
  onRemoveMember,
  onTransferLeadership,
  onOpenNotice,
  onCreateNotice,
  onCreateAssignment,
  onOpenAssignment,
  onOpenNotifications,
  onNavigateToTab,
}: StudyPageProps) {
  if (activeTab === 'members') {
    return (
      <MemberListPage
        canDeleteStudy={study.role === 'leader'}
        canRemoveMembers={study.role === 'leader'}
        inviteUrl={`https://chongchong.app/join/${study.id}`}
        members={members}
        onBack={onBack}
        onCopyInviteLink={onCopyInviteLink}
        onDeleteStudy={onDeleteStudy}
        onRemoveMember={onRemoveMember}
        onTransferLeadership={onTransferLeadership}
        status={memberDataStatus}
      />
    )
  }

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
        <StudyHome
          assignmentDataStatus={assignmentDataStatus}
          assignments={assignments}
          displayName={displayName}
          noticeDataStatus={noticeDataStatus}
          notices={notices}
          onNavigateToTab={onNavigateToTab}
          onOpenAssignment={onOpenAssignment}
          onOpenNotice={onOpenNotice}
          study={study}
        />
      ) : activeTab === 'notices' ? (
        <NoticeListPage
          dataStatus={noticeDataStatus}
          notices={notices}
          onCreateNotice={onCreateNotice}
          onOpenNotice={onOpenNotice}
          role={study.role}
        />
      ) : activeTab === 'assignments' ? (
        <AssignmentListPage
          assignments={assignments}
          onCreate={onCreateAssignment}
          onOpen={onOpenAssignment}
          role={study.role}
          status={assignmentDataStatus}
        />
      ) : (
        <PageScaffold activeTab={activeTab} />
      )}
    </main>
  )
}

function StudyHome({
  assignmentDataStatus,
  assignments,
  displayName,
  noticeDataStatus,
  notices,
  onNavigateToTab,
  onOpenAssignment,
  onOpenNotice,
  study,
}: {
  assignmentDataStatus: AssignmentDataStatus
  assignments: AssignmentSummary[]
  displayName: string
  noticeDataStatus: NoticeDataStatus
  notices: NoticeDetail[]
  onNavigateToTab: (tab: TabId) => void
  onOpenAssignment: (assignmentId: string) => void
  onOpenNotice: (noticeId: string) => void
  study: StudySummary
}) {
  const pendingNotices = notices.filter((notice) =>
    study.role === 'leader'
      ? notice.readCount < notice.totalMemberCount
      : !notice.isReadByCurrentUser,
  )
  const pendingAssignments = assignments.filter((assignment) =>
    study.role === 'leader'
      ? assignment.submittedCount < assignment.totalMemberCount
      : !assignment.isSubmitted,
  )
  const isLoading =
    noticeDataStatus === 'loading' || assignmentDataStatus === 'loading'
  const hasError =
    noticeDataStatus === 'error' || assignmentDataStatus === 'error'

  return (
    <section className="study-home-content">
      <div className="today-card">
        <strong>{displayName}님, 오늘도 화이팅!</strong>
        <span>리마인드는 총총이 대신 보낼게요</span>
        <img alt="" src={leadHomeMascot} />
      </div>

      <p className="subsection-title">스터디 현황</p>
      <div className="status-cards">
        <button className="status-card" onClick={() => onNavigateToTab('notices')} type="button">
          <img alt="" src={homeNoticeIcon} />
          <strong>{pendingNotices.length}</strong>
          <span>공지</span>
          <small>읽음 {notices.reduce((total, notice) => total + notice.readCount, 0)}건</small>
        </button>
        <button className="status-card" onClick={() => onNavigateToTab('assignments')} type="button">
          <img alt="" src={homeAssignmentIcon} />
          <strong>{pendingAssignments.length}</strong>
          <span>과제</span>
          <small>제출 {assignments.reduce((total, assignment) => total + assignment.submittedCount, 0)}건</small>
        </button>
      </div>

      {pendingNotices.map((notice) => (
        <button className="todo-card" key={notice.id} onClick={() => onOpenNotice(notice.id)} type="button">
          <img alt="" src={homeNoticeIcon} />
          <span>{notice.title}</span>
          <small>{notice.readCount}/{notice.totalMemberCount} 읽음</small>
        </button>
      ))}

      {pendingAssignments.map((assignment) => (
        <button className="todo-card" key={assignment.id} onClick={() => onOpenAssignment(assignment.id)} type="button">
          <img alt="" src={homeAssignmentIcon} />
          <span>{assignment.title}</span>
          <small>{assignment.submittedCount}/{assignment.totalMemberCount} 제출</small>
        </button>
      ))}

      {isLoading && pendingNotices.length === 0 && pendingAssignments.length === 0 ? (
        <p className="study-home-state">현황을 불러오고 있어요.</p>
      ) : null}
      {!isLoading && hasError && pendingNotices.length === 0 && pendingAssignments.length === 0 ? (
        <p className="study-home-state">현황을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      ) : null}
      {!isLoading && !hasError && pendingNotices.length === 0 && pendingAssignments.length === 0 ? (
        <p className="study-home-state">확인할 공지와 과제가 없어요.</p>
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
