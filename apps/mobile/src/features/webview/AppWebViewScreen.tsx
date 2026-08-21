import type { User } from '@react-native-firebase/auth';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useAlertModal } from '../../components/AlertModal';
import { trackScreen } from '../monitoring/monitoring';
import { BottomTabBar } from './BottomTabBar';
import type { AppTab, WebViewMessage } from './types';
import {
  createAssignment,
  deleteAssignment,
  requestAssignmentReminder,
  submitAssignment,
  subscribeToStudyAssignments,
  updateAssignment,
  type AssignmentPayload,
} from '../assignments/assignmentData';
import {
  createNotice,
  deleteNotice,
  markNoticeRead,
  requestNoticeReminder,
  subscribeToStudyNotices,
  updateNotice,
  type NoticePayload,
} from '../notices/noticeData';
import {
  readNotification,
  subscribeToNotifications,
  type NotificationPayload,
} from '../notifications/notificationData';
import {
  createStudy,
  deleteStudy,
  joinStudy,
  subscribeToUserStudies,
  type StudyListPayload,
  type StudyPayload,
} from '../studies/studyData';
import {
  removeStudyMember,
  subscribeToStudyMembers,
  transferStudyLeadership,
  type StudyMemberPayload,
} from '../studies/memberData';

type AppWebViewScreenProps = {
  displayName?: string | null;
  onOpenProfile: () => void;
  user: User;
};

const DEV_WEB_APP_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5173' : 'http://localhost:5173';
const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL ?? DEV_WEB_APP_URL;
const WEB_APP_ORIGIN = new URL(WEB_APP_URL).origin;
const IOS_BACK_SWIPE_EDGE_WIDTH = 28;
const IOS_BACK_SWIPE_ACTIVATION_DISTANCE = 12;
const IOS_BACK_SWIPE_COMPLETION_DISTANCE = 72;
const IOS_BACK_SWIPE_COMPLETION_VELOCITY = 0.35;

function isWebViewMessage(value: unknown): value is WebViewMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false;
  }

  if (value.type === 'study-selected') {
    return 'studyId' in value && typeof value.studyId === 'string';
  }

  if (value.type === 'navigate-study-tab') {
    return (
      'tab' in value &&
      ['home', 'notices', 'assignments', 'members'].includes(String(value.tab))
    );
  }

  if (value.type === 'create-study') {
    return (
      'name' in value &&
      typeof value.name === 'string' &&
      'description' in value &&
      typeof value.description === 'string' &&
      'memberLimit' in value &&
      typeof value.memberLimit === 'number' &&
      Number.isInteger(value.memberLimit)
    );
  }

  if (value.type === 'join-study') {
    return 'inviteUrl' in value && typeof value.inviteUrl === 'string';
  }

  if (value.type === 'create-notice') {
    return (
      'title' in value &&
      typeof value.title === 'string' &&
      'content' in value &&
      typeof value.content === 'string' &&
      'reminderAts' in value &&
      Array.isArray(value.reminderAts) &&
      value.reminderAts.every((reminderAt) => typeof reminderAt === 'string')
    );
  }

  if (value.type === 'create-assignment' || value.type === 'update-assignment') {
    return (
      (value.type !== 'update-assignment' ||
        ('assignmentId' in value && typeof value.assignmentId === 'string')) &&
      'title' in value && typeof value.title === 'string' &&
      'content' in value && typeof value.content === 'string' &&
      'submissionInstructions' in value && typeof value.submissionInstructions === 'string' &&
      'deadlineAt' in value && typeof value.deadlineAt === 'string' &&
      'reminderAts' in value && Array.isArray(value.reminderAts) &&
      value.reminderAts.every((item) => typeof item === 'string')
    );
  }

  if (value.type === 'submit-assignment') {
    return 'assignmentId' in value && typeof value.assignmentId === 'string' &&
      'content' in value && typeof value.content === 'string' &&
      (!('link' in value) || typeof value.link === 'string');
  }

  if (value.type === 'update-notice') {
    return (
      'noticeId' in value &&
      typeof value.noticeId === 'string' &&
      'title' in value &&
      typeof value.title === 'string' &&
      'content' in value &&
      typeof value.content === 'string' &&
      'reminderAts' in value &&
      Array.isArray(value.reminderAts) &&
      value.reminderAts.every((reminderAt) => typeof reminderAt === 'string')
    );
  }

  if (value.type === 'copy-invite-link') {
    return 'inviteUrl' in value && typeof value.inviteUrl === 'string';
  }

  if (value.type === 'delete-study') {
    return 'studyName' in value && typeof value.studyName === 'string';
  }

  if (
    value.type === 'open-notice' ||
    value.type === 'edit-notice' ||
    value.type === 'delete-notice' ||
    value.type === 'mark-notice-read'
  ) {
    return 'noticeId' in value && typeof value.noticeId === 'string';
  }

  if (value.type === 'open-assignment') {
    return 'assignmentId' in value && typeof value.assignmentId === 'string';
  }

  if (value.type === 'edit-assignment' || value.type === 'delete-assignment') {
    return 'assignmentId' in value && typeof value.assignmentId === 'string';
  }

  if (value.type === 'send-assignment-reminder') {
    return 'assignmentId' in value && typeof value.assignmentId === 'string' &&
      'memberIds' in value && Array.isArray(value.memberIds) &&
      value.memberIds.every((item) => typeof item === 'string');
  }

  if (value.type === 'send-notice-reminder') {
    return (
      'noticeId' in value &&
      typeof value.noticeId === 'string' &&
      'memberIds' in value &&
      Array.isArray(value.memberIds) &&
      value.memberIds.every((memberId) => typeof memberId === 'string')
    );
  }

  if (value.type === 'open-notification') {
    return (
      'notificationId' in value &&
      typeof value.notificationId === 'string' &&
      (!('assignmentId' in value) || typeof value.assignmentId === 'string') &&
      (!('noticeId' in value) || typeof value.noticeId === 'string') &&
      (!('studyId' in value) || typeof value.studyId === 'string')
    );
  }

  if (value.type === 'remove-study-member') {
    return (
      'memberId' in value &&
      typeof value.memberId === 'string' &&
      'displayName' in value &&
      typeof value.displayName === 'string'
    );
  }

  if (value.type === 'transfer-study-leadership') {
    return (
      'memberId' in value &&
      typeof value.memberId === 'string' &&
      'displayName' in value &&
      typeof value.displayName === 'string'
    );
  }

  return [
    'close-create-study',
    'close-create-assignment',
    'close-notifications',
    'close-create-notice',
    'close-join-study',
    'close-notice',
    'close-assignment',
    'exit-study',
    'open-create-study',
    'open-create-assignment',
    'open-create-notice',
    'open-join-study',
    'open-notifications',
    'open-profile',
    'web-ready',
  ].includes(String(value.type));
}

