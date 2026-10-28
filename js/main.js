import { getState, resetState, subscribe, updateState } from "./core/gameState.js";
import { advanceMonth, hasReachedEnd } from "./core/time.js";
import { changeFunds, paySalaries } from "./company/company.js";
import { growEmployees, hireEmployee, offerEmployeeCandidates } from "./company/employee.js";
import { acceptProject, advanceProjects, completeProjects, offerProjects, processMonthlyProjectRewards } from "./project/project.js";
import { applyEventChoice, chooseEvents, markEventShown } from "./event/event.js";
import { renderHeader, renderView, setPaginationPage } from "./ui/dashboard.js";
import { setupNavigation } from "./ui/navigation.js";
import { closeModal, showChoiceModal, showFinalModal } from "./ui/modal.js";
import { showNotification } from "./ui/notification.js";
import { loadGame, saveGame } from "./save/save.js";
import { addHistoryLog } from "./history/historyManager.js";
import {initializeGameLoop,startGameLoop,pauseGameLoop,setGameSpeed,isGameRunning} from "./core/gameLoop.js";
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
    ...data[6].map((event) => ({ ...event, category: "incident" })),
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
    changePage: handlePageChange,
    restart: restartGame,
    openRecruitment: openRecruitment,
    closeRecruitment: closeRecruitment
  });
  const nextMonthButton = document.querySelector("#next-month-button");
  if (nextMonthButton) nextMonthButton.disabled = state.gameOver || state.currentView === "recruitment";
  const pauseButton = document.querySelector("#pause-button");
  if (pauseButton) pauseButton.disabled = state.currentView === "recruitment";
}

function openRecruitment() {
  if (!getState().eventActionUnlocked) return;
  pauseGameLoop();
  updateState((state) => ({
    ...state,
    previousView: state.currentView,
    currentView: "recruitment"
  }));
  const pauseButton = document.querySelector("#pause-button");
  if (pauseButton) pauseButton.textContent = "▶ 再開";
  render();
}

function closeRecruitment() {
  updateState((state) => ({
    ...state,
    currentView: state.previousView || "employees"
  }));
  startGameLoop();
  const pauseButton = document.querySelector("#pause-button");
  if (pauseButton) pauseButton.textContent = "Ⅱ 一時停止";
  render();
  processPendingEvents();
}

function handlePageChange(type, page) {
  setPaginationPage(type, page);
  render();
}

function handleHire(candidateId) {
  if (!getState().eventActionUnlocked) {
    showNotification("イベント対応後のみ採用できます。", "warning");
    return;
  }
  const candidate = employees.find((employee) => employee.id === candidateId);
  if (!candidate) return;
  if (hireEmployee(candidate)) {
    showNotification(`${candidate.name}さんを採用しました。`, "success");
    if (getState().employeeHiresRemaining === 0) {
      updateState((state) => ({ ...state, currentView: "dashboard" }));
      startGameLoop();
      const pauseButton = document.querySelector("#pause-button");
      if (pauseButton) pauseButton.textContent = "Ⅱ 一時停止";
      processPendingEvents();
    }
    saveGame();
    render();
  } else {
    showNotification("採用費が不足しています。", "warning");
  }
}

function handleAccept(projectId) {
  if (!getState().eventActionUnlocked) {
    showNotification("イベント対応後のみ案件を受注できます。", "warning");
    return;
  }
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
  const nextMonth = advanceMonth(current);
  const salaryPerEmployee = current.salaryPerEmployee ?? 24;
  const increasedSalary = nextMonth.month === 12 && current.month !== 12
    ? salaryPerEmployee + 2
    : salaryPerEmployee;
  const salaryState = { ...nextMonth, salaryPerEmployee: increasedSalary };
  const salary = paySalaries(salaryState);
  updateState((state) => ({ ...salaryState, funds: state.funds - salary, eventActionUnlocked: false }));
  const paidProjectRewards = processMonthlyProjectRewards();
  if (paidProjectRewards > 0) {
    showNotification(`案件の成功報酬${paidProjectRewards.toLocaleString()}万円が支給されました。`, "success");
  }
  const completed = advanceProjects(projects);
  if (completed.length > 0) {
    completeProjects(completed);
    completed.forEach((project) => showNotification(project.success ? `「${project.name}」が完了し、${project.reward}万円を獲得しました。` : `「${project.name}」は失敗しました。評判が低下しました。`, project.success ? "success" : "warning"));
  }
  growEmployees();
  const next = getState();
  const triggeredEvents = chooseEvents(events, next);
  if (triggeredEvents.length > 0) {
    updateState((state) => ({
      ...state,
      pendingEventIds: [...(state.pendingEventIds ?? []), ...triggeredEvents.map((event) => event.id)]
    }));
    processPendingEvents();
  }
  if (Math.random() < 0.15 + (next.projectOfferProbabilityBonus ?? 0)) {
    offerProjects(projects, 2);
  }
  if (hasReachedEnd(next)) finishGame();
  saveGame();
  render();
}

function processPendingEvents() {
  const state = getState();
  if (state.gameOver || state.currentView === "recruitment" || document.querySelector(".event-modal")) return;
  const pendingEventIds = state.pendingEventIds ?? [];
  if (pendingEventIds.length === 0) return;
  const eventId = pendingEventIds[0];
  const event = events.find((item) => item.id === eventId);
  if (!event) {
    updateState((current) => ({ ...current, pendingEventIds: (current.pendingEventIds ?? []).slice(1) }));
    processPendingEvents();
    return;
  }
  markEventShown(event.id);
  showChoiceModal(event, (choice) => {
    applyEventChoice(choice);
    updateState((current) => ({
      ...current,
      pendingEventIds: (current.pendingEventIds ?? []).slice(1)
    }));
    closeModal();
    const isBusinessMeeting = choice.effects?.addProjectOffers;
    const meetingSucceeded = !isBusinessMeeting || Math.random() >= 0.1;
    if (isBusinessMeeting && meetingSucceeded) {
      offerProjects(projects, choice.effects.addProjectOffers);
      showNotification("商談に成功しました。新しい案件が提示されました。", "success");
    } else if (isBusinessMeeting) {
      showNotification("商談に失敗しました。今回は案件を受注できませんでした。", "warning");
    }
    if (choice.effects?.hireEmployee) {
      offerEmployeeCandidates(employees);
      openRecruitment();
    } else {
      render();
      processPendingEvents();
    }
    saveGame();
  });
}

function getInitialEmployees() {
  const initialManagers = employees
    .filter((employee) => employee.role === "マネージャー")
    .slice(0, 2);
  if (initialManagers.length < 2) return initialManagers;
  return [
    { ...initialManagers[0], role: "人事部" },
    initialManagers[1]
  ];
}

function restartGame() {
  closeModal();
  resetState();
  updateState((state) => ({
    ...state,
    employees: getInitialEmployees()
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
        employees: getInitialEmployees()
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
    processPendingEvents();
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