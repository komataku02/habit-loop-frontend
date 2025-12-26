<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="app-title">履歴</h1>
        <p class="app-subtitle">日別の達成率を確認できます。</p>
      </div>

      <NuxtLink to="/" class="nav-link">← 戻る</NuxtLink>
    </header>

    <section class="card">
      <header class="card-header">
        <h2 class="card-title">直近の記録</h2>
        <p class="card-caption">保存されている履歴（localStorage）から表示しています。</p>
      </header>

      <ul v-if="items.length > 0" class="history-list">
        <li v-for="item in items" :key="item.date" class="history-item">
          <div class="history-row">
            <div class="history-left">
              <p class="history-date">
                <span>{{ item.label }}</span>
                <span v-if="item.isPerfect" class="badge badge-perfect">Perfect</span>
              </p>
              <p class="history-meta">完了: {{ item.done }} / {{ item.total }}</p>
            </div>

            <div class="history-right">
              <p class="history-rate">
                <span>{{ item.rate }}%</span>
                <span v-if="item.isPerfect" class="badge badge-perfect subtle">100%</span>
              </p>
              <div class="bar">
                <div class="bar-inner" :style="{ width: item.rate + '%' }"></div>
              </div>
            </div>
          </div>
        </li>
      </ul>

      <p v-else class="empty">履歴がまだありません（習慣の追加やチェックで記録されます）</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useHabitLoopStore } from '~/stores/habitLoop';

const store = useHabitLoopStore();

onMounted(() => {
  store.init();
});

const items = computed(() => {
  return store.historyItems.slice(0, 30).map((x) => {
    const isPerfect = x.total > 0 && x.done >= x.total;
    return { ...x, isPerfect };
  });
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
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    'Helvetica Neue', Arial, sans-serif;
  width: min(960px, 100%);
}

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
}
.nav-link:hover {
  background: #111827;
}

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

.history-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: grid;
  gap: 8px;
}

.history-item {
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 10px 12px;
}

.history-row {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 12px;
  align-items: center;
}

.history-date {
  margin: 0 0 2px;
  font-weight: 700;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.history-meta {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

.history-right {
  display: grid;
  gap: 6px;
}

.history-rate {
  margin: 0;
  text-align: right;
  font-size: 12px;
  display: inline-flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
}

.badge-perfect {
  background: rgba(34, 197, 94, 0.12);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.25);
}

.badge-perfect.subtle {
  background: transparent;
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.25);
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

.empty {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 640px) {
  .history-row {
    grid-template-columns: 1fr;
  }
  .history-rate {
    justify-content: flex-start;
    text-align: left;
  }
}
</style>
