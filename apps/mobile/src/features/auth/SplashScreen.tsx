import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SplashScreen() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Image
          accessibilityIgnoresInvertColors
          contentFit="contain"
          source={require('../../../assets/auth/splash-mascot.png')}
          style={styles.mascot}
        />
        <Image
          accessibilityIgnoresInvertColors
          contentFit="contain"
          source={require('../../../assets/auth/wordmark.png')}
          style={styles.wordmark}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 56,
  },
  mascot: {
    width: 250,
    height: 290,
  },
  wordmark: {
    width: 204,
    height: 133,
    marginTop: 16,
  },
});
