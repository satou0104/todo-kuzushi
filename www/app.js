// ===== todo崩し - app.js =====

// ---- TODO データ ----
const MAX_TODOS = 10;
let todos = Array.from({ length: MAX_TODOS }, (_, i) => ({
  id: i,
  text: i === 0 ? '会社に電話する' : '',
  completed: false,
}));

// ---- DOM 参照 ----
const modeToggle   = document.getElementById('mode-toggle');
const todoMode     = document.getElementById('todo-mode');
const gameMode     = document.getElementById('game-mode');
const todoList     = document.getElementById('todo-list');
const header       = document.getElementById('header');
const toggleLabelGame = document.getElementById('toggle-label-game');
const canvas       = document.getElementById('game-canvas');
const ctx          = canvas.getContext('2d');
const gameOverlay  = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub   = document.getElementById('overlay-sub');
const overlayScore = document.getElementById('overlay-score');
const overlayBtn   = document.getElementById('overlay-btn');
const scoreValue   = document.getElementById('score-value');
const saveDialog   = document.getElementById('save-dialog');
const saveYesBtn   = document.getElementById('save-yes-btn');
const saveNoBtn    = document.getElementById('save-no-btn');

// ===========================
// ===== TODOリスト描画 =====
// ===========================
function renderTodoList() {
  todoList.innerHTML = '';
  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' is-completed' : '');

    // チェックボタン
    const btn = document.createElement('button');
    btn.className = 'check-btn' + (todo.completed ? ' checked' : '');
    btn.setAttribute('aria-label', todo.completed ? '完了済み' : '未完了');
    btn.addEventListener('click', () => {
      todo.completed = !todo.completed;
      renderTodoList();
    });

    // テキスト入力
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-input' + (todo.completed ? ' completed' : '');
    input.placeholder = 'タスクを入力...';
    input.value = todo.text;
    input.maxLength = 15;
    input.addEventListener('input', (e) => {
      todo.text = e.target.value;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });

    li.appendChild(btn);
    li.appendChild(input);
    todoList.appendChild(li);
  });
}

// ===========================
// ===== モード切り替え =====
// ===========================
modeToggle.addEventListener('change', () => {
  const isGame = modeToggle.checked;

  if (isGame) {
    // → ゲームモードへ
    todoMode.classList.add('hidden');
    gameMode.classList.remove('hidden');
    header.classList.add('game-header');
    toggleLabelGame.classList.add('active');
    initGame();
  } else {
    // → TODOモードへ
    stopGame();
    gameMode.classList.add('hidden');
    todoMode.classList.remove('hidden');
    header.classList.remove('game-header');
    toggleLabelGame.classList.remove('active');
    renderTodoList();
  }
});

// ===========================
// ===== ゲームエンジン =====
// ===========================

// ---- 定数 ----
const BALL_R    = 7;
const PADDLE_H  = 13;
const PADDLE_W  = 90;
// 1文字を 2×2 個の小ブロックに分割
const CHAR_COLS = 2;   // 横2個
const CHAR_ROWS = 2;   // 縦2個
const MINI_W    = 16;  // 小ブロック幅
const MINI_H    = 14;  // 小ブロック高さ
const MINI_PAD  = 2;   // 小ブロック間隔
// 1文字グループのサイズ
const CHAR_GW   = CHAR_COLS * MINI_W + (CHAR_COLS - 1) * MINI_PAD; // 38px
const CHAR_GH   = CHAR_ROWS * MINI_H + (CHAR_ROWS - 1) * MINI_PAD; // 34px
const CHAR_PAD  = 6;   // 文字グループ間の余白
const BLOCK_TOP = 50;
const SPEED_BASE = 5.0;

// ---- ゲーム状態 ----
let blocks      = [];
let balls       = []; // 複数ボール対応
let paddleX     = 0;
let score       = 0;
let gameState   = 'idle';
let animId      = null;

// ---- アイテム状態 ----
let items       = []; // 落下中のアイテム
let pierceTimer = 0;  // 貫通残り時間（フレーム数）
let bigTimer    = 0;  // 大きくなる残り時間

const ITEM_W    = 36;
const ITEM_H    = 18;
const ITEM_SPEED = 2.5;
const ITEM_DROP_CHANCE = 0.15; // 15%の確率でドロップ

