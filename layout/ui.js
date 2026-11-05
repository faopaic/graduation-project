// ===== 画面の表示と操作 =====
// game.js の計算結果(S)を、画面に表示する。

const $ = (id) => document.getElementById(id);
const DIFF_LABEL = ['', '低', '中', '高'];
const DIFF_CLASS = ['', 'low', 'mid', 'high'];

let stage = 1;           // 決断画面: 1 = 選ぶ / 2 = 結果と解説
let lastResult = null;
let timer = null;
let screenMode = 'title';  // 'title' | 'end' | null
let resetArmed = false;

// ----- 部品 -----
function avatar(skill, label) {
  return `<svg class="px" viewBox="0 0 8 8" role="img" aria-label="${label}">` +
    '<rect class="skin" x="2" y="0" width="4" height="3"/><rect class="hair" x="2" y="0" width="4" height="1"/>' +
    `<rect class="b-${skill}" x="1" y="3" width="6" height="3"/>` +
    '<rect class="legs" x="2" y="6" width="1" height="2"/><rect class="legs" x="5" y="6" width="1" height="2"/></svg>';
}
const skillTag = (sk, state) => `<span class="stag ${state || ''}" title="${SKILL_HELP[sk]}">${SKILLS[sk]}</span>`;
const pips = (lv, max) => '<span class="pips">' + Array.from({ length: max }, (_, i) => `<span class="${i < lv ? 'on' : ''}"></span>`).join('') + '</span>';
const seg = (cur, max, cells) => {
  const on = Math.floor(clamp(cur / max, 0, 1) * cells + 1e-9);
  return '<div class="seg">' + Array.from({ length: cells }, (_, i) => `<span class="${i < on ? 'on' : ''}"></span>`).join('') + '</div>';
};
const leftText = (job) => { const l = remainDays(job); return l >= 0 ? `残り${l}日` : `${-l}日遅れ`; };
const progressPct = (job) => Math.min(100, Math.floor(job.progress / job.work * 100));

// ----- 画面の切り替え -----
let curPage = 'town';
function showPage(name) {
  curPage = name;
  ['town', 'company', 'jobs', 'staff', 'invest'].forEach((p) => $('page-' + p).classList.toggle('hidden', p !== name));
  document.querySelectorAll('.nav').forEach((b) => b.classList.toggle('active', b.dataset.go === name));
}

