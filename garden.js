// ===== 정원 (식물 키우기 · 꾸미기) =====
// 이 파일은 script.js보다 먼저 불러온다. 별(totalStars)·타이머 같은 공용 값은
// 함수 안에서 쓸 때(실행 시점)에 script.js에 있는 것을 가져다 쓴다.

const GARDEN_KEY = "sudoku-garden";
const CAPACITY = { 1: 6, 2: 12 }; // 정원 단계별로 심을 수 있는 식물 수
const EXPAND_COST = 20;           // 2단계 정원으로 확장하는 데 드는 별
const MAX_DECOR = 30;             // 장식 상한

// 식물 종류. cost = 한 단계 키우는 데 드는 별, stages = 단계 이름 (마지막이 다 자란 모습)
const PLANTS = {
  apple: {
    name: "사과나무", type: "tree", cost: 3,
    stages: ["새싹", "작은 나무", "큰 나무", "풍성한 나무", "사과나무"],
  },
  cherry: {
    name: "벚꽃나무", type: "tree", cost: 3,
    stages: ["새싹", "작은 나무", "큰 나무", "풍성한 나무", "벚꽃나무"],
  },
  sunflower: {
    name: "해바라기", type: "flower", cost: 2,
    stages: ["새싹", "봉오리", "활짝 핀 해바라기"],
  },
  tulip: {
    name: "튤립", type: "flower", cost: 2,
    stages: ["새싹", "봉오리", "활짝 핀 튤립"],
  },
  rose: {
    name: "장미", type: "flower", cost: 2,
    stages: ["새싹", "봉오리", "활짝 핀 장미"],
  },
};
const PLANT_IDS = Object.keys(PLANTS);
// 씨앗 가격: 상점에서 한 번 사면 그 식물을 계속 심을 수 있다. 기본 식물은 처음부터 열려 있다
const SEED_PRICE = { apple: 0, tulip: 0, cherry: 8, sunflower: 4, rose: 6 };
const STARTER_PLANTS = ["apple", "tulip"];
const maxStageOf = (id) => PLANTS[id].stages.length - 1;
const totalCostOf = (id) => PLANTS[id].cost * maxStageOf(id); // 새싹에서 다 자랄 때까지 드는 별