// アイテム種類
const ITEM_TYPES = {
  TRIPLE: { label: '×3', color: '#FF6584', desc: '3分割' },
  PIERCE: { label: '貫通',  color: '#6C63FF', desc: '貫通'  },
  BIG:    { label: '⬤',  color: '#FFCC00', desc: '巨大化' },
};

function currentBallR() {
  return bigTimer > 0 ? BALL_R * 2.2 : BALL_R;
}

// ブロックカラー（todoごとに色を変える）
const BLOCK_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
  '#007AFF', '#5856D6', '#FF2D55', '#00C7BE',
  '#30B0C7', '#BF5AF2',
];

// ---- キャンバスサイズ設定 ----
function resizeCanvas() {
  const rect = gameMode.getBoundingClientRect();
  canvas.width  = rect.width  * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function canvasW() { return canvas.width  / window.devicePixelRatio; }
function canvasH() { return canvas.height / window.devicePixelRatio; }

// ---- ブロック生成 ----
// ・completedのtodoはスキップ
// ・todoごとに1行ずつ配置（文字数に応じてブロックサイズを自動調整）
// ・行のy座標は実際の高さを積み上げて被りを防ぐ
function generateBlocks() {
  blocks = [];

  const BASE_MINI_W = 16;
  const BASE_MINI_H = 14;
  const BASE_MINI_PAD = 2;
  const BASE_CHAR_PAD = 4;
  const ROW_GAP = 6;

  let currentY = BLOCK_TOP; // 積み上げ方式

  todos.forEach((todo, todoIdx) => {
    if (!todo.text.trim() || todo.completed) return;
    const color = BLOCK_COLORS[todoIdx % BLOCK_COLORS.length];
    const charCount = [...todo.text].length;

    const availW = canvasW() - BASE_CHAR_PAD * 2;
    const maxCharW = Math.floor(availW / charCount);
    let miniW = Math.floor((maxCharW - BASE_MINI_PAD - BASE_CHAR_PAD) / 2);
    miniW = Math.min(miniW, BASE_MINI_W);
    miniW = Math.max(miniW, 8);

    const ratio   = miniW / BASE_MINI_W;
    const miniH   = Math.max(Math.floor(BASE_MINI_H * ratio), 7);
    const miniPad = BASE_MINI_PAD;
    const charPad = BASE_CHAR_PAD;
    const charGW  = CHAR_COLS * miniW + (CHAR_COLS - 1) * miniPad;
    const charGH  = CHAR_ROWS * miniH + (CHAR_ROWS - 1) * miniPad;
    const stepX   = charGW + charPad;
    const fontSize = Math.max(Math.floor(miniH * 1.6), 8);

    let col = 0;
    [...todo.text].forEach((char) => {
      const gx = charPad + col * stepX;
      const gy = currentY;
      const labelX = gx + charGW / 2;
      const labelY = gy + charGH / 2;
      const groupKey = labelX + '_' + labelY;

      for (let r = 0; r < CHAR_ROWS; r++) {
        for (let c = 0; c < CHAR_COLS; c++) {
          const bx = gx + c * (miniW + miniPad);
          const by = gy + r * (miniH + miniPad);
          const isAnchor = (r === 0 && c === 0);
          blocks.push({
            x: bx, y: by,
            w: miniW, h: miniH,
            alive: true,
            color,
            groupKey,
            label: isAnchor ? char : '',
            labelX: isAnchor ? labelX : 0,
            labelY: isAnchor ? labelY : 0,
            fontSize,
          });
        }
      }
      col++;
    });

    // 次の行のyをこの行の実際の高さ分だけ下にずらす
    currentY += charGH + ROW_GAP;
  });
}

// ---- ゲーム初期化 ----
function initGame() {
  stopGame();
  resizeCanvas();
  generateBlocks();

  const w = canvasW(), h = canvasH();
  paddleX = w / 2;

  const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 0.6;
  balls = [{
    x: w / 2, y: h * 0.65,
    vx: SPEED_BASE * Math.cos(angle),
    vy: SPEED_BASE * Math.sin(angle),
  }];

  items       = [];
  pierceTimer = 0;
  bigTimer    = 0;
  score       = 0;
  scoreValue.textContent = '0';

  hideOverlay();
  gameState = 'playing';
  loop();
}

// ---- ゲーム停止 ----
function stopGame() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  gameState = 'idle';
}