function toast(text, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.textContent = text;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// ----- ホーム -----
function renderHome() {
  // お知らせ
  const alerts = [];
  const hint = hintText();
  if (hint) alerts.push(`<div class="hint">${hint}</div>`);
  if (S.money < monthlyCost() * 1.5) alerts.push(`<div class="alert"><span>資金が少なくなっている。このままだと、来月の給料が払えなくなる。</span></div>`);
  S.jobs.filter((j) => j.late).forEach((j) => alerts.push(`<div class="alert"><span>「${j.name}」が納期を過ぎている。早く完成させよう。</span></div>`));
  $('home-alerts').innerHTML = alerts.join('');

  // 社員の席
  const seats = S.employees.map(seatCard);
  for (let i = S.employees.length; i < levelInfo().slots; i++) seats.push('<div class="seat seat-empty" data-go="staff">空席(「社員」で採用できます)</div>');
  $('home-seats').innerHTML = seats.join('');

  // 進行中の案件
  $('home-projects').innerHTML = S.jobs.length ? S.jobs.map(projectCard).join('') :
    '<div class="card muted">まだ案件がありません。「案件」ページから受注しよう。</div>';

  // 右パネル
  $('home-side').innerHTML = levelPanel() + goalPanel() + missionPanel();
}

function seatCard(e) {
  const job = e.job ? jobById(e.job) : null;
  const away = isAbsent(e);
  let status;
  if (away) status = `<div class="small neg" data-away="${e.absentUntil}">欠勤中 あと${e.absentUntil - S.day}日</div>`;
  else if (job) status = `<div class="small">${job.name} / 作業中</div>`;
  else status = '<div class="small muted">待機中(案件を割り振ろう)</div>';
  return `<div class="seat ${away ? 'seat-away' : ''}">${avatar(e.skill, e.name + 'のドット絵')}<div class="seat-info"><strong>${e.name}</strong> <span class="small muted">${skillsLabel(e)} Lv.${e.lv}</span>${status}
    <div class="xpbar"><div data-xpfill="${e.id}" style="width:${xpPct(e)}%"></div></div><div class="small muted" data-grow="${e.id}">${growText(e)}</div></div></div>`;
}

// ----- 街(最初の画面) -----
const SKILL_COLOR = { design: '#6dcfb2', dev: '#ffb59e', test: '#ffe08a', infra: '#9fd6f5', security: '#cbbcf3' };
function walker(e, i) {
  const t = 16 + (i * 7) % 13, w = 70 + (i * 23) % 50, x0 = 8 + (i * 31) % 70;
  const delay = -(((Date.now() / 1000) + i * 5) % (t * 2)).toFixed(2);
  const c = SKILL_COLOR[e.skill];
  const label = `${e.name} ${skillsLabel(e)} Lv.${e.lv}`;
  const tw = [...label].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 4.2 : 2.4), 0) + 8;
  return `<g class="walker" style="--t:${t}s;--w:${w}px;--delay:${delay}s" transform="translate(${x0} 0)"><title>${e.name} ${skillsLabel(e)} Lv.${e.lv}</title><g class="bounce" style="animation-delay:${(i % 4) * 0.2}s">
    <rect x="2" y="77" width="4" height="3" fill="#f8cdbb"/><rect x="2" y="77" width="4" height="1" fill="#2e504a"/>
    <rect x="1" y="80" width="6" height="3" fill="${c}"/><rect x="2" y="83" width="1" height="2" fill="#2e504a"/><rect x="5" y="83" width="1" height="2" fill="#2e504a"/></g>
    <rect x="-2" y="75" width="12" height="11" fill="transparent"/>
    <g class="emp-tip"><rect x="${4 - tw / 2}" y="66" width="${tw}" height="9" fill="#fafffd" stroke="#2e504a" stroke-width=".6"/>
    <text x="4" y="72.6" font-size="4" text-anchor="middle" fill="#2e504a">${label}</text></g></g>`;
}
function townScene() {
  const lv = S.level, n = S.employees.length;
  const rows = [2, 3, 4][lv - 1], cols = 4;
  const bh = 12 + rows * 10.5, bx = 70, bw = 60, by = 72 - bh;
  let wins = '', k = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++, k++) {
    if (r === rows - 1 && (c === 1 || c === 2)) continue;  // ドアの場所
    const lit = k < n + 2;
    wins += `<rect x="${bx + 4 + c * 14}" y="${by + 6 + r * 10.5}" width="9" height="8" fill="#2e504a"/><rect x="${bx + 5 + c * 14}" y="${by + 7 + r * 10.5}" width="7" height="6" fill="${lit ? '#ffe08a' : '#9fd6f5'}"/>`;
  }
  const far = [[0, 44, 22, 28], [24, 52, 16, 20], [150, 46, 22, 26], [174, 40, 26, 32]].map(([x, y, w, h], i) => {
    let ws = '';
    for (let j = 0; j < h / 8 - 1; j++) for (let c = 0; c < w / 6 - 1; c++) if ((j + c + i) % 3) ws += `<rect x="${x + 3 + c * 6}" y="${y + 4 + j * 8}" width="3" height="4" fill="#ffffff" opacity=".7"/>`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${i % 2 ? '#cbbcf3' : '#b9d9f2'}"/>${ws}`;
  }).join('');
  // 増築の予告(Lv.3になると本物の別館が建つ)
  const annex = lv >= 3
    ? `<rect x="${bx + bw + 3}" y="42" width="26" height="30" fill="#2e504a"/><rect x="${bx + bw + 4}" y="43" width="24" height="29" fill="#fff7ea"/><rect x="${bx + bw + 2}" y="40" width="28" height="3" fill="#ffb59e"/>` +
      [0, 1].map((r) => [0, 1].map((c) => `<rect x="${bx + bw + 8 + c * 10}" y="${48 + r * 11}" width="7" height="7" fill="#2e504a"/><rect x="${bx + bw + 9 + c * 10}" y="${49 + r * 11}" width="5" height="5" fill="#ffe08a"/>`).join('')).join('')
    : `<rect x="${bx + bw + 4}" y="44" width="24" height="28" fill="#ffffff" opacity=".35" stroke="#2e504a" stroke-dasharray="1.5 1.5" stroke-width=".6"/><text x="${bx + bw + 16}" y="57" font-size="3.4" text-anchor="middle" fill="#2e504a">Lv.3で</text><text x="${bx + bw + 16}" y="62" font-size="3.4" text-anchor="middle" fill="#2e504a">増築!</text>`;
  const emps = S.employees.filter((e) => !isAbsent(e)).map(walker).join('');
  return `<svg class="town-scene" viewBox="0 0 200 100" role="img" aria-label="会社のある街">
    <rect width="200" height="72" fill="#9fd6f5"/><rect y="40" width="200" height="32" fill="#c3e8f8"/>
    <rect x="150" y="8" width="12" height="12" fill="#fff3b0"/>
    <g fill="#fff"><rect x="20" y="14" width="22" height="5"/><rect x="24" y="11" width="14" height="4"/><rect x="100" y="8" width="26" height="5"/><rect x="106" y="5" width="14" height="4"/></g>
    ${far}
    <rect y="72" width="200" height="28" fill="#8fd9b5"/><rect y="72" width="200" height="1.5" fill="#2e504a"/>
    <rect y="86" width="200" height="9" fill="#d5d5d5"/><g fill="#fff">${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 18 + 4}" y="90" width="9" height="1.2"/>`).join('')}</g>
    ${annex}
    <g class="company" data-go="company"><title>会社の中を見る</title>
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#2e504a"/><rect x="${bx + 1}" y="${by + 1}" width="${bw - 2}" height="${bh - 1}" fill="#fff7ea"/>
      <rect class="roof" x="${bx - 3}" y="${by - 4}" width="${bw + 6}" height="5" fill="#ffb59e" stroke="#2e504a" stroke-width=".8"/>
      <rect x="${bx + 8}" y="${by - 16}" width="${bw - 16}" height="11" fill="#fafffd" stroke="#2e504a" stroke-width=".8"/>
      <text x="${bx + bw / 2}" y="${by - 8}" font-size="5" text-anchor="middle" fill="#2e504a" font-weight="bold">SAMPLE Inc.</text>
      ${wins}
      <rect x="${bx + 24}" y="${72 - 14}" width="12" height="14" fill="#2e504a"/><rect x="${bx + 25}" y="${72 - 13}" width="10" height="13" fill="#6dcfb2"/><rect x="${bx + 33}" y="${72 - 7}" width="1" height="1" fill="#2e504a"/>
    </g>
    <g fill="#3aa37a"><rect x="14" y="62" width="14" height="10"/><rect x="17" y="58" width="8" height="5"/></g><rect x="20" y="72" width="3" height="6" fill="#8a5a3a" transform="translate(0 -6)"/>
    <g fill="#3aa37a"><rect x="176" y="62" width="14" height="10"/><rect x="179" y="58" width="8" height="5"/></g><rect x="182" y="66" width="3" height="6" fill="#8a5a3a"/>
    ${emps}
    <g><rect x="${bx + 4}" y="${by + bh + 2}" width="52" height="0" /></g>
    <text x="${bx + bw / 2}" y="97" font-size="4" text-anchor="middle" fill="#2e504a">▲ 会社をクリックすると、中が見られる</text>
  </svg>`;
}
function renderTown() {
  const alerts = [];
  const hint = hintText();
  if (hint) alerts.push(`<div class="hint">${hint}</div>`);
  if (S.money < monthlyCost() * 1.5) alerts.push(`<div class="alert"><span>資金が少なくなっている。このままだと、来月の給料が払えなくなる。</span></div>`);
  S.jobs.filter((j) => j.late).forEach((j) => alerts.push(`<div class="alert"><span>「${j.name}」が納期を過ぎている。早く完成させよう。</span></div>`));
  S.jobs.filter((j) => !j.late && remainDays(j) <= 7).forEach((j) => alerts.push(`<div class="alert"><span>「${j.name}」の納期まで、あと${remainDays(j)}日。</span></div>`));
  const projects = S.jobs.length ? S.jobs.map((j) => {
    const left = remainDays(j);
    return `<div class="town-job"><div class="row"><strong class="small">${j.name}</strong><span class="small ${left <= 7 ? 'neg' : 'muted'}" data-left="${j.id}">${leftText(j)}</span></div>
      <div class="bar"><div class="fill ${left <= 7 ? 'fill-warn' : ''}" data-bar="${j.id}" style="width:${progressPct(j)}%"></div></div></div>`;
  }).join('') : '<div class="small muted">進行中の案件はない。下の「案件」から受注しよう。</div>';
  $('town-body').innerHTML = townScene() + `
    <div class="town-grid">
      <div>${alerts.join('')}
        <div class="panel"><div class="panel-title">いまの会社</div>
          <div class="goal-row"><span>資金</span><span data-live="money">${yen(S.money)}</span></div>
          <div class="goal-row"><span>評判</span><span data-live="rep">${S.rep} / 100</span></div>
          <div class="goal-row"><span>社員</span><span data-live="staff">${S.employees.length} / ${levelInfo().slots}人</span></div>
          <div class="goal-row"><span>会社Lv</span><span>Lv.${S.level} / Lv.3</span></div>
        </div>
        <div id="town-level">${levelPanel()}</div>
      </div>
      <div class="panel"><div class="panel-title">進行中の案件</div>${projects}
        <div class="town-menu"><button class="btn-small" data-act="auto">おまかせ配置</button></div></div>
    </div>`;
}

function hintText() {
  if (S.counts.accepted === 0) return '最初の一歩: 下の「案件」ページで、最初の案件を受注しよう。まずは難易度が低い案件がおすすめ。';
  if (S.jobs.length === 0) return '案件がない間も、給料は出ていく。「案件」ページで、次の案件を受注しよう。';
  if (S.jobs.some((j) => j.staff.length === 0)) return '担当者がいない案件がある。案件の「担当」で、社員を選んで割り振ろう。';
  if (!S.playing && S.day === 0) return '準備ができたら、上の「▶ 再生」を押して、時間を進めよう。';
  return '';
}

function projectCard(job) {
  const pct = progressPct(job);
  const left = remainDays(job);
  const covered = new Set(job.staff.map(empById).filter(Boolean).flatMap((e) => e.skills));
  const req = job.skills.map((sk) => skillTag(sk, covered.has(sk) ? 'ok' : 'ng')).join('');
  const chips = S.employees.map((e) => {
    const mine = e.job === job.id, busy = e.job && !mine, away = isAbsent(e);
    return `<button class="chip ${mine ? 'on' : ''} ${busy ? 'busy' : ''} ${away ? 'away' : ''}" data-act="assign" data-job="${job.id}" data-emp="${e.id}" title="${skillsLabel(e)} Lv.${e.lv}">${e.name}<span class="small">${skillsLabel(e)}</span></button>`;
  }).join('');
  return `<div class="card proj">
    <div class="row"><strong>${job.name}</strong><span class="small ${left <= 7 ? 'neg' : 'muted'}" data-left="${job.id}">${leftText(job)}</span></div>
    <div class="bar"><div class="fill ${left <= 7 ? 'fill-warn' : ''}" data-bar="${job.id}" style="width:${pct}%"></div></div>
    <div class="small"><span data-pct="${job.id}">進捗 ${pct}%</span> / 報酬 ${yen(job.reward)}</div>
    <div class="req small">必要なスキル(緑=担当がいる / 赤=足りない): ${req}</div>
    <div class="chips">担当: ${chips}</div>
  </div>`;
}

function levelPanel() {
  const next = LEVELS[S.level];
  if (!next) return `<div class="panel"><div class="panel-title">会社Lv.3 に成長した</div><div class="small">席が${levelInfo().slots}つ、案件は同時に${levelInfo().jobs}件まで受けられる。</div></div>`;
  return `<div class="panel"><div class="panel-title">次の会社Lv.${next.lv}まで(席${next.slots}つ、案件${next.jobs}件)</div>
    <div class="goal-row"><span>評判</span><span>${S.rep} / ${next.needRep}</span></div>${seg(S.rep, next.needRep, 10)}
    <div class="goal-row"><span>案件の完了</span><span>${Math.min(S.done, next.needDone)} / ${next.needDone}</span></div>${seg(S.done, next.needDone, next.needDone)}</div>`;
}

function goalPanel() {
  const rows = goalList().map((g) => `<div class="goal-row"><span>${g.met ? '■' : '□'} ${g.label}</span><span>${g.fmt(g.cur)} / ${g.fmt(g.target)}</span></div>${seg(g.cur, g.target, 10)}`).join('');
  return `<div class="panel"><div class="panel-title">目標(5年後の成績で、ランクが決まる)</div>${rows}</div>`;
}

function missionPanel() {
  const m = [
    ['最初の案件を受注する', S.counts.accepted >= 1],
    ['社員を1人採用する', S.counts.hired >= 1],
    ['障害に対応する', S.counts.handled >= 1],
    ['案件を1つ完成させる', S.done >= 1],
    ['会社Lv.2に成長する', S.level >= 2]
  ];
  return `<div class="panel panel-hl"><div class="panel-title">ミッション</div><ul class="mission">${m.map(([t, d]) => `<li class="${d ? 'done' : ''}">${t}</li>`).join('')}</ul></div>`;
}

// ----- 案件 -----
function renderJobs() {
  const info = levelInfo();
  const list = S.offers.map(offerCard).join('') || '<div class="card muted">いまは募集がない。しばらく待とう。</div>';
  $('jobs-body').innerHTML = `<h2>案件を選ぶ <span class="muted small">同時進行 ${S.jobs.length}/${info.jobs}件</span></h2>
    <p class="small muted legend">必要なスキルの色: 緑=いまの社員にいる / 赤=まだいない(採用すると品質が上がる)。スキルが合わない社員は、半分の力で手伝う。</p>${list}`;
}

function offerCard(o) {
  const locked = S.rep < o.minRep;
  const req = o.skills.map((sk) => skillTag(sk, S.employees.some((e) => e.skills.includes(sk)) ? 'ok' : 'ng')).join('');
  const right = locked ? `<span class="small">評判${o.minRep}で解放</span>` : '<button class="act" data-act="accept" data-id="' + o.id + '">受注する</button>';
  return `<div class="card job ${locked ? 'locked' : ''}">
    <div class="row"><div><strong>${o.name}</strong> <span class="badge badge-${DIFF_CLASS[o.diff]}">難易度 ${DIFF_LABEL[o.diff]}</span> <span class="stars">${'★'.repeat(o.diff)}${'☆'.repeat(3 - o.diff)}</span></div>${right}</div>
    <div class="small">報酬 ${yen(o.reward)} / 納期 ${o.days}日 / 仕事量 ${o.work}</div>
    <div class="req small">必要なスキル: ${req}</div>
    <div class="small">リスク: ${o.risk} ・ <span data-expire="${o.expires}">募集あと${o.expires - S.day}日</span></div>
  </div>`;
}

// ----- 社員(採用も、ここ) -----
function renderStaff() {
  const slots = levelInfo().slots;
  const free = slots - S.employees.length;
  const cards = S.candidates.map((c) => `<div class="card job">
    <div class="row"><div class="who">${avatar(c.skill, c.name + 'のドット絵')}<div><strong>${c.name}</strong> <span class="small muted">${SKILLS[c.skill]} Lv.${c.lv}</span><div class="small muted">${SKILL_HELP[c.skill]}</div></div></div>
    <button class="act" data-act="hire" data-id="${c.id}">採用する</button></div>
    <div class="small">月給 ${yen(c.salary)} / 採用すると、月の支出が ${yen(monthlyCost())} → ${yen(monthlyCost() + c.salary)} に増える</div></div>`).join('') || '<div class="card muted">いまは求職者がいない。しばらく待とう。</div>';
  $('staff-body').innerHTML = `<h2>いまの社員 <span class="muted small">${S.employees.length} / 席 ${slots}</span></h2>
    <div class="seats">${S.employees.map(seatCard).join('')}</div>
    <h2 class="gap-top">人材を採用する <span class="muted small">空席 ${free}</span></h2>
    <p class="small muted legend">採用すると、毎月の支出が増える。席がいっぱいのときは、会社Lvを上げると席が増える。求職者は、約2か月ごとに入れ替わる。</p>${cards}`;
}

// ----- 投資 -----
function renderInvest() {
  const cards = Object.keys(INVEST).map((k) => {
    const inv = INVEST[k], lv = S.invest[k], max = inv.costs.length;
    const btn = lv >= max ? '<span class="small">最大</span>' : `<button class="act" data-act="invest" data-key="${k}">強化する ${yen(inv.costs[lv])}</button>`;
    return `<div class="card job"><div class="row"><div><strong>${inv.name}</strong> ${pips(lv, max)}</div>${btn}</div>
      <div class="small">${inv.help}</div><div class="small muted">いまの効果: ${inv.now(lv)}</div></div>`;
  }).join('');
  $('invest-body').innerHTML = `<h2>投資する <span class="muted small">資金 ${yen(S.money)}</span></h2>
    <p class="small muted legend">投資すると、障害が起きにくくなり、起きたときの被害も小さくなる。すぐには儲からないが、長く経営するほど効いてくる。</p>${cards}`;
}

// ----- 時間バーとHUD -----
function renderTrack() {
  $('track-marks').innerHTML = S.marks.map((m) => `<span class="marker marker-${m.kind}" style="left:${(m.day / CONFIG.totalDays * 100).toFixed(2)}%"></span>`).join('');
}

function updateLive() {
  $('h-money').textContent = yen(S.money);
  $('h-money').className = S.money < monthlyCost() * 1.5 ? 'neg' : '';
  $('h-cost').textContent = `(月の支出 ${yen(monthlyCost())})`;
  $('h-rep').textContent = S.rep;
  $('h-staff').textContent = `${S.employees.length}/${levelInfo().slots}人`;
  $('h-level').textContent = `会社Lv.${S.level}`;
  $('h-date').textContent = dateLabel(S.day);
  $('track-fill').style.width = (S.day / CONFIG.totalDays * 100) + '%';
  $('play-btn').textContent = S.playing && !S.pending ? '❚❚ 一時停止' : '▶ 再生';
  $('speed-btn').textContent = CONFIG.speeds[S.speedIdx].label;

  if ($('town-level')) $('town-level').innerHTML = levelPanel();
  const live = { money: yen(S.money), rep: `${S.rep} / 100`, staff: `${S.employees.length} / ${levelInfo().slots}人` };
  Object.keys(live).forEach((k) => document.querySelectorAll(`[data-live="${k}"]`).forEach((el) => { el.textContent = live[k]; }));
  S.jobs.forEach((job) => {
    const pct = progressPct(job), left = remainDays(job);
    document.querySelectorAll(`[data-bar="${job.id}"]`).forEach((bar) => { bar.style.width = pct + '%'; bar.classList.toggle('fill-warn', left <= 7); });
    document.querySelectorAll(`[data-pct="${job.id}"]`).forEach((p) => { p.textContent = `進捗 ${pct}%`; });
    document.querySelectorAll(`[data-left="${job.id}"]`).forEach((l) => { l.textContent = leftText(job); l.className = 'small ' + (left <= 7 ? 'neg' : 'muted'); });
  });
  S.employees.forEach((e) => {
    document.querySelectorAll(`[data-xpfill="${e.id}"]`).forEach((f) => { f.style.width = xpPct(e) + '%'; });
    document.querySelectorAll(`[data-grow="${e.id}"]`).forEach((g) => { g.textContent = growText(e); });
  });
  document.querySelectorAll('[data-expire]').forEach((el) => { el.textContent = `募集あと${Math.max(0, Number(el.dataset.expire) - S.day)}日`; });
  document.querySelectorAll('[data-away]').forEach((el) => { el.textContent = `欠勤中 あと${Math.max(0, Number(el.dataset.away) - S.day)}日`; });
}

function render() {
  renderTown();
  renderHome();
  renderJobs();
  renderStaff();
  renderInvest();
  renderTrack();
  updateLive();
  renderModal();
  S.dirty = false;
}

// ----- 決断画面 -----
function renderModal() {
  const p = S && S.pending;
  $('modal').classList.toggle('hidden', !p || screenMode !== null);
  if (!p || screenMode !== null) return;
  const body = $('modal-body');

  if (stage === 2 && lastResult) {
    body.innerHTML = `<div class="modal-head"><span class="badge badge-low">結果</span></div><h3>${lastResult.title}</h3>
      <div class="result">${lastResult.text}</div>
      ${lastResult.lesson ? `<div class="lesson"><div class="small muted">ひとこと解説</div>${lastResult.lesson}</div>` : ''}
      <button class="choice" data-act="continue"><strong>つづける</strong></button>`;
    return;
  }

  const badgeClass = p.kind === 'report' ? 'low' : p.kind === 'notice' && !p.id ? 'mid' : 'high';
  const head = `<div class="modal-head"><span class="badge badge-${badgeClass}">${p.kind === 'incident' ? 'インシデント発生: ' : ''}${p.badge}</span><span class="small muted">ゲーム一時停止中</span></div><h3>${p.title}</h3>`;
  const text = p.lines ? `<ul class="lines">${p.lines.map((l) => `<li>${l}</li>`).join('')}</ul>` : `<p class="muted">${p.body}</p>`;
  const chips = p.chips ? `<div class="chips">${p.chips.map((c) => `<span class="stag">${c}</span>`).join('')}</div>` : '';
  const choices = p.choices.map((c, i) => `<button class="choice ${c.tag === 'hide' ? 'is-hide' : ''}" data-act="choice" data-i="${i}"><strong>${c.label}</strong>${c.desc ? `<span class="small ${c.tag === 'hide' ? 'neg' : 'muted'}">${c.desc}</span>` : ''}</button>`).join('');
  body.innerHTML = head + chips + text + choices;
}

function onChoice(i) {
  const res = resolve(i);
  if (!res) return;
  if (S.over) { render(); afterTick(); return; }
  if (res.text || res.lesson) { lastResult = res; stage = 2; renderModal(); updateLive(); render(); return; }
  nextPending();
}

function nextPending() {
  stage = 1; lastResult = null;
  advance();
  render();
  loop();
}

// ----- 開始画面と終了画面 -----
function showTitle() {
  screenMode = 'title';
  const g = CONFIG.goals;
  $('screen-body').innerHTML = `<h1 class="big-title">IT会社経営シミュレーター(仮)</h1>
    <p>あなたは、できたばかりのIT会社の社長。5年のあいだに、会社を大きく育てよう。</p>
    <div class="panel"><div class="panel-title">目標(5年後の成績で、ランクが決まる)</div>
      <div class="goal-row"><span>資金</span><span>${yen(g.money)}</span></div>
      <div class="goal-row"><span>評判</span><span>${g.rep}</span></div>
      <div class="goal-row"><span>従業員</span><span>${g.staff}人</span></div>
      <div class="goal-row"><span>大規模案件(難易度 高)の成功</span><span>${g.big}件</span></div>
      <p class="small muted gap-top">目標を4つすべて達成するとランクA、2〜3つでB、0〜1つでC。</p></div>
    <ol class="steps"><li>「案件」で仕事を受注する</li><li>社員を割り振って、「再生」で時間を進める</li><li>起きた障害に、どう対応するか決める</li><li>お金がたまったら、「社員」での採用と「投資」で会社を強くする</li></ol>
    <p class="small muted">社員は、案件で働くほど成長する。レベルが上がって昇進したり、手伝った仕事のスキルを覚えたりする(月給も上がる)。</p>
    <p class="small muted">5年間たっぷり経営して、最後にランクが出る。資金が0を下回ると、その場でゲームオーバー。</p>
    <button class="btn-main" data-act="start">ゲームスタート</button>`;
  $('screen').classList.remove('hidden');
  $('modal').classList.add('hidden');
}

function showEnd() {
  screenMode = 'end';
  const o = S.over;
  const goals = goalList();
  const g = CONFIG.goals;
  const t = S.tally;

  let title, lead, rankHtml = '';
  if (o.type === 'bankrupt') {
    title = 'ゲームオーバー';
    lead = `${dateLabel(o.day)}、資金が尽きて、会社を続けられなくなった。`;
  } else {
    title = '5年が経った';
    lead = { A: '目標をすべて達成した。会社は大きく成長した。', B: '目標のいくつかを達成した。あと一歩で、さらに大きくできる。', C: '5年が経った。目標の達成は、これからだ。' }[o.rank];
    rankHtml = `<div class="rank rank-${o.rank}"><b>${o.rank}</b><div><div class="small muted">ランク</div><div>${lead}</div></div></div>`;
  }

  let style;
  if (t.incidents === 0) style = 'まだ障害を経験していない。';
  else if (t.hide === 0) style = `障害に${t.incidents}回対応して、一度も隠さなかった。誠実な社長。`;
  else if (t.hide >= t.honest) style = `障害${t.incidents}回のうち、${t.hide}回は隠す選択をした。実際の会社では、信頼を失う原因になる。`;
  else style = `障害${t.incidents}回のうち、${t.hide}回は隠す選択をした。隠した障害は、あとで見つかることが多い。`;

  const mark = (k) => (goals.find((x) => x.key === k).met ? '■' : '□');
  $('screen-body').innerHTML = `<div class="modal-head"><span class="badge badge-${o.type === 'bankrupt' ? 'high' : 'low'}">結果</span><span class="small muted">${dateLabel(o.day)}</span></div>
    <h1 class="big-title">${title}</h1>
    ${rankHtml}
    ${o.type === 'bankrupt' ? `<p>${lead}</p>` : ''}
    <table class="stats">
      <tr class="${mark('money') === '■' ? 'met' : ''}"><td>${mark('money')} 資金</td><td>${yen(S.money)} / ${yen(g.money)}</td></tr>
      <tr class="${mark('rep') === '■' ? 'met' : ''}"><td>${mark('rep')} 評判</td><td>${S.rep} / ${g.rep}</td></tr>
      <tr class="${mark('staff') === '■' ? 'met' : ''}"><td>${mark('staff')} 従業員数</td><td>${S.employees.length}人 / ${g.staff}人</td></tr>
      <tr><td>　 完成させた案件数</td><td>${S.done}件</td></tr>
      <tr class="${mark('big') === '■' ? 'met' : ''}"><td>${mark('big')} 大規模案件の成功数</td><td>${S.big}件 / ${g.big}件</td></tr>
      <tr><td>　 会社Lv(上限あり)</td><td>Lv.${S.level} / Lv.${LEVELS.length}</td></tr>
      <tr><td>　 社員の成長</td><td>昇進 ${S.stats.promos}回 / 新スキル ${S.stats.learned}個</td></tr>
    </table>
    <p class="small muted">■は、目標を達成した項目。4つ達成でA、2〜3つでB、0〜1つでC。</p>
    <div class="lesson"><div class="small muted">あなたの判断</div>${style}(障害に対応した回数: ${t.incidents}回、隠した回数: ${t.hide}回)</div>
    <button class="btn-main" data-act="restart">もう一度あそぶ</button>`;
  $('screen').classList.remove('hidden');
  $('modal').classList.add('hidden');
}

function startGame() {
  screenMode = null;
  $('screen').classList.add('hidden');
  stage = 1; lastResult = null;
  render();
}

function restart() {
  clearTimeout(timer);
  newGame();
  showPage('town');
  render();
  showTitle();
}

// ----- 時間を進める -----
function loop() {
  clearTimeout(timer);
  if (!S.playing || S.pending || S.over || screenMode !== null) return;
  timer = setTimeout(() => { tick(); afterTick(); loop(); }, CONFIG.speeds[S.speedIdx].ms);
}

function afterTick() {
  S.notices.splice(0).forEach((n) => toast(n.text, n.kind));
  if (S.over) { S.playing = false; render(); showEnd(); return; }
  if (S.dirty) render(); else updateLive();
}

// ----- 操作 -----
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act],[data-go]');
  if (!el || !S) return;
  if (el.dataset.go) {
    // 下のボタンを、いま開いているページでもう一度押すと、街にもどる
    const go = el.dataset.go;
    showPage(el.classList.contains('nav') && go === curPage ? 'town' : go);
    return;
  }
  const a = el.dataset.act;
  const done = (r) => { if (r) toast(r.msg, r.ok ? 'good' : 'bad'); render(); };

  if (a === 'start') { startGame(); return; }
  if (a === 'restart') { restart(); return; }
  if (a === 'reset') {
    // 押し間違いを防ぐため、3秒以内にもう一度押したときだけ、最初からにする
    if (resetArmed) { resetArmed = false; el.textContent = '最初から'; restart(); return; }
    resetArmed = true; el.textContent = '本当に?';
    setTimeout(() => { resetArmed = false; el.textContent = '最初から'; }, 3000);
    return;
  }
  if (screenMode !== null) return;

  if (a === 'play') { S.playing = !S.playing; updateLive(); loop(); }
  else if (a === 'speed') { S.speedIdx = (S.speedIdx + 1) % CONFIG.speeds.length; updateLive(); loop(); }
  else if (a === 'auto') { autoAssignAll(); toast(S.jobs.length ? '全員を配置し直した。進行中のすべての案件に人を入れた' : '進行中の案件がない', 'good'); render(); }
  else if (a === 'assign') { toggleAssign(Number(el.dataset.job), Number(el.dataset.emp)); render(); }
  else if (a === 'accept') { const r = acceptOffer(Number(el.dataset.id)); done(r); if (r.ok) showPage('town'); }
  else if (a === 'hire') { done(hire(Number(el.dataset.id))); }
  else if (a === 'invest') { done(buyInvest(el.dataset.key)); }
  else if (a === 'choice') { onChoice(Number(el.dataset.i)); }
  else if (a === 'continue') { nextPending(); }
});

// ----- 起動 -----
newGame();
render();
showTitle();