// ----- 식물 그림 (SVG). size를 주면 가로세로 px, 없으면 CSS가 정한다 -----
const svgWrap = (body, size) => {
  const dim = size ? ` width="${size}" height="${size}"` : "";
  return `<svg viewBox="0 0 100 100"${dim} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
};
const svgCircle = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const GROUND_SHADOW = '<ellipse cx="50" cy="91" rx="24" ry="5" fill="rgba(0,0,0,0.14)"/>';

// 새싹 (모든 식물의 첫 단계): 줄기 하나에 잎 두 장
const SPROUT =
  '<ellipse cx="50" cy="90" rx="18" ry="5" fill="#7a5230"/>' +
  '<path d="M50 90 C50 82 50 74 50 66" stroke="#3f9b49" stroke-width="4" fill="none" stroke-linecap="round"/>' +
  '<ellipse cx="38" cy="64" rx="13" ry="7" fill="#5cc86a" transform="rotate(-30 38 64)"/>' +
  '<ellipse cx="62" cy="62" rx="13" ry="7" fill="#4caf50" transform="rotate(30 62 62)"/>';

// 아무것도 심지 않은 빈 흙
function seedSVG(size) {
  return svgWrap(
    GROUND_SHADOW +
      '<ellipse cx="50" cy="84" rx="26" ry="10" fill="#7a5230"/>' +
      '<ellipse cx="50" cy="81" rx="20" ry="6" fill="#8d6238"/>' +
      '<ellipse cx="50" cy="78" rx="5" ry="3" fill="#c9a26b"/>',
    size
  );
}

// 나무 (사과나무 / 벚꽃나무). 0~3단계는 초록 나무, 마지막 단계에서 열매나 꽃이 핀다
function treeSVG(kind, stage, size) {
  const final = stage === maxStageOf(kind);
  const pink = kind === "cherry" && final;
  const TRUNK = pink ? "#6d4530" : "#8d5a2b";
  const DARK = pink ? "#e75c8a" : "#2e8b3d";
  const MID = pink ? "#f48fb1" : "#3fae4f";
  const LIGHT = pink ? "#ffc1d6" : "#68cf74";
  const trunk = (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${TRUNK}"/>`;
  const c = svgCircle;

  let body = GROUND_SHADOW;
  if (stage === 0) {
    body += SPROUT;
  } else if (stage === 1) {
    // 작은 나무: 가는 줄기에 작은 잎 뭉치
    body += trunk(46, 60, 8, 30) + c(50, 50, 18, MID) + c(44, 45, 9, LIGHT);
  } else if (stage === 2) {
    // 큰 나무: 굵은 줄기에 넉넉한 잎
    body +=
      trunk(43, 48, 14, 42) + c(32, 50, 16, DARK) + c(68, 50, 16, DARK) +
      c(50, 36, 24, MID) + c(42, 30, 10, LIGHT);
  } else {
    // 풍성한 나무(3) / 다 자란 나무(4): 잎이 가득하다
    body +=
      trunk(41, 52, 18, 38) +
      c(26, 46, 18, DARK) + c(74, 46, 18, DARK) + c(50, 52, 20, DARK) +
      c(50, 28, 24, MID) + c(30, 36, 20, MID) + c(70, 36, 20, MID) + c(50, 44, 22, MID) +
      c(40, 24, 9, LIGHT) + c(62, 32, 8, LIGHT) + c(30, 40, 7, LIGHT);

    if (final && kind === "apple") {
      [[34, 38], [52, 22], [68, 40], [42, 54], [60, 52], [24, 52], [76, 54]].forEach(([x, y]) => {
        body += c(x, y, 5, "#e53935") + c(x - 1.6, y - 1.6, 1.6, "#ff8a80");
      });
    } else if (pink) {
      [[30, 34], [48, 20], [66, 30], [40, 48], [58, 46], [22, 50], [76, 48], [52, 36], [34, 56], [68, 56]].forEach(([x, y]) => {
        body += c(x, y, 2.6, "#fff4f8");
      });
    }
  }
  return svgWrap(body, size);
}

// 꽃 (해바라기 / 튤립 / 장미): 0 새싹, 1 봉오리, 2 활짝 핀 모습
function flowerSVG(kind, stage, size) {
  if (stage === 0) return svgWrap(GROUND_SHADOW + SPROUT, size);

  let body =
    GROUND_SHADOW +
    '<path d="M50 90 C50 78 50 66 50 54" stroke="#3f9b49" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="39" cy="76" rx="11" ry="5" fill="#5cc86a" transform="rotate(-30 39 76)"/>' +
    '<ellipse cx="61" cy="70" rx="11" ry="5" fill="#4caf50" transform="rotate(30 61 70)"/>';

  if (stage === 1) {
    // 봉오리: 꽃마다 색이 살짝 비친다
    const tip = { sunflower: "#ffc107", tulip: "#ff8aa8", rose: "#e8445a" }[kind];
    body +=
      svgCircle(50, 50, 7, "#4caf50") +
      `<ellipse cx="50" cy="46" rx="5" ry="6" fill="${tip}"/>`;
    return svgWrap(body, size);
  }

  if (kind === "sunflower") {
    for (let i = 0; i < 12; i++) {
      const fill = i % 2 ? "#ffb300" : "#ffc107";
      body += `<ellipse cx="50" cy="26" rx="5.5" ry="12" fill="${fill}" transform="rotate(${i * 30} 50 40)"/>`;
    }
    body += svgCircle(50, 40, 11, "#6d4c41") + svgCircle(47, 37, 2, "#8d6e63") + svgCircle(54, 43, 2, "#8d6e63");
  } else if (kind === "tulip") {
    body +=
      '<path d="M36 32 Q36 56 50 58 Q64 56 64 32 L57 40 L50 28 L43 40 Z" fill="#ff4d79"/>' +
      '<path d="M50 28 Q45 44 50 56 Q55 44 50 28 Z" fill="#ff7a9c"/>';
  } else {
    body +=
      svgCircle(50, 40, 15, "#e8445a") + svgCircle(50, 40, 11, "#c9324a") +
      svgCircle(50, 40, 7, "#e8445a") + svgCircle(50, 40, 3.5, "#b02440") +
      '<path d="M41 40 Q50 31 59 40" stroke="#8f1d33" stroke-width="1.5" fill="none"/>';
  }
  return svgWrap(body, size);
}

