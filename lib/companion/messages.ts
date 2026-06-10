export const COMPANION_NAME = 'Aria';

export type Personality = 'friendly' | 'motivational' | 'strict' | 'playful';
export type NotifCategory = 'workout' | 'diet' | 'sleep' | 'streak';

// ── Tutorial steps ────────────────────────────────────────────────────────────

export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    feature: '',
    title: `Hey, I'm ${COMPANION_NAME} 👋`,
    message:
      "I'm your personal AI fitness companion. I'll help you stay consistent, build better habits, and actually enjoy the process. Let me give you a quick tour!",
  },
  {
    id: 'dashboard',
    feature: 'Dashboard',
    title: 'Your daily HQ',
    message:
      "This is your home base. Every morning you'll see your Body Score, today's workout, diet, and sleep scores at a glance. It's designed to tell you exactly where you stand.",
  },
  {
    id: 'body-score',
    feature: 'Body Score',
    title: 'Your fitness fingerprint',
    message:
      "Your Body Score grows as you log workouts over time. Unlike a step counter, it reflects your real training history — accumulated effort, consistency, and muscle development.",
  },
  {
    id: 'workout',
    feature: 'Workout Logging',
    title: 'Log every session',
    message:
      "Tap Log Workout to start a session. Follow a saved routine or go completely freestyle. I'll track your sets, reps, and weight — and call out personal records in real time 🏆",
  },
  {
    id: 'diet',
    feature: 'Diet Logging',
    title: 'Fuel your gains',
    message:
      "Log your meals in the Diet tab. Search millions of foods, adjust serving sizes, and see your macros add up. Nutrition is half the battle — and I'll remind you if you forget.",
  },
  {
    id: 'sleep',
    feature: 'Sleep Tracking',
    title: 'Recovery matters',
    message:
      "Log your sleep each night and I'll factor it into your daily score. Quality sleep literally determines how well your body responds to training. Don't skip this one.",
  },
  {
    id: 'routines',
    feature: 'Routines',
    title: 'Train with a plan',
    message:
      "Build your own programs or grab an expert template from the Routines tab. Structured training beats random sessions every single time.",
  },
  {
    id: 'progress',
    feature: 'Progress Analytics',
    title: 'See the results',
    message:
      "The Progress tab shows your trends over weeks and months — body score, volume, PRs, and muscle development. This is where you'll see that consistency is actually paying off.",
  },
] as const;

// ── Notification messages ─────────────────────────────────────────────────────

