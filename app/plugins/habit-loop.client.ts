import { useHabitLoopStore } from '~/stores/habitLoop';

export default defineNuxtPlugin(() => {
  const store = useHabitLoopStore();
  store.init();

  const onActive = () => {
    store.ensureToday();
  };

  window.addEventListener('focus', onActive);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) onActive();
  });
});
