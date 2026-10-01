// ===== 정원 (식물 키우기 · 꾸미기) =====
// 이 파일은 script.js보다 먼저 불러온다. 별(totalStars)·타이머 같은 공용 값은
// 함수 안에서 쓸 때(실행 시점)에 script.js에 있는 것을 가져다 쓴다.

const GARDEN_KEY = "sudoku-garden";
const ITEM_LIMIT = 10;  // 정원 하나에 놓을 수 있는 아이템 수 (식물 + 장식)
const UNLOCK_COST = 20; // 다음 정원을 여는 데 드는 별

// 정원 목록. 단계마다 배경, 키울 수 있는 식물, 파는 장식이 다르다
const GARDENS = {
  1: { name: "풀밭 정원", icon: "🌱", theme: "meadow", plants: ["apple", "tulip", "cherry", "sunflower", "rose"] },
  2: { name: "연못 정원", icon: "🌊", theme: "pond", plants: ["lotus", "bamboo", "hydrangea", "reed"] },
};
const GARDEN_IDS = Object.keys(GARDENS).map(Number);

// 식물 종류. cost = 한 단계 키우는 데 드는 별, stages = 단계 이름 (마지막이 다 자란 모습)
// type은 정원 풍경에서 보이는 크기 기준 (tree는 크게, flower는 작게)
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
  lotus: {
    name: "연꽃", type: "flower", cost: 2,
    stages: ["연잎", "봉오리", "활짝 핀 연꽃"],
  },
  bamboo: {
    name: "대나무", type: "tree", cost: 3,
    stages: ["새싹", "죽순", "어린 대나무", "대나무"],
  },
  hydrangea: {
    name: "수국", type: "flower", cost: 2,
    stages: ["새싹", "봉오리", "활짝 핀 수국"],
  },
  reed: {
    name: "갈대", type: "flower", cost: 2,
    stages: ["새싹", "갈대", "이삭 핀 갈대"],
  },
};
const PLANT_IDS = Object.keys(PLANTS);
// 씨앗 가격: 상점에서 한 번 사면 그 식물을 계속 심을 수 있다. 0원은 기본 식물(처음부터 열려 있음)
const SEED_PRICE = { apple: 0, tulip: 0, cherry: 8, sunflower: 4, rose: 6, lotus: 0, bamboo: 0, hydrangea: 6, reed: 4 };
const STARTER_PLANTS = ["apple", "tulip", "lotus", "bamboo"];
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

