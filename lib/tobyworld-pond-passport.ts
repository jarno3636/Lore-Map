export type PondPassportPersona = {
  title: string;
  characteristic: string;
  strangeHabit: string;
  pondWarning: string;
  stamp: string;
  shareText: string;
};

export type PondPassportSnapshot = {
  fid: number;
  username: string | null;
  displayName: string | null;
  currentMark: string;
  streakCount: number;
  bestStreak: number;
  totalCompletions: number;
  currentEchoPower: number;
  highestEchoPower: number;
  totalEchoes: number;
  totalRites: number;
};

export const POND_PASSPORT_LIMITS = {
  maxDailyRerolls: 2,
  cooldownSeconds: 120,
};

const TITLES = [
  'Keeper of the Suspicious Lily Pad',
  'Assistant Regional Pond Manager',
  'Minor Gate Problem',
  'Red Grain Goblin',
  'Taboshi Leaf Accountant',
  'Certified Ripple Overthinker',
  'The Frog Who Read the Fine Print',
  'Pond Intern With Ancient Clearance',
  'Still-Water Menace',
  'Deputy of Unnecessary Stillness',
];

const CHARACTERISTICS = [
  'Returns daily, then acts like the pond summoned them personally.',
  'Can turn one tiny ritual into a full mythological situation.',
  'Stares at progress bars with spiritual intensity.',
  'Treats a streak like a legally binding prophecy.',
  'Shows up for stillness but somehow brings main-character energy.',
  'Counts echoes like they owe rent.',
  'Believes every locked gate is just being dramatic.',
  'Has never met a ripple they could not overinterpret.',
  'Quietly farming destiny one tiny rite at a time.',
  'Moves slowly, but suspiciously on purpose.',
];

const HABITS = [
  'Whispers “one more rite” like that has ever stayed simple.',
  'Checks the pond, checks it again, then calls it patience.',
  'Waters imaginary leaves and insists this is strategy.',
  'Approaches mystical doors with completely unearned confidence.',
  'Keeps a mental spreadsheet of vibes, echoes, and frog-related concerns.',
  'Pretends not to care about relics while absolutely caring about relics.',
  'Turns every daily check-in into a ceremonial business meeting.',
  'Nods at the red triangle like it said something profound.',
];

const WARNINGS = [
  'Do not hand this frog a golden gate after midnight.',
  'May attempt to explain the pond economy at dinner.',
  'Keep away from unlocked lore unless supervised.',
  'If found staring at water, do not interrupt the calculation.',
  'May become emotionally attached to a progress meter.',
  'Do not ask what the triangle means unless you have 45 minutes.',
  'May claim stillness while clearly plotting.',
  'Not dangerous, just weirdly committed.',
];

const STAMPS = [
  '△ · 🐸 · 🍃',
  '🐸 · 🌀 · ✦',
  '△ · △ · 🐸',
  '🍃 · 🐸 · ✦',
  '🌀 · 🐸 · △',
  '✦ · 🍃 · 🐸',
];

function pick<T>(items: readonly T[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

function hashText(value: string) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function clampText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

export function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

export function secondsUntilNextGeneration(lastGeneratedAt: string | null | undefined) {
  if (!lastGeneratedAt) return 0;

  const elapsedSeconds = Math.floor((Date.now() - new Date(lastGeneratedAt).getTime()) / 1000);
  return Math.max(0, POND_PASSPORT_LIMITS.cooldownSeconds - elapsedSeconds);
}

export function createPassportSeed(snapshot: PondPassportSnapshot, nonce = 0) {
  return [
    snapshot.fid,
    snapshot.username ?? '',
    snapshot.displayName ?? '',
    snapshot.currentMark,
    snapshot.streakCount,
    snapshot.bestStreak,
    snapshot.totalCompletions,
    snapshot.currentEchoPower,
    snapshot.highestEchoPower,
    snapshot.totalEchoes,
    snapshot.totalRites,
    getTodayUtcDate(),
    nonce,
  ].join(':');
}

export function createFallbackPersona(
  snapshot: PondPassportSnapshot,
  nonce = 0,
): PondPassportPersona {
  const seed = createPassportSeed(snapshot, nonce);
  const hash = hashText(seed);
  const display = snapshot.displayName || snapshot.username || `FID ${snapshot.fid}`;

  const title = pick(TITLES, hash);
  const characteristic = pick(CHARACTERISTICS, hash >> 3);
  const strangeHabit = pick(HABITS, hash >> 6);
  const pondWarning = pick(WARNINGS, hash >> 9);
  const stamp = pick(STAMPS, hash >> 12);

  return {
    title,
    characteristic,
    strangeHabit,
    pondWarning,
    stamp,
    shareText: `My Tobyworld Pond Passport has been stamped: ${title}. The pond remains concerned. ${stamp}`,
  };
}

export function sanitizePersona(
  raw: Partial<PondPassportPersona>,
  fallback: PondPassportPersona,
): PondPassportPersona {
  const cleanField = (
    value: unknown,
    fallbackValue: string,
    maxLength: number,
  ) => {
    if (typeof value !== 'string') return fallbackValue;

    const cleaned = clampText(
      value
        .replace(/[`*_#<>]/g, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/\b(?:buy|sell|moon|pump|guaranteed|profit|financial advice)\b/gi, ''),
      maxLength,
    );

    return cleaned.length >= 3 ? cleaned : fallbackValue;
  };

  return {
    title: cleanField(raw.title, fallback.title, 48),
    characteristic: cleanField(raw.characteristic, fallback.characteristic, 110),
    strangeHabit: cleanField(raw.strangeHabit, fallback.strangeHabit, 110),
    pondWarning: cleanField(raw.pondWarning, fallback.pondWarning, 100),
    stamp: cleanField(raw.stamp, fallback.stamp, 32),
    shareText: cleanField(raw.shareText, fallback.shareText, 180),
  };
}