function createNavigationScript(tab: AppTab) {
  return `window.dispatchEvent(new CustomEvent('chongchong:navigate', { detail: { tab: ${JSON.stringify(tab)} } })); true;`;
}

function createNoticeDataScript(
  status: 'error' | 'ready',
  notices: NoticePayload[] = [],
) {
  const detail = JSON.stringify({ notices, status }).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:notices', { detail: ${detail} })); true;`;
}

function createAssignmentDataScript(
  status: 'error' | 'ready',
  assignments: AssignmentPayload[] = [],
) {
  const detail = JSON.stringify({ assignments, status }).replaceAll(
    '<',
    '\\u003c',
  );
  return `window.dispatchEvent(new CustomEvent('chongchong:assignments', { detail: ${detail} })); true;`;
}

function createAssignmentResultScript(
  eventName:
    | 'assignment-create-result'
    | 'assignment-delete-result'
    | 'assignment-submit-result'
    | 'assignment-update-result',
  detail: unknown,
) {
  const serialized = JSON.stringify(detail).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:${eventName}', { detail: ${serialized} })); true;`;
}

function createStudyResultScript(
  detail:
    | { status: 'error'; message: string }
    | { status: 'success'; study: StudyPayload },
) {
  const serialized = JSON.stringify(detail).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:study-create-result', { detail: ${serialized} })); true;`;
}

function createStudyJoinResultScript(
  detail:
    | { status: 'error'; message: string }
    | { status: 'success'; study: StudyPayload },
) {
  const serialized = JSON.stringify(detail).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:study-join-result', { detail: ${serialized} })); true;`;
}

function createNoticeResultScript(
  detail:
    | { status: 'error'; message: string }
    | { status: 'success'; notice: { id: string; title: string } },
) {
  const serialized = JSON.stringify(detail).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:notice-create-result', { detail: ${serialized} })); true;`;
}

function createNoticeUpdateResultScript(
  detail:
    | { status: 'error'; message: string }
    | { status: 'success'; notice: { id: string; title: string } },
) {
  const serialized = JSON.stringify(detail).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:notice-update-result', { detail: ${serialized} })); true;`;
}

function createNoticeDeleteResultScript(
  detail:
    | { status: 'error'; message: string }
    | { status: 'success'; notice: { id: string; title: string } },
) {
  const serialized = JSON.stringify(detail).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:notice-delete-result', { detail: ${serialized} })); true;`;
}

function createStudyListScript(
  status: 'error' | 'ready',
  studies: StudyListPayload[] = [],
) {
  const detail = JSON.stringify({ status, studies }).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:studies', { detail: ${detail} })); true;`;
}