// ---- オーバーレイ表示 ----
function showOverlay(title, sub, scoreText, showBtn) {
  overlayTitle.textContent = title;
  overlaySub.textContent   = sub;
  if (scoreText) {
    overlayScore.textContent = scoreText;
    overlayScore.classList.remove('hidden');
  } else {
    overlayScore.classList.add('hidden');
  }
  if (showBtn) {
    overlayBtn.classList.remove('hidden');
  } else {
    overlayBtn.classList.add('hidden');
  }
  gameOverlay.classList.remove('hidden');
}

function hideOverlay() {
  gameOverlay.classList.add('hidden');
}

// ---- もう一度ボタン ----
overlayBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  initGame();
});

// ---- パドル操作（タッチ & マウス） ----
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect  = canvas.getBoundingClientRect();
  const x     = touch.clientX - rect.left;
  paddleX = Math.min(Math.max(x, PADDLE_W / 2), canvasW() - PADDLE_W / 2);
}, { passive: false });

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x    = e.clientX - rect.left;
  paddleX = Math.min(Math.max(x, PADDLE_W / 2), canvasW() - PADDLE_W / 2);
});

// ---- 衝突判定（円 vs 矩形）ballR引数対応 ----
function ballHitsRect(bx, by, rx, ry, rw, rh, r) {
  const rad = r !== undefined ? r : BALL_R;
  const nearX = Math.max(rx, Math.min(bx, rx + rw));
  const nearY = Math.max(ry, Math.min(by, ry + rh));
  const dx = bx - nearX, dy = by - nearY;
  return dx * dx + dy * dy <= rad * rad;
}

// ---- ゲームループ ----
function loop() {
  if (gameState !== 'playing') return;
  update();
  draw();
  animId = requestAnimationFrame(loop);
}

function update() {
  const w = canvasW(), h = canvasH();
  const py = h - 50;
  const ballR = currentBallR();

  // アイテムタイマー更新
  if (pierceTimer > 0) pierceTimer--;
  if (bigTimer    > 0) bigTimer--;

  // ---- アイテム落下・取得 ----
  items = items.filter(item => {
    item.y += ITEM_SPEED;
    // パドルで取得
    if (
      item.y + ITEM_H / 2 >= py - PADDLE_H / 2 &&
      item.y - ITEM_H / 2 <= py + PADDLE_H / 2 &&
      item.x + ITEM_W / 2 >= paddleX - PADDLE_W / 2 &&
      item.x - ITEM_W / 2 <= paddleX + PADDLE_W / 2
    ) {
      applyItem(item.type);
      return false;
    }
    // 画面外
    return item.y < h + ITEM_H;
  });

  // ---- 各ボール更新 ----
  const aliveBalls = [];
  for (const ball of balls) {
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 左右壁
    if (ball.x - ballR <= 0)  { ball.x = ballR;      ball.vx =  Math.abs(ball.vx); }
    if (ball.x + ballR >= w)  { ball.x = w - ballR;  ball.vx = -Math.abs(ball.vx); }
    // 上壁
    if (ball.y - ballR <= 0)  { ball.y = ballR;      ball.vy =  Math.abs(ball.vy); }

    // 下（このボールは消える）
    if (ball.y - ballR >= h) continue;

    // パドル衝突
    if (ball.vy > 0 && ballHitsRect(ball.x, ball.y, paddleX - PADDLE_W / 2, py - PADDLE_H / 2, PADDLE_W, PADDLE_H, ballR)) {
      const hit = (ball.x - paddleX) / (PADDLE_W / 2);
      const speed = Math.hypot(ball.vx, ball.vy);
      ball.vx = hit * speed * 0.85;
      ball.vy = -Math.abs(ball.vy);
      if (Math.abs(ball.vy) < 3.5) ball.vy = -3.5;
      ball.y = py - PADDLE_H / 2 - ballR;
    }

    // ブロック衝突
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.alive) continue;
      if (!ballHitsRect(ball.x, ball.y, b.x, b.y, b.w, b.h, ballR)) continue;

      b.alive = false;
      score += 10;
      scoreValue.textContent = score;

      // アイテムドロップ
      if (Math.random() < ITEM_DROP_CHANCE) {
        const types = Object.keys(ITEM_TYPES);
        const type  = types[Math.floor(Math.random() * types.length)];
        items.push({ x: b.x + b.w / 2, y: b.y, type });
      }

      // 貫通中は反射しない
      if (pierceTimer <= 0) {
        const ol  = (ball.x + ballR) - b.x;
        const or_ = (b.x + b.w) - (ball.x - ballR);
        const ot  = (ball.y + ballR) - b.y;
        const ob  = (b.y + b.h) - (ball.y - ballR);
        const minO = Math.min(ol, or_, ot, ob);
        if (minO === ot || minO === ob) ball.vy = -ball.vy;
        else                            ball.vx = -ball.vx;
        break;
      }
    }

    aliveBalls.push(ball);
  }
  balls = aliveBalls;

  // 全ボール消えたらゲームオーバー
  if (balls.length === 0) {
    gameState = 'gameover';
    cancelAnimationFrame(animId);
    draw();
    showOverlay('GAME OVER', '', 'SCORE: ' + score, true);
    checkAndShowSaveDialog();
    return;
  }

  // クリア判定
  if (blocks.every(b => !b.alive)) {
    gameState = 'cleared';
    cancelAnimationFrame(animId);
    draw();
    showOverlay('🎉 CLEAR!', '', 'SCORE: ' + score, true);
    checkAndShowSaveDialog();
  }
}

