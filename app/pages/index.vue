<template>
  <main class="page">
    <header class="page-header">
      <div class="page-header__left">
        <h1 class="app-title">Habit Loop（仮）</h1>
        <p class="app-subtitle">毎日の小さな習慣を、見える化しよう。</p>
        <p class="today">今日：{{ todayLabel }}</p>
      </div>

      <NuxtLink to="/history" class="nav-link">履歴を見る</NuxtLink>
    </header>

    <!-- 追加 -->
    <section class="card add-card">
      <header class="card-header">
        <h2 class="card-title">習慣を追加</h2>
        <p class="card-caption">例：学習30分、ストレッチ、早起き など</p>
      </header>

      <form class="add-form" @submit.prevent="handleAddHabit">
        <input
          v-model="newHabitName"
          type="text"
          class="add-input"
          placeholder="習慣名を入力"
          maxlength="30"
          autocomplete="off"
        />
        <button class="add-button" type="submit" :disabled="isAddDisabled">追加</button>
      </form>
      <p class="add-help">※ 1〜30文字 / 追加後にチェックで達成を記録できます。</p>
    </section>

    <!-- 今日の達成状況 -->
    <section class="card">
      <header class="card-header card-header--row">
        <div>
          <h2 class="card-title">今日の達成状況</h2>
          <p class="card-caption">チェックを入れると達成率と履歴が更新されます。</p>

          <label class="hide-done-toggle">
            <input v-model="hideDone" type="checkbox" />
            完了した習慣を隠す
          </label>
        </div>

        <div class="card-summary" v-if="totalCount > 0">
          <p class="summary-rate">{{ completionRate }}%</p>
          <p class="summary-meta">完了: {{ doneCount }} / {{ totalCount }}</p>
          <div class="bar">
            <div class="bar-inner" :style="{ width: completionRate + '%' }" />
          </div>

          <div class="streak">
            <div class="streak-item">
              <p class="streak-num">{{ currentStreak }}</p>
              <p class="streak-label">連続達成</p>
            </div>
            <div class="streak-item">
              <p class="streak-num">{{ bestStreak }}</p>
              <p class="streak-label">最長</p>
            </div>
          </div>
        </div>
      </header>

      <ul class="habit-list" v-if="visibleHabits.length > 0">
        <li
          v-for="habit in visibleHabits"
          :key="habit.id"
          class="habit-item"
          :class="{ 'habit-item--done': habit.done }"
        >
          <div class="habit-row">
            <div class="habit-left">
              <input
                class="habit-checkbox"
                type="checkbox"
                :checked="habit.done"
                @change="toggleHabit(habit.id)"
              />

              <template v-if="editingId === habit.id">
                <input
                  v-model="editingName"
                  class="edit-input"
                  type="text"
                  maxlength="30"
                  autocomplete="off"
                />
              </template>
              <template v-else>
                <p class="habit-name">{{ habit.name }}</p>
              </template>
            </div>

            <div class="habit-actions">
              <template v-if="editingId === habit.id">
                <button class="habit-action" type="button" @click="saveEdit(habit.id)">保存</button>
                <button class="habit-action ghost" type="button" @click="cancelEdit">キャンセル</button>
              </template>
              <template v-else>
                <button class="habit-action" type="button" @click="startEdit(habit)">編集</button>
                <button class="habit-delete" type="button" @click="removeHabit(habit.id)">✕</button>
              </template>
            </div>
          </div>
        </li>
      </ul>

      <p v-else class="empty">まだ習慣がありません。上のフォームから追加してください。</p>
    </section>

    <!-- 週間サマリー -->
    <section class="card weekly-card">
      <header class="card-header">
        <h2 class="card-title">今週の達成率</h2>
        <p class="card-caption">今週（月〜日）の達成率です（履歴データから算出）。</p>
      </header>

      <div class="weekly-grid">
        <div v-for="w in weeklySummary" :key="w.label" class="weekly-item">
          <div class="weekly-top">
            <p class="weekly-label">{{ w.label }}</p>
            <p class="weekly-rate">{{ w.rate }}%</p>
          </div>
          <div class="bar">
            <div class="bar-inner" :style="{ width: w.rate + '%' }" />
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useHabitLoopStore, type Habit } from '~/stores/habitLoop';

const store = useHabitLoopStore();

onMounted(() => {
  // pluginで init 済みでもOK（ガードしているので二重呼びでも問題なし）
  store.init();
});

const newHabitName = ref('');
const hideDone = ref(false);

const editingId = ref<number | null>(null);
const editingName = ref('');

const habits = computed(() => store.habits);
const totalCount = computed(() => store.totalCount);
const doneCount = computed(() => store.doneCount);
const completionRate = computed(() => store.completionRate);
const weeklySummary = computed(() => store.weeklySummary);
const currentStreak = computed(() => store.currentStreak);
const bestStreak = computed(() => store.bestStreak);

