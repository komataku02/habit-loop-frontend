<template>
    <main class="page">
        <header class="page-header">
            <h1 class="app-title"> Habit Loop（仮）</h1>
            <p class="app-subtitle">毎日の小さな習慣を、見える化しよう。</p>
            <p class="today">今日：{{ todayLabel }}</p>
        </header>

        <section class="add-card">
            <h2 class="add-title">習慣を追加</h2>
            <form class="add-form" @submit.prevent="handleAddHabit">
                <input
                    v-model="newHabitName"
                    type="text"
                    class="add-input"
                    placeholder="例) 日記を書く">
                </input>
                <button type="submit"
                    class="add-button"
                    :disabled="!newHabitName.trim()">
                    追加
                </button>
            </form>
        </section>

        <section class="card">
            <header class="card-header">
                <div>
                    <h2 class="card-title">今日の習慣</h2>
                    <p class="card-caption">完了したものにチェックをつけてください。</p>
                </div>

                <div class="card-summary" v-if="totalCount > 0">
                    <p class="card-progress">
                        完了: {{  doneCount }} / {{ totalCount }} ({{ completionRate }}%)
                    </p>
                    <div class="progress-bar">
                        <div
                            class="progress-bar-inner"
                            :style="{ width: completionRate + '%'}">
                        </div>
                    </div>

                    <label class="hide-done-toggle">
                        <input
                            type="checkbox"
                            v-model="hideDone"></input>
                            完了した習慣を隠す
                    </label>
                </div>
            </header>
            <ul class="habit-list">
                <li
                    v-for="habit in visibleHabits"
                    :key="habit.id"
                    class="habit-item"
                    :class="{ 'habit-item--done': habit.done}"
                >
                    <div class="habit-row">
                        <!-- 編集中かどうかで表示を切り替え -->
                        <template v-if="editingId === habit.id">
                            <!-- 編集モード -->
                            <input
                                v-model="editingName"
                                type="text"
                                class="habit-edit-input"
                            />
                            <div class="habit-edit-actions">
                                <button
                                    type="button"
                                    class="habit-edit-save"
                                    @click="saveEdit(habit.id)"
                                >
                                    保存
                                </button>
                                <button
                                    type="button"
                                    class="habit-edit-cancel"
                                    @click="cancelEdit"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </template>

                        <template v-else>
                            <!-- 通常モード -->
                            <label class="habit-label">
                                <input
                                    type="checkbox"
                                    class="habit-checkbox"
                                    :checked="habit.done"
                                    @change="toggleHabit(habit.id)"
                                />
                                <span class="habit-name">{{ habit.name }}</span>
                            </label>

                            <div class="habit-actions">
                                <button
                                    type="button"
                                    class="habit-edit-button"
                                    @click="startEdit(habit)"
                                >
                                    編集
                                </button>
                                <button
                                    type="button"
                                    class="habit-delete"
                                    @click="removeHabit(habit.id)"
                                >
                                    ✕
                                </button>
                            </div>
                        </template>
                    </div>
                </li>
            </ul>
        </section>

        <section class="card weekly-card">
            <header class="weekly-header">
                <h2 class="weekly-title">今週の達成状況</h2>
                <p class="weekly-caption">ダミーデータで表示中。あとで実データとつなぎます。</p>
            </header>

            <ul class="weekly-list">
                <li
                    v-for="day in weeklySummary"
                    :key="day.label"
                    class="weekly-item"
                >
                    <span class="weekly-label">{{  day.label }}</span>
                    <div class="weekly-bar">
                        <div
                            class="weekly-bar-inner"
                            :style="{ width: day.rate + '%' }">
                        </div>
                    </div>

                    <span class="weekly-rate">{{ day.rate }}%</span>
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

//フォーム用の入力値
const newHabitName = ref('')