function plantSVG(id, stage, size) {
  return PLANTS[id].type === "tree" ? treeSVG(id, stage, size) : flowerSVG(id, stage, size);
}

// ----- 정원 상태 -----
// level: 정원 단계(1 작은 정원 / 2 꾸미기 정원)
// growing: 지금 키우는 식물 {plant, stage} (없으면 null)
// planted: 정원에 심은 식물 id들, discovered: 도감에 등록된 식물 id들,
// unlocked: 심을 수 있게 열린 식물 id들 (기본 식물 + 상점에서 산 씨앗)
// decor: 상점에서 산 장식 id들, positions/scales: 직접 옮긴 위치 / 크기 배율 (key 예: d0, t1)
let garden = defaultGarden();
let resumeOnClose = false; // 정원을 닫을 때 타이머를 이어갈지

function defaultGarden() {
  return {
    level: 1, growing: null, planted: [], discovered: [], unlocked: [...STARTER_PLANTS],
    decor: [], positions: {}, scales: {},
  };
}

// 저장된 데이터를 읽고, 예전 형식(단계 개념이 없던 시절)이면 새 형식으로 바꿔 준다
function loadGarden() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(GARDEN_KEY));
  } catch {
    // 저장소를 못 쓰거나 값이 깨졌으면 새로 시작
  }
  if (!saved || typeof saved !== "object") return defaultGarden();

  const legacy = saved.level === undefined; // 예전 형식: stage(숫자)와 planted만 있음
  const validId = (id) => (PLANTS[id] ? id : "apple"); // 예전 이모지 값 등은 사과나무로
  const planted = Array.isArray(saved.planted) ? saved.planted.map(validId) : [];
  const decor = Array.isArray(saved.decor) ? saved.decor.filter((d) => typeof d === "string") : [];

  let growing = null;
  if (legacy) {
    if (Number.isInteger(saved.stage) && saved.stage > 0) {
      growing = { plant: "apple", stage: Math.min(saved.stage, maxStageOf("apple")) };
    }
  } else if (saved.growing && PLANTS[saved.growing.plant] && Number.isInteger(saved.growing.stage)) {
    const id = saved.growing.plant;
    growing = { plant: id, stage: Math.max(0, Math.min(saved.growing.stage, maxStageOf(id))) };
  }

  // 이미 식물을 심었거나 장식을 산 예전 정원은 2단계로 이어 간다
  const level = legacy ? (planted.length > 0 || decor.length > 0 ? 2 : 1) : saved.level === 2 ? 2 : 1;

  const found = new Set(planted);
  if (Array.isArray(saved.discovered)) saved.discovered.forEach((id) => PLANTS[id] && found.add(id));

  // 씨앗 상점이 생기기 전에 저장된 정원은 모든 식물을 쓰고 있었으니 전부 열어 둔다
  const unlocked = new Set(Array.isArray(saved.unlocked) ? saved.unlocked.filter((id) => PLANTS[id]) : PLANT_IDS);
  STARTER_PLANTS.forEach((id) => unlocked.add(id));
  planted.forEach((id) => unlocked.add(id));
  if (growing) unlocked.add(growing.plant);

  return {
    level,
    growing,
    planted,
    discovered: [...found],
    unlocked: [...unlocked],
    decor,
    positions: saved.positions && typeof saved.positions === "object" ? saved.positions : {},
    scales: saved.scales && typeof saved.scales === "object" ? saved.scales : {},
  };
}

