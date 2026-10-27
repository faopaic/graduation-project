export function closeModal() {
  document.querySelector("#modal-root").innerHTML = "";
}

export function showChoiceModal(event, onChoose) {
  const root = document.querySelector("#modal-root");
  root.innerHTML = `
    <div class="modal-backdrop">
      <section class="modal-card event-modal" role="dialog" aria-modal="true">
        <button class="modal-close" data-close-modal aria-label="閉じる">×</button>
        <div class="modal-image image-placeholder">EVENT</div>
        <p class="eyebrow">RANDOM EVENT</p>
        <h2>${event.title}</h2>
        <p>${event.text}</p>
        <div class="choice-list">
          ${event.choices.map((choice, index) => `<button class="choice-button" data-choice="${index}"><strong>${choice.label}</strong><small>${choice.description}</small></button>`).join("")}
        </div>
      </section>
    </div>`;
  root.querySelector("[data-close-modal]").addEventListener("click", closeModal);
  root.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      onChoose(event.choices[Number(button.dataset.choice)]);
      closeModal();
    });
  });
}

export function showFinalModal(state, rank, onRestart) {
  const root = document.querySelector("#modal-root");
  root.innerHTML = `
    <div class="modal-backdrop">
      <section class="modal-card final-card" role="dialog" aria-modal="true">
        <p class="eyebrow">5 YEARS LATER</p>
        <h2>経営結果</h2>
        <div class="rank">${rank}</div>
        <p>5年間の会社経営、お疲れさまでした。</p>
        <div class="final-stats">
          <span>資金<strong>${formatFunds(state.funds)}万円</strong></span>
          <span>社員<strong>${state.employees.length}人</strong></span>
          <span>評判<strong>${state.reputation}</strong></span>
          <span>大型案件<strong>${state.largeProjectsCompleted}件</strong></span>
        </div>
        <button class="primary-button" data-restart>もう一度プレイ</button>
      </section>
    </div>`;
  root.querySelector("[data-restart]").addEventListener("click", onRestart);
}

function formatFunds(funds) {
  return Math.round(funds).toLocaleString();
}