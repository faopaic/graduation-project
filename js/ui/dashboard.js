import { formatDate } from "../core/time.js";
import { getCompanyRank, paySalaries } from "../company/company.js";
import { getEmployeeSales, getSalesPower } from "../company/employee.js";
import { canAcceptProject, getDeadlineMonths, getMonthIndex, getProgress } from "../project/project.js";

const EMPLOYEES_PER_PAGE = 10;
const PROJECTS_PER_PAGE = 10;
let employeePage = 1;
let candidatePage = 1;
let projectPage = 1;

export function setPaginationPage(type, page) {
  if (type === "employees") employeePage = page;
  if (type === "candidates") candidatePage = page;
  if (type === "projects") projectPage = page;
}

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
    events: () => renderEvents(state, events, handlers)
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

function renderDashboard(state) {
  const projects = state.activeProjects.map((project) => `
    <div class="active-project compact-card">
      <div class="project-heading"><strong>${project.name}</strong><span>${project.monthsRemaining}ヶ月</span></div>
      <div class="progress-track"><span style="width:${getProgress(project)}%"></span></div>
      <small>進捗 ${getProgress(project)}%</small>
    </div>`).join("");
  return `<div class="dashboard-layout">
    <aside class="dashboard-side left-side">
      <section class="pixel-panel company-panel"><div class="panel-ribbon">会社情報 ・ STATUS</div><div class="company-emblem">◆</div><h3>Blue Orbit Systems</h3><p class="muted">小さなチームの挑戦</p><div class="mini-facts"><span>設立 <b>1年目</b></span><span>ランク <b>${getCompanyRank(state)}</b></span><span>実績 <b>${state.completedProjects}件</b></span></div></section>
      <section class="pixel-panel"><div class="panel-title"><h3>会社の状態</h3><small>0 — 100</small></div><div class="meter-row"><span>評判</span><div class="meter"><i style="width:${state.reputation}%"></i></div><b>${state.reputation}</b></div><div class="meter-row"><span>技術</span><div class="meter teal"><i style="width:${Math.min(100, state.technology)}%"></i></div><b>${state.technology}</b></div><div class="meter-row"><span>士気</span><div class="meter gold"><i style="width:${state.morale}%"></i></div><b>${state.morale}</b></div></section>
    </aside>
    <section class="dashboard-center">
      <section class="view-heading"><div><p class="eyebrow">MONTHLY REPORT</p><h2>会社ダッシュボード</h2></div><span class="company-rank">${getCompanyRank(state)}</span></section>
      <div class="hero-panel"><div><p class="eyebrow">今月の重点</p><h2>次の一手が、会社の未来をつくる。</h2><p>案件を受注し、社員の力を活かして信頼を積み上げましょう。</p></div><div class="hero-mark">◈</div></div>
      <div class="summary-grid"><div><span>進行中案件</span><strong>${state.activeProjects.length}件</strong></div><div><span>完了案件</span><strong>${state.completedProjects}件</strong></div><div><span>給与支出 / 月</span><strong>${paySalaries(state)}万円</strong></div><div><span>大型案件成功</span><strong>${state.largeProjectsCompleted}件</strong></div></div>
      <section class="subsection"><div class="section-title"><h3>進行中の案件</h3><button class="text-button" data-view-link="projects">案件一覧を見る →</button></div>${projects || '<div class="empty-inline">現在進行中の案件はありません。案件一覧から仕事を受注しましょう。</div>'}</section>
    </section>
    <aside class="dashboard-side right-side"><section class="pixel-panel"><div class="panel-title"><h3>今月の記録</h3><small>LOG</small></div><div class="log-entry"><b>会社を設立</b><span>新しい月が始まりました</span></div><div class="log-entry"><b>社員 ${state.employees.length}人</b><span>チームが活動中</span></div><div class="log-entry"><b>案件 ${state.activeProjects.length}件</b><span>開発プロジェクト</span></div></section><section class="pixel-panel map-panel"><div class="panel-title"><h3>会社の成長</h3><small>YEAR 1</small></div>
    <div class="pixel-map">
    ${
      state.growthMap
        .slice(-60)
        .map((cell) => `
        <i
          class="growth-cell level-${cell.colorLevel}"
          title="${cell.calendarYear}年 ${cell.month}月
            評判: ${cell.reputation}
            技術: ${cell.technology}
            士気: ${cell.morale}
            資金: ${cell.funds}万円
            ${cell.event || '記録なし'}
          "
        >
          ${cell.symbol || ""}
        </i>`)
        .join("")
    }
    </div><small class="muted">次の月へ進むと記録が更新されます</small></section></aside>
    </div>`;
    
}