function saveGarden() {
  try {
    localStorage.setItem(GARDEN_KEY, JSON.stringify(garden));
  } catch {
    // 저장 실패는 무시
  }
}

const capacity = () => CAPACITY[garden.level];

// ----- 화면 요소 -----
const gardenEl = document.getElementById("garden");
const growViewEl = document.getElementById("grow-view");
const treeEl = document.getElementById("tree");
const treeNameEl = document.getElementById("tree-name");
const treeDotsEl = document.getElementById("tree-dots");
const treeActionBtn = document.getElementById("tree-action");
const pickerEl = document.getElementById("plant-picker");
const expandBoxEl = document.getElementById("expand-box");
const gardenMsgEl = document.getElementById("garden-msg");
const tabGrowEl = document.getElementById("tab-grow");
const tabShopEl = document.getElementById("tab-shop");
const tabSceneEl = document.getElementById("tab-scene");
const tabStatusEl = document.getElementById("tab-status");
const tabGrowBtn = document.getElementById("tab-grow-btn");
const tabShopBtn = document.getElementById("tab-shop-btn");
const tabSceneBtn = document.getElementById("tab-scene-btn");
const tabStatusBtn = document.getElementById("tab-status-btn");
const sceneEl = document.getElementById("scene");
const sceneInfoEl = document.getElementById("scene-info");
const statusBodyEl = document.getElementById("status-body");

// ----- 키우기 탭 -----
function renderGarden(grew = false) {
  const g = garden.growing;
  growViewEl.hidden = !g;
  pickerEl.hidden = !!g;

  if (g) {
    const plant = PLANTS[g.plant];
    const max = maxStageOf(g.plant);
    treeEl.innerHTML = plantSVG(g.plant, g.stage);
    treeNameEl.textContent = `${plant.name} · ${plant.stages[g.stage]}`;

    if (grew) {
      treeEl.classList.remove("grow");
      void treeEl.offsetWidth; // 애니메이션 재시작
      treeEl.classList.add("grow");
    }

    treeDotsEl.innerHTML = "";
    for (let i = 0; i <= max; i++) {
      const dot = document.createElement("span");
      if (i <= g.stage) dot.className = "on";
      treeDotsEl.appendChild(dot);
    }

    if (g.stage === max) {
      treeActionBtn.textContent = "🌿 정원에 심기";
      treeActionBtn.disabled = false;
    } else {
      treeActionBtn.textContent = `💧 물 주기 (⭐${plant.cost})`;
      treeActionBtn.disabled = totalStars < plant.cost;
    }
  } else {
    renderPicker();
  }

  renderExpandBox();
}

// 키울 식물 고르기
function renderPicker() {
  const full = garden.planted.length >= capacity();
  pickerEl.innerHTML = `<div class="picker-title">무엇을 키울까요?</div><div class="picker-grid"></div>`;
  const grid = pickerEl.querySelector(".picker-grid");

  PLANT_IDS.forEach((id) => {
    const plant = PLANTS[id];
    const locked = !garden.unlocked.includes(id);
    const card = document.createElement("div");
    card.className = "plant-card" + (locked ? " locked" : "");
    card.innerHTML =
      `<div class="plant-art">${plantSVG(id, maxStageOf(id))}</div>` +
      `<div class="name">${plant.name}</div>` +
      `<div class="owned">${plant.type === "tree" ? "나무" : "꽃"} · ${plant.stages.length}단계 · ⭐${totalCostOf(id)}</div>`;

    const btn = document.createElement("button");
    if (locked) {
      // 아직 못 심는 식물: 누르면 씨앗을 파는 상점 탭으로 간다
      btn.textContent = `🔒 씨앗 ⭐${SEED_PRICE[id]}`;
      btn.classList.add("seed-locked");
      btn.addEventListener("click", () => showTab("shop"));
    } else {
      btn.textContent = "🌱 심기";
      btn.disabled = full;
      btn.addEventListener("click", () => startPlant(id));
    }
    card.appendChild(btn);
    grid.appendChild(card);
  });

  if (full) {
    const note = document.createElement("p");
    note.className = "garden-msg";
    note.textContent =
      garden.level === 1
        ? "정원이 가득 찼어요. 아래에서 2단계 정원으로 확장해 보세요!"
        : "정원이 가득 찼어요!";
    pickerEl.appendChild(note);
  }
}

