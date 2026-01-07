import { defineStore } from 'pinia';
import { computed, ref, watch, type WatchStopHandle } from 'vue';

export type Habit = {
  id: number;
  name: string;
  done: boolean;
};

export type DayHistory = {
  total: number;
  done: number;
  doneIds?: number[];
};

export type HistoryMap = Record<string, DayHistory>;

type HabitStorageV2 = {
  lastDate: string;
  habits: Habit[];
};

type HabitStorageV3 = {
  version: 3;
  lastDate: string;
  habits: Habit[];
  history: HistoryMap;
};

const STORAGE_KEY = 'habit-loop:habits';
const HISTORY_KEY_LEGACY = 'habit-loop:history';

// ===== Date helpers (YYYY/MM/DD) =====
const formatDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`; // 既存実装に合わせて YYYY/MM/DD 維持
};

const getTodayKey = () => formatDateKey(new Date());

const parseKeyToDate = (key: string) => {
  // 'YYYY/MM/DD' 前提
  const [y, m, d] = key.split('/').map((v) => Number(v));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const addDays = (date: Date, diff: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + diff);
  return d;
};

const isYesterdayKey = (currentKey: string, prevKey: string) => {
  // currentKey の前日が prevKey なら true
  const cur = parseKeyToDate(currentKey);
  const expectedPrev = formatDateKey(addDays(cur, -1));
  return expectedPrev === prevKey;
};

const weekday = (d: Date) => ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];

const labelFromKey = (key: string) => {
  const [y, m, day] = key.split('/').map((v) => Number(v));
  const d = new Date(y, (m ?? 1) - 1, day ?? 1);
  return `${key}(${weekday(d)})`;
};

// ===== Calc helpers =====
const calc = (habits: Habit[]) => {
  const total = habits.length;
  const done = habits.filter((h) => h.done).length;
  const doneIds = habits.filter((h) => h.done).map((h) => h.id);
  return { total, done, doneIds };
};

// streak判定：その日が100%達成（total>0 かつ done>=total）
const isPerfectDay = (h?: DayHistory) => {
  if (!h) return false;
  return h.total > 0 && h.done >= h.total;
};

// 履歴を最大N件に制限（localStorage肥大化対策）
const pruneHistory = (map: HistoryMap, maxDays = 90): HistoryMap => {
  const entries = Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1)); // date desc
  return Object.fromEntries(entries.slice(0, maxDays));
};

export const useHabitLoopStore = defineStore('habitLoop', () => {
  const version = 3 as const;

  const lastDate = ref<string>(getTodayKey());
  const habits = ref<Habit[]>([
    // 初回だけのデフォルト（localStorage があれば上書きされます）
    { id: 1, name: '朝のストレッチ', done: false },
    { id: 2, name: '水を1リットル飲む', done: false },
    { id: 3, name: '読書を15分する', done: false },
  ]);

  const history = ref<HistoryMap>({});

  const ready = ref(false);
  let stopAutoSave: WatchStopHandle | null = null;

  // ===== Computed =====
  const totalCount = computed(() => habits.value.length);

  const doneCount = computed(() => habits.value.filter((h) => h.done).length);

  const completionRate = computed(() => {
    if (totalCount.value === 0) return 0;
    return Math.round((doneCount.value / totalCount.value) * 100);
  });

  const historyItems = computed(() => {
    return Object.entries(history.value)
      .map(([date, v]) => {
        const total = Number(v?.total ?? 0);
        const done = Number(v?.done ?? 0);
        const rate = total === 0 ? 0 : Math.round((done / total) * 100);
        return { date, label: labelFromKey(date), total, done, rate };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  });

  const weeklySummary = computed(() => {
    // 月〜日の7日
    const result: { label: string; rate: number }[] = [];
    const today = new Date();
    const todayDow = today.getDay(); // 0:日〜6:土
    const diffFromMonday = (todayDow + 6) % 7; // 月=0に揃える

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - diffFromMonday + i);

      const key = formatDateKey(d);
      const h = history.value[key];
      const total = h?.total ?? 0;
      const done = h?.done ?? 0;
      const rate = total === 0 ? 0 : Math.round((done / total) * 100);
      const weekdayLabel = ['月', '火', '水', '木', '金', '土', '日'][i] ?? '';

      result.push({ label: weekdayLabel, rate });
    }
    return result;
  });

  // 連続達成（今日から遡る）
  const currentStreak = computed(() => {
    const todayKey = getTodayKey();
    const keysSet = new Set(Object.keys(history.value));
    if (!keysSet.has(todayKey)) return 0;

    let streak = 0;
    let cursorKey = todayKey;

    while (true) {
      const h = history.value[cursorKey];
      if (!isPerfectDay(h)) break;

      streak += 1;

      const prevKey = formatDateKey(addDays(parseKeyToDate(cursorKey), -1));
      if (!keysSet.has(prevKey)) break;

      cursorKey = prevKey;
    }

    return streak;
  });

  // 最長連続達成（履歴全体）
  const bestStreak = computed(() => {
    const keysAsc = [...Object.keys(history.value)].sort((a, b) => (a > b ? 1 : -1));
    if (keysAsc.length === 0) return 0;

    let best = 0;
    let run = 0;

    for (let i = 0; i < keysAsc.length; i++) {
      const key = keysAsc[i];
      const h = history.value[key];

      if (!isPerfectDay(h)) {
        run = 0;
        continue;
      }

      if (run === 0) {
        run = 1;
        best = Math.max(best, run);
        continue;
      }

      const prevKey = keysAsc[i - 1];
      if (prevKey && isYesterdayKey(key, prevKey)) {
        run += 1;
      } else {
        run = 1;
      }

      best = Math.max(best, run);
    }

    return best;
  });

  // ===== Persistence =====
  const saveV3 = () => {
    if (!import.meta.client) return;

    // 念のため保存前に prune（常に90日以内に保つ）
    const pruned = pruneHistory(history.value, 90);
    if (pruned !== history.value) history.value = pruned;

    const payload: HabitStorageV3 = {
      version,
      lastDate: lastDate.value,
      habits: habits.value,
      history: history.value,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // 互換のためレガシーもミラー
    localStorage.setItem(HISTORY_KEY_LEGACY, JSON.stringify(history.value));
  };

  const loadAndMigrateToV3 = (): HabitStorageV3 => {
    const today = getTodayKey();

    // 1) legacy history を拾う（あるなら）
    let legacyHistory: HistoryMap = {};
    const legacyRaw = localStorage.getItem(HISTORY_KEY_LEGACY);
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          legacyHistory = parsed as HistoryMap;
        }
      } catch {
        // ignore
      }
    }

    // 2) habits 側のロード
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version, lastDate: today, habits: habits.value, history: legacyHistory };
    }

    try {
      const parsed = JSON.parse(raw) as unknown;

      // v1: Habit[]
      if (Array.isArray(parsed)) {
        const migratedHabits = parsed.map((h: any, index: number) => ({
          id: Number(h?.id ?? index + 1),
          name: String(h?.name ?? ''),
          done: false, // v1は日付が無いので安全にリセット
        })) as Habit[];

        return { version, lastDate: today, habits: migratedHabits, history: legacyHistory };
      }

      // v3
      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed as any).version === 3 &&
        typeof (parsed as any).lastDate === 'string' &&
        Array.isArray((parsed as any).habits)
      ) {
        const v3 = parsed as HabitStorageV3;
        return {
          version,
          lastDate: v3.lastDate,
          habits: v3.habits,
          history: (v3.history ?? legacyHistory) as HistoryMap,
        };
      }

      // v2
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof (parsed as any).lastDate === 'string' &&
        Array.isArray((parsed as any).habits)
      ) {
        const v2 = parsed as HabitStorageV2;
        return {
          version,
          lastDate: v2.lastDate,
          habits: v2.habits,
          history: legacyHistory,
        };
      }
    } catch {
      // ignore
    }

    // 解析できなかった場合は初期化
    return { version, lastDate: today, habits: habits.value, history: legacyHistory };
  };

  // 今日の履歴を更新（表示/週サマリー/連続記録のため常に持つ）
  const updateTodayHistory = () => {
    const key = getTodayKey();
    const { total, done, doneIds } = calc(habits.value);

    const next = {
      ...history.value,
      [key]: { total, done, doneIds },
    };

    history.value = pruneHistory(next, 90);
  };

  // 日付が変わっていたら前日を確定→今日へリセット
  const ensureToday = () => {
    if (!import.meta.client) return;

    const today = getTodayKey();
    if (lastDate.value === today) return;

    // 前日分を確定保存（lastDate が前日）
    const { total, done, doneIds } = calc(habits.value);
    history.value = pruneHistory(
      {
        ...history.value,
        [lastDate.value]: { total, done, doneIds },
      },
      90,
    );

    // doneリセットして今日へ
    habits.value = habits.value.map((h) => ({ ...h, done: false }));
    lastDate.value = today;

    // 今日の枠も作っておく
    updateTodayHistory();
    saveV3();
  };

  const startAutoSave = () => {
    if (stopAutoSave) return;

    stopAutoSave = watch(
      habits,
      () => {
        if (!ready.value) return;
        updateTodayHistory();
        saveV3();
      },
      { deep: true },
    );
  };

  const init = () => {
    if (!import.meta.client) return;
    if (ready.value) return;

    const v3 = loadAndMigrateToV3();
    lastDate.value = v3.lastDate;
    habits.value = v3.habits;
    history.value = pruneHistory(v3.history ?? {}, 90);

    // roll over（必要なら前日確定→今日リセット）
    ensureToday();

    // 今日の履歴を確実に作る
    updateTodayHistory();
    saveV3();

    ready.value = true;
    startAutoSave();
  };

  // ===== Actions =====
  const addHabit = (nameRaw: string) => {
    const name = nameRaw.trim();
    if (!name) return;

    const nextId = habits.value.length > 0 ? Math.max(...habits.value.map((h) => h.id)) + 1 : 1;
    habits.value = [...habits.value, { id: nextId, name, done: false }];
  };

  const toggleHabit = (id: number) => {
    habits.value = habits.value.map((h) => (h.id === id ? { ...h, done: !h.done } : h));
  };

  const removeHabit = (id: number) => {
    habits.value = habits.value.filter((h) => h.id !== id);
  };

  const renameHabit = (id: number, nameRaw: string) => {
    const name = nameRaw.trim();
    if (!name) return;
    habits.value = habits.value.map((h) => (h.id === id ? { ...h, name } : h));
  };

  return {
    // state
    version,
    ready,
    lastDate,
    habits,
    history,

    // computed
    totalCount,
    doneCount,
    completionRate,
    weeklySummary,
    historyItems,
    currentStreak,
    bestStreak,

    // actions
    init,
    ensureToday,
    addHabit,
    toggleHabit,
    removeHabit,
    renameHabit,
  };
});
