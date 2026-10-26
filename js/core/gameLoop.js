let isRunning = true;
let speed = 1;
let progress = 0;
let timer = null;

const MONTH_DURATION = 45000;

let monthCallback = null;
let progressCallback = null;

export function initializeGameLoop(
  onMonthPassed,
  onProgressChanged
) {
  monthCallback = onMonthPassed;
  progressCallback = onProgressChanged;

  if (timer) {
    clearInterval(timer);
  }

  timer = setInterval(updateLoop, 100);
}

function updateLoop() {

  if (!isRunning) return;

  const increment =
    (100 / (MONTH_DURATION / 100))
    * speed;

  progress += increment;

  if (progressCallback) {
    progressCallback(progress);
  }

  if (progress >= 100) {

    progress = 0;

    if (progressCallback) {
      progressCallback(0);
    }

    if (monthCallback) {
      monthCallback();
    }
  }
}

export function pauseGameLoop() {
  isRunning = false;
}

export function startGameLoop() {
  isRunning = true;
}

export function setGameSpeed(value) {
  speed = value;
}

export function getGameSpeed() {
  return speed;
}

export function isGameRunning() {
  return isRunning;
}