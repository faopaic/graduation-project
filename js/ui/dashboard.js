import { formatDate } from "../core/time.js";
import { getCompanyRank, paySalaries } from "../company/company.js";
import { getProgress } from "../project/project.js";

export function renderHeader(state) {
  document.querySelector("#current-date").textContent = formatDate(state);
  document.querySelector("#funds").textContent = `${state.funds.toLocaleString()}万円`;
  document.querySelector("#employee-count").textContent = `${state.employees.length}人`;
  document.querySelector("#reputation").textContent = state.reputation;
  document.querySelector("#technology").textContent = state.technology;
}

export function renderView(state, projects, employees, events, handlers) {
  const content = document.querySelector("#main-content");
  if (state.gameOver) {
    content.innerHTML = `<section class="empty-state"><span class="big-icon">🏁</span><h2>5年間の経営が終了しました</h2><p>最終評価を確認してください。</p></section>`;
    return;
  }
  const views = {
    dashboard: () => renderDashboard(state),
    employees: () => renderEmployees(state, employees, handlers),
    projects: () => renderProjects(state, projects, handlers),
    events: () => renderEvents(state)
  };
  content.innerHTML = (views[state.currentView] ?? views.dashboard)();
  if (state.currentView === "employees") bindEmployeeButtons(handlers);
  if (state.currentView === "projects") bindProjectButtons(handlers);
  if (state.currentView === "events") bindEventButton(handlers);
  content.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`[data-view="${button.dataset.viewLink}"]`)?.click();
    });
  });
}

function renderEvents(state) {

  const historyLogs = state.history?.map((log) => `
    <div class="event-log-item">
      <span class="event-dot"></span>
      <div>
        <strong>${log.title}</strong>
        <p>${log.description}</p>
      </div>
      <time>
        ${log.year}年目 ${log.month}月
      </time>
    </div>
  `).join("");
  return `
    <section class="view-heading">
      <div>
        <p class="eyebrow">COMPANY HISTORY</p>
        <h2>会社史</h2>
      </div>
      <span class="section-count">
        ${state.history?.length ?? 0}件
      </span>
    </section>
    <div class="event-log">
      ${
        historyLogs ||
        `<div class="empty-state">
          <h3>履歴はまだありません</h3>
         </div>`
      }
    </div>
  `;
}

function renderEmployees(state, candidates) {
  const cards = state.employees.map((employee) => `<article class="employee-card"><div class="avatar">${employee.name.slice(0, 1)}</div><div class="employee-main"><div class="card-title"><h3>${employee.name}</h3><span>${employee.role}</span></div><div class="stat-line"><span>開発 ${employee.development}</span><span>デザイン ${employee.design}</span><span>管理 ${employee.management}</span></div><small>月給 ${employee.salary}万円</small></div></article>`).join("");
  const available = candidates.filter((candidate) => !state.employees.some((employee) => employee.id === candidate.id)).map((candidate) => `<article class="candidate-card"><div class="avatar candidate">${candidate.name.slice(0, 1)}</div><div class="employee-main"><div class="card-title"><h3>${candidate.name}</h3><span>${candidate.role}</span></div><div class="stat-line"><span>開発 ${candidate.development}</span><span>デザイン ${candidate.design}</span><span>管理 ${candidate.management}</span></div><small>採用費 ${candidate.hireCost}万円 / 月給 ${candidate.salary}万円</small></div><button class="secondary-button hire-button" data-hire="${candidate.id}">採用</button></article>`).join("");
  return `<section class="view-heading"><div><p class="eyebrow">TEAM MANAGEMENT</p><h2>社員</h2></div><span class="section-count">${state.employees.length}人</span></section><section class="card-list">${cards}</section><section class="subsection"><div class="section-title"><h3>採用候補</h3><span class="muted">採用費は一度だけ発生</span></div><section class="card-list">${available || '<div class="empty-inline">現在採用できる候補はいません。</div>'}</section></section>`;
}

function renderProjects(state, projects) {
  const cards = projects.filter((project) => project.minReputation <= state.reputation).map((project) => {
    const active = state.activeProjects.some((item) => item.projectId === project.id);
    const eligible = state.technology >= project.requiredTechnology && state.employees.length >= project.requiredEmployees;
    return `<article class="project-card"><div class="project-art image-placeholder">${project.large ? "LARGE" : "PROJECT"}</div><div class="project-body"><div class="card-title"><h3>${project.name}</h3><span class="difficulty">${"★".repeat(project.difficulty)}${"☆".repeat(5 - project.difficulty)}</span></div><p>${project.description}</p><div class="requirements"><span>報酬 <strong>${project.reward}万円</strong></span><span>期間 <strong>${project.duration}ヶ月</strong></span><span>必要技術 <strong>${project.requiredTechnology}</strong></span><span>必要人数 <strong>${project.requiredEmployees}人</strong></span></div><button class="primary-button accept-button" data-project="${project.id}" ${active || !eligible ? "disabled" : ""}>${active ? "進行中" : eligible ? "受注する" : "条件不足"}</button></div></article>`;
  }).join("");
  return `<section class="view-heading"><div><p class="eyebrow">PROJECT BOARD</p><h2>案件一覧</h2></div><span class="section-count">${projects.filter((project) => project.minReputation <= state.reputation).length}件</span></section><div class="project-list">${cards || '<div class="empty-state"><span class="big-icon">🔒</span><h3>評判を高めると新しい案件が登場します</h3></div>'}</div>`;
}



function bindEmployeeButtons(handlers) { document.querySelectorAll("[data-hire]").forEach((button) => button.addEventListener("click", () => handlers.hire(button.dataset.hire))); }
function bindProjectButtons(handlers) { document.querySelectorAll("[data-project]").forEach((button) => button.addEventListener("click", () => handlers.accept(button.dataset.project))); }
function bindEventButton() {}