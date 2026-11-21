(() => {
  const root = document.documentElement;
  const key = 'cinaptic:theme';
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  let chosen;
  try { chosen = localStorage.getItem(key); } catch { /* System theme works without storage. */ }
  function apply(theme) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101c19' : '#f5f8f6');
    document.querySelectorAll('.theme-toggle').forEach(button => {
      const label = theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    });
  }
  apply(['light', 'dark'].includes(chosen) ? chosen : preference.matches ? 'dark' : 'light');
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('.theme-toggle').forEach(button => button.addEventListener('click', () => {
      chosen = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(chosen);
      try { localStorage.setItem(key, chosen); } catch { /* Theme still works for this visit. */ }
    }));
  });
  preference.addEventListener('change', () => { if (!['light', 'dark'].includes(chosen)) apply(preference.matches ? 'dark' : 'light'); });
})();
