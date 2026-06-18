import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerShown: false,
        animation: 'slide_from_bottom',
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
