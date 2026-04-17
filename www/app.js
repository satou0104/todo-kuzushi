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

// ===========================
// ===== TODOリスト描画 =====
// ===========================
function renderTodoList() {
  todoList.innerHTML = '';
  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = 'todo-item';

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
    input.maxLength = 20;
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
const BALL_R    = 9;
const PADDLE_H  = 13;
const PADDLE_W  = 90;
const BLOCK_W   = 44;
const BLOCK_H   = 28;
const BLOCK_PAD = 6;
const BLOCK_TOP = 55;
const SPEED_BASE = 5.0;

// ---- ゲーム状態 ----
let blocks      = [];
let ball        = { x: 0, y: 0, vx: 0, vy: 0 };
let paddleX     = 0;
let score       = 0;
let gameState   = 'idle'; // idle | playing | cleared | gameover
let animId      = null;

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
function generateBlocks() {
  blocks = [];
  const maxCols = Math.floor((canvasW() - BLOCK_PAD) / (BLOCK_W + BLOCK_PAD));
  let col = 0, row = 0;

  todos.forEach((todo, todoIdx) => {
    if (!todo.text.trim()) return;
    const color = BLOCK_COLORS[todoIdx % BLOCK_COLORS.length];
    [...todo.text].forEach((char) => {
      const x = BLOCK_PAD + col * (BLOCK_W + BLOCK_PAD);
      const y = BLOCK_TOP + row * (BLOCK_H + BLOCK_PAD);
      blocks.push({ x, y, w: BLOCK_W, h: BLOCK_H, alive: true, color, label: char });
      col++;
      if (col >= maxCols) { col = 0; row++; }
    });
  });
}

// ---- ゲーム初期化 ----
function initGame() {
  stopGame();
  resizeCanvas();
  generateBlocks();

  const w = canvasW(), h = canvasH();
  paddleX = w / 2;
  ball.x  = w / 2;
  ball.y  = h * 0.65;

  const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 0.6;
  ball.vx = SPEED_BASE * Math.cos(angle);
  ball.vy = SPEED_BASE * Math.sin(angle);

  score = 0;
  scoreValue.textContent = '0';
  gameState = 'idle';

  showOverlay('todo崩し', 'タップしてスタート', null, false);
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

// ---- オーバーレイタップ → スタート ----
gameOverlay.addEventListener('click', () => {
  if (gameState === 'idle') {
    hideOverlay();
    gameState = 'playing';
    loop();
  }
});

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

// ---- 衝突判定（円 vs 矩形） ----
function ballHitsRect(bx, by, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(bx, rx + rw));
  const nearY = Math.max(ry, Math.min(by, ry + rh));
  const dx = bx - nearX, dy = by - nearY;
  return dx * dx + dy * dy <= BALL_R * BALL_R;
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

  ball.x += ball.vx;
  ball.y += ball.vy;

  // 左右壁
  if (ball.x - BALL_R <= 0)  { ball.x = BALL_R;      ball.vx =  Math.abs(ball.vx); }
  if (ball.x + BALL_R >= w)  { ball.x = w - BALL_R;  ball.vx = -Math.abs(ball.vx); }
  // 上壁
  if (ball.y - BALL_R <= 0)  { ball.y = BALL_R;      ball.vy =  Math.abs(ball.vy); }

  // 下（ゲームオーバー）
  if (ball.y - BALL_R >= h) {
    gameState = 'gameover';
    cancelAnimationFrame(animId);
    draw();
    showOverlay('GAME OVER', '', 'SCORE: ' + score, true);
    return;
  }

  // パドル衝突
  const py = h - 50;
  if (ball.vy > 0 && ballHitsRect(ball.x, ball.y, paddleX - PADDLE_W / 2, py - PADDLE_H / 2, PADDLE_W, PADDLE_H)) {
    const hit = (ball.x - paddleX) / (PADDLE_W / 2); // -1 〜 1
    const speed = Math.hypot(ball.vx, ball.vy);
    ball.vx = hit * speed * 0.85;
    ball.vy = -Math.abs(ball.vy);
    if (Math.abs(ball.vy) < 3.5) ball.vy = -3.5;
    ball.y = py - PADDLE_H / 2 - BALL_R;
  }

  // ブロック衝突
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b.alive) continue;
    if (!ballHitsRect(ball.x, ball.y, b.x, b.y, b.w, b.h)) continue;

    b.alive = false;
    score += 10;
    scoreValue.textContent = score;

    // 反射方向
    const ol = (ball.x + BALL_R) - b.x;
    const or_ = (b.x + b.w) - (ball.x - BALL_R);
    const ot = (ball.y + BALL_R) - b.y;
    const ob = (b.y + b.h) - (ball.y - BALL_R);
    const minO = Math.min(ol, or_, ot, ob);
    if (minO === ot || minO === ob) ball.vy = -ball.vy;
    else                            ball.vx = -ball.vx;
    break;
  }

  // クリア判定
  if (blocks.every(b => !b.alive)) {
    gameState = 'cleared';
    cancelAnimationFrame(animId);
    draw();
    showOverlay('🎉 CLEAR!', '', 'SCORE: ' + score, true);
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
    // 角丸矩形
    roundRect(ctx, b.x, b.y, b.w, b.h, 5);
    ctx.fillStyle = b.color + 'D9'; // 85% opacity
    ctx.fill();
    // 文字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
  });

  // パドル
  const py = h - 50;
  const grad = ctx.createLinearGradient(paddleX - PADDLE_W / 2, 0, paddleX + PADDLE_W / 2, 0);
  grad.addColorStop(0, '#00C7BE');
  grad.addColorStop(1, '#007AFF');
  roundRect(ctx, paddleX - PADDLE_W / 2, py - PADDLE_H / 2, PADDLE_W, PADDLE_H, PADDLE_H / 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // ボール
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(255,255,255,0.7)';
  ctx.shadowBlur  = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
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
// ===== 初期化 =====
// ===========================
renderTodoList();