//日付文字列YYYY/MM/DDを返すヘルパー
const getTodayKey = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}/${m}/${day}`
}

//保存用のフォーマット v2
type HabitStorageV2 = {
    lastDate: string
    habits: Habit[]
}

//新しい習慣を追加する処理
const handleAddHabit = () => {
    const name = newHabitName.value.trim()
    if (!name) return
    //idはひとまず「今ある最大＋１」でOK(簡易版)
    const nextId =
        habits.value.length > 0
            ? Math.max(...habits.value.map((h) => h.id)) + 1
            : 1

    habits.value = [
        ...habits.value,
        {
            id: nextId,
            name,
            done: false,
        }
    ]
    //追加後は入力欄を殻にする
    newHabitName.value = ''
}

//今日の日付をラベル用に整形
const todayLabel = computed(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    return `${y}/${m}/${day}(${weekdays})`
});

const totalCount = computed(() => habits.value.length)

const doneCount = computed(() =>
    habits.value.filter((h) => h.done).length
)
const completionRate = computed(() => {
    if (totalCount.value === 0) return 0
    return Math.round((doneCount.value / totalCount.value) * 100)
})

//完了した習慣を隠すかどうか
const hideDone = ref(false)

//表示用の「並び替え+フィルター済みリスト」
const visibleHabits = computed(() => {
    //false(0)が先に、true(1)が後ろ→未完了が上、完了が下
    const sorted = [...habits.value].sort((a, b) => {
        return Number(a.done) - Number(b.done)
    })
    //hideDoneがtrueなら完了済みを除外
    if (hideDone.value) {
        return sorted.filter((h) => !h.done)
    }
    return sorted
})

// マウント時に localStorage から読み込み＆変更を監視して保存
onMounted(() => {
    // SSR 対策
    if (typeof window === 'undefined') return

    // 1) 保存済みデータがあれば読み込む
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as Habit[] | HabitStorageV2
            if (Array.isArray(parsed)) {
                //旧フォーマット:日付なし→習慣だけ読み込み&doneはリセット
                habits.value = parsed.map((h, index) => ({
                id: h.id ?? index + 1,
                name: h.name ?? '',
                done: !!h.done,
                }))
            } else if (
                parsed &&
                typeof parsed === 'object' &&
                Array.isArray(parsed.habits)
            ) {
                //新フォーマット日付あり
                const storedDate: string | undefined = parsed.lastDate
                const baseHabits: Habit[] = parsed.habits
                //日付が変わっていたらdoneをリセット
                const today = getTodayKey()
                const shouldReset = storedDate !== today

                habits.value = baseHabits.map((h, index) => ({
                    id: h.id ?? index + 1,
                    name: h.name ?? '',
                    //日付が変わっていたら全て未完了に、それ以外は保存されていた状態を使う
                    done: shouldReset ? false : !!h.done,
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
            const payload: HabitStorageV2 = {
                lastDate: getTodayKey(),
                habits: value,
            }
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
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

const editingId = ref<number | null>(null) //いま編集中の習慣ID
const editingName = ref('') //編集用の入力値

//編集開始の処理
const startEdit = (habit: Habit) => {
    editingId.value = habit.id
    editingName.value = habit.name
}

//編集をキャンセル
const cancelEdit = () => {
    editingId.value = null
    editingName.value = ''
}

//編集内容を保存
const saveEdit = (id: number) => {
    const name = editingName.value.trim()
    if (!name) return

    habits.value = habits.value.map((h) =>
        h.id === id ? { ...h, name} : h
    )
    editingId.value = null
    editingName.value = ''
}

//習慣を削除する処理
const removeHabit = ( id: number) => {
    habits.value = habits.value.filter((h) =>
        h.id !== id)
}

//習慣サマリー(ダミーデータ)
//rateは0~100の達成率
const weeklySummary = ref<{ label: string; rate: number }[]>([
    { label: '月', rate: 80 },
    { label: '火', rate: 60 },
    { label: '水', rate: 100 },
    { label: '木', rate: 40 },
    { label: '金', rate: 0 },
    { label: '土', rate: 50 },
    { label: '日', rate: 70 },

])
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

.add-card {
    margin-top: 16px;
    margin-bottom: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: #020617;
    border: 1px solid #1f2937;
}

.add-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 700;
}

.add-form {
    display: flex;
    gap: 8px;
}

.add-input {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid #1f2937;
    border-radius: 8px;
    background: #020617;
    color: #e5e7eb;
    font-size: 14px;
}

.add-input::placeholder {
    color: #6b7280;
}

.add-button {
    padding: 8px 12px;
    border: 1px solid #7e6bf2;
    border-radius: 8px;
    background: #9b8cf7;
    color: #0d1020;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}

.add-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.habit-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
}

.habit-delete {
    background: transparent;
    border: none;
    color: #6b7280;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 6px;
    cursor: pointer;
}

.habit-delete:hover {
    background: #111827;
    color: #f97373;
}

.card-summary {
    min-width: 160px;
    margin-left: 12px;
}

.card-progress {
    margin: 0 0 4px;
    font-size: 12px;
    color: #e5e7ed;
    text-align: right;
}

.progress-bar {
    width: 100%;
    height: 6px;
    border-radius: 8px;
    background: #111827;
    overflow: hidden;
}

.progress-bar-inner {
    height: 100%;
    border-radius: inherit;
    background: #22c55e;
    transition: width 0.15s ease;
}

.habit-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.habit-edit-button {
    background: transparent;
    border: 1px solid #374152;
    color: #e5e7eb;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
}

.habit-edit-button:hover {
    background: #111827;
}

.habit-edit-input {
    flex: 1;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid #374151;
    background: #020617;
    color: #e5e7eb;
    font-size: 14px;
}

.habit-edit-actions {
    display: flex;
    gap: 6px;
}

.habit-edit-save,
.habit-edit-cancel {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid transparent;
}

.habit-edit-save {
    background: #22c55e;
    border-color: #16a34a;
    color: #022c22;
}

.habit-edit-cancel {
    background: transparent;
    border-color: #4b5563;
    color: #e5e7eb;
}

.weekly-card {
    margin-top: 16px;
}

.weekly-header {
    margin-bottom: 10px;
}

.weekly-title {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
}

.weekly-caption {
    margin: 0;
    font-size: 12px;
    color: #9ca3af;
}

.weekly-list {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    display: grid;
    gap: 6px;
}

.weekly-item {
    display: grid;
    grid-template-columns: 32px 1fr 40px;
    align-items: center;
    gap: 8px;
    font-size: 12px;
}

.weekly-label {
    color: #e5e7eb;
}

.weekly-bar {
    position: relative;
    height: 6px;
    border-radius: 999px;
    background: #111827;
    overflow: hidden;
}

.weekly-bar-inner {
    height: 100%;
    border-radius: inherit;
    background: #22c55e;
    transition: width 0.15s ease;
}

.weekly-rate {
    text-align: right;
    color: #9ca3af;
}

.hide-done-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #9ca3af;
    margin-top: 4px;
}

.hide-done-toggle input {
    width: 12px;
    height: 12px;
}


</style>