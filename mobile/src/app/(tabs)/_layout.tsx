import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet } from 'react-native';

import { colors, fonts, PHONE_MAX_WIDTH } from '@/theme/tokens';

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  home: ['home', 'home-outline'],
  lawyers: ['people', 'people-outline'],
  forum: ['chatbubbles', 'chatbubbles-outline'],
  profile: ['person', 'person-outline'],
};

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: colors.canvas },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = ICONS[route.name] ?? ICONS.home;
          return (
            <Ionicons
              name={focused ? active : inactive}
              size={size - 2}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="lawyers" options={{ title: t('tabs.lawyers') }} />
      <Tabs.Screen name="forum" options={{ title: t('tabs.forum') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    // Generous height so the icon + label stack is never clipped. React
    // Navigation's own default is too tight for a two-line item on web.
    height: Platform.OS === 'ios' ? 88 : 76,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    // Keep the bar aligned with the phone-width column on the web build.
    maxWidth: PHONE_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 13,
    marginTop: 3,
  },
  item: {
    paddingTop: 0,
  },
});