// 꽃 (해바라기 / 튤립 / 장미 / 연꽃 / 수국 / 갈대): 0 새싹, 1 봉오리, 2 활짝 핀 모습
function flowerSVG(kind, stage, size) {
  const leaf = (x, y, rot, fill) =>
    `<ellipse cx="${x}" cy="${y}" rx="11" ry="5" fill="${fill}" transform="rotate(${rot} ${x} ${y})"/>`;

  if (kind === "lotus") {
    // 연꽃: 물 위에 연잎이 떠 있고, 자라면 봉오리 → 활짝 핀 꽃
    let body =
      '<ellipse cx="50" cy="88" rx="32" ry="8" fill="rgba(79,163,214,0.35)"/>' +
      '<ellipse cx="50" cy="82" rx="27" ry="8" fill="#43a047"/>' +
      '<ellipse cx="50" cy="80" rx="23" ry="6" fill="#66bb6a"/>';
    if (stage === 1) {
      body +=
        '<path d="M50 80 C50 70 50 62 50 54" stroke="#4caf50" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="50" cy="48" rx="6" ry="11" fill="#f48fb1"/>';
    } else if (stage >= 2) {
      [-52, -26, 0, 26, 52].forEach((a) => {
        body += `<ellipse cx="50" cy="56" rx="7" ry="16" fill="#f8bbd0" transform="rotate(${a} 50 72)"/>`;
      });
      [-34, 0, 34].forEach((a) => {
        body += `<ellipse cx="50" cy="60" rx="6" ry="12" fill="#f06292" transform="rotate(${a} 50 72)"/>`;
      });
      body += svgCircle(50, 68, 4, "#ffd54f");
    }
    return svgWrap(body, size);
  }

  if (stage === 0) return svgWrap(GROUND_SHADOW + SPROUT, size);

  if (kind === "reed") {
    // 갈대: 가늘고 긴 잎, 다 자라면 끝에 이삭이 달린다
    const blades = [["M50 90 Q46 60 36 40", -20, 36, 38], ["M50 90 Q50 56 50 28", 0, 50, 26], ["M50 90 Q54 60 64 40", 20, 64, 38]];
    let body = GROUND_SHADOW;
    blades.forEach(([d]) => {
      body += `<path d="${d}" stroke="#7cb342" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    });
    if (stage >= 2) {
      blades.forEach(([, rot, x, y]) => {
        body += `<ellipse cx="${x}" cy="${y - 6}" rx="4.5" ry="12" fill="#d7bd8d" transform="rotate(${rot} ${x} ${y - 6})"/>`;
      });
    }
    return svgWrap(body, size);
  }

  let body =
    GROUND_SHADOW +
    '<path d="M50 90 C50 78 50 66 50 54" stroke="#3f9b49" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    leaf(39, 76, -30, "#5cc86a") +
    leaf(61, 70, 30, "#4caf50");

  if (stage === 1) {
    // 봉오리: 꽃마다 색이 살짝 비친다
    if (kind === "hydrangea") {
      body += svgCircle(44, 52, 6, "#9fa8da") + svgCircle(56, 50, 6, "#7986cb") + svgCircle(50, 42, 6, "#9fa8da");
    } else {
      const tip = { sunflower: "#ffc107", tulip: "#ff8aa8", rose: "#e8445a" }[kind];
      body += svgCircle(50, 50, 7, "#4caf50") + `<ellipse cx="50" cy="46" rx="5" ry="6" fill="${tip}"/>`;
    }
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
  } else if (kind === "hydrangea") {
    // 작은 꽃송이가 둥글게 모여 핀다
    const colors = ["#7986cb", "#9fa8da", "#5c6bc0"];
    let n = 0;
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const x = 50 + col * 9 + (row % 2 ? 4.5 : 0);
        const y = 42 + row * 8;
        if ((x - 50) ** 2 + (y - 42) ** 2 <= 24 ** 2) body += svgCircle(x, y, 6, colors[n++ % 3]);
      }
    }
  } else {
    body +=
      svgCircle(50, 40, 15, "#e8445a") + svgCircle(50, 40, 11, "#c9324a") +
      svgCircle(50, 40, 7, "#e8445a") + svgCircle(50, 40, 3.5, "#b02440") +
      '<path d="M41 40 Q50 31 59 40" stroke="#8f1d33" stroke-width="1.5" fill="none"/>';
  }
  return svgWrap(body, size);
}

// 대나무: 0 새싹, 1 죽순, 2 어린 대나무(줄기 둘), 3 대나무(줄기 넷)
function bambooSVG(stage, size) {
  if (stage === 0) return svgWrap(GROUND_SHADOW + SPROUT, size);

  const stalk = (x, top) => {
    let s = `<rect x="${x - 3.5}" y="${top}" width="7" height="${90 - top}" rx="3" fill="#7cb342"/>`;
    for (let y = top + 14; y < 88; y += 16) {
      s += `<path d="M${x - 4} ${y} H${x + 4}" stroke="#558b2f" stroke-width="2.5"/>`;
    }
    return s;
  };
  const leaf = (x, y, rot) =>
    `<ellipse cx="${x}" cy="${y}" rx="11" ry="3.5" fill="#66bb6a" transform="rotate(${rot} ${x} ${y})"/>`;

  let body = GROUND_SHADOW;
  if (stage === 1) {
    body +=
      '<path d="M42 90 L46 56 L50 46 L54 56 L58 90 Z" fill="#c5a572"/>' +
      '<path d="M43 80 H57 M44 70 H56 M45 60 H55" stroke="#9c7a45" stroke-width="2"/>' +
      '<path d="M46 56 L50 46 L54 56 Z" fill="#8bc34a"/>';
  } else if (stage === 2) {
    body +=
      stalk(42, 36) + stalk(58, 46) +
      leaf(42, 40, -30) + leaf(42, 50, 30) + leaf(58, 50, -30) + leaf(58, 60, 30);
  } else {
    body +=
      stalk(32, 22) + stalk(46, 12) + stalk(60, 24) + stalk(73, 38) +
      leaf(32, 26, -30) + leaf(32, 36, 30) + leaf(46, 16, -30) + leaf(46, 26, 30) +
      leaf(60, 28, -30) + leaf(60, 38, 30) + leaf(73, 42, -30) + leaf(73, 52, 30);
  }
  return svgWrap(body, size);
}

function plantSVG(id, stage, size) {
  if (id === "apple" || id === "cherry") return treeSVG(id, stage, size);
  if (id === "bamboo") return bambooSVG(stage, size);
  return flowerSVG(id, stage, size);
}

// ----- 정원 상태 -----
// current: 지금 보고 있는 정원 번호, unlockedGardens: 열린 정원 수
// gardens[번호]: 그 정원에 놓인 것들
//   planted(심은 식물 id들), decor(산 장식 id들),
//   positions(직접 옮긴 위치), scales(직접 바꾼 크기 배율)  — 키 예: d0(장식 0번), t1(식물 1번)
// growing: 지금 키우는 식물 {plant, stage, garden(다 자라면 심어질 정원)} (없으면 null)
// discovered: 도감에 등록된 식물 id들, unlocked: 심을 수 있게 열린 식물 id들(기본 + 산 씨앗)
let garden = defaultGarden();
let resumeOnClose = false; // 정원을 닫을 때 타이머를 이어갈지
let activeTab = "grow";    // 정원 화면에서 열려 있는 탭
let selectedKey = null;    // 정원 풍경에서 선택한 항목 (치우기 버튼용)

function emptyGardenData() {
  return { planted: [], decor: [], positions: {}, scales: {} };
}

function defaultGarden() {
  const gardens = {};
  GARDEN_IDS.forEach((id) => (gardens[id] = emptyGardenData()));
  return {
    current: 1, unlockedGardens: 1, growing: null, gardens,
    discovered: [], unlocked: [...STARTER_PLANTS],
  };
}

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

// 저장된 데이터를 읽는다. 예전 형식이면 새 형식으로 바꿔 준다
function loadGarden() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(GARDEN_KEY));
  } catch {
    // 저장소를 못 쓰거나 값이 깨졌으면 새로 시작
  }
  if (!isObject(saved)) return defaultGarden();
  return isObject(saved.gardens) ? sanitizeGarden(saved) : fromOldFormat(saved);
}

// 현재 형식의 저장 데이터를 검사해서 깨진 값은 바로잡는다
function sanitizeGarden(saved) {
  const g = defaultGarden();
  const validPlants = (arr) => (Array.isArray(arr) ? arr.filter((id) => PLANTS[id]) : []);

  GARDEN_IDS.forEach((id) => {
    const d = saved.gardens[id];
    if (!isObject(d)) return;
    g.gardens[id] = {
      planted: validPlants(d.planted),
      decor: Array.isArray(d.decor) ? d.decor.filter((x) => typeof x === "string") : [],
      positions: isObject(d.positions) ? d.positions : {},
      scales: isObject(d.scales) ? d.scales : {},
    };
  });

  g.unlockedGardens = clampInt(Number(saved.unlockedGardens) || 1, 1, GARDEN_IDS.length);
  g.current = clampInt(Number(saved.current) || 1, 1, g.unlockedGardens);

  const gr = saved.growing;
  if (isObject(gr) && PLANTS[gr.plant] && Number.isInteger(gr.stage)) {
    g.growing = {
      plant: gr.plant,
      stage: clampInt(gr.stage, 0, maxStageOf(gr.plant)),
      garden: GARDEN_IDS.includes(gr.garden) ? gr.garden : 1,
    };
  }

  const found = new Set(validPlants(saved.discovered));
  const unlocked = new Set(validPlants(saved.unlocked));
  STARTER_PLANTS.forEach((id) => unlocked.add(id));
  GARDEN_IDS.forEach((id) => g.gardens[id].planted.forEach((p) => (found.add(p), unlocked.add(p))));
  if (g.growing) unlocked.add(g.growing.plant);
  g.discovered = [...found];
  g.unlocked = [...unlocked];
  return g;
}

// 정원이 하나뿐이던 예전 형식(level, planted, decor ...)을 1단계 정원으로 옮긴다
function fromOldFormat(saved) {
  const OLD_PLANTS = ["apple", "cherry", "sunflower", "tulip", "rose"]; // 그때 있던 식물들
  const legacy = saved.level === undefined; // 더 예전: stage(숫자)와 planted만 있음
  const validId = (id) => (PLANTS[id] ? id : "apple"); // 아주 예전 이모지 값 등은 사과나무로
  const planted = Array.isArray(saved.planted) ? saved.planted.map(validId) : [];
  const decor = Array.isArray(saved.decor) ? saved.decor.filter((d) => typeof d === "string") : [];

  const g = defaultGarden();
  g.gardens[1] = {
    planted,
    decor,
    positions: isObject(saved.positions) ? saved.positions : {},
    scales: isObject(saved.scales) ? saved.scales : {},
  };

  if (legacy) {
    if (Number.isInteger(saved.stage) && saved.stage > 0) {
      g.growing = { plant: "apple", stage: Math.min(saved.stage, maxStageOf("apple")), garden: 1 };
    }
  } else if (isObject(saved.growing) && PLANTS[saved.growing.plant] && Number.isInteger(saved.growing.stage)) {
    const id = saved.growing.plant;
    g.growing = { plant: id, stage: clampInt(saved.growing.stage, 0, maxStageOf(id)), garden: 1 };
  }

  // 예전에 '2단계(넓은 정원)'였던 사람은 새 2단계 정원을 바로 열어 준다
  g.unlockedGardens = saved.level === 2 ? 2 : 1;

  const found = new Set(planted);
  if (Array.isArray(saved.discovered)) saved.discovered.forEach((id) => PLANTS[id] && found.add(id));
  // 씨앗 상점이 생기기 전에 저장된 정원은 그때 있던 식물을 전부 쓰고 있었으니 모두 열어 둔다
  const unlocked = new Set(Array.isArray(saved.unlocked) ? saved.unlocked.filter((id) => PLANTS[id]) : OLD_PLANTS);
  STARTER_PLANTS.forEach((id) => unlocked.add(id));
  planted.forEach((id) => unlocked.add(id));
  if (g.growing) unlocked.add(g.growing.plant);
  g.discovered = [...found];
  g.unlocked = [...unlocked];
  return g;
}

function saveGarden() {
  try {
    localStorage.setItem(GARDEN_KEY, JSON.stringify(garden));
  } catch {
    // 저장 실패는 무시
  }
}

// ----- 정원 도우미 -----
const cur = () => garden.gardens[garden.current];  // 지금 보고 있는 정원의 데이터
const placedCount = (gid = garden.current) => garden.gardens[gid].planted.length + garden.gardens[gid].decor.length;
// 놓였거나, 곧 놓일(키우는 중인) 아이템 수. 키우는 식물도 한 칸을 미리 차지한다
const usedSlots = (gid = garden.current) =>
  placedCount(gid) + (garden.growing && garden.growing.garden === gid ? 1 : 0);
const isGardenFull = (gid = garden.current) => usedSlots(gid) >= ITEM_LIMIT;
const gardenLabel = (id) => `${GARDENS[id].icon} ${id}단계 ${GARDENS[id].name}`;

// ----- 화면 요소 -----
const gardenEl = document.getElementById("garden");
const gardenSwitchEl = document.getElementById("garden-switch");
const growViewEl = document.getElementById("grow-view");
const treeEl = document.getElementById("tree");
const treeNameEl = document.getElementById("tree-name");
const growTargetEl = document.getElementById("grow-target");
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
const sceneActionsEl = document.getElementById("scene-actions");
const sceneInfoEl = document.getElementById("scene-info");
const statusBodyEl = document.getElementById("status-body");

// 정원 선택 (위쪽 버튼): 단계마다 다른 정원을 오가며 본다
function renderGardenSwitch() {
  gardenSwitchEl.innerHTML = "";
  GARDEN_IDS.forEach((id) => {
    const open = id <= garden.unlockedGardens;
    const btn = document.createElement("button");
    btn.className = "garden-tab" + (id === garden.current ? " active" : "") + (open ? "" : " locked");
    btn.textContent = open ? gardenLabel(id) : `🔒 ${id}단계 ${GARDENS[id].name}`;
    btn.addEventListener("click", () => {
      if (!open) {
        // 아직 못 여는 정원: 열 조건을 안내하는 키우기 탭으로
        showTab("grow");
        gardenMsgEl.textContent = `${id - 1}단계 정원을 ${ITEM_LIMIT}칸 모두 채우고 ⭐${UNLOCK_COST}로 열 수 있어요.`;
        return;
      }
      garden.current = id;
      selectedKey = null;
      saveGarden();
      showTab(activeTab);
    });
    gardenSwitchEl.appendChild(btn);
  });
}

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
    growTargetEl.textContent = `다 자라면 ${gardenLabel(g.garden)}에 심어져요`;

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

// 키울 식물 고르기 (지금 보고 있는 정원에서 키울 수 있는 식물만)
function renderPicker() {
  const full = isGardenFull();
  pickerEl.innerHTML =
    `<div class="picker-title">${GARDENS[garden.current].name}에 무엇을 심을까요?</div><div class="picker-grid"></div>`;
  const grid = pickerEl.querySelector(".picker-grid");

  GARDENS[garden.current].plants.forEach((id) => {
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
    note.textContent = "이 정원이 가득 찼어요. 아래에서 다음 정원을 열거나, 풍경에서 아이템을 치워 보세요!";
    pickerEl.appendChild(note);
  }
}

function startPlant(id) {
  if (garden.growing || isGardenFull() || !garden.unlocked.includes(id)) return;
  if (!GARDENS[garden.current].plants.includes(id)) return;
  garden.growing = { plant: id, stage: 0, garden: garden.current };
  gardenMsgEl.textContent = `${PLANTS[id].name}의 새싹을 심었어요 🌱`;
  saveGarden();
  renderGarden(true);
}

// 지금 정원의 칸 수 안내 + (가득 차면) 다음 정원 열기 버튼
function renderExpandBox() {
  const d = cur();
  const id = garden.current;
  const next = id + 1;
  const used = usedSlots();

  expandBoxEl.innerHTML =
    `<div class="expand-title">${gardenLabel(id)}</div>` +
    `<div class="expand-sub">아이템 ${placedCount()}/${ITEM_LIMIT}칸 (식물 ${d.planted.length}개 · 장식 ${d.decor.length}개)</div>` +
    `<div class="bar"><div style="width: ${(used / ITEM_LIMIT) * 100}%"></div></div>`;

  if (GARDENS[next] && next > garden.unlockedGardens) {
    if (used >= ITEM_LIMIT) {
      const btn = document.createElement("button");
      btn.className = "primary";
      btn.textContent = `${gardenLabel(next)} 열기 (⭐${UNLOCK_COST})`;
      btn.disabled = totalStars < UNLOCK_COST;
      btn.addEventListener("click", () => unlockGarden(next));
      expandBoxEl.appendChild(btn);
    } else {
      expandBoxEl.insertAdjacentHTML(
        "beforeend",
        `<div class="status-note">${ITEM_LIMIT}칸을 모두 채우면 ${gardenLabel(next)}을 열 수 있어요 (⭐${UNLOCK_COST} 필요)</div>`
      );
    }
  }
}

function unlockGarden(n) {
  if (!GARDENS[n] || n !== garden.unlockedGardens + 1 || !isGardenFull(n - 1)) return;
  if (totalStars < UNLOCK_COST) {
    gardenMsgEl.textContent = "별이 부족해요. 스도쿠를 풀어서 모아 보세요!";
    return;
  }
  totalStars -= UNLOCK_COST;
  saveStars(totalStars);
  showStars();
  garden.unlockedGardens = n;
  garden.current = n;
  selectedKey = null;
  saveGarden();
  showTab("grow");
  gardenMsgEl.textContent = `🎉 ${gardenLabel(n)}이 열렸어요! 새 식물과 장식을 만나 보세요.`;
}

// 물 주기 / 다 자라면 정원에 심기
function treeAction() {
  const g = garden.growing;
  if (!g) return;
  const plant = PLANTS[g.plant];

  if (g.stage === maxStageOf(g.plant)) {
    garden.gardens[g.garden].planted.push(g.plant); // 키우기 시작한 정원에 심는다
    if (!garden.discovered.includes(g.plant)) garden.discovered.push(g.plant);
    garden.growing = null;
    gardenMsgEl.textContent = `${plant.name}를 ${GARDENS[g.garden].name}에 심었어요! 새로 키울 식물을 골라 보세요.`;
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

// 식물과 장식을 자유롭게 끌어서 옮기고, 크기를 바꾼다 (놓을 수 있는 개수만 정원마다 제한)
function renderScene() {
  const d = cur();
  GARDEN_IDS.forEach((id) => sceneEl.classList.remove(GARDENS[id].theme));
  sceneEl.classList.add(GARDENS[garden.current].theme);
  sceneEl.innerHTML = "";

  // 이 정원에서 키우는 식물은 정원 가운데 앞쪽 (옮길 수 없음)
  const placed = [{ x: 50, y: 78 }];
  const things = [];
  const g = garden.growing && garden.growing.garden === garden.current ? garden.growing : null;
  if (g) {
    const kind = PLANTS[g.plant].type;
    things.push({ plantId: g.plant, stage: g.stage, kind, x: 50, y: 78, size: kind === "tree" ? 60 : 46, label: true });
  }

  // 심은 식물과 산 장식. key는 옮긴 위치/크기를 저장할 때 쓰는 이름
  const entries = [
    ...d.planted.map((id, i) => ({ plantId: id, kind: PLANTS[id].type, key: `t${i}` })),
    ...d.decor.map((id, i) => {
      const item = SHOP_ITEMS.find((it) => it.id === id);
      return item ? { emoji: item.emoji, sky: !!item.sky, big: id === "rainbow", key: `d${i}` } : null;
    }),
  ].filter(Boolean);

  entries.forEach((entry, i) => {
    // 자동 배치는 옮긴 위치와 상관없이 계산해서, 하나를 옮겨도 다른 것들이 움직이지 않는다
    const auto = pickSpot(i, entry.sky, placed);
    placed.push(auto);
    const spot = d.positions[entry.key] || auto;
    const scale = d.scales[entry.key] ?? 1;
    things.push({ ...entry, scale, x: spot.x, y: spot.y, size: sceneSize(entry, spot.y, scale) });
  });

  if (selectedKey && !entries.some((e) => e.key === selectedKey)) selectedKey = null;

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
    el.style.zIndex = Math.round(t.y * 10) + 10; // 아래쪽 것이 앞에 오게
    sceneEl.appendChild(el);

    if (t.key) {
      el.classList.add("movable");
      el.classList.toggle("selected", t.key === selectedKey);
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

  renderSceneActions();
  sceneInfoEl.textContent =
    placedCount() === 0
      ? "식물을 키우고 상점에서 장식을 사서 정원을 꾸며 보세요!"
      : `${gardenLabel(garden.current)} · 아이템 ${placedCount()}/${ITEM_LIMIT}칸 · 끌어서 옮기고, 마우스 휠이나 두 손가락으로 크기를 바꿀 수 있어요`;
}

// 선택한 항목을 치우는 버튼 (실수로 누르지 않게 두 번 눌러야 치워진다)
function renderSceneActions() {
  sceneActionsEl.innerHTML = "";
  if (!selectedKey) return;

  const btn = document.createElement("button");
  btn.className = "secondary";
  btn.textContent = "🗑 선택한 아이템 치우기 (별은 돌려받지 않아요)";
  let armed = false;
  btn.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      btn.classList.add("danger");
      btn.textContent = "정말 치울까요? 한 번 더 누르세요";
      return;
    }
    removeItem(selectedKey);
    selectedKey = null;
    renderScene();
  });
  sceneActionsEl.appendChild(btn);
}

// 아이템을 치운다. 뒤에 있던 항목들의 번호가 하나씩 당겨지므로, 저장된 위치/크기의 키도 같이 당긴다
function removeItem(key) {
  const d = cur();
  const type = key[0];
  const index = Number(key.slice(1));
  const list = type === "t" ? d.planted : d.decor;
  if (!(index >= 0 && index < list.length)) return;
  list.splice(index, 1);

  [d.positions, d.scales].forEach((map) => {
    const entries = Object.entries(map);
    Object.keys(map).forEach((k) => delete map[k]);
    entries.forEach(([k, v]) => {
      if (k[0] !== type) {
        map[k] = v;
        return;
      }
      const j = Number(k.slice(1));
      if (j === index) return; // 치운 항목의 위치/크기는 버린다
      map[`${type}${j > index ? j - 1 : j}`] = v;
    });
  });
  saveGarden();
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
      if (!el) {
        // 빈 곳을 누르면 선택 해제
        if (selectedKey) {
          selectedKey = null;
          renderScene();
        }
        return;
      }
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
    const key = active.thing.key;
    if (active.changed) {
      cur().positions[key] = { x: active.x, y: active.y };
      cur().scales[key] = active.scale;
      saveGarden();
    }
    selectedKey = key; // 누르거나 옮긴 항목을 선택 (치우기 버튼이 나타난다)
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

      cur().scales[t.key] = t.scale;
      clearTimeout(saveTimer); // 휠을 굴리는 동안은 잠깐 모아서 한 번만 저장
      saveTimer = setTimeout(saveGarden, 300);
    },
    { passive: false }
  );
}


// ===== 상점 (별로 씨앗과 장식 사기) =====
// garden: 어느 정원에서 파는지 (생략하면 1단계). basic: true는 싸게 늘 열려 있는 기본 장식
const SHOP_ITEMS = [
  // 1단계 풀밭 정원
  { id: "tulip", basic: true, emoji: "🌷", name: "튤립", price: 1 },
  { id: "mushroom", basic: true, emoji: "🍄", name: "버섯", price: 1 },
  { id: "rock", basic: true, emoji: "🪨", name: "바위", price: 1 },
  { id: "sunflower", emoji: "🌻", name: "해바라기", price: 2 },
  { id: "bee", sky: true, emoji: "🐝", name: "꿀벌", price: 4 },
  { id: "butterfly", sky: true, emoji: "🦋", name: "나비", price: 4 },
  { id: "bench", emoji: "🪑", name: "벤치", price: 5 },
  { id: "lantern", emoji: "🏮", name: "등불", price: 5 },
  { id: "birdhouse", emoji: "🏠", name: "새집", price: 6 },
  { id: "fountain", emoji: "⛲", name: "분수", price: 8 },
  { id: "rabbit", emoji: "🐇", name: "토끼", price: 10 },
  { id: "rainbow", sky: true, emoji: "🌈", name: "무지개", price: 12 },
  // 2단계 연못 정원
  { id: "frog", garden: 2, basic: true, emoji: "🐸", name: "개구리", price: 1 },
  { id: "shell", garden: 2, basic: true, emoji: "🐚", name: "조개", price: 1 },
  { id: "waterweed", garden: 2, basic: true, emoji: "🌿", name: "수초", price: 1 },
  { id: "duck", garden: 2, emoji: "🦆", name: "오리", price: 4 },
  { id: "koi", garden: 2, emoji: "🐟", name: "잉어", price: 5 },
  { id: "turtle", garden: 2, emoji: "🐢", name: "거북이", price: 6 },
  { id: "bridge", garden: 2, emoji: "🌉", name: "다리", price: 6 },
  { id: "swan", garden: 2, emoji: "🦢", name: "백조", price: 8 },
  { id: "moon", garden: 2, sky: true, emoji: "🌙", name: "달", price: 8 },
  { id: "torii", garden: 2, emoji: "⛩️", name: "도리이", price: 10 },
];
const itemGarden = (item) => item.garden ?? 1;

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
  shopStarsEl.textContent =
    `보유 별 ⭐ ${totalStars} · ${GARDENS[garden.current].name} 아이템 ${placedCount()}/${ITEM_LIMIT}칸`;

  // 씨앗: 한 번 사면 그 식물을 계속 심을 수 있다 (지금 보고 있는 정원의 식물만 판다)
  heading("🌱 씨앗 (한 번 사면 계속 심을 수 있어요)");
  GARDENS[garden.current].plants.forEach((id) => {
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

  // 장식: 칸이 남아 있으면 살 수 있다 (지금 보고 있는 정원에 놓인다)
  const addDecor = (item) => {
    const owned = cur().decor.filter((id) => id === item.id).length;
    const card = document.createElement("div");
    card.className = "shop-item";
    card.innerHTML =
      `<div class="emoji">${item.emoji}</div>` +
      `<div class="name">${item.name}</div>` +
      `<div class="owned">${owned ? `보유 ${owned}개` : ""}</div>`;

    const btn = document.createElement("button");
    btn.textContent = `⭐ ${item.price} 구매`;
    btn.disabled = totalStars < item.price || isGardenFull();
    btn.addEventListener("click", () => buyItem(item.id));
    card.appendChild(btn);
    shopListEl.appendChild(card);
  };

  const here = SHOP_ITEMS.filter((it) => itemGarden(it) === garden.current);
  heading("🪨 기본 장식");
  here.filter((it) => it.basic).forEach(addDecor);
  heading("✨ 특별 장식");
  here.filter((it) => !it.basic).forEach(addDecor);
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
  if (!item || itemGarden(item) !== garden.current) return;

  if (isGardenFull()) {
    shopMsgEl.textContent = "이 정원이 가득 찼어요! 풍경에서 아이템을 치우거나 다음 정원을 열어 보세요.";
    return;
  }
  if (totalStars < item.price) {
    shopMsgEl.textContent = "별이 부족해요. 스도쿠를 풀어서 모아 보세요!";
    return;
  }

  totalStars -= item.price;
  saveStars(totalStars);
  showStars();
  cur().decor.push(id);
  saveGarden();
  shopMsgEl.textContent = `${item.emoji} ${item.name}을(를) ${GARDENS[garden.current].name}에 놓았어요!`;
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

  html += '<ul class="stat-list"><li class="head">정원</li>';
  GARDEN_IDS.forEach((id) => {
    const open = id <= garden.unlockedGardens;
    html += statRow(
      open ? gardenLabel(id) : `🔒 ${id}단계 ${GARDENS[id].name}`,
      open ? `${placedCount(id)}/${ITEM_LIMIT}칸` : "잠김"
    );
  });
  html += `
      <li class="head">별</li>
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
  activeTab = name;
  renderGardenSwitch();
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
  selectedKey = null;
  showTab("grow");
  gardenEl.hidden = false;
}

function closeGarden() {
  gardenEl.hidden = true;
  if (resumeOnClose) resumeTimer();
  resumeOnClose = false;
  renderHome(); // 식물이 자랐을 수 있으니 홈 표시도 갱신
}
