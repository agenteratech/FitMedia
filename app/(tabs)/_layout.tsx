import { Tabs } from 'expo-router';
import { House, Dumbbell, Repeat2, TrendingUp, UserRound } from 'lucide-react-native';
import { FloatingTabBar } from '../../src/components/primitives';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Content must be padded so nothing hides behind the floating tab bar.
        // FloatingTabBar is ~96px tall (64px bar + 16px gap + safe area).
        // Individual screens handle their own bottom padding via useSafeAreaInsets.
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="home"     options={{ title: 'Home',     tabBarIcon: House     as any }} />
      <Tabs.Screen name="logs"     options={{ title: 'Logs',     tabBarIcon: Dumbbell  as any }} />
      <Tabs.Screen name="routines" options={{ title: 'Routines', tabBarIcon: Repeat2   as any }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: TrendingUp as any }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile',  tabBarIcon: UserRound as any }} />
    </Tabs>
  );
}