function renderEmployees(state, candidates) {
  const availableCandidates = candidates.filter((candidate) => !state.employees.some((employee) => employee.id === candidate.id));
  const employeePages = getPageCount(state.employees.length, EMPLOYEES_PER_PAGE);
  const candidatePages = getPageCount(availableCandidates.length, EMPLOYEES_PER_PAGE);
  employeePage = clampPage(employeePage, employeePages);
  candidatePage = clampPage(candidatePage, candidatePages);
  const employeesOnPage = getPageItems(state.employees, employeePage, EMPLOYEES_PER_PAGE);
  const candidatesOnPage = getPageItems(availableCandidates, candidatePage, EMPLOYEES_PER_PAGE);
  const cards = employeesOnPage.map((employee) => {
    const assignedToSales = (state.salesEmployeeIds ?? []).includes(employee.id);
    return `<article class="employee-card"><div class="avatar">${employee.name.slice(0, 1)}</div><div class="employee-main"><div class="card-title"><h3>${employee.name}</h3><span>${employee.role}</span></div><div class="stat-line"><span>開発 ${employee.development}</span><span>デザイン ${employee.design}</span><span>管理 ${employee.management}</span><span>営業 ${getEmployeeSales(employee)}</span></div><small>月給 ${employee.salary}万円</small></div><button class="secondary-button sales-button" data-sales="${employee.id}">${assignedToSales ? "開発に戻す" : "営業に回す"}</button></article>`;
  }).join("");
  const available = candidatesOnPage.map((candidate) => `<article class="candidate-card"><div class="avatar candidate">${candidate.name.slice(0, 1)}</div><div class="employee-main"><div class="card-title"><h3>${candidate.name}</h3><span>${candidate.role}</span></div><div class="stat-line"><span>開発 ${candidate.development}</span><span>デザイン ${candidate.design}</span><span>管理 ${candidate.management}</span><span>営業 ${getEmployeeSales(candidate)}</span></div><small>採用費 ${candidate.hireCost}万円 / 月給 ${candidate.salary}万円</small></div><button class="secondary-button hire-button" data-hire="${candidate.id}">採用</button></article>`).join("");
  const salesCount = (state.salesEmployeeIds ?? []).length;
  return `<section class="view-heading"><div><p class="eyebrow">TEAM MANAGEMENT</p><h2>社員</h2><p class="muted">営業担当 ${salesCount}人 ・ 営業力 ${getSalesPower(state)}</p></div><span class="section-count">${state.employees.length}人</span></section><section class="card-list">${cards || '<div class="empty-inline">在籍社員はいません。</div>'}</section>${renderPagination("employees", employeePage, employeePages)}<section class="subsection"><div class="section-title"><h3>採用候補</h3><span class="muted">採用費は一度だけ発生</span></div><section class="card-list">${available || '<div class="empty-inline">現在採用できる候補はいません。</div>'}</section>${renderPagination("candidates", candidatePage, candidatePages)}</section>`;
}

