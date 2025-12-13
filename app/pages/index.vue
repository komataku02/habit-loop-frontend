<template>
    <main class="page">
        <header class="page-header">
            <h1 class="app-title"> Habit Loop（仮）</h1>
            <p class="app-subtitle">毎日の小さな習慣を、見える化しよう。</p>
            <p class="today">今日：{{ todayLabel }}</p>
        </header>

        <section class="card">
            <header class="card-header">
                <h2 class="card-title">今日の習慣</h2>
                <p class="card-caption">完了したものにチェックをつけてください。</p>
            </header>
            <ul class="habit-list">
                <li
                    v-for="habit in habits"
                    :key="habit.id"
                    class="habit-item"
                    :class="{ 'habit-item--done': habit.done}"
                >
                    <label class="habit-label">
                        <input
                            type="checkbox"
                            class="habit-checkbox"
                            :checked="habit.done"
                            @change="toggleHabit(habit.id)"></input>
                        <span class="habit-name">{{ habit.name }}</span>
                    </label>
                </li>
            </ul>
        </section>
    </main>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';

//仮の習慣リスト(あとでAPIやローカル保存に差し替える)
type Habit = {
    id: number
    name: string
    done: boolean
}

//保存に使うキー名(好みでOK)
const STORAGE_KEY = 'habit-loop:habits'

//ref(...)でリアクティブな変数を作成
const habits = ref<Habit[]>([
    { id: 1, name: '朝のストレッチ', done: false },
    { id: 2, name: '水を1リットル飲む', done: false },
    { id: 3, name: '読書を15分する', done: false },
])

//今日の日付をラベル用に整形
const todayLabel = computed(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    return `${y}/${m}/${day}(${weekdays})`
});

// マウント時に localStorage から読み込み＆変更を監視して保存
onMounted(() => {
    // SSR 対策
    if (typeof window === 'undefined') return

    // 1) 保存済みデータがあれば読み込む
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as Habit[]
            if (Array.isArray(parsed)) {
                habits.value = parsed.map((h, index) => ({
                id: h.id ?? index + 1,
                name: h.name ?? '',
                done: !!h.done,
                }))
            }
        } catch (e) {
        console.error('failed to parse habits from storage', e)
        }
    }

    // 2) habits が変わるたびに保存
    watch(
        habits,
        (value) => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
        },
        { deep: true }
    )
})


//チェックボックスを押したときにdoneをトグル
const toggleHabit = (id: number) => {
    habits.value = habits.value.map((h) =>
        h.id === id ? { ...h, done: !h.done } : h
    )
}
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
    margin-bottom: 18px;
}

.app-title {
    font-size: 40px;
    font-weight: 800;
    margin: 0 0 4px;
}

.app-subtitle {
    margin:0 0 8px;
    font-size: 16px;
    color: #9ca3af;
}

.today {
    font-size: 24px;
    color: #e5e7eb;
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
    font-size: 20px;
    font-weight: 700;
}

.card-caption {
    margin: 0;
    font-size: 12px;
    color: #9ca3af;
}

.habit-list {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    display: grid;
    gap: 6px;
}

.habit-item {
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid #1f2937;
    background: #020617;
    transition: background 0.15s ease, border-color 0.15s ease,
    transform 0.1s ease;
}

.habit-item--done {
    background: #022c22;
    border-color: #16a34a;
    opacity: 0.9;
}

.habit-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.habit-checkbox {
    width: 16px;
    height: 16px;
}

.habit-name {
    font-size: 18px;
}
</style>