const visibleHabits = computed(() => {
  const sorted = [...habits.value].sort((a, b) => Number(a.done) - Number(b.done));
  return hideDone.value ? sorted.filter((h) => !h.done) : sorted;
});

const isAddDisabled = computed(() => {
  const v = newHabitName.value.trim();
  return v.length === 0 || v.length > 30;
});

const handleAddHabit = () => {
  store.addHabit(newHabitName.value);
  newHabitName.value = '';
};

const toggleHabit = (id: number) => store.toggleHabit(id);
const removeHabit = (id: number) => store.removeHabit(id);

const startEdit = (habit: Habit) => {
  editingId.value = habit.id;
  editingName.value = habit.name;
};

const cancelEdit = () => {
  editingId.value = null;
  editingName.value = '';
};

const saveEdit = (id: number) => {
  store.renameHabit(id, editingName.value);
  editingId.value = null;
  editingName.value = '';
};

const todayLabel = computed(() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${y}/${m}/${day}(${weekdays})`;
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24px 16px 40px;
  margin: 0 auto;
  box-sizing: border-box;
  background: #020617;
  color: #e5e7eb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue',
    Arial, sans-serif;
  width: min(960px, 100%);
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.app-title {
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 4px;
}

.app-subtitle {
  margin: 0;
  font-size: 14px;
  color: #9ca3af;
}

.today {
  margin: 6px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #374152;
  color: #e5e7eb;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  text-decoration: none;
  white-space: nowrap;
}
.nav-link:hover {
  background: #111827;
}

/* Card */
.card {
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #020617;
  border: 1px solid #1f2937;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.card-header {
  margin-bottom: 10px;
}

.card-header--row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
}

.card-caption {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

/* Add */
.add-form {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.add-input {
  flex: 1;
  border-radius: 12px;
  border: 1px solid #1f2937;
  background: #0b1220;
  color: #e5e7eb;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
}

.add-input:focus {
  border-color: #334155;
}

.add-button {
  border-radius: 12px;
  border: 1px solid #1f2937;
  background: #111827;
  color: #e5e7eb;
  padding: 10px 14px;
  font-size: 14px;
  cursor: pointer;
}

.add-button:hover {
  background: #0b1220;
}

.add-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-help {
  margin: 8px 0 0;
  font-size: 11px;
  color: #9ca3af;
}

/* Summary */
.card-summary {
  min-width: 200px;
  text-align: right;
}

.summary-rate {
  margin: 0;
  font-weight: 800;
  font-size: 18px;
}

.summary-meta {
  margin: 2px 0 6px;
  font-size: 12px;
  color: #9ca3af;
}

.streak {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.streak-item {
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.01);
}

.streak-num {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}

.streak-label {
  margin: 2px 0 0;
  font-size: 11px;
  color: #9ca3af;
}

.bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #111827;
  overflow: hidden;
}

.bar-inner {
  height: 100%;
  border-radius: inherit;
  background: #22c55e;
  transition: width 0.15s ease;
}

/* Toggle */
.hide-done-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #9ca3af;
  margin-top: 8px;
  user-select: none;
}

.hide-done-toggle input {
  width: 12px;
  height: 12px;
}

/* Habits */
.habit-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: grid;
  gap: 8px;
}

.habit-item {
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.01);
}

.habit-item--done .habit-name {
  color: #9ca3af;
  text-decoration: line-through;
}

.habit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.habit-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.habit-checkbox {
  width: 16px;
  height: 16px;
}

.habit-name {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-input {
  width: min(420px, 56vw);
  border-radius: 10px;
  border: 1px solid #1f2937;
  background: #0b1220;
  color: #e5e7eb;
  padding: 8px 10px;
  font-size: 14px;
  outline: none;
}

.edit-input:focus {
  border-color: #334155;
}

.habit-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.habit-action {
  border: 1px solid #1f2937;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.habit-action:hover {
  background: #0b1220;
}

.habit-action.ghost {
  background: transparent;
  color: #9ca3af;
}

.habit-action.ghost:hover {
  background: #111827;
  color: #e5e7eb;
}

.habit-delete {
  border: 1px solid #1f2937;
  background: transparent;
  color: #9ca3af;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.habit-delete:hover {
  background: #111827;
  color: #f97373;
}

.empty {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

/* Weekly */
.weekly-grid {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.weekly-item {
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 10px 12px;
}

.weekly-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.weekly-label {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
}

.weekly-rate {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .card-header--row {
    flex-direction: column;
    align-items: flex-start;
  }
  .card-summary {
    text-align: left;
    min-width: auto;
    width: 100%;
  }
}
</style>
