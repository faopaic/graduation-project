import { getState, resetState, subscribe, updateState } from "./core/gameState.js";
import { advanceMonth, hasReachedEnd } from "./core/time.js";
import { changeFunds, paySalaries } from "./company/company.js";
import { growEmployees, hireEmployee } from "./company/employee.js";
import { acceptProject, advanceProjects, completeProjects } from "./project/project.js";
import { applyEventChoice, chooseEvent, markEventShown, shouldTriggerEvent } from "./event/event.js";
import { renderHeader, renderView, setPaginationPage } from "./ui/dashboard.js";
import { setupNavigation } from "./ui/navigation.js";
import { closeModal, showChoiceModal, showFinalModal } from "./ui/modal.js";
import { showNotification } from "./ui/notification.js";
import { clearSavedGame, loadGame, saveGame } from "./save/save.js";
import { addHistoryLog } from "./history/historyManager.js";
import {initializeGameLoop,startGameLoop,pauseGameLoop,setGameSpeed,isGameRunning} from "./core/gameLoop.js";
import { updateLatestGrowthCell }from "./core/companyMap.js";
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
    ...data[6].map((event) => ({ ...event, category: "company" })),
    ...data[7].map((event) => ({ ...event, category: "employees" })),
    ...data[8].map((event) => ({ ...event, category: "projects" })),
    ...data[9].map((event) => ({ ...event, category: "random" }))
  ];
}

function render() {
  const state = getState();
  renderHeader(state);
  renderView(state, projects, employees, events, {
    hire: handleHire,
    accept: handleAccept,
    changePage: handlePageChange
  });
}

function handlePageChange(type, page) {
  setPaginationPage(type, page);
  render();
}

function handleHire(candidateId) {
  const candidate = employees.find((employee) => employee.id === candidateId);
  if (!candidate) return;
  if (hireEmployee(candidate)) {
    showNotification(`${candidate.name}さんを採用しました。`, "success");
    updateState((state) => ({
      ...state,
      growthMap:
        updateLatestGrowthCell(
          state,
          "E",
          `社員採用: ${candidate.name}`
        )
    }));
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
    completed.forEach((project) => {
      if (!project.success) return;
      updateState((state) => ({
        ...state,
        growthMap:
          updateLatestGrowthCell(
            state,
            "P",
            `案件成功: ${project.name}`
          )
      }));
    });
    completed.forEach((project) => showNotification(project.success ? `「${project.name}」が完了し、${project.reward}万円を獲得しました。` : `「${project.name}」は失敗しました。評判が低下しました。`, project.success ? "success" : "warning"));
  }
  growEmployees();
  const next = getState();
  if (shouldTriggerEvent(next)) {
    const event = chooseEvent(events, next);
    if (event) {
      markEventShown(event.id);
      showChoiceModal(event, (choice) => {
        applyEventChoice(choice, employees, projects);
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
  clearSavedGame();
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
  saveGame();
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

      updateState((state) => ({
        ...state,
        growthMap: [
          {
            year: state.year,
            month: state.month,
            calendarYear:
              state.calendarYear,
            reputation:
              state.reputation,
            technology:
              state.technology,
            morale:
              state.morale,
            funds:
              state.funds,
            completedProjects: 0,
            activeProjects: 0,
            symbol: "S",
            event:
              "会社設立"
          }
        ]
      }));
    }

    setupNavigation(render);
    
    initializeGameLoop(advanceGameMonth,updateTimeProgress);
    startGameLoop();
    document
      .querySelector("#speed-1")
      .addEventListener("click", () => {
        setGameSpeed(1);
        setActiveSpeedButton("#speed-1");
        console.log("1x");
    });
    document
      .querySelector("#speed-2")
      .addEventListener("click", () => {
        setGameSpeed(2);
        setActiveSpeedButton("#speed-2");
        console.log("2x");
    });
    document
      .querySelector("#speed-4")
      .addEventListener("click", () => {
        setGameSpeed(4);
        setActiveSpeedButton("#speed-4");
        console.log("4x");
    });
    document
      .querySelector("#speed-8")
      .addEventListener("click", () => {
        setGameSpeed(8);
        setActiveSpeedButton("#speed-8");
        console.log("8x");
    });
    document
      .querySelector("#speed-16")
      .addEventListener("click", () => {
        setGameSpeed(16);
        setActiveSpeedButton("#speed-16");
        console.log("16x");
    });    
    document
      .querySelector("#pause-button")
      .addEventListener("click", (event) => {
        console.log(
          "running=",
          isGameRunning()
        );
        if (isGameRunning()) {
          pauseGameLoop();
          event.target.textContent =
            "▶ 再開";
        } else {
          startGameLoop();
          event.target.textContent =
            "Ⅱ 一時停止";
        }
    });
    document.querySelector("#next-month-button").addEventListener("click", advanceGameMonth);
    subscribe(render);
    render();
    const state = getState();
    if (state.gameOver) {
      showFinalModal(state, state.finalRank ?? getFinalRank(state), restartGame);
    }
  } catch (error) {
    document.querySelector("#main-content").innerHTML = `<div class="empty-state"><h2>ゲームを起動できませんでした</h2><p>${error.message} ローカルサーバー経由でindex.htmlを開いてください。</p></div>`;
  }
}
function setActiveSpeedButton(id) {
  document
    .querySelectorAll(".speed-button")
    .forEach((button) => {
      button.classList.remove("active");
    });
  document
    .querySelector(id)
    .classList.add("active");
}
function updateTimeProgress(value) {
  const badge =
    document.querySelector("#current-date");
  if (!badge) return;
  badge.style.setProperty(
    "--progress-width",
    `${Math.min(value,100)}%`
  );
}
startGame();