export const NOTIFICATION_MESSAGES: Record<Personality, Record<NotifCategory | 'comeback', string[]>> = {
  friendly: {
    workout: [
      "Your routine is waiting. Just 45 minutes and you'll thank yourself later 💪",
      "Hey! It's a great day to move. Your body is ready when you are 🙌",
      "A quick workout now, and the rest of the day is yours. Let's go!",
    ],
    diet: [
      "Hey... you've logged your workout but not your meals today 👀",
      "Quick reminder to log what you've been eating! It really does add up.",
      "Don't forget your meals — you're doing amazing with your workouts 🥗",
    ],
    sleep: [
      "Future you would appreciate getting enough sleep tonight.",
      "Rest is where the magic happens 😴 Time to wind down.",
      "Your muscles need sleep to grow. Make tonight count.",
    ],
    streak: [
      "One more day and your streak hits 7 days 🔥",
      "You're on a roll! Keep that streak alive today.",
      "Consistency is the secret ingredient. You've got this 🌟",
    ],
    comeback: [
      "I saved your spot... ready to get back on track?",
      "No judgement here — just glad you're back 💛",
      "Every champion has a comeback story. Today is yours.",
    ],
  },
  motivational: {
    workout: [
      "Champions train even when they don't feel like it. Be a champion TODAY 🏆",
      "Every rep is a vote for who you want to become. GET IN THERE.",
      "The pain of discipline weighs ounces. The pain of regret weighs tons. Let's go! 💪",
    ],
    diet: [
      "Abs are made in the kitchen. Don't undo your hard work — log those meals! 🥩",
      "Fuel your gains. Log your nutrition NOW.",
      "Your body is built from what you eat. Track it. Control it. Dominate it.",
    ],
    sleep: [
      "Elite athletes prioritise sleep. You want elite results? Get those 8 hours.",
      "Recovery is training too. Get the sleep you earned.",
      "Your body transforms while you sleep. Don't skip this session.",
    ],
    streak: [
      "STREAK ALERT 🔥 One more day and you hit 7. Don't break the chain!",
      "Warriors don't miss days. Keep that streak moving forward!",
      "Your streak is proof of commitment. PROTECT IT 🛡️",
    ],
    comeback: [
      "Setbacks are setups for comebacks. Time to make yours. Let's GO! 💥",
      "The strongest people aren't those who never fall — they're the ones who get back up.",
      "You didn't come this far to only come this far. Get back in the game.",
    ],
  },
  strict: {
    workout: [
      "You haven't trained today. That's not acceptable. Get it done.",
      "Your workout window is closing. No excuses — move.",
      "Discipline means training even when motivation is low. You know what to do.",
    ],
    diet: [
      "Unlogged meals equal untracked progress. Log your food. Now.",
      "You can't manage what you don't measure. Log your nutrition.",
      "Your diet is sabotaging your results if you're not tracking it.",
    ],
    sleep: [
      "7–9 hours. Non-negotiable. Log your sleep and commit to it.",
      "Lack of sleep reduces muscle protein synthesis by 20%. Prioritise rest.",
      "Sleep deprivation kills performance. Lights out.",
    ],
    streak: [
      "Your streak is on the line. Protect it.",
      "Consistency separates amateurs from professionals. Don't break the chain.",
      "One day off becomes two, becomes a month. Stay consistent.",
    ],
    comeback: [
      "You've been absent. That stops today. Get back to your program.",
      "Excuses don't build muscle. Get back in the app and log something.",
      "Every day away costs you. Start logging again immediately.",
    ],
  },
  playful: {
    workout: [
      "Your muscles called — they want to know where you are 😂",
      "Plot twist: you CRUSH your workout today 🎬 Let's go!",
      "Fun fact: the gym is more fun when you actually go 🤸",
    ],
    diet: [
      "Plot twist: food logs itself... just kidding. Log it! 🍕",
      "Your macros are out here living their best life unchecked 😅",
      "If you eat it and don't log it, did it even happen? (Yes. Log it.) 🌮",
    ],
    sleep: [
      "PSA: your bed misses you and so does your sleep score 😴",
      "Sleep is the original performance enhancer. Science said so 🧬💤",
      "Tonight's vibe: early bedtime, big gains tomorrow. You in? 🎯",
    ],
    streak: [
      "Almost at 7 days! Your streak is glowing UP 🔥✨",
      "Your streak is becoming a whole personality and we love it 💅",
      "Day by day, gains on the way! Keep it alive 🎉",
    ],
    comeback: [
      "Welcome back!! We missed you 🥺 Let's make a comeback era!",
      "Plot twist: YOU return stronger than ever 💪✨",
      "Okay, no roasting — just glad you're back! Let's do this 🙌",
    ],
  },
};

// ── Companion tips (shown in the companion sheet) ─────────────────────────────

export const COMPANION_TIPS = [
  // Training
  "Progressive overload is the #1 driver of muscle growth. Add 2.5 kg every time you hit your target reps.",
  "Compound lifts (squat, deadlift, bench, row) give you the most muscle activation per minute of training.",
  "Rest 60–90 seconds between sets for hypertrophy, 3–5 minutes when training for strength.",
  "Training to failure isn't necessary every set — leaving 2 reps in reserve is often more effective.",
  "Frequency matters more than volume. Hitting a muscle 2× per week beats one long session.",
  // Diet
  "Aim for 1.6–2.2 g of protein per kg of bodyweight for muscle building.",
  "You don't need to eat perfectly — you just need to eat consistently well.",
  "Meal prepping on Sundays can save 5+ hours during the week.",
  "Hydration affects performance more than most realise. Aim for 2–3 L of water daily.",
  "The best diet is one you can actually stick to for years, not weeks.",
  // Sleep
  "Going to bed at the same time every night dramatically improves sleep quality.",
  "Avoid screens 30 minutes before bed — blue light suppresses melatonin production.",
  "Most adults need 7–9 hours. Athletes often need closer to 9.",
  "A 10–20 minute nap can restore alertness without disrupting nighttime sleep.",
  // Mindset
  "Consistency beats intensity every time. Show up daily, even for short sessions.",
  "Track everything — what gets measured gets improved.",
  "Recovery is where you actually grow. Don't skip scheduled rest days.",
  "Motivation gets you started. Discipline keeps you going. Build discipline.",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function pickMessage(
  category: NotifCategory | 'comeback',
  personality: Personality,
): string {
  const msgs = NOTIFICATION_MESSAGES[personality][category];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function pickTip(): string {
  return COMPANION_TIPS[Math.floor(Math.random() * COMPANION_TIPS.length)];
}
