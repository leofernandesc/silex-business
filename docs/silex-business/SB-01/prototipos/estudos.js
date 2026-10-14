// Somente apresentação estática. Não usa fetch, API, cookies ou storage.
const toast = document.querySelector('.toast');
let toastTimer;
function explain() {
  toast.textContent = 'Estudo SB-01: ação apenas ilustrativa. Nenhum dado foi enviado ou alterado.';
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
}
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', explain));
document.querySelectorAll('form').forEach(form => form.addEventListener('submit', event => {
  event.preventDefault();
  form.reset();
  explain();
}));
const sidebar = document.querySelector('.sidebar');
const opener = document.querySelector('.mobile-menu');
const backdrop = document.querySelector('.backdrop');
const closer = document.querySelector('.drawer-close');
const mobileQuery = matchMedia('(max-width:900px)');
function syncDrawer() {
  if (sidebar) sidebar.inert = mobileQuery.matches && !sidebar.classList.contains('open');
}
mobileQuery.addEventListener('change', syncDrawer);
syncDrawer();
function setMenu(open) {
  sidebar?.classList.toggle('open', open);
  backdrop?.classList.toggle('open', open);
  opener?.setAttribute('aria-expanded', String(open));
  syncDrawer();
  if (open) closer?.focus();
  else opener?.focus();
}
opener?.addEventListener('click', () => setMenu(true));
closer?.addEventListener('click', () => setMenu(false));
backdrop?.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', event => {
  if (!sidebar?.classList.contains('open')) return;
  if (event.key === 'Escape') setMenu(false);
  if (event.key === 'Tab') {
    const controls = [...sidebar.querySelectorAll('a[href],button:not([disabled]),summary')].filter(el => el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