function createMemberDataScript(
  status: 'error' | 'ready',
  members: StudyMemberPayload[] = [],
) {
  const detail = JSON.stringify({ members, status }).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:members', { detail: ${detail} })); true;`;
}

function createNotificationDataScript(
  status: 'error' | 'ready',
  notifications: NotificationPayload[] = [],
) {
  const detail = JSON.stringify({ notifications, status }).replaceAll(
    '<',
    '\\u003c',
  );
  return `window.dispatchEvent(new CustomEvent('chongchong:notifications', { detail: ${detail} })); true;`;
}

export function AppWebViewScreen({
  displayName,
  onOpenProfile,
  user,
}: AppWebViewScreenProps) {
  const { showAlert } = useAlertModal();
  const webViewRef = useRef<WebView>(null);
  const latestAssignmentsRef = useRef<AssignmentPayload[] | undefined>(
    undefined,
  );
  const latestNoticesRef = useRef<NoticePayload[] | undefined>(undefined);
  const latestStudiesRef = useRef<StudyListPayload[] | undefined>(undefined);
  const latestStudiesStatusRef = useRef<'error' | 'loading' | 'ready'>(
    'loading',
  );
  const latestMembersRef = useRef<StudyMemberPayload[] | undefined>(undefined);
  const latestNotificationsRef = useRef<NotificationPayload[] | undefined>(
    undefined,
  );
  const handledBackSwipeRequestCountRef = useRef(0);
  const deletingStudyIdRef = useRef<string | undefined>(undefined);
  const pendingStudyIdRef = useRef<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [isStudySelected, setIsStudySelected] = useState(false);
  const [isSubpageOpen, setIsSubpageOpen] = useState(false);
  const [selectedStudyId, setSelectedStudyId] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [backSwipeRequestCount, setBackSwipeRequestCount] = useState(0);
  const [backSwipeTranslateX] = useState(() => new Animated.Value(0));
  const injectedSession = useMemo(() => {
    const session = JSON.stringify({ displayName }).replaceAll(
      '<',
      '\\u003c',
    );

    return `window.__CHONGCHONG_SESSION__ = ${session}; true;`;
  }, [displayName]);

  useEffect(() => {
    const screenName = isSubpageOpen
      ? `study_${activeTab}_detail`
      : isStudySelected
        ? `study_${activeTab}`
        : 'study_list';

    void trackScreen(screenName).catch(() => undefined);
  }, [activeTab, isStudySelected, isSubpageOpen]);

  const navigateToTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    setIsSubpageOpen(false);
    webViewRef.current?.injectJavaScript(createNavigationScript(tab));
  }, []);

  const navigateBack = useCallback(() => {
    if (isSubpageOpen) {
      setIsSubpageOpen(false);
      webViewRef.current?.injectJavaScript(
        "window.dispatchEvent(new CustomEvent('chongchong:close-subpage')); true;",
      );
      return true;
    }

    if (!isStudySelected) {
      return false;
    }

    if (activeTab !== 'home') {
      navigateToTab('home');
      return true;
    }

    setIsStudySelected(false);
    setSelectedStudyId(undefined);
    setActiveTab('home');
    webViewRef.current?.injectJavaScript(
      "window.dispatchEvent(new CustomEvent('chongchong:exit-study')); true;",
    );
    return true;
  }, [activeTab, isStudySelected, isSubpageOpen, navigateToTab]);

  const canNavigateBack = isSubpageOpen || isStudySelected;
  const edgeSwipeBackResponder = useMemo(
    () =>
      PanResponder.create({
        onPanResponderGrant: () => {
          backSwipeTranslateX.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          backSwipeTranslateX.setValue(Math.max(0, gestureState.dx));
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Platform.OS === 'ios' &&
          canNavigateBack &&
          gestureState.x0 <= IOS_BACK_SWIPE_EDGE_WIDTH &&
          gestureState.dx >= IOS_BACK_SWIPE_ACTIVATION_DISTANCE &&
          gestureState.dx > Math.abs(gestureState.dy) * 1.5,
        onPanResponderRelease: (_, gestureState) => {
          const movedFarEnough =
            gestureState.dx >= IOS_BACK_SWIPE_COMPLETION_DISTANCE;
          const flickedFastEnough =
            gestureState.dx >= IOS_BACK_SWIPE_ACTIVATION_DISTANCE &&
            gestureState.vx >= IOS_BACK_SWIPE_COMPLETION_VELOCITY;

          if (movedFarEnough || flickedFastEnough) {
            Animated.timing(backSwipeTranslateX, {
              duration: 180,
              toValue: Dimensions.get('window').width,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) {
                setBackSwipeRequestCount((current) => current + 1);
              }
            });
            return;
          }

          Animated.spring(backSwipeTranslateX, {
            damping: 24,
            mass: 0.8,
            stiffness: 260,
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(backSwipeTranslateX, {
            damping: 24,
            mass: 0.8,
            stiffness: 260,
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [backSwipeTranslateX, canNavigateBack],
  );

  useEffect(() => {
    if (
      backSwipeRequestCount === handledBackSwipeRequestCountRef.current
    ) {
      return;
    }

    handledBackSwipeRequestCountRef.current = backSwipeRequestCount;
    const frame = requestAnimationFrame(() => {
      navigateBack();
      requestAnimationFrame(() => backSwipeTranslateX.setValue(0));
    });

    return () => cancelAnimationFrame(frame);
  }, [backSwipeRequestCount, backSwipeTranslateX, navigateBack]);

  useEffect(() => {
    return subscribeToUserStudies(
      user.uid,
      (studies) => {
        latestStudiesStatusRef.current = 'ready';
        latestStudiesRef.current = studies;
        const hasSelectedStudy = studies.some(
          (study) => study.id === selectedStudyId,
        );

        if (hasSelectedStudy && pendingStudyIdRef.current === selectedStudyId) {
          pendingStudyIdRef.current = undefined;
        }

        if (
          selectedStudyId &&
          !hasSelectedStudy &&
          pendingStudyIdRef.current !== selectedStudyId
        ) {
          const wasDeletedByCurrentUser =
            deletingStudyIdRef.current === selectedStudyId;
          setIsStudySelected(false);
          setIsSubpageOpen(false);
          setSelectedStudyId(undefined);
          setActiveTab('home');
          webViewRef.current?.injectJavaScript(
            "window.dispatchEvent(new CustomEvent('chongchong:exit-study')); true;",
          );
          if (!wasDeletedByCurrentUser) {
            showAlert(
              '스터디 이용이 종료되었어요',
              '리드가 멤버에서 제외했거나 스터디를 삭제했어요.',
            );
          }
        }
        webViewRef.current?.injectJavaScript(
          createStudyListScript('ready', studies),
        );
      },
      (error) => {
        latestStudiesStatusRef.current = 'error';
        console.warn('Study subscription error', error);
        webViewRef.current?.injectJavaScript(createStudyListScript('error'));
      },
    );
  }, [selectedStudyId, showAlert, user.uid]);

  useEffect(() => {
    return subscribeToNotifications(
      user.uid,
      (notifications) => {
        latestNotificationsRef.current = notifications;
        webViewRef.current?.injectJavaScript(
          createNotificationDataScript('ready', notifications),
        );
      },
      (error) => {
        console.warn('Notification subscription error', error);
        webViewRef.current?.injectJavaScript(
          createNotificationDataScript('error'),
        );
      },
    );
  }, [user.uid]);

  useEffect(() => {
    if (!selectedStudyId) {
      latestNoticesRef.current = undefined;
      return;
    }

    return subscribeToStudyNotices(
      selectedStudyId,
      user.uid,
      (notices) => {
        latestNoticesRef.current = notices;
        webViewRef.current?.injectJavaScript(
          createNoticeDataScript('ready', notices),
        );
      },
      (error) => {
        console.warn('Notice subscription error', error);
        webViewRef.current?.injectJavaScript(createNoticeDataScript('error'));
      },
    );
  }, [selectedStudyId, user.uid]);

  useEffect(() => {
    if (!selectedStudyId) {
      latestAssignmentsRef.current = undefined;
      return;
    }

    return subscribeToStudyAssignments(
      selectedStudyId,
      user.uid,
      (assignments) => {
        latestAssignmentsRef.current = assignments;
        webViewRef.current?.injectJavaScript(
          createAssignmentDataScript('ready', assignments),
        );
      },
      (error) => {
        console.warn('Assignment subscription error', error);
        webViewRef.current?.injectJavaScript(
          createAssignmentDataScript('error'),
        );
      },
    );
  }, [selectedStudyId, user.uid]);

  useEffect(() => {
    if (!selectedStudyId) {
      latestMembersRef.current = undefined;
      return;
    }

    return subscribeToStudyMembers(
      selectedStudyId,
      (members) => {
        latestMembersRef.current = members;
        webViewRef.current?.injectJavaScript(
          createMemberDataScript('ready', members),
        );
      },
      (error) => {
        console.warn('Member subscription error', error);
        webViewRef.current?.injectJavaScript(createMemberDataScript('error'));
      },
    );
  }, [selectedStudyId]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      navigateBack,
    );

    return () => subscription.remove();
  }, [navigateBack]);

  const syncLatestData = useCallback(() => {
    if (isStudySelected) {
      webViewRef.current?.injectJavaScript(createNavigationScript(activeTab));
    }
    if (latestNoticesRef.current) {
      webViewRef.current?.injectJavaScript(
        createNoticeDataScript('ready', latestNoticesRef.current),
      );
    }
    if (latestAssignmentsRef.current) {
      webViewRef.current?.injectJavaScript(
        createAssignmentDataScript('ready', latestAssignmentsRef.current),
      );
    }
    if (latestStudiesStatusRef.current === 'error') {
      webViewRef.current?.injectJavaScript(createStudyListScript('error'));
    } else if (
      latestStudiesStatusRef.current === 'ready' &&
      latestStudiesRef.current
    ) {
      webViewRef.current?.injectJavaScript(
        createStudyListScript('ready', latestStudiesRef.current),
      );
    }
    if (latestMembersRef.current) {
      webViewRef.current?.injectJavaScript(
        createMemberDataScript('ready', latestMembersRef.current),
      );
    }
    if (latestNotificationsRef.current) {
      webViewRef.current?.injectJavaScript(
        createNotificationDataScript(
          'ready',
          latestNotificationsRef.current,
        ),
      );
    }
  }, [activeTab, isStudySelected]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message: unknown = JSON.parse(event.nativeEvent.data);

        if (!isWebViewMessage(message)) {
          return;
        }

        if (message.type === 'web-ready') {
          syncLatestData();
          return;
        }

        if (message.type === 'study-selected') {
          setIsStudySelected(true);
          setIsSubpageOpen(false);
          setSelectedStudyId(message.studyId);
          setActiveTab('home');
          return;
        }

        if (message.type === 'navigate-study-tab') {
          setActiveTab(message.tab);
          setIsSubpageOpen(false);
          return;
        }

        if (message.type === 'exit-study') {
          setIsStudySelected(false);
          setIsSubpageOpen(false);
          setSelectedStudyId(undefined);
          setActiveTab('home');
          return;
        }

        if (message.type === 'open-profile') {
          onOpenProfile();
          return;
        }

        if (message.type === 'open-create-study') {
          setIsSubpageOpen(true);
          return;
        }

        if (message.type === 'open-notifications') {
          setIsSubpageOpen(true);
          return;
        }

        if (message.type === 'close-notifications') {
          setIsSubpageOpen(false);
          return;
        }

        if (message.type === 'open-notification') {
          if (message.studyId && message.assignmentId) {
            setIsStudySelected(true);
            setIsSubpageOpen(true);
            setSelectedStudyId(message.studyId);
            setActiveTab('assignments');
          }
          if (message.studyId && message.noticeId) {
            setIsStudySelected(true);
            setIsSubpageOpen(true);
            setSelectedStudyId(message.studyId);
            setActiveTab('notices');
          }
          void readNotification(message.notificationId).catch(
            (error: unknown) => {
              console.warn('Notification read error', error);
              showAlert(
                '알림을 열지 못했어요',
                '읽음 상태를 저장하지 못했어요. 다시 시도해 주세요.',
              );
            },
          );
          return;
        }

        if (message.type === 'open-create-notice') {
          setIsSubpageOpen(true);
          return;
        }

        if (message.type === 'open-create-assignment' || message.type === 'open-assignment') {
          setIsSubpageOpen(true);
          return;
        }

        if (message.type === 'edit-assignment') {
          setIsSubpageOpen(true);
          return;
        }

        if (message.type === 'open-join-study') {
          setIsSubpageOpen(true);
          return;
        }

        if (message.type === 'close-create-study') {
          setIsSubpageOpen(false);
          return;
        }

        if (message.type === 'close-create-notice') {
          setIsSubpageOpen(false);
          return;
        }

        if (message.type === 'close-create-assignment' || message.type === 'close-assignment') {
          setIsSubpageOpen(false);
          return;
        }

        if (message.type === 'close-join-study') {
          setIsSubpageOpen(false);
          return;
        }

        if (message.type === 'create-study') {
          void createStudy({
            description: message.description,
            memberLimit: message.memberLimit,
            name: message.name,
          })
            .then((study) => {
              pendingStudyIdRef.current = study.id;
              setIsStudySelected(true);
              setIsSubpageOpen(false);
              setSelectedStudyId(study.id);
              setActiveTab('home');
              webViewRef.current?.injectJavaScript(
                createStudyResultScript({ status: 'success', study }),
              );
            })
            .catch((error: unknown) => {
              console.warn('Study creation error', error);
              webViewRef.current?.injectJavaScript(
                createStudyResultScript({
                  message: '스터디를 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
                  status: 'error',
                }),
              );
            });
          return;
        }

        if (message.type === 'join-study') {
          void joinStudy(message.inviteUrl)
            .then((study) => {
              pendingStudyIdRef.current = study.id;
              setIsStudySelected(true);
              setIsSubpageOpen(false);
              setSelectedStudyId(study.id);
              setActiveTab('home');
              webViewRef.current?.injectJavaScript(
                createStudyJoinResultScript({ status: 'success', study }),
              );
            })
            .catch((error: unknown) => {
              console.warn('Study joining error', error);
              webViewRef.current?.injectJavaScript(
                createStudyJoinResultScript({
                  message: getCallableErrorMessage(
                    error,
                    '스터디에 참여하지 못했어요. 잠시 후 다시 시도해 주세요.',
                  ),
                  status: 'error',
                }),
              );
            });
          return;
        }

        if (message.type === 'copy-invite-link') {
          void Clipboard.setStringAsync(message.inviteUrl)
            .then(() => {
              showAlert('복사 완료', '초대 링크를 복사했어요.');
            })
            .catch((error: unknown) => {
              console.warn('Invite link copy error', error);
              showAlert('복사 실패', '초대 링크를 복사하지 못했어요.');
            });
          return;
        }

        if (message.type === 'remove-study-member') {
          if (!selectedStudyId) {
            showAlert('방출 실패', '선택한 스터디 정보를 찾지 못했어요.');
            return;
          }

          showAlert(
            '스터디원을 방출할까요?',
            `${message.displayName}님은 이 스터디를 더 이상 이용할 수 없어요.`,
            [
              { style: 'cancel', text: '취소' },
              {
                onPress: () => {
                  void removeStudyMember(selectedStudyId, message.memberId)
                    .then(() => {
                      showAlert(
                        '방출 완료',
                        `${message.displayName}님을 스터디에서 방출했어요.`,
                      );
                    })
                    .catch((error: unknown) => {
                      console.warn('Study member removal error', error);
                      showAlert(
                        '방출하지 못했어요',
                        getCallableErrorMessage(
                          error,
                          '잠시 후 다시 시도해 주세요.',
                        ),
                      );
                    });
                },
                style: 'destructive',
                text: '방출하기',
              },
            ],
          );
          return;
        }

        if (message.type === 'transfer-study-leadership') {
          if (!selectedStudyId) {
            showAlert('양도 실패', '선택한 스터디 정보를 찾지 못했어요.');
            return;
          }
          showAlert(
            '리드를 양도할까요?',
            `${message.displayName}님이 새로운 리드가 되며, 양도 후에는 스터디 관리 권한을 잃게 돼요.`,
            [
              { style: 'cancel', text: '취소' },
              {
                onPress: () => {
                  void transferStudyLeadership(selectedStudyId, message.memberId)
                    .then(() => showAlert('양도 완료', `${message.displayName}님에게 리드를 양도했어요.`))
                    .catch((error: unknown) => {
                      console.warn('Study leadership transfer error', error);
                      showAlert('양도하지 못했어요', getCallableErrorMessage(error, '잠시 후 다시 시도해 주세요.'));
                    });
                },
                text: '양도하기',
              },
            ],
          );
          return;
        }

        if (message.type === 'delete-study') {
          if (!selectedStudyId) {
            showAlert('삭제 실패', '선택한 스터디 정보를 찾지 못했어요.');
            return;
          }

          showAlert(
            '스터디를 삭제할까요?',
            `${message.studyName}의 공지, 과제, 멤버 정보가 모두 삭제되며 되돌릴 수 없어요.`,
            [
              { style: 'cancel', text: '취소' },
              {
                onPress: () => {
                  deletingStudyIdRef.current = selectedStudyId;
                  void deleteStudy(selectedStudyId)
                    .then(() => {
                      setIsStudySelected(false);
                      setIsSubpageOpen(false);
                      setSelectedStudyId(undefined);
                      setActiveTab('home');
                      webViewRef.current?.injectJavaScript(
                        "window.dispatchEvent(new CustomEvent('chongchong:exit-study')); true;",
                      );
                      deletingStudyIdRef.current = undefined;
                      showAlert(
                        '삭제 완료',
                        `${message.studyName} 스터디를 삭제했어요.`,
                      );
                    })
                    .catch((error: unknown) => {
                      deletingStudyIdRef.current = undefined;
                      console.warn('Study deletion error', error);
                      showAlert(
                        '삭제하지 못했어요',
                        getCallableErrorMessage(
                          error,
                          '잠시 후 다시 시도해 주세요.',
                        ),
                      );
                    });
                },
                style: 'destructive',
                text: '삭제하기',
              },
            ],
          );
          return;
        }

        if (message.type === 'open-notice') {
          setIsSubpageOpen(true);
          return;
        }

        if (message.type === 'mark-notice-read') {
          if (!selectedStudyId) {
            return;
          }

          void markNoticeRead(selectedStudyId, message.noticeId).catch(
            (error: unknown) => {
              console.warn('Notice read error', error);
              showAlert(
                '읽음 처리에 실패했어요',
                getCallableErrorMessage(error, '잠시 후 다시 시도해 주세요.'),
              );
            },
          );
          return;
        }

        if (message.type === 'close-notice') {
          setIsSubpageOpen(false);
          return;
        }

        if (message.type === 'send-notice-reminder') {
          if (!selectedStudyId) {
            showAlert('발송 실패', '선택한 스터디 정보를 찾지 못했어요.');
            return;
          }

          void requestNoticeReminder(
            selectedStudyId,
            message.noticeId,
            message.memberIds,
          )
            .then(({ targetCount }) => {
              showAlert(
                '리마인드 발송 완료',
                `미확인 ${targetCount}명에게 푸시 알림을 요청했어요.`,
              );
            })
            .catch((error: unknown) => {
              console.warn('Notice reminder error', error);
              showAlert(
                '리마인드를 보내지 못했어요',
                '잠시 후 다시 시도해 주세요.',
              );
            });
          return;
        }

        if (message.type === 'send-assignment-reminder') {
          if (!selectedStudyId) return;
          void requestAssignmentReminder(selectedStudyId, message.assignmentId, message.memberIds)
            .then(({ targetCount }) => showAlert('리마인드 발송 완료', `미제출 ${targetCount}명에게 푸시 알림을 요청했어요.`))
            .catch((error: unknown) => {
              console.warn('Assignment reminder error', error);
              showAlert('리마인드를 보내지 못했어요', getCallableErrorMessage(error, '잠시 후 다시 시도해 주세요.'));
            });
          return;
        }

        if (message.type === 'create-assignment') {
          if (!selectedStudyId) return;
          void createAssignment(selectedStudyId, {
            content: message.content,
            deadlineAt: message.deadlineAt,
            reminderAts: message.reminderAts,
            submissionInstructions: message.submissionInstructions,
            title: message.title,
          }).then((assignment) => {
            setIsSubpageOpen(false);
            webViewRef.current?.injectJavaScript(createAssignmentResultScript('assignment-create-result', { assignment, status: 'success' }));
          }).catch((error: unknown) => {
            console.warn('Assignment creation error', error);
            webViewRef.current?.injectJavaScript(createAssignmentResultScript('assignment-create-result', { message: getCallableErrorMessage(error, '과제를 올리지 못했어요.'), status: 'error' }));
          });
          return;
        }

        if (message.type === 'update-assignment') {
          if (!selectedStudyId) return;
          void updateAssignment(selectedStudyId, message.assignmentId, {
            content: message.content,
            deadlineAt: message.deadlineAt,
            reminderAts: message.reminderAts,
            submissionInstructions: message.submissionInstructions,
            title: message.title,
          }).then((assignment) => {
            webViewRef.current?.injectJavaScript(createAssignmentResultScript('assignment-update-result', { assignment, status: 'success' }));
          }).catch((error: unknown) => {
            console.warn('Assignment update error', error);
            webViewRef.current?.injectJavaScript(createAssignmentResultScript('assignment-update-result', { message: getCallableErrorMessage(error, '과제를 수정하지 못했어요.'), status: 'error' }));
          });
          return;
        }

        if (message.type === 'delete-assignment') {
          if (!selectedStudyId) return;
          void deleteAssignment(selectedStudyId, message.assignmentId)
            .then((assignment) => {
              setIsSubpageOpen(false);
              webViewRef.current?.injectJavaScript(createAssignmentResultScript('assignment-delete-result', { assignment, status: 'success' }));
            })
            .catch((error: unknown) => {
              console.warn('Assignment deletion error', error);
              webViewRef.current?.injectJavaScript(createAssignmentResultScript('assignment-delete-result', { message: getCallableErrorMessage(error, '과제를 삭제하지 못했어요.'), status: 'error' }));
            });
          return;
        }

        if (message.type === 'submit-assignment') {
          if (!selectedStudyId) return;
          void submitAssignment(selectedStudyId, message.assignmentId, { content: message.content, link: message.link })
            .then((submission) => webViewRef.current?.injectJavaScript(createAssignmentResultScript('assignment-submit-result', { status: 'success', submission })))
            .catch((error: unknown) => {
              console.warn('Assignment submission error', error);
              webViewRef.current?.injectJavaScript(createAssignmentResultScript('assignment-submit-result', { message: getCallableErrorMessage(error, '과제를 제출하지 못했어요.'), status: 'error' }));
            });
          return;
        }

        if (message.type === 'edit-notice') {
          setIsSubpageOpen(true);
          return;
        }

        if (message.type === 'delete-notice') {
          if (!selectedStudyId) {
            webViewRef.current?.injectJavaScript(
              createNoticeDeleteResultScript({
                message: '선택한 스터디 정보를 찾지 못했어요.',
                status: 'error',
              }),
            );
            return;
          }

          void deleteNotice(selectedStudyId, message.noticeId)
            .then((notice) => {
              setIsSubpageOpen(false);
              webViewRef.current?.injectJavaScript(
                createNoticeDeleteResultScript({ notice, status: 'success' }),
              );
            })
            .catch((error: unknown) => {
              console.warn('Notice deletion error', error);
              webViewRef.current?.injectJavaScript(
                createNoticeDeleteResultScript({
                  message: getCallableErrorMessage(
                    error,
                    '공지를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
                  ),
                  status: 'error',
                }),
              );
            });
          return;
        }

        if (message.type === 'create-notice') {
          if (!selectedStudyId) {
            webViewRef.current?.injectJavaScript(
              createNoticeResultScript({
                message: '선택한 스터디 정보를 찾지 못했어요.',
                status: 'error',
              }),
            );
            return;
          }

          void createNotice(selectedStudyId, {
            content: message.content,
            reminderAts: message.reminderAts,
            title: message.title,
          })
            .then((notice) => {
              setIsSubpageOpen(false);
              webViewRef.current?.injectJavaScript(
                createNoticeResultScript({ notice, status: 'success' }),
              );
            })
            .catch((error: unknown) => {
              console.warn('Notice creation error', error);
              webViewRef.current?.injectJavaScript(
                createNoticeResultScript({
                  message: getCallableErrorMessage(
                    error,
                    '공지를 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
                  ),
                  status: 'error',
                }),
              );
            });
          return;
        }

        if (message.type === 'update-notice') {
          if (!selectedStudyId) {
            webViewRef.current?.injectJavaScript(
              createNoticeUpdateResultScript({
                message: '선택한 스터디 정보를 찾지 못했어요.',
                status: 'error',
              }),
            );
            return;
          }

          void updateNotice(selectedStudyId, message.noticeId, {
            content: message.content,
            reminderAts: message.reminderAts,
            title: message.title,
          })
            .then((notice) => {
              webViewRef.current?.injectJavaScript(
                createNoticeUpdateResultScript({ notice, status: 'success' }),
              );
            })
            .catch((error: unknown) => {
              console.warn('Notice update error', error);
              webViewRef.current?.injectJavaScript(
                createNoticeUpdateResultScript({
                  message: getCallableErrorMessage(
                    error,
                    '공지를 수정하지 못했어요. 잠시 후 다시 시도해 주세요.',
                  ),
                  status: 'error',
                }),
              );
            });
          return;
        }
      } catch {
        // 타입이 지정되지 않은 WebView 메시지는 무시합니다.
      }
    },
    [onOpenProfile, selectedStudyId, showAlert, syncLatestData],
  );

  const handleNavigationRequest = useCallback(
    (request: { url: string }) => {
      if (request.url === 'about:blank') {
        return true;
      }

      try {
        if (new URL(request.url).origin === WEB_APP_ORIGIN) {
          return true;
        }
      } catch {
        return false;
      }

      void Linking.openURL(request.url);
      return false;
    },
    [],
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <Animated.View
        {...edgeSwipeBackResponder.panHandlers}
        style={[
          styles.gestureContainer,
          { transform: [{ translateX: backSwipeTranslateX }] },
        ]}
      >
        <WebView
          androidLayerType="software"
          cacheEnabled
          injectedJavaScriptBeforeContentLoaded={injectedSession}
          key={reloadKey}
          onHttpError={(event) => {
            console.warn('WebView HTTP error', event.nativeEvent.statusCode);
          }}
          onLoadEnd={syncLatestData}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={handleNavigationRequest}
          originWhitelist={['http://*', 'https://*']}
          ref={webViewRef}
          renderError={() => (
            <View style={styles.errorState}>
              <Text style={styles.errorTitle}>화면을 불러오지 못했어요</Text>
              <Text style={styles.errorDescription}>
                웹 앱 실행 상태와 네트워크 연결을 확인해 주세요.
              </Text>
              <Pressable
                onPress={() => setReloadKey((current) => current + 1)}
                style={styles.retryButton}
              >
                <Text style={styles.retryLabel}>다시 시도</Text>
              </Pressable>
            </View>
          )}
          renderLoading={() => (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#00C471" size="large" />
            </View>
          )}
          source={{ uri: WEB_APP_URL }}
          startInLoadingState
          style={styles.webView}
        />
        {isStudySelected && !isSubpageOpen ? (
          <BottomTabBar activeTab={activeTab} onTabPress={navigateToTab} />
        ) : !isSubpageOpen ? (
          <View style={styles.tabPlaceholder} />
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

function getCallableErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    const message = error.message
      .replace(/^\[functions\/[^\]]+\]\s*/, '')
      .trim();
    if (message.length > 0 && message.length <= 150) {
      return message;
    }
  }

  return fallback;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gestureContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabPlaceholder: {
    height: 64,
    backgroundColor: '#FFFFFF',
  },
  loadingState: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    color: '#172033',
    fontSize: 20,
    fontWeight: '600',
  },
  errorDescription: {
    marginTop: 8,
    color: 'rgba(15, 23, 42, 0.55)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00C471',
  },
  retryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