function startPlant(id) {
  if (garden.growing || garden.planted.length >= capacity() || !garden.unlocked.includes(id)) return;
  garden.growing = { plant: id, stage: 0 };
  gardenMsgEl.textContent = `${PLANTS[id].name}의 새싹을 심었어요 🌱`;
  saveGarden();
  renderGarden(true);
}

// 정원 단계 안내 + (1단계가 가득 차면) 2단계 확장 버튼
function renderExpandBox() {
  const count = garden.planted.length;
  const cap = capacity();

  if (garden.level === 1) {
    const full = count >= cap;
    expandBoxEl.innerHTML =
      `<div class="expand-title">🌱 1단계 · 작은 정원</div>` +
      `<div class="expand-sub">식물 ${count}/${cap}칸</div>` +
      `<div class="bar"><div style="width: ${(count / cap) * 100}%"></div></div>` +
      (full
        ? ""
        : `<div class="status-note">${cap}칸을 모두 채우면 2단계 정원으로 확장할 수 있어요 (⭐${EXPAND_COST} 필요)</div>`);

    if (full) {
      const btn = document.createElement("button");
      btn.className = "primary";
      btn.textContent = `🏡 2단계 정원으로 확장하기 (⭐${EXPAND_COST})`;
      btn.disabled = totalStars < EXPAND_COST;
      btn.addEventListener("click", expandGarden);
      expandBoxEl.appendChild(btn);
    }
  } else {
    expandBoxEl.innerHTML =
      `<div class="expand-title">🏡 2단계 · 꾸미기 정원</div>` +
      `<div class="expand-sub">식물 ${count}/${cap}칸 · 장식 ${garden.decor.length}/${MAX_DECOR}개</div>`;
  }
}

function expandGarden() {
  if (garden.level !== 1 || garden.planted.length < capacity()) return;
  if (totalStars < EXPAND_COST) {
    gardenMsgEl.textContent = "별이 부족해요. 스도쿠를 풀어서 모아 보세요!";
    return;
  }
  totalStars -= EXPAND_COST;
  saveStars(totalStars);
  showStars();
  garden.level = 2;
  gardenMsgEl.textContent = "🎉 2단계 정원으로 확장했어요! 상점이 열렸고, 장식을 옮길 수 있어요.";
  saveGarden();
  renderGarden();
}

// 물 주기 / 다 자라면 정원에 심기
function treeAction() {
  const g = garden.growing;
  if (!g) return;
  const plant = PLANTS[g.plant];

  if (g.stage === maxStageOf(g.plant)) {
    garden.planted.push(g.plant);
    if (!garden.discovered.includes(g.plant)) garden.discovered.push(g.plant);
    garden.growing = null;
    gardenMsgEl.textContent = `${plant.name}를 정원에 심었어요! 새로 키울 식물을 골라 보세요.`;
    saveGarden();
    renderGarden(true);
    return;
  }

  if (totalStars < plant.cost) {
    gardenMsgEl.textContent = "별이 부족해요. 스도쿠를 풀어서 모아 보세요!";
    return;
  }

  totalStars -= plant.cost;
  saveStars(totalStars);
  showStars();
  g.stage++;
  gardenMsgEl.textContent =
    g.stage === maxStageOf(g.plant) ? "다 자랐어요! 정원에 심어 주세요." : "무럭무럭 자라고 있어요 💧";
  saveGarden();
  renderGarden(true);
}

// ===== 정원 풍경 =====

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
    if (entry.kind === "tree") size *= 1.6;
    else if (entry.kind === "flower") size *= 1.3;
  }
  return size * scale;
}

