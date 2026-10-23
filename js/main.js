import { getState, resetState, subscribe, updateState } from "./core/gameState.js";
import { advanceMonth, hasReachedEnd } from "./core/time.js";
import { changeFunds, paySalaries } from "./company/company.js";
import { growEmployees, hireEmployee } from "./company/employee.js";
import { acceptProject, advanceProjects, completeProjects } from "./project/project.js";
import { applyEventChoice, chooseEvent, markEventShown, shouldTriggerEvent } from "./event/event.js";
import { renderHeader, renderView } from "./ui/dashboard.js";
import { setupNavigation } from "./ui/navigation.js";
import { closeModal, showChoiceModal, showFinalModal } from "./ui/modal.js";
import { showNotification } from "./ui/notification.js";
import { loadGame, saveGame } from "./save/save.js";
import { addHistoryLog } from "./history/historyManager.js";
let projects = [];
let employees = [];
let events = [];

async function loadData() {

  const responses = await Promise.all([

    // 社員
    fetch("data/employees/designers.json"),
    fetch("data/employees/managers.json"),
    fetch("data/employees/programmers.json"),

    // 案件
    fetch("data/projects/small.json"),
    fetch("data/projects/medium.json"),
    fetch("data/projects/large.json"),

    // イベント
    fetch("data/events/company.json"),
    fetch("data/events/employees.json"),
    fetch("data/events/projects.json"),
    fetch("data/events/random.json")

  ]);
  
  responses.forEach((response) => {
    if (!response.ok) {
      throw new Error(`データ読み込み失敗: ${response.url}`);
    }
  });
  const data = await Promise.all(
    responses.map((response) => response.json())
  );
  employees = [
    ...data[0],
    ...data[1],
    ...data[2]
  ];
  projects = [
    ...data[3],
    ...data[4],
    ...data[5]
  ];
  events = [
    ...data[6],
    ...data[7],
    ...data[8],
    ...data[9]
  ];
}

function render() {
  const state = getState();
  renderHeader(state);
  renderView(state, projects, employees, events, {
    hire: handleHire,
    accept: handleAccept
  });
}

function handleHire(candidateId) {
  const candidate = employees.find((employee) => employee.id === candidateId);
  if (!candidate) return;
  if (hireEmployee(candidate)) {
    showNotification(`${candidate.name}さんを採用しました。`, "success");
    saveGame();
    render();
  } else {
    showNotification("採用費が不足しています。", "warning");
  }
}

function handleAccept(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  if (acceptProject(project)) {
    showNotification(`「${project.name}」を受注しました。`, "success");
    saveGame();
    render();
  } else {
    showNotification("受注条件を満たしていません。", "warning");
  }
}

function finishGame() {
  const state = getState();
  const rank = getFinalRank(state);
  updateState((current) => ({ ...current, gameOver: true, finalRank: rank }));
  showFinalModal(getState(), rank, restartGame);
}

function getFinalRank(state) {
  const score = (state.funds >= 5000 ? 1 : 0) + (state.employees.length >= 20 ? 1 : 0) + (state.reputation >= 80 ? 1 : 0) + (state.largeProjectsCompleted >= 3 ? 1 : 0);
  if (score === 4) return "S";
  if (score === 3) return "A";
  if (score === 2) return "B";
  if (score === 1) return "C";
  return "D";
}

function advanceGameMonth() {
  const current = getState();
  if (current.gameOver) return;
  const salary = paySalaries(current);
  updateState((state) => ({ ...advanceMonth(state), funds: state.funds - salary }));
  const completed = advanceProjects(projects);
  if (completed.length > 0) {
    completeProjects(completed);
    completed.forEach((project) => showNotification(project.success ? `「${project.name}」が完了し、${project.reward}万円を獲得しました。` : `「${project.name}」は失敗しました。評判が低下しました。`, project.success ? "success" : "warning"));
  }
  growEmployees();
  const next = getState();
  if (shouldTriggerEvent(next)) {
    const event = chooseEvent(events, next);
    if (event) {
      markEventShown(event.id);
      showChoiceModal(event, (choice) => {
        applyEventChoice(choice);
        saveGame();
        render();
      });
    }
  }
  if (hasReachedEnd(next)) finishGame();
  saveGame();
  render();
}

function restartGame() {
  closeModal();
  resetState();
  updateState((state) => ({
    ...state,
    employees: employees.slice(0, 2)
  }));
  const state = getState();
  addHistoryLog(
    state,
    "company",
    "会社設立",
    "Blue Orbit Systemsを設立した"
  );
  render();
}

async function startGame() {
  try {
    await loadData();

    if (!loadGame()) {
      updateState((state) => ({
        ...state,
        employees: employees.slice(0, 2)
      }));
      const state = getState();

      addHistoryLog(
        state,
        "company",
        "会社設立",
        "Blue Orbit Systemsを設立した"
      );
    }

    setupNavigation(render);
    document.querySelector("#next-month-button").addEventListener("click", advanceGameMonth);
    subscribe(render);
    render();
  } catch (error) {
    document.querySelector("#main-content").innerHTML = `<div class="empty-state"><h2>ゲームを起動できませんでした</h2><p>${error.message} ローカルサーバー経由でindex.htmlを開いてください。</p></div>`;
  }
}

startGame();