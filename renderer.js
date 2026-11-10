const actions = ['back', 'forward', 'reload', 'home'];
for (const name of actions) {
  document.getElementById(name).addEventListener('click', () => {
    window.browserAPI.action(name).catch(console.error);
  });
}
const toggle = document.getElementById('adblock-toggle');
const status = document.getElementById('adblock-status');
function updateToggle(enabled) {
  toggle.checked = enabled;
  status.textContent = enabled ? 'ON' : 'OFF';
  status.style.color = enabled ? '#4ade80' : '#f87171';
}
window.browserAPI.getAdBlockState().then(updateToggle).catch(console.error);
toggle.addEventListener('change', async () => {
  toggle.disabled = true;
  try {
    updateToggle(await window.browserAPI.setAdBlockState(toggle.checked));
  } catch (error) {
    console.error(error);
    updateToggle(await window.browserAPI.getAdBlockState());
  } finally { toggle.disabled = false; }
});
window.browserAPI.onState(state => {
  document.getElementById('address').textContent = state.url || 'youtube.com';
  document.getElementById('back').disabled = !state.canGoBack;
  document.getElementById('forward').disabled = !state.canGoForward;
  updateToggle(state.adBlockEnabled);
});