// 1단계 작은 정원의 식물 자리 (x, y는 % 단위): 3칸 x 2줄
const SLOT_POS = [[26, 64], [50, 64], [74, 64], [26, 86], [50, 86], [74, 86]];

function renderScene() {
  sceneEl.innerHTML = "";
  sceneEl.classList.toggle("small", garden.level === 1);
  if (garden.level === 1) renderSmallScene();
  else renderBigScene();
}

// 1단계: 울타리 친 작은 화단. 다 자란 식물은 알아서 빈자리에 심어진다 (옮길 수 없음)
function renderSmallScene() {
  const add = (cls, html, x, y, width) => {
    const el = document.createElement("div");
    el.className = cls;
    if (html) el.innerHTML = html;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    if (width) el.style.width = `${width}%`;
    sceneEl.appendChild(el);
    return el;
  };

  add("scene-sun", "☀️", 88, 14);
  const bed = document.createElement("div");
  bed.className = "bed";
  sceneEl.appendChild(bed);

  SLOT_POS.forEach(([x, y], i) => {
    if (i < garden.planted.length) {
      const id = garden.planted[i];
      add("slot-plant", plantSVG(id, maxStageOf(id)), x, y, 22);
    } else if (i === garden.planted.length && garden.growing) {
      const g = garden.growing;
      const el = add("slot-plant growing", plantSVG(g.plant, g.stage), x, y, 22);
      el.title = `키우는 중 · ${PLANTS[g.plant].stages[g.stage]}`;
    } else {
      add("slot", "", x, y);
    }
  });

  const count = garden.planted.length;
  sceneInfoEl.textContent =
    count === 0 && !garden.growing
      ? "별로 식물을 키워서 정원을 채워 보세요!"
      : count >= capacity()
        ? "정원이 가득 찼어요! 키우기 탭에서 2단계로 확장할 수 있어요."
        : `식물 ${count}/${capacity()}칸 · 다 자라면 알아서 심어져요`;
}

// 2단계: 넓은 정원. 장식을 사서 꾸미고, 끌어서 옮기고, 크기를 바꿀 수 있다
function renderBigScene() {
  // 지금 키우는 식물은 정원 가운데 앞쪽 (옮길 수 없음)
  const placed = [{ x: 50, y: 78 }];
  const things = [];
  const g = garden.growing;
  if (g) {
    const kind = PLANTS[g.plant].type;
    things.push({ plantId: g.plant, stage: g.stage, kind, x: 50, y: 78, size: kind === "tree" ? 60 : 46, label: true });
  }

  // 심은 식물과 산 장식. key는 옮긴 위치/크기를 저장할 때 쓰는 이름
  const entries = [
    ...garden.planted.map((id, i) => ({ plantId: id, kind: PLANTS[id].type, key: `t${i}` })),
    ...garden.decor.map((id, i) => {
      const item = SHOP_ITEMS.find((it) => it.id === id);
      return item ? { emoji: item.emoji, sky: !!item.sky, big: id === "rainbow", key: `d${i}` } : null;
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
    if (t.plantId) {
      const stage = t.stage ?? maxStageOf(t.plantId);
      el.innerHTML = plantSVG(t.plantId, stage, t.size * 1.3);
    } else {
      el.textContent = t.emoji;
    }
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
      label.textContent = `키우는 중 · ${PLANTS[t.plantId].stages[t.stage]}`;
      label.style.left = `${t.x}%`;
      label.style.top = `${t.y + 8}%`;
      label.style.zIndex = 2000;
      sceneEl.appendChild(label);
    }
  });

  sceneInfoEl.textContent =
    garden.decor.length + garden.planted.length === 0
      ? "상점에서 장식을 사고 식물을 심어 정원을 꾸며 보세요!"
      : `식물 ${garden.planted.length}개 · 장식 ${garden.decor.length}개 · 끌어서 옮기고, 마우스 휠이나 두 손가락으로 크기를 바꿀 수 있어요`;
}

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


