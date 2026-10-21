let timeoutId;

export function showNotification(message, type = "info") {
  const area = document.querySelector("#notification-area");
  if (!area) return;
  clearTimeout(timeoutId);
  area.innerHTML = `<div class="notification ${type}">${message}</div>`;
  timeoutId = setTimeout(() => { area.innerHTML = ""; }, 4000);
}