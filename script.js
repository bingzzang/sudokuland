// ===== 상태 =====
// 보드는 길이 81짜리 배열. 0은 빈 칸. 인덱스 = 행 * 9 + 열
let solution = [];  // 정답
let board = [];     // 현재 보드
let given = [];     // 처음부터 주어진 칸인지 (true/false)
let selected = -1;  // 선택된 칸 (없으면 -1)
let hinted = [];    // 힌트로 채워진 칸인지 (true/false)
let hintsLeft = 0;  // 남은 힌트 수
const MAX_HINTS = 3;
let notes = [];        // 칸별 메모 (각 칸이 Set). 예: notes[0] = Set {1, 5}
let notesMode = false; // 메모 모드 on/off
let level = "medium";  // 현재 게임 난이도

// ===== 정원 (별로 나무 키우기) =====
const TREE_STAGES = [
  { name: "새싹" },
  { name: "작은 나무" },
  { name: "큰 나무" },
  { name: "풍성한 나무" },
  { name: "사과나무" },
];
const MAX_STAGE = TREE_STAGES.length - 1;
const WATER_COST = 3; // 한 단계 키우는 데 드는 별

// 단계별 나무 그림 (SVG). size를 주면 가로세로 px, 없으면 CSS가 정한다
function treeSVG(stage, size) {
  const TRUNK = "#8d5a2b";
  const DARK = "#2e8b3d";
  const MID = "#3fae4f";
  const LIGHT = "#68cf74";
  const circle = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  const trunk = (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${TRUNK}"/>`;

  let body = '<ellipse cx="50" cy="91" rx="24" ry="5" fill="rgba(0,0,0,0.14)"/>';

  if (stage === 0) {
    // 새싹: 줄기 하나에 잎 두 장
    body +=
      '<ellipse cx="50" cy="90" rx="18" ry="5" fill="#7a5230"/>' +
      '<path d="M50 90 C50 82 50 74 50 66" stroke="#3f9b49" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="38" cy="64" rx="13" ry="7" fill="#5cc86a" transform="rotate(-30 38 64)"/>' +
      '<ellipse cx="62" cy="62" rx="13" ry="7" fill="#4caf50" transform="rotate(30 62 62)"/>';
  } else if (stage === 1) {
    // 작은 나무: 가는 줄기에 작은 잎 뭉치
    body += trunk(46, 60, 8, 30) + circle(50, 50, 18, MID) + circle(44, 45, 9, LIGHT);
  } else if (stage === 2) {
    // 큰 나무: 굵은 줄기에 넉넉한 잎
    body +=
      trunk(43, 48, 14, 42) +
      circle(32, 50, 16, DARK) + circle(68, 50, 16, DARK) +
      circle(50, 36, 24, MID) + circle(42, 30, 10, LIGHT);
  } else {
    // 풍성한 나무(3) / 사과나무(4): 잎이 가득하고, 4단계에는 사과가 열린다
    body +=
      trunk(41, 52, 18, 38) +
      circle(26, 46, 18, DARK) + circle(74, 46, 18, DARK) + circle(50, 52, 20, DARK) +
      circle(50, 28, 24, MID) + circle(30, 36, 20, MID) + circle(70, 36, 20, MID) + circle(50, 44, 22, MID) +
      circle(40, 24, 9, LIGHT) + circle(62, 32, 8, LIGHT) + circle(30, 40, 7, LIGHT);

    if (stage === MAX_STAGE) {
      [[34, 38], [52, 22], [68, 40], [42, 54], [60, 52], [24, 52], [76, 54]].forEach(([x, y]) => {
        body += circle(x, y, 5, "#e53935") + circle(x - 1.6, y - 1.6, 1.6, "#ff8a80");
      });
    }
  }

  const dim = size ? ` width="${size}" height="${size}"` : "";
  return `<svg viewBox="0 0 100 100"${dim} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}
const GARDEN_KEY = "sudoku-garden";

// stage: 지금 키우는 나무 단계, planted: 심은 나무들, decor: 상점에서 산 장식 id들,
// positions: 직접 옮긴 위치 (예: { d0: {x, y}, t1: {x, y} }), scales: 직접 바꾼 크기 배율 (예: { d0: 1.4 })
let garden = { stage: 0, planted: [], decor: [], positions: {}, scales: {} };
let resumeOnClose = false;              // 정원을 닫을 때 타이머를 이어갈지

const gardenEl = document.getElementById("garden");
const treeEl = document.getElementById("tree");
const treeNameEl = document.getElementById("tree-name");
const treeDotsEl = document.getElementById("tree-dots");
const treeActionBtn = document.getElementById("tree-action");
const gardenMsgEl = document.getElementById("garden-msg");
const plantedEl = document.getElementById("planted");
const plantedTitleEl = document.getElementById("planted-title");
const tabGrowEl = document.getElementById("tab-grow");
const tabStatusEl = document.getElementById("tab-status");
const sceneEl = document.getElementById("scene");
const sceneInfoEl = document.getElementById("scene-info");
const tabSceneEl = document.getElementById("tab-scene");
const tabSceneBtn = document.getElementById("tab-scene-btn");
const tabShopEl = document.getElementById("tab-shop");
const tabShopBtn = document.getElementById("tab-shop-btn");
const tabGrowBtn = document.getElementById("tab-grow-btn");
const tabStatusBtn = document.getElementById("tab-status-btn");
const statusBodyEl = document.getElementById("status-body");

function loadGarden() {
  try {
    const saved = JSON.parse(localStorage.getItem(GARDEN_KEY));
    if (saved && Number.isInteger(saved.stage) && Array.isArray(saved.planted)) {
      // 상점 기능 이전에 저장된 데이터에는 decor가 없으므로 빈 배열로 채운다
      return {
        ...saved,
        decor: Array.isArray(saved.decor) ? saved.decor : [],
        positions: saved.positions && typeof saved.positions === "object" ? saved.positions : {},
        scales: saved.scales && typeof saved.scales === "object" ? saved.scales : {},
      };
    }
  } catch {
    // 저장소를 못 쓰거나 값이 깨졌으면 새로 시작
  }
  return { stage: 0, planted: [], decor: [], positions: {}, scales: {} };
}

function saveGarden() {
  try {
    localStorage.setItem(GARDEN_KEY, JSON.stringify(garden));
  } catch {
    // 저장 실패는 무시
  }
}

function renderGarden(grew = false) {
  const stage = TREE_STAGES[garden.stage];
  treeEl.innerHTML = treeSVG(garden.stage);
  treeNameEl.textContent = stage.name;

  if (grew) {
    treeEl.classList.remove("grow");
    void treeEl.offsetWidth; // 애니메이션 재시작
    treeEl.classList.add("grow");
  }

  treeDotsEl.innerHTML = "";
  for (let i = 0; i <= MAX_STAGE; i++) {
    const dot = document.createElement("span");
    if (i <= garden.stage) dot.className = "on";
    treeDotsEl.appendChild(dot);
  }

  if (garden.stage === MAX_STAGE) {
    treeActionBtn.textContent = "🌳 정원에 심기";
    treeActionBtn.disabled = false;
  } else {
    treeActionBtn.textContent = `💧 물 주기 (⭐${WATER_COST})`;
    treeActionBtn.disabled = totalStars < WATER_COST;
  }

  // 심은 나무와 산 장식을 한 정원에 함께 보여준다
  plantedTitleEl.textContent =
    `내 정원 · 나무 ${garden.planted.length}그루 · 장식 ${garden.decor.length}개`;
  plantedEl.innerHTML = "";
  const decorEmojis = garden.decor.map((id) => SHOP_ITEMS.find((it) => it.id === id)?.emoji);
  // 심은 나무는 모두 다 자란 사과나무 그림으로, 장식은 이모지로 보여준다
  const all = [
    ...garden.planted.map(() => treeSVG(MAX_STAGE)),
    ...decorEmojis.filter(Boolean),
  ];
  if (all.length === 0) {
    plantedEl.innerHTML = '<span class="empty">아직 정원이 비어 있어요</span>';
  } else {
    all.forEach((html) => {
      const span = document.createElement("span");
      span.innerHTML = html;
      plantedEl.appendChild(span);
    });
  }
}

// ===== 정원 풍경 =====
// 같은 시드면 항상 같은 난수가 나오는 간단한 생성기 (새로 열어도 배치가 안 바뀌게)
function seededRandom(seed) {
  let a = seed * 2654435761 + 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 이미 놓인 것들과 너무 가깝지 않은 자리를 고른다 (x, y는 % 단위)
function pickSpot(index, sky, placed) {
  const rand = seededRandom(index + 1);
  let best = null;
  let bestDist = -1;
  for (let attempt = 0; attempt < 25; attempt++) {
    const x = 8 + rand() * 84;
    const y = sky ? 10 + rand() * 26 : 54 + rand() * 38; // 하늘 / 잔디 영역
    const nearest = placed.reduce(
      (min, p) => Math.min(min, Math.hypot(x - p.x, (y - p.y) * 1.4)),
      Infinity
    );
    if (nearest > bestDist) {
      bestDist = nearest;
      best = { x, y };
    }
    if (nearest > 14) break; // 충분히 떨어져 있으면 바로 사용
  }
  return best;
}

// 크기 배율 범위 (마우스 휠 / 두 손가락으로 조절)
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const clampScale = (v) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

// 크기: 아래쪽(가까운 쪽)일수록 크게 + 직접 정한 배율. 하늘 장식은 기본 크기가 고정
function sceneSize(entry, y, scale = entry.scale ?? 1) {
  let size;
  if (entry.sky) size = entry.big ? 52 : 24;
  else {
    size = Math.max(16, 22 + (y - 50) * 0.5);
    if (entry.tree) size *= 1.6;
  }
  return size * scale;
}

function renderScene() {
  sceneEl.innerHTML = "";

  // 지금 키우는 나무는 정원 가운데 앞쪽에 크게 (옮길 수 없음)
  const placed = [{ x: 50, y: 78 }];
  const things = [{ svgStage: garden.stage, x: 50, y: 78, size: 60, label: true }];

  // 심은 나무와 산 장식. key는 옮긴 위치를 저장할 때 쓰는 이름
  const entries = [
    ...garden.planted.map((emoji, i) => ({ emoji, tree: true, key: `t${i}` })),
    ...garden.decor.map((id, i) => {
      const item = SHOP_ITEMS.find((it) => it.id === id);
      return item
        ? { emoji: item.emoji, sky: !!item.sky, big: id === "rainbow", key: `d${i}` }
        : null;
    }),
  ].filter(Boolean);

  entries.forEach((entry, i) => {
    // 자동 배치는 옮긴 위치와 상관없이 계산해서, 하나를 옮겨도 다른 것들이 움직이지 않는다
    const auto = pickSpot(i, entry.sky, placed);
    placed.push(auto);
    const spot = garden.positions[entry.key] || auto;
    const scale = garden.scales[entry.key] ?? 1;
    things.push({ ...entry, scale, x: spot.x, y: spot.y, size: sceneSize(entry, spot.y, scale) });
  });

  things.forEach((t) => {
    const el = document.createElement("div");
    el.className = "scene-item";
    const svgStage = t.svgStage ?? (t.tree ? MAX_STAGE : null);
    if (svgStage !== null) el.innerHTML = treeSVG(svgStage, t.size * 1.3);
    else el.textContent = t.emoji;
    el.style.left = `${t.x}%`;
    el.style.top = `${t.y}%`;
    el.style.fontSize = `${t.size}px`;
    el.style.zIndex = Math.round(t.y * 10); // 아래쪽 것이 앞에 오게
    sceneEl.appendChild(el);

    if (t.key) {
      el.classList.add("movable");
      el._thing = t; // 끌기/크기 조절 처리에서 어떤 항목인지 알아내는 용도
    }

    if (t.label) {
      const label = document.createElement("div");
      label.className = "scene-label";
      label.textContent = `키우는 중 · ${TREE_STAGES[garden.stage].name}`;
      label.style.left = `${t.x}%`;
      label.style.top = `${t.y + 8}%`;
      label.style.zIndex = 2000;
      sceneEl.appendChild(label);
    }
  });

  sceneInfoEl.textContent =
    garden.decor.length + garden.planted.length === 0
      ? "상점에서 장식을 사고 나무를 심어 정원을 꾸며 보세요!"
      : `나무 ${garden.planted.length}그루 · 장식 ${garden.decor.length}개 · 끌어서 옮기고, 마우스 휠이나 두 손가락으로 크기를 바꿀 수 있어요`;
}

// 항목의 위치/크기를 화면에 바로 반영 (저장은 따로)
function applySceneThing(el, thing, x, y, scale) {
  el.style.left = `${x}%`;
  el.style.top = `${y}%`;
  const size = sceneSize(thing, y, scale);
  el.style.fontSize = `${size}px`;
  const svg = el.querySelector("svg"); // 나무 그림은 크기도 같이 바꾼다
  if (svg) {
    svg.setAttribute("width", size * 1.3);
    svg.setAttribute("height", size * 1.3);
  }
}

// 정원 풍경 조작: 끌어서 옮기기, 마우스 휠 / 두 손가락 벌리기로 크기 조절
function initSceneInteractions() {
  const pointers = new Map(); // 화면에 닿아 있는 손가락/마우스 (id -> 좌표)
  let active = null;          // 지금 조작 중인 항목 {el, thing, pointerId, x, y, scale, changed, pinched}
  let pinch = null;           // 두 손가락 조절 중이면 {startDist, startScale}

  const pinchDistance = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  sceneEl.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (!active) {
      // 첫 손가락: 항목 위라면 끌기 시작
      const el = e.target.closest(".scene-item.movable");
      if (!el) return;
      const t = el._thing;
      active = { el, thing: t, pointerId: e.pointerId, x: t.x, y: t.y, scale: t.scale, changed: false, pinched: false };
      sceneEl.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
      el.style.zIndex = 3000; // 조작하는 동안은 맨 앞
      e.preventDefault();
    } else if (pointers.size === 2 && !pinch) {
      // 두 번째 손가락: 위치는 어디든 상관없이 선택된 항목의 크기를 조절
      pinch = { startDist: pinchDistance() || 1, startScale: active.scale };
      active.pinched = true;
    }
  });

  sceneEl.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!active) return;

    if (pinch && pointers.size >= 2) {
      active.scale = clampScale((pinch.startScale * pinchDistance()) / pinch.startDist);
      active.changed = true;
      applySceneThing(active.el, active.thing, active.x, active.y, active.scale);
    } else if (!active.pinched && e.pointerId === active.pointerId) {
      const rect = sceneEl.getBoundingClientRect();
      const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      active.x = clamp(((e.clientX - rect.left) / rect.width) * 100, 4, 96);
      active.y = clamp(((e.clientY - rect.top) / rect.height) * 100, 6, 94);
      active.changed = true;
      applySceneThing(active.el, active.thing, active.x, active.y, active.scale);
    }
  });

  const release = (e) => {
    pointers.delete(e.pointerId);
    if (pinch && pointers.size < 2) pinch = null;
    if (!active || pointers.size > 0) return;

    // 모든 손가락을 뗐을 때 저장하고, 앞뒤 순서를 다시 계산
    if (active.changed) {
      const key = active.thing.key;
      garden.positions[key] = { x: active.x, y: active.y };
      garden.scales[key] = active.scale;
      saveGarden();
    }
    active = null;
    renderScene();
  };
  sceneEl.addEventListener("pointerup", release);
  sceneEl.addEventListener("pointercancel", release);

  // 마우스 휠: 항목 위에서 굴리면 크기 조절 (페이지는 스크롤되지 않게 막는다)
  let saveTimer = null;
  sceneEl.addEventListener(
    "wheel",
    (e) => {
      const el = e.target.closest(".scene-item.movable");
      if (!el || active) return;
      e.preventDefault();

      const t = el._thing;
      t.scale = clampScale(t.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
      applySceneThing(el, t, t.x, t.y, t.scale);

      garden.scales[t.key] = t.scale;
      clearTimeout(saveTimer); // 휠을 굴리는 동안은 잠깐 모아서 한 번만 저장
      saveTimer = setTimeout(saveGarden, 300);
    },
    { passive: false }
  );
}

// ===== 상점 (별로 정원 장식 사기) =====
const SHOP_ITEMS = [
  { id: "tulip", emoji: "🌷", name: "튤립", price: 2 },
  { id: "sunflower", emoji: "🌻", name: "해바라기", price: 2 },
  { id: "mushroom", emoji: "🍄", name: "버섯", price: 3 },
  { id: "rock", emoji: "🪨", name: "바위", price: 3 },
  { id: "bee", sky: true, emoji: "🐝", name: "꿀벌", price: 4 },
  { id: "butterfly", sky: true, emoji: "🦋", name: "나비", price: 4 },
  { id: "bench", emoji: "🪑", name: "벤치", price: 5 },
  { id: "lantern", emoji: "🏮", name: "등불", price: 5 },
  { id: "birdhouse", emoji: "🏠", name: "새집", price: 6 },
  { id: "fountain", emoji: "⛲", name: "분수", price: 8 },
  { id: "rabbit", emoji: "🐇", name: "토끼", price: 10 },
  { id: "rainbow", sky: true, emoji: "🌈", name: "무지개", price: 12 },
];
const MAX_DECOR = 30; // 정원이 너무 길어지지 않게 하는 상한

const shopStarsEl = document.getElementById("shop-stars");
const shopListEl = document.getElementById("shop-list");
const shopMsgEl = document.getElementById("shop-msg");

function renderShop() {
  shopStarsEl.textContent = `보유 별 ⭐ ${totalStars} · 장식 ${garden.decor.length}/${MAX_DECOR}`;
  shopListEl.innerHTML = "";

  SHOP_ITEMS.forEach((item) => {
    const owned = garden.decor.filter((id) => id === item.id).length;

    const card = document.createElement("div");
    card.className = "shop-item";
    card.innerHTML =
      `<div class="emoji">${item.emoji}</div>` +
      `<div class="name">${item.name}</div>` +
      `<div class="owned">${owned ? `보유 ${owned}개` : ""}</div>`;

    const btn = document.createElement("button");
    btn.textContent = `⭐ ${item.price} 구매`;
    btn.disabled = totalStars < item.price || garden.decor.length >= MAX_DECOR;
    btn.addEventListener("click", () => buyItem(item.id));
    card.appendChild(btn);

    shopListEl.appendChild(card);
  });
}

function buyItem(id) {
  const item = SHOP_ITEMS.find((it) => it.id === id);
  if (!item) return;

  if (garden.decor.length >= MAX_DECOR) {
    shopMsgEl.textContent = "정원이 가득 찼어요!";
    return;
  }
  if (totalStars < item.price) {
    shopMsgEl.textContent = "별이 부족해요. 스도쿠를 풀어서 모아 보세요!";
    return;
  }

  totalStars -= item.price;
  saveStars(totalStars);
  showStars();
  garden.decor.push(id);
  saveGarden();
  shopMsgEl.textContent = `${item.emoji} ${item.name}을(를) 정원에 놓았어요!`;
  renderShop();
}

function treeAction() {
  if (garden.stage === MAX_STAGE) {
    // 다 자란 나무를 정원에 심고 새 새싹을 시작
    garden.planted.push("apple"); // 값은 의미 없고 개수만 센다 (그림은 모두 사과나무)
    garden.stage = 0;
    gardenMsgEl.textContent = "정원에 나무를 심었어요! 새 새싹이 돋아났어요 🌱";
    saveGarden();
    renderGarden(true);
    return;
  }

  if (totalStars < WATER_COST) {
    gardenMsgEl.textContent = "별이 부족해요. 스도쿠를 풀어서 모아 보세요!";
    return;
  }

  totalStars -= WATER_COST;
  saveStars(totalStars);
  showStars();
  garden.stage++;
  gardenMsgEl.textContent =
    garden.stage === MAX_STAGE ? "다 자랐어요! 정원에 심어 주세요." : "무럭무럭 자라고 있어요 💧";
  saveGarden();
  renderGarden(true);
}

// ===== 통계 (현황 화면용) =====
const STATS_KEY = "sudoku-stats";
const LEVEL_NAMES = { easy: "쉬움", medium: "보통", hard: "어려움" };
let stats = { wins: { easy: 0, medium: 0, hard: 0 }, earned: 0 };

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY));
    if (saved && saved.wins) return saved;
  } catch {
    // 저장소를 못 쓰거나 값이 깨졌으면 새로 시작
  }
  // 통계 기능이 생기기 전에 모은 별은 '번 별'에 포함해 둔다
  return { wins: { easy: 0, medium: 0, hard: 0 }, earned: totalStars };
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // 저장 실패는 무시
  }
}

// ===== 현황 화면 =====
function statRow(label, value) {
  return `<li><span>${label}</span><span>${value}</span></li>`;
}

function renderStatus() {
  const stage = TREE_STAGES[garden.stage];
  const percent = (garden.stage / MAX_STAGE) * 100;
  const starsNeeded = (MAX_STAGE - garden.stage) * WATER_COST;
  const best = loadBest();

  const note =
    garden.stage === MAX_STAGE
      ? "다 자랐어요! 정원에 심어 주세요."
      : `다 자랄 때까지 ⭐${starsNeeded}개 필요 (보유 ⭐${totalStars}개)`;

  let html = `
    <div class="status-tree">
      <div class="big">${treeSVG(garden.stage)}</div>
      <div class="tree-name">${stage.name} · ${garden.stage + 1}/${TREE_STAGES.length}단계</div>
      <div class="bar"><div style="width: ${percent}%"></div></div>
      <div class="status-note">${note}</div>
    </div>
    <ul class="stat-list">
      ${statRow("🌳 심은 나무", `${garden.planted.length}그루`)}
      ${statRow("🌷 정원 장식", `${garden.decor.length}개`)}
      ${statRow("⭐ 보유 별", totalStars)}
      ${statRow("🏅 지금까지 번 별", stats.earned)}
      <li class="head">푼 퍼즐</li>`;

  for (const key of Object.keys(LEVEL_NAMES)) {
    html += statRow(LEVEL_NAMES[key], `${stats.wins[key] || 0}판`);
  }

  html += '<li class="head">최고 기록 (힌트 없이)</li>';
  for (const key of Object.keys(LEVEL_NAMES)) {
    html += statRow(LEVEL_NAMES[key], best[key] ? formatTime(best[key]) : "-");
  }
  html += "</ul>";

  statusBodyEl.innerHTML = html;
}

function showTab(name) {
  tabGrowEl.hidden = name !== "grow";
  tabShopEl.hidden = name !== "shop";
  tabSceneEl.hidden = name !== "scene";
  tabStatusEl.hidden = name !== "status";
  tabGrowBtn.classList.toggle("active", name === "grow");
  tabShopBtn.classList.toggle("active", name === "shop");
  tabSceneBtn.classList.toggle("active", name === "scene");
  tabStatusBtn.classList.toggle("active", name === "status");

  if (name === "grow") renderGarden();
  else if (name === "scene") renderScene();
  else if (name === "shop") {
    shopMsgEl.textContent = "";
    renderShop();
  } else renderStatus();
}

function openGarden() {
  resumeOnClose = pauseTimer();
  gardenMsgEl.textContent = "";
  showTab("grow");
  gardenEl.hidden = false;
}

function closeGarden() {
  gardenEl.hidden = true;
  if (resumeOnClose) resumeTimer();
  resumeOnClose = false;
  renderHome(); // 나무가 자랐을 수 있으니 홈 표시도 갱신
}

// ===== 최고 기록 (브라우저 localStorage에 저장) =====
const BEST_KEY = "sudoku-best";

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) || {};
  } catch {
    return {}; // 저장소를 못 쓰거나 값이 깨졌을 때
  }
}

function saveBest(best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // 저장 실패는 무시 (게임 진행에는 영향 없음)
  }
}

function showBest() {
  const ms = loadBest()[level];
  bestEl.textContent = ms ? `최고 기록: ${formatTime(ms)}` : "최고 기록: -";
}

const boardEl = document.getElementById("board");
const numpadEl = document.getElementById("numpad");
const messageEl = document.getElementById("message");
const hintBtn = document.getElementById("hint");
const timerEl = document.getElementById("timer");
const bestEl = document.getElementById("best");
const notesBtn = document.getElementById("notes-toggle");
const starsEls = document.querySelectorAll(".stars-badge"); // 홈/게임 화면 둘 다에 있음

// ===== 별 (난이도별 보상, localStorage에 누적 저장) =====
const STAR_REWARD = { easy: 1, medium: 3, hard: 5 };
const NO_HINT_BONUS = 1; // 힌트를 한 번도 안 쓰고 완성하면 추가로 받는 별
const STARS_KEY = "sudoku-stars";
let totalStars = 0;
let gameOver = false; // 완성한 게임이면 true (별 중복 지급과 입력 방지)

function loadStars() {
  try {
    return Number(localStorage.getItem(STARS_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveStars(n) {
  try {
    localStorage.setItem(STARS_KEY, String(n));
  } catch {
    // 저장 실패는 무시
  }
}

function showStars(animate = false) {
  starsEls.forEach((el) => {
    el.textContent = `⭐ ${totalStars}`;
    if (animate) {
      el.classList.remove("pop");
      void el.offsetWidth; // 애니메이션을 다시 시작하기 위한 트릭
      el.classList.add("pop");
    }
  });
}

// ===== 타이머 =====
let startTime = 0;     // 게임 시작 시각 (ms)
let timerId = null;    // setInterval 번호

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function startTimer() {
  stopTimer();
  startTime = Date.now();
  timerEl.textContent = formatTime(0);
  timerId = setInterval(() => {
    timerEl.textContent = formatTime(Date.now() - startTime);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

// 정원 화면을 여는 동안 시간이 흐르지 않도록 잠시 멈췄다가 이어간다
let pausedAt = 0;

function pauseTimer() {
  if (timerId === null) return false; // 이미 멈춘 상태 (완성 후 등)
  stopTimer();
  pausedAt = Date.now();
  return true;
}

function resumeTimer() {
  startTime += Date.now() - pausedAt; // 멈춰 있던 시간만큼 시작 시각을 뒤로 민다
  timerId = setInterval(() => {
    timerEl.textContent = formatTime(Date.now() - startTime);
  }, 1000);
}

// 난이도별로 비울 칸 수 (많이 비울수록 어려움)
const REMOVE_COUNT = { easy: 35, medium: 45, hard: 54 };

// ===== 규칙 검사 =====
// 칸 idx에 숫자 num을 넣어도 되는지 (행/열/3x3 중복 없는지)
function isValid(grid, idx, num) {
  const row = Math.floor(idx / 9);
  const col = idx % 9;

  for (let i = 0; i < 9; i++) {
    if (grid[row * 9 + i] === num && row * 9 + i !== idx) return false; // 행
    if (grid[i * 9 + col] === num && i * 9 + col !== idx) return false; // 열
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      const i = r * 9 + c;
      if (grid[i] === num && i !== idx) return false; // 3x3 박스
    }
  }
  return true;
}

// ===== 퍼즐 생성 =====
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 백트래킹으로 빈 칸을 채워 완성된 보드를 만든다
function fillGrid(grid) {
  const idx = grid.indexOf(0);
  if (idx === -1) return true; // 다 채워짐

  for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isValid(grid, idx, num)) {
      grid[idx] = num;
      if (fillGrid(grid)) return true;
      grid[idx] = 0; // 막히면 되돌리기
    }
  }
  return false;
}

// 칸 idx에 들어갈 수 있는 숫자 후보 목록
function getCandidates(grid, idx) {
  const result = [];
  for (let n = 1; n <= 9; n++) {
    if (isValid(grid, idx, n)) result.push(n);
  }
  return result;
}

// 해답의 개수를 센다. limit개 이상 찾으면 바로 멈춘다 (유일성 검사엔 2면 충분)
function countSolutions(grid, limit = 2) {
  // 후보가 가장 적은 빈 칸부터 채우면 훨씬 빠르다
  let bestIdx = -1;
  let bestCandidates = null;
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const candidates = getCandidates(grid, i);
    if (bestCandidates === null || candidates.length < bestCandidates.length) {
      bestIdx = i;
      bestCandidates = candidates;
      if (candidates.length === 0) return 0; // 막다른 길
    }
  }
  if (bestIdx === -1) return 1; // 빈 칸이 없음 = 해답 1개 찾음

  let count = 0;
  for (const num of bestCandidates) {
    grid[bestIdx] = num;
    count += countSolutions(grid, limit - count);
    grid[bestIdx] = 0;
    if (count >= limit) break;
  }
  return count;
}

// 정답 보드에서 칸을 하나씩 비워 퍼즐을 만든다 (targetRemove = 비우고 싶은 칸 수)
// 비운 뒤에도 해답이 정확히 1개일 때만 비우고, 아니면 되돌린다.
// 그래서 목표만큼 못 비우는 경우도 있다 (그때는 가능한 만큼만 비운다)
function makePuzzle(full, targetRemove) {
  const puzzle = full.slice();
  const indexes = shuffle([...Array(81).keys()]);
  let removed = 0;

  for (const idx of indexes) {
    if (removed >= targetRemove) break;

    const backup = puzzle[idx];
    puzzle[idx] = 0;

    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      puzzle[idx] = backup; // 해답이 여러 개가 되면 되돌리기
    }
  }
  return puzzle;
}

// ===== 진행 상황 자동 저장 =====
const SAVE_KEY = "sudoku-save";

// 지금까지 흐른 시간 (실행 중이든 멈춰 있든)
function getElapsed() {
  return timerId !== null ? Date.now() - startTime : pausedAt - startTime;
}

function saveGame() {
  if (board.length === 0 || gameOver) return;
  const data = {
    level,
    solution,
    board,
    given,
    hinted,
    notes: notes.map((s) => [...s]), // Set은 JSON으로 못 담으니 배열로 변환
    hintsLeft,
    elapsed: getElapsed(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // 저장 실패는 무시 (게임 진행에는 영향 없음)
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // 무시
  }
}

// 저장된 게임이 있으면 복원한다. 복원했으면 true.
function loadGame() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }

  const isGrid = (a) => Array.isArray(a) && a.length === 81;
  if (
    !data ||
    !REMOVE_COUNT[data.level] ||
    !isGrid(data.solution) ||
    !isGrid(data.board) ||
    !isGrid(data.given) ||
    !isGrid(data.hinted) ||
    !isGrid(data.notes) ||
    !Number.isInteger(data.hintsLeft) ||
    !Number.isFinite(data.elapsed)
  ) {
    return false; // 없거나 깨진 저장은 무시
  }

  level = data.level;
  solution = data.solution;
  board = data.board;
  given = data.given;
  hinted = data.hinted;
  notes = data.notes.map((arr) => new Set(arr));
  hintsLeft = data.hintsLeft;
  gameOver = false;
  selected = -1;

  // 타이머는 멈춘 상태로 두고, '이어하기'를 누르면 이어서 흐른다
  pausedAt = Date.now();
  startTime = pausedAt - data.elapsed;
  homePaused = true;
  timerEl.textContent = formatTime(data.elapsed);

  messageEl.textContent = "";
  setNotesMode(false);
  showBest();
  updateHintButton();
  render();
  return true;
}

// 앱을 닫거나 다른 탭으로 가기 직전에도 저장 (흐른 시간을 최신으로)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveGame();
});
window.addEventListener("pagehide", saveGame);

// ===== 화면 전환 (홈 <-> 게임) =====
const homeEl = document.getElementById("home");
const gameEl = document.getElementById("game");
const continueBtn = document.getElementById("continue-btn");
const gameTitleEl = document.getElementById("game-title");
let homePaused = false; // 홈으로 나가면서 타이머를 멈췄는지

// 홈 화면의 나무 표시
function renderHome() {
  const stage = TREE_STAGES[garden.stage];
  document.getElementById("home-tree").innerHTML = treeSVG(garden.stage);
  document.getElementById("home-tree-name").textContent =
    `${stage.name} · ${garden.stage + 1}/${TREE_STAGES.length}단계`;

  const dotsEl = document.getElementById("home-dots");
  dotsEl.innerHTML = "";
  for (let i = 0; i <= MAX_STAGE; i++) {
    const dot = document.createElement("span");
    if (i <= garden.stage) dot.className = "on";
    dotsEl.appendChild(dot);
  }

  // 풀던 게임이 있을 때만 이어하기 표시
  continueBtn.hidden = !(board.length > 0 && !gameOver);
}

function showHome() {
  gameEl.hidden = true;
  homeEl.hidden = false;
  renderHome();
}

function showGame() {
  homeEl.hidden = true;
  gameEl.hidden = false;
  gameTitleEl.textContent = `스도쿠 · ${LEVEL_NAMES[level]}`;
}

function startGame(chosenLevel) {
  level = chosenLevel;
  homePaused = false;
  showGame();
  newGame();
}

function goHome() {
  homePaused = pauseTimer(); // 풀던 게임은 시간을 멈추고 보관
  saveGame();
  showHome();
}

function continueGame() {
  showGame();
  if (homePaused) resumeTimer();
  homePaused = false;
}

// ===== 게임 시작 =====
function newGame() {
  solution = Array(81).fill(0);
  fillGrid(solution);

  board = makePuzzle(solution, REMOVE_COUNT[level]);
  given = board.map((n) => n !== 0);
  hinted = Array(81).fill(false);
  gameOver = false;
  notes = Array.from({ length: 81 }, () => new Set());
  setNotesMode(false);
  showBest();
  hintsLeft = MAX_HINTS;
  selected = -1;
  messageEl.textContent = "";
  updateHintButton();
  startTimer();
  render();
  saveGame();
}

// ===== 화면 그리기 =====
function render() {
  boardEl.innerHTML = "";

  const selectedNum = selected >= 0 ? board[selected] : 0;

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    if (board[i]) {
      cell.textContent = board[i];
    } else if (notes[i].size > 0) {
      // 빈 칸에 메모가 있으면 3x3 작은 격자로 표시
      const notesEl = document.createElement("div");
      notesEl.className = "notes";
      for (let n = 1; n <= 9; n++) {
        const span = document.createElement("span");
        span.textContent = notes[i].has(n) ? n : "";
        notesEl.appendChild(span);
      }
      cell.appendChild(notesEl);
    }

    const row = Math.floor(i / 9);
    const col = i % 9;

    if (row === 2 || row === 5) cell.classList.add("row-end");
    if (given[i]) cell.classList.add("given");
    else if (hinted[i]) cell.classList.add("hinted");
    else if (board[i]) cell.classList.add("user");

    if (selected >= 0) {
      const sRow = Math.floor(selected / 9);
      const sCol = selected % 9;
      const sameBox =
        Math.floor(row / 3) === Math.floor(sRow / 3) &&
        Math.floor(col / 3) === Math.floor(sCol / 3);

      if (i === selected) cell.classList.add("selected");
      else if (row === sRow || col === sCol || sameBox) cell.classList.add("related");

      if (selectedNum && board[i] === selectedNum && i !== selected) {
        cell.classList.add("same-number");
      }
    }

    // 규칙 위반(중복)인 숫자는 빨갛게 표시
    if (board[i] && !isValid(board, i, board[i])) cell.classList.add("conflict");

    cell.addEventListener("click", () => {
      selected = i;
      render();
    });
    boardEl.appendChild(cell);
  }

  updateNumpad();
}

// 9칸이 모두 정답으로 채워진 숫자는 패드에서 흐리게 표시한다
function updateNumpad() {
  for (let n = 1; n <= 9; n++) {
    let correct = 0;
    for (let i = 0; i < 81; i++) {
      if (board[i] === n && solution[i] === n) correct++;
    }
    const btn = numpadEl.children[n - 1];
    btn.classList.toggle("done", correct === 9);
    btn.disabled = correct === 9;
  }
}

// ===== 입력 처리 =====
function inputNumber(num) {
  if (gameOver || selected < 0 || given[selected] || hinted[selected]) return; // 선택 안 했거나 고정/힌트 칸이면 무시

  if (notesMode && num !== 0 && board[selected] === 0) {
    // 메모 모드: 빈 칸에서 숫자를 누르면 메모를 켜고 끈다
    if (notes[selected].has(num)) notes[selected].delete(num);
    else notes[selected].add(num);
  } else if (num === 0) {
    // 지우기: 숫자가 있으면 숫자를, 없으면 메모를 지운다
    if (board[selected] !== 0) board[selected] = 0;
    else notes[selected].clear();
  } else {
    board[selected] = num;
    clearNotes(selected, num);
  }
  render();
  saveGame();
  checkWin();
}

// idx 칸에 num을 확정했을 때: 그 칸의 메모를 지우고,
// 같은 행/열/박스 칸의 메모에서 num을 자동으로 제거한다
function clearNotes(idx, num) {
  notes[idx].clear();
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const sameBox =
      Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3);
    if (r === row || c === col || sameBox) notes[i].delete(num);
  }
}

function setNotesMode(on) {
  notesMode = on;
  notesBtn.textContent = on ? "✏️ 메모 ON (N)" : "✏️ 메모 OFF (N)";
  notesBtn.classList.toggle("active", on);
}

// ===== 힌트 =====
function updateHintButton() {
  hintBtn.textContent = `💡 힌트 (${hintsLeft})`;
  hintBtn.disabled = hintsLeft === 0;
}

// 선택한 칸의 정답을 알려준다. 칸을 선택하지 않았다면 틀렸거나 빈 칸 중 하나를 골라준다.
function useHint() {
  if (gameOver || hintsLeft === 0) return;

  let target = selected;
  if (target < 0) {
    const candidates = [];
    for (let i = 0; i < 81; i++) {
      if (board[i] !== solution[i]) candidates.push(i);
    }
    if (candidates.length === 0) return;
    target = candidates[Math.floor(Math.random() * candidates.length)];
  } else if (given[target] || hinted[target] || board[target] === solution[target]) {
    messageEl.textContent = "이미 정답인 칸이에요. 다른 칸을 선택해 주세요.";
    return;
  }

  board[target] = solution[target];
  clearNotes(target, solution[target]);
  hinted[target] = true;
  selected = target;
  hintsLeft--;
  messageEl.textContent = "";
  updateHintButton();
  render();
  saveGame();
  checkWin();
}

function checkWin() {
  const complete = board.every((n, i) => n !== 0 && isValid(board, i, n));
  if (complete && !gameOver) {
    gameOver = true;
    stopTimer();
    clearSave(); // 끝난 게임은 이어할 필요 없음

    const used = MAX_HINTS - hintsLeft;
    const bonus = used === 0 ? NO_HINT_BONUS : 0; // 힌트를 안 썼으면 보너스 별
    const reward = STAR_REWARD[level] + bonus;
    totalStars += reward;
    saveStars(totalStars);
    stats.wins[level] = (stats.wins[level] || 0) + 1;
    stats.earned += reward;
    saveStats();
    showStars(true);

    timerEl.textContent = formatTime(Date.now() - startTime);
    const elapsed = Date.now() - startTime;
    const rewardText = bonus ? `${reward}개 (힌트 없이 +${bonus})` : `${reward}개`;
    let text = `🎉 완성! ⭐ ${rewardText} 획득 · 기록 ${timerEl.textContent} · 힌트 ${used}회 사용`;

    // 최고 기록은 힌트를 쓰지 않았을 때만 인정
    if (used === 0) {
      const best = loadBest();
      if (!best[level] || elapsed < best[level]) {
        best[level] = elapsed;
        saveBest(best);
        text += " · 🏆 신기록!";
        showBest();
      }
    }
    messageEl.textContent = text;
  }
}

// 숫자 패드 (1~9 + 지우기)
for (let n = 1; n <= 9; n++) {
  const btn = document.createElement("button");
  btn.textContent = n;
  btn.addEventListener("click", () => inputNumber(n));
  numpadEl.appendChild(btn);
}
const eraseBtn = document.createElement("button");
eraseBtn.textContent = "⌫";
eraseBtn.addEventListener("click", () => inputNumber(0));
numpadEl.appendChild(eraseBtn);

// 키보드: 숫자키 입력, Backspace/Delete 지우기, 방향키 이동
document.addEventListener("keydown", (e) => {
  // 정원이 열려 있으면 보드 입력을 막고 Esc로만 닫는다
  if (!gardenEl.hidden) {
    if (e.key === "Escape") closeGarden();
    return;
  }
  if (gameEl.hidden) return; // 홈 화면에서는 보드 입력 없음

  if (e.key === "n" || e.key === "N") setNotesMode(!notesMode);
  else if (e.key >= "1" && e.key <= "9") inputNumber(Number(e.key));
  else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") inputNumber(0);
  else if (selected >= 0) {
    const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in moves) {
      const next = selected + moves[e.key];
      const wrapsRow =
        (e.key === "ArrowLeft" && selected % 9 === 0) ||
        (e.key === "ArrowRight" && selected % 9 === 8);
      if (next >= 0 && next < 81 && !wrapsRow) {
        selected = next;
        render();
      }
      e.preventDefault();
    }
  }
});

document.getElementById("new-game").addEventListener("click", newGame);
notesBtn.addEventListener("click", () => {
  notesBtn.blur();
  setNotesMode(!notesMode);
});
hintBtn.addEventListener("click", () => {
  hintBtn.blur(); // 포커스가 남아 Enter/Space로 힌트가 또 쓰이는 것을 방지
  useHint();
});

// 홈 화면: 난이도 버튼, 이어하기, 나무 카드(정원 열기)
document.querySelectorAll(".level").forEach((btn) => {
  btn.addEventListener("click", () => startGame(btn.dataset.level));
});
continueBtn.addEventListener("click", continueGame);
document.getElementById("home-tree-card").addEventListener("click", openGarden);
document.getElementById("home-btn").addEventListener("click", goHome);

initSceneInteractions();
document.getElementById("garden-btn").addEventListener("click", openGarden);
document.getElementById("garden-close").addEventListener("click", closeGarden);
treeActionBtn.addEventListener("click", treeAction);
tabGrowBtn.addEventListener("click", () => showTab("grow"));
tabShopBtn.addEventListener("click", () => showTab("shop"));
tabSceneBtn.addEventListener("click", () => showTab("scene"));
tabStatusBtn.addEventListener("click", () => showTab("status"));
// 어두운 배경을 누르면 닫기
gardenEl.addEventListener("click", (e) => {
  if (e.target === gardenEl) closeGarden();
});

totalStars = loadStars();

// 테스트용: 내 컴퓨터(파일/localhost)에서 주소 뒤에 ?givestars=100 을 붙여 열면 별을 더해준다.
// 공개된 주소(github.io 등)에서는 동작하지 않는다.
{
  const extra = Number(new URLSearchParams(location.search).get("givestars"));
  const isLocal = ["", "localhost", "127.0.0.1"].includes(location.hostname);
  if (isLocal && extra > 0) {
    totalStars += Math.floor(extra);
    saveStars(totalStars);
    try {
      history.replaceState(null, "", location.pathname); // 새로고침해도 또 더해지지 않게 주소에서 제거
    } catch {
      // 주소를 못 바꿔도 별은 이미 더해졌으니 무시
    }
  }
}

garden = loadGarden();
stats = loadStats();
showStars();
loadGame(); // 저장된 게임이 있으면 복원 (홈에 '이어하기'가 나타남)
showHome();