// ===== 상점 (2단계 정원에서 열림. 별로 장식 사기) =====
// basic: true는 2단계 기본 장식 (싸게 늘 열려 있음), 나머지는 특별 장식
const SHOP_ITEMS = [
  { id: "tulip", basic: true, emoji: "🌷", name: "튤립", price: 1 },
  { id: "sunflower", emoji: "🌻", name: "해바라기", price: 2 },
  { id: "mushroom", basic: true, emoji: "🍄", name: "버섯", price: 1 },
  { id: "rock", basic: true, emoji: "🪨", name: "바위", price: 1 },
  { id: "bee", sky: true, emoji: "🐝", name: "꿀벌", price: 4 },
  { id: "butterfly", sky: true, emoji: "🦋", name: "나비", price: 4 },
  { id: "bench", emoji: "🪑", name: "벤치", price: 5 },
  { id: "lantern", emoji: "🏮", name: "등불", price: 5 },
  { id: "birdhouse", emoji: "🏠", name: "새집", price: 6 },
  { id: "fountain", emoji: "⛲", name: "분수", price: 8 },
  { id: "rabbit", emoji: "🐇", name: "토끼", price: 10 },
  { id: "rainbow", sky: true, emoji: "🌈", name: "무지개", price: 12 },
];
const shopStarsEl = document.getElementById("shop-stars");
const shopListEl = document.getElementById("shop-list");
const shopMsgEl = document.getElementById("shop-msg");

function renderShop() {
  shopListEl.innerHTML = "";
  const heading = (text) => {
    const h = document.createElement("div");
    h.className = "shop-heading";
    h.textContent = text;
    shopListEl.appendChild(h);
  };
  const decorCount = garden.level >= 2 ? ` · 장식 ${garden.decor.length}/${MAX_DECOR}` : "";
  shopStarsEl.textContent = `보유 별 ⭐ ${totalStars}${decorCount}`;

  // 씨앗: 모든 단계에서 살 수 있다. 한 번 사면 그 식물을 계속 심을 수 있다
  heading("🌱 씨앗 (한 번 사면 계속 심을 수 있어요)");
  PLANT_IDS.forEach((id) => {
    const owned = garden.unlocked.includes(id);
    const card = document.createElement("div");
    card.className = "shop-item";
    card.innerHTML =
      `<div class="plant-art">${plantSVG(id, maxStageOf(id))}</div>` +
      `<div class="name">${PLANTS[id].name}</div>` +
      `<div class="owned">${owned ? (SEED_PRICE[id] === 0 ? "기본 식물" : "보유 중") : PLANTS[id].type === "tree" ? "나무" : "꽃"}</div>`;

    const btn = document.createElement("button");
    if (owned) {
      btn.textContent = "✔ 열림";
      btn.disabled = true;
    } else {
      btn.textContent = `⭐ ${SEED_PRICE[id]} 구매`;
      btn.disabled = totalStars < SEED_PRICE[id];
      btn.addEventListener("click", () => buySeed(id));
    }
    card.appendChild(btn);
    shopListEl.appendChild(card);
  });

  // 장식: 2단계 정원에서 열린다
  if (garden.level < 2) {
    heading("🌷 장식");
    shopListEl.insertAdjacentHTML(
      "beforeend",
      `<div class="lock-box">` +
        `<div class="lock-icon">🔒</div>` +
        `<div class="name">장식은 2단계 정원에서 열려요</div>` +
        `<div class="status-note">작은 정원 ${capacity()}칸을 식물로 모두 채우고<br>⭐${EXPAND_COST}로 확장하면 살 수 있어요.<br>(지금 ${garden.planted.length}/${capacity()}칸)</div>` +
        `</div>`
    );
    return;
  }

  const addDecor = (item) => {
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
  };

  heading("🪨 기본 장식");
  SHOP_ITEMS.filter((it) => it.basic).forEach(addDecor);
  heading("✨ 특별 장식");
  SHOP_ITEMS.filter((it) => !it.basic).forEach(addDecor);
}