function renderProjects(state, projects) {
  const offeredProjectIds = state.offeredProjectIds ?? [];
  const visibleProjects = projects.filter((project) =>
    offeredProjectIds.includes(project.id)
    && (
      state.activeProjects.some((active) => active.projectId === project.id)
      || !state.projectDeadlines?.[project.id]
      || getMonthIndex(state) <= state.projectDeadlines[project.id]
    )
  );
  const projectPages = getPageCount(visibleProjects.length, PROJECTS_PER_PAGE);
  projectPage = clampPage(projectPage, projectPages);
  const cards = getPageItems(visibleProjects, projectPage, PROJECTS_PER_PAGE).map((project) => {
    const active = state.activeProjects.some((item) => item.projectId === project.id);
    const eligible = canAcceptProject(project, state);
    const remainingMonths = state.projectDeadlines?.[project.id]
      ? state.projectDeadlines[project.id] - getMonthIndex(state)
      : getDeadlineMonths(project);
    return `<article class="project-card"><div class="project-art image-placeholder">${project.large ? "LARGE" : "PROJECT"}</div><div class="project-body"><div class="card-title"><h3>${project.name}</h3><span class="difficulty">${"★".repeat(project.difficulty)}${"☆".repeat(5 - project.difficulty)}</span></div><p>${project.description}</p><div class="requirements"><span>報酬 <strong>${project.reward}万円</strong></span><span>期間 <strong>${project.duration}ヶ月</strong></span><span>必要技術 <strong>${project.requiredTechnology}</strong></span><span>必要人数 <strong>${project.requiredEmployees}人</strong></span><span>受注期限 <strong>あと${remainingMonths}ヶ月</strong></span></div><button class="primary-button accept-button" data-project="${project.id}" ${active || !eligible ? "disabled" : ""}>${active ? "進行中" : eligible ? "受注する" : "条件不足"}</button></div></article>`;
  }).join("");
  return `<section class="view-heading"><div><p class="eyebrow">PROJECT BOARD</p><h2>案件一覧</h2></div><span class="section-count">${visibleProjects.length}件</span></section><p class="muted">営業の結果、提案された案件だけが表示されます。</p><div class="project-list">${cards || '<div class="empty-state"><span class="big-icon">📣</span><h3>営業を進めると案件が提案されます</h3><p>次の月へ進むと営業結果を確認できます。</p></div>'}</div>${renderPagination("projects", projectPage, projectPages)}`;
}

function getPageCount(itemCount, pageSize) {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

function getPageItems(items, page, pageSize) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

function clampPage(page, pageCount) {
  return Math.min(Math.max(page, 1), pageCount);
}

function renderPagination(type, page, pageCount) {
  if (pageCount <= 1) return "";
  return `<nav class="pagination" aria-label="ページ移動"><button class="secondary-button page-button" data-page-type="${type}" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>前へ</button><span>${page} / ${pageCount}</span><button class="secondary-button page-button" data-page-type="${type}" data-page="${page + 1}" ${page === pageCount ? "disabled" : ""}>次へ</button></nav>`;
}

function renderEvents(state, events) {
  return `<section class="view-heading"><div><p class="eyebrow">COMPANY LOG</p><h2>イベント</h2></div></section><div class="event-log"><div class="event-log-item"><span class="event-dot"></span><div><strong>会社を設立しました</strong><p>小さなチームで大きな未来を目指します。</p></div><time>1年目 4月</time></div>${state.lastEventId ? `<div class="event-log-item"><span class="event-dot"></span><div><strong>${events.find((event) => event.id === state.lastEventId)?.title ?? "イベント"}</strong><p>選択結果が会社の状態に反映されました。</p></div><time>最近</time></div>` : ""}</div>`;
}

function bindEmployeeButtons(handlers) {
  document.querySelectorAll("[data-hire]").forEach((button) => button.addEventListener("click", () => handlers.hire(button.dataset.hire)));
  document.querySelectorAll("[data-sales]").forEach((button) => button.addEventListener("click", () => handlers.toggleSales(button.dataset.sales)));
  document.querySelectorAll("[data-page-type]").forEach((button) => button.addEventListener("click", () => handlers.changePage(button.dataset.pageType, Number(button.dataset.page))));
}
function bindProjectButtons(handlers) {
  document.querySelectorAll("[data-project]").forEach((button) => button.addEventListener("click", () => handlers.accept(button.dataset.project)));
  document.querySelectorAll("[data-page-type]").forEach((button) => button.addEventListener("click", () => handlers.changePage(button.dataset.pageType, Number(button.dataset.page))));
}
function bindEventButton() {}
