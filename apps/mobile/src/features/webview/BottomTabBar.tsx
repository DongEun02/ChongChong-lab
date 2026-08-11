import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTab } from './types';

type BottomTabBarProps = {
  activeTab: AppTab;
  onTabPress: (tab: AppTab) => void;
};

const TABS: readonly {
  id: AppTab;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { id: 'home', icon: 'home-outline', label: '홈' },
  { id: 'notices', icon: 'megaphone-outline', label: '공지' },
  { id: 'assignments', icon: 'document-text-outline', label: '과제' },
  { id: 'members', icon: 'people-outline', label: '멤버' },
];

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const color = isActive ? '#00C471' : 'rgba(15, 23, 42, 0.4)';

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons color={color} name={tab.icon} size={22} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.65,
  },
  label: {
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.3,
  },
});
