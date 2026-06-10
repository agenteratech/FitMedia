import * as Notifications from 'expo-notifications';
import type { Personality, NotifCategory } from './messages';
import { pickMessage } from './messages';

// Configure how notifications are displayed when the app is in foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Each category maps to a stable channel ID and default daily hour.
const CATEGORY_CONFIG: Record<NotifCategory, { channelId: string; hour: number; minute: number }> = {
  workout: { channelId: 'workout-reminder', hour: 9,  minute: 0  },
  diet:    { channelId: 'diet-reminder',    hour: 13, minute: 0  },
  sleep:   { channelId: 'sleep-reminder',   hour: 21, minute: 30 },
  streak:  { channelId: 'streak-reminder',  hour: 20, minute: 0  },
};

const CATEGORY_TITLES: Record<NotifCategory, string> = {
  workout: 'Time to train 💪',
  diet:    'Meal check-in 🥗',
  sleep:   'Wind down 😴',
  streak:  'Streak alert 🔥',
};

// ── Permissions ───────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ── Schedule helpers ──────────────────────────────────────────────────────────

async function scheduleCategory(
  category: NotifCategory,
  personality: Personality,
): Promise<void> {
  const { channelId, hour, minute } = CATEGORY_CONFIG[category];

  // Create Android notification channel.
  await Notifications.setNotificationChannelAsync(channelId, {
    name: CATEGORY_TITLES[category],
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#D9663F',
  });

  await Notifications.scheduleNotificationAsync({
    identifier: channelId,
    content: {
      title: `Aria — ${CATEGORY_TITLES[category]}`,
      body: pickMessage(category, personality),
      categoryIdentifier: channelId,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });
}

/** Schedule (or reschedule) notifications for enabled categories. */
export async function scheduleNotifications(
  personality: Personality,
  categories: Record<NotifCategory, boolean>,
): Promise<void> {
  try {
    // Cancel all first so we don't stack duplicates on reschedule.
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const cat of Object.keys(categories) as NotifCategory[]) {
      if (categories[cat]) {
        await scheduleCategory(cat, personality);
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('Notification scheduling failed:', err);
  }
}

/** Cancel all scheduled companion notifications. */
export async function cancelNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Silently fail — app works without notifications.
  }
}