// ---- アイテム効果適用 ----
function applyItem(type) {
  if (type === 'TRIPLE') {
    // 現在のボールを3つに増やす
    const newBalls = [];
    balls.forEach(b => {
      const speed = Math.hypot(b.vx, b.vy);
      [-0.4, 0, 0.4].forEach(offset => {
        const angle = Math.atan2(b.vy, b.vx) + offset;
        newBalls.push({ x: b.x, y: b.y, vx: speed * Math.cos(angle), vy: speed * Math.sin(angle) });
      });
    });
    balls = newBalls.slice(0, 9); // 最大9個まで
  } else if (type === 'PIERCE') {
    pierceTimer = 600; // 10秒（60fps×10）
  } else if (type === 'BIG') {
    bigTimer = 600;
  }
}

// ---- 描画 ----
function draw() {
  const w = canvasW(), h = canvasH();
  ctx.clearRect(0, 0, w, h);

  // 背景
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  // ブロック
  blocks.forEach(b => {
    if (!b.alive) return;
    // 小ブロック本体
    roundRect(ctx, b.x, b.y, b.w, b.h, 3);
    ctx.fillStyle = b.color + 'D9';
    ctx.fill();
    // 枠線（立体感）
    roundRect(ctx, b.x, b.y, b.w, b.h, 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // 文字描画：生きているブロックの領域をクリップマスクにして文字を描く
  // → 壊れたブロックの部分だけ文字が欠ける
  const groupMap = new Map();
  blocks.forEach(b => {
    if (!b.groupKey) return;
    if (!groupMap.has(b.groupKey)) {
      groupMap.set(b.groupKey, { label: '', labelX: 0, labelY: 0, fontSize: 13, aliveBlocks: [] });
    }
    const g = groupMap.get(b.groupKey);
    if (b.label) {
      g.label    = b.label;
      g.labelX   = b.labelX;
      g.labelY   = b.labelY;
      g.fontSize = b.fontSize || 13;
    }
    if (b.alive) g.aliveBlocks.push(b);
  });

  groupMap.forEach((g) => {
    if (!g.label || g.aliveBlocks.length === 0) return;

    ctx.save();

    // 生きているブロックの矩形をクリッピング領域に設定
    ctx.beginPath();
    g.aliveBlocks.forEach(b => {
      ctx.rect(b.x, b.y, b.w, b.h);
    });
    ctx.clip();

    // クリップ内に文字を描画
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${g.fontSize}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.label, g.labelX, g.labelY);

    ctx.restore();
  });

  // パドル
  const py = h - 50;
  const paddleColor1 = pierceTimer > 0 ? '#FF6584' : '#00C7BE';
  const paddleColor2 = pierceTimer > 0 ? '#6C63FF' : '#007AFF';
  const grad = ctx.createLinearGradient(paddleX - PADDLE_W / 2, 0, paddleX + PADDLE_W / 2, 0);
  grad.addColorStop(0, paddleColor1);
  grad.addColorStop(1, paddleColor2);
  roundRect(ctx, paddleX - PADDLE_W / 2, py - PADDLE_H / 2, PADDLE_W, PADDLE_H, PADDLE_H / 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // アイテム描画
  items.forEach(item => {
    const info = ITEM_TYPES[item.type];
    roundRect(ctx, item.x - ITEM_W / 2, item.y - ITEM_H / 2, ITEM_W, ITEM_H, 6);
    ctx.fillStyle = info.color;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.label, item.x, item.y);
  });

  // ボール（複数対応）
  const ballR = currentBallR();
  balls.forEach(ball => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballR, 0, Math.PI * 2);
    ctx.fillStyle = bigTimer > 0 ? '#FFCC00' : '#fff';
    ctx.shadowColor = bigTimer > 0 ? 'rgba(255,204,0,0.8)' : 'rgba(255,255,255,0.7)';
    ctx.shadowBlur  = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // アクティブアイテム表示（画面左上）
  let statusX = 14;
  const statusY = h - 28;
  if (pierceTimer > 0) {
    ctx.fillStyle = ITEM_TYPES.PIERCE.color;
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`貫通 ${Math.ceil(pierceTimer/60)}s`, statusX, statusY);
    statusX += 60;
  }
  if (bigTimer > 0) {
    ctx.fillStyle = ITEM_TYPES.BIG.color;
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⬤ ${Math.ceil(bigTimer/60)}s`, statusX, statusY);
  }
}

// 角丸矩形ヘルパー
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ===========================
// ===== 保存確認ダイアログ =====
// ===========================

// 全ブロックが消えたtodoのインデックスを返す
function getFullyClearedTodoIndices() {
  // todoごとにgroupKeyのセットを作る
  const todoGroupKeys = {};
  todos.forEach((todo, idx) => {
    if (!todo.text.trim() || todo.completed) return;
    todoGroupKeys[idx] = new Set();
  });

  // blocksからgroupKeyとtodoIndexを紐付け
  // colorでtodoを特定する（todoごとに色が違う）
  const colorToTodoIdx = {};
  todos.forEach((todo, idx) => {
    if (!todo.text.trim() || todo.completed) return;
    colorToTodoIdx[BLOCK_COLORS[idx % BLOCK_COLORS.length]] = idx;
  });

  // 各todoのgroupKeyを収集
  const todoAllKeys   = {}; // 全groupKey
  const todoAliveKeys = {}; // 生きているgroupKey
  blocks.forEach(b => {
    if (!b.groupKey) return;
    const todoIdx = colorToTodoIdx[b.color];
    if (todoIdx === undefined) return;
    if (!todoAllKeys[todoIdx])   todoAllKeys[todoIdx]   = new Set();
    if (!todoAliveKeys[todoIdx]) todoAliveKeys[todoIdx] = new Set();
    todoAllKeys[todoIdx].add(b.groupKey);
    if (b.alive) todoAliveKeys[todoIdx].add(b.groupKey);
  });

  // 全groupKeyが消えたtodoを返す
  const cleared = [];
  Object.keys(todoAllKeys).forEach(idx => {
    const i = parseInt(idx);
    const aliveCount = todoAliveKeys[i] ? todoAliveKeys[i].size : 0;
    if (aliveCount === 0 && todoAllKeys[i].size > 0) {
      cleared.push(i);
    }
  });
  return cleared;
}

let pendingClearedIndices = [];

function checkAndShowSaveDialog() {
  const cleared = getFullyClearedTodoIndices();
  if (cleared.length === 0) return; // 1行も消えていなければ表示しない
  pendingClearedIndices = cleared;
  // 少し遅らせてオーバーレイの後に表示
  setTimeout(() => {
    saveDialog.classList.remove('hidden');
  }, 600);
}

saveYesBtn.addEventListener('click', () => {
  // 崩したtodoにチェックを入れる
  pendingClearedIndices.forEach(idx => {
    todos[idx].completed = true;
  });
  pendingClearedIndices = [];
  saveDialog.classList.add('hidden');
});

saveNoBtn.addEventListener('click', () => {
  pendingClearedIndices = [];
  saveDialog.classList.add('hidden');
});

// ===========================
// ===== 初期化 =====
// ===========================
renderTodoList();
