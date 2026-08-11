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

  return [
    'exit-study',
    'open-notifications',
    'open-profile',
    'study-selected',
  ].includes(String(value.type));
}

function createNavigationScript(tab: AppTab) {
  return `window.dispatchEvent(new CustomEvent('chongchong:navigate', { detail: { tab: ${JSON.stringify(tab)} } })); true;`;
}

export function AppWebViewScreen({ onOpenProfile, user }: AppWebViewScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [isStudySelected, setIsStudySelected] = useState(false);
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
    webViewRef.current?.injectJavaScript(createNavigationScript(tab));
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
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
  }, [isStudySelected]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message: unknown = JSON.parse(event.nativeEvent.data);

        if (!isWebViewMessage(message)) {
          return;
        }

        if (message.type === 'study-selected') {
          setIsStudySelected(true);
          setActiveTab('home');
          return;
        }

        if (message.type === 'exit-study') {
          setIsStudySelected(false);
          setActiveTab('home');
          return;
        }

        if (message.type === 'open-profile') {
          onOpenProfile();
          return;
        }

        Alert.alert('알림', '알림 목록 화면은 다음 페이지 PR에서 연결할게요.');
      } catch {
        // 타입이 지정되지 않은 WebView 메시지는 무시합니다.
      }
    },
    [onOpenProfile],
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
      {isStudySelected ? (
        <BottomTabBar activeTab={activeTab} onTabPress={navigateToTab} />
      ) : (
        <View style={styles.tabPlaceholder} />
      )}
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
