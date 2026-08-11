import type { User } from '@react-native-firebase/auth';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { BottomTabBar } from './BottomTabBar';
import type { AppTab, WebViewMessage } from './types';
import {
  requestNoticeReminder,
  subscribeToStudyNotices,
  type NoticePayload,
} from '../notices/noticeData';
import {
  createStudy,
  subscribeToUserStudies,
  type StudyListPayload,
  type StudyPayload,
} from '../studies/studyData';

type AppWebViewScreenProps = {
  onOpenProfile: () => void;
  user: User;
};

const DEV_WEB_APP_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5173' : 'http://localhost:5173';
const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL ?? DEV_WEB_APP_URL;
const WEB_APP_ORIGIN = new URL(WEB_APP_URL).origin;

function isWebViewMessage(value: unknown): value is WebViewMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false;
  }

  if (value.type === 'study-selected') {
    return 'studyId' in value && typeof value.studyId === 'string';
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

  if (
    value.type === 'open-notice' ||
    value.type === 'edit-notice' ||
    value.type === 'delete-notice'
  ) {
    return 'noticeId' in value && typeof value.noticeId === 'string';
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

  return [
    'close-create-study',
    'close-notice',
    'create-notice',
    'exit-study',
    'open-create-study',
    'open-notifications',
    'open-profile',
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

function createStudyResultScript(
  detail:
    | { status: 'error'; message: string }
    | { status: 'success'; study: StudyPayload },
) {
  const serialized = JSON.stringify(detail).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:study-create-result', { detail: ${serialized} })); true;`;
}

function createStudyListScript(
  status: 'error' | 'ready',
  studies: StudyListPayload[] = [],
) {
  const detail = JSON.stringify({ status, studies }).replaceAll('<', '\\u003c');
  return `window.dispatchEvent(new CustomEvent('chongchong:studies', { detail: ${detail} })); true;`;
}

export function AppWebViewScreen({ onOpenProfile, user }: AppWebViewScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const latestNoticesRef = useRef<NoticePayload[] | undefined>(undefined);
  const latestStudiesRef = useRef<StudyListPayload[] | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [isStudySelected, setIsStudySelected] = useState(false);
  const [isSubpageOpen, setIsSubpageOpen] = useState(false);
  const [selectedStudyId, setSelectedStudyId] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const injectedSession = useMemo(() => {
    const session = JSON.stringify({ displayName: user.displayName }).replaceAll(
      '<',
      '\\u003c',
    );

    return `window.__CHONGCHONG_SESSION__ = ${session}; true;`;
  }, [user.displayName]);

  const navigateToTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    setIsSubpageOpen(false);
    webViewRef.current?.injectJavaScript(createNavigationScript(tab));
  }, []);

  useEffect(() => {
    return subscribeToUserStudies(
      user.uid,
      (studies) => {
        latestStudiesRef.current = studies;
        webViewRef.current?.injectJavaScript(
          createStudyListScript('ready', studies),
        );
      },
      (error) => {
        console.warn('Study subscription error', error);
        webViewRef.current?.injectJavaScript(createStudyListScript('error'));
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
  }, [selectedStudyId]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
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

      setIsStudySelected(false);
      setActiveTab('home');
      webViewRef.current?.injectJavaScript(
        "window.dispatchEvent(new CustomEvent('chongchong:exit-study')); true;",
      );
      return true;
    });

    return () => subscription.remove();
  }, [isStudySelected, isSubpageOpen]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message: unknown = JSON.parse(event.nativeEvent.data);

        if (!isWebViewMessage(message)) {
          return;
        }

        if (message.type === 'study-selected') {
          setIsStudySelected(true);
          setIsSubpageOpen(false);
          setSelectedStudyId(message.studyId);
          setActiveTab('home');
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

        if (message.type === 'close-create-study') {
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

        if (message.type === 'open-notice') {
          setIsSubpageOpen(true);
          return;
        }

        if (message.type === 'close-notice') {
          setIsSubpageOpen(false);
          return;
        }

        if (message.type === 'send-notice-reminder') {
          if (!selectedStudyId) {
            Alert.alert('발송 실패', '선택한 스터디 정보를 찾지 못했어요.');
            return;
          }

          void requestNoticeReminder(
            selectedStudyId,
            message.noticeId,
            message.memberIds,
          )
            .then(({ targetCount }) => {
              Alert.alert(
                '리마인드 발송 완료',
                `미확인 ${targetCount}명에게 푸시 알림을 요청했어요.`,
              );
            })
            .catch((error: unknown) => {
              console.warn('Notice reminder error', error);
              Alert.alert(
                '리마인드를 보내지 못했어요',
                '잠시 후 다시 시도해 주세요.',
              );
            });
          return;
        }

        if (message.type === 'edit-notice') {
          Alert.alert('공지 수정', '공지 작성·수정 화면 PR에서 연결할게요.');
          return;
        }

        if (message.type === 'delete-notice') {
          Alert.alert('공지 삭제', '실제 데이터 연결 후 삭제 확인창을 연결할게요.');
          return;
        }

        if (message.type === 'create-notice') {
          Alert.alert('공지 작성', '공지 작성 화면은 별도 페이지 PR에서 연결할게요.');
          return;
        }

        Alert.alert('알림', '알림 목록 화면은 별도 페이지 PR에서 연결할게요.');
      } catch {
        // 타입이 지정되지 않은 WebView 메시지는 무시합니다.
      }
    },
    [onOpenProfile, selectedStudyId],
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
      <WebView
        androidLayerType="software"
        cacheEnabled
        injectedJavaScriptBeforeContentLoaded={injectedSession}
        key={reloadKey}
        onHttpError={(event) => {
          console.warn('WebView HTTP error', event.nativeEvent.statusCode);
        }}
        onLoadEnd={() => {
          if (isStudySelected) {
            webViewRef.current?.injectJavaScript(createNavigationScript(activeTab));
          }
          if (latestNoticesRef.current) {
            webViewRef.current?.injectJavaScript(
              createNoticeDataScript('ready', latestNoticesRef.current),
            );
          }
          if (latestStudiesRef.current) {
            webViewRef.current?.injectJavaScript(
              createStudyListScript('ready', latestStudiesRef.current),
            );
          }
        }}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
