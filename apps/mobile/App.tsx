import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>CHONGCHONG MOBILE</Text>
      <Text style={styles.title}>네이티브 셸 준비 완료</Text>
      <Text style={styles.description}>
        로그인, 하단 탭, WebView, 푸시 알림 기능이 이 앱에 추가됩니다.
      </Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  eyebrow: {
    color: '#00C878',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#172033',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
  },
  description: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
});