// 씨앗 사기: 한 번 사면 계속 심을 수 있다
function buySeed(id) {
  if (garden.unlocked.includes(id)) return;
  if (totalStars < SEED_PRICE[id]) {
    shopMsgEl.textContent = "별이 부족해요. 스도쿠를 풀어서 모아 보세요!";
    return;
  }
  totalStars -= SEED_PRICE[id];
  saveStars(totalStars);
  showStars();
  garden.unlocked.push(id);
  saveGarden();
  shopMsgEl.textContent = `${PLANTS[id].name} 씨앗을 샀어요! 키우기 탭에서 심을 수 있어요.`;
  renderShop();
}

function buyItem(id) {
  const item = SHOP_ITEMS.find((it) => it.id === id);
  if (!item || garden.level < 2) return;

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

// 지금 키우는 식물의 이름/단계/진행률. 없으면 null
function growingInfo() {
  const g = garden.growing;
  if (!g) return null;
  const plant = PLANTS[g.plant];
  const max = maxStageOf(g.plant);
  return {
    g,
    plant,
    max,
    title: `${plant.name} · ${plant.stages[g.stage]}`,
    stageText: `${g.stage + 1}/${max + 1}단계`,
    starsNeeded: (max - g.stage) * plant.cost,
  };
}

function renderStatus() {
  const info = growingInfo();
  const best = loadBest();

  let html = '<div class="status-tree">';
  if (info) {
    const note =
      info.g.stage === info.max
        ? "다 자랐어요! 정원에 심어 주세요."
        : `다 자랄 때까지 ⭐${info.starsNeeded}개 필요 (보유 ⭐${totalStars}개)`;
    html += `
      <div class="big">${plantSVG(info.g.plant, info.g.stage)}</div>
      <div class="tree-name">${info.title} · ${info.stageText}</div>
      <div class="bar"><div style="width: ${(info.g.stage / info.max) * 100}%"></div></div>
      <div class="status-note">${note}</div>`;
  } else {
    html += `
      <div class="big">${seedSVG()}</div>
      <div class="tree-name">키우는 식물이 없어요</div>
      <div class="status-note">키우기 탭에서 새 식물을 골라 보세요.</div>`;
  }
  html += "</div>";

  const levelName = garden.level === 1 ? "🌱 1단계 · 작은 정원" : "🏡 2단계 · 꾸미기 정원";
  html += `
    <ul class="stat-list">
      ${statRow("정원 단계", levelName)}
      ${statRow("🌳 심은 식물", `${garden.planted.length}/${capacity()}칸`)}
      ${statRow("🌷 정원 장식", garden.level === 1 ? "🔒 2단계에서 열림" : `${garden.decor.length}개`)}
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

  // 도감: 정원에 한 번이라도 심은 식물만 공개된다
  html += `<h3 class="dex-title">📖 식물 도감 ${garden.discovered.length}/${PLANT_IDS.length}</h3><div class="dex">`;
  PLANT_IDS.forEach((id) => {
    const found = garden.discovered.includes(id);
    html += found
      ? `<div class="dex-item">${plantSVG(id, maxStageOf(id))}<div>${PLANTS[id].name}</div></div>`
      : `<div class="dex-item locked"><div class="dex-q">?</div><div>???</div></div>`;
  });
  html += "</div>";

  statusBodyEl.innerHTML = html;
}

// 홈 화면의 식물 카드
function renderHomePlant() {
  const info = growingInfo();
  const art = document.getElementById("home-tree");
  const name = document.getElementById("home-tree-name");
  const dotsEl = document.getElementById("home-dots");
  dotsEl.innerHTML = "";

  if (!info) {
    art.innerHTML = seedSVG();
    name.textContent = "키우는 식물이 없어요";
    return;
  }

  art.innerHTML = plantSVG(info.g.plant, info.g.stage);
  name.textContent = `${info.title} · ${info.stageText}`;
  for (let i = 0; i <= info.max; i++) {
    const dot = document.createElement("span");
    if (i <= info.g.stage) dot.className = "on";
    dotsEl.appendChild(dot);
  }
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
  renderHome(); // 식물이 자랐을 수 있으니 홈 표시도 갱신
}
