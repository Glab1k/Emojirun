const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Настройки игры
const game = {
  isRunning: true,
  lastTime: 0,
  keys: {},
  gravity: 800,
  jumpSpeed: -700,
  cameraY: 0,
  maxPlatforms: 60,
  isPaused: false,
};

// Настройки генерации платформ
const platformSettings = {
  minPlatformWidth: 75,
  maxPlatformWidth: 150,
  minVerticalGap: 100,
  maxVerticalGap: 200,
};

// Создаем персонажа
const player = {
  x: 0,
  y: 0,
  width: 32,
  height: 32,
  color: "#00FF00",
  speed: 200,
  velocityY: 0,
  isJumping: false,
  wasJumping: false,
};

// Создаем массив платформ
const platforms = [];

// Создаем массив для врагов
const enemies = [];

// Настройки врагов
const enemySettings = {
  width: 24,
  height: 24,
  color: "#FF0000",
  speed: 50,
};

// Переменные состояния игры
let gameState = "menu";
let platformsPassed = 0;
let score = 0;
let lastPlatformTouched = null;
let touchedPlatforms = [];

// Получаем элемент кнопки по ID
const pauseButton = document.getElementById("pauseButton");

//Добавляем текст на кнопки
pauseButton.textContent = "Пауза";

// Добавляем обработчик события click
pauseButton.addEventListener("click", () => {
  if (gameState === "playing") {
    game.isPaused = !game.isPaused;
    pauseButton.textContent = game.isPaused ? "Продолжить" : "Пауза";
  }
});

// Загружаем изображение для статичного фона
const staticBackground = new Image();
staticBackground.src = "assets/img/static_background.png";

let renderStaticBackground; // Объявляем переменную для функции отрисовки

staticBackground.onload = function () {
  // Определяем функцию отрисовки после загрузки изображения
  renderStaticBackground = function () {
    ctx.drawImage(staticBackground, 0, 0, canvas.width, canvas.height);
  };
};

// Функция создания врага
function createEnemy(x, y) {
  return {
    x: x,
    y: y,
    width: enemySettings.width,
    height: enemySettings.height,
    color: enemySettings.color,
    speed: 50,
    direction: Math.random() > 0.5 ? 1 : -1, // 1 - вправо, -1 - влево
    isAlive: true,
  };
}

// Функция генерации врагов на платформах
function generateEnemies() {
  platforms.forEach((platform) => {
    // Проверяем тип платформы. Не создаем врагов на платформах "photo"
    if (
      platform.type !== "photo" &&
      platform.type !== "video" &&
      platform.type !== "text"
    ) {
      // С некоторой вероятностью создаем врага на платформе
      if (Math.random() < 0.3) {
        // 30% вероятность
        const enemyX =
          platform.x + Math.random() * (platform.width - enemySettings.width);
        const enemyY = platform.y - enemySettings.height;
        const enemy = createEnemy(enemyX, enemyY);
        enemies.push(enemy);
      }
    }
  });
}
// Отрисовка врагов
function renderEnemies() {
  enemies.forEach((enemy) => {
    if (enemy.isAlive) {
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x, enemy.y + game.cameraY, enemy.width, enemy.height);
    }
  });
}

// Движение врагов
function updateEnemies(deltaTime) {
  enemies.forEach((enemy) => {
    if (enemy.isAlive) {
      enemy.x += (enemy.speed * enemy.direction * deltaTime) / 1000;

      // Проверка на столкновение с краем платформы
      const platform = platforms.find(
        (platform) =>
          enemy.x + enemy.width > platform.x &&
          enemy.x < platform.x + platform.width &&
          enemy.y + enemy.height === platform.y
      );

      if (platform) {
        if (
          enemy.x < platform.x ||
          enemy.x + enemy.width > platform.x + platform.width
        ) {
          enemy.direction *= -1; // Меняем направление
        }
      } else {
        enemy.direction *= -1; // Если нет платформы, меняем направление
      }
    }
  });
}

// Обнаружение столкновений с врагами
function checkEnemyCollisions() {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];

    if (enemy.isAlive) {
      const collision =
        player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y + player.height >= enemy.y + game.cameraY &&
        player.y + player.height <= enemy.y + game.cameraY + 10;

      if (collision) {
        // Проверяем, наступил ли игрок на врага сверху
        if (
          player.velocityY > 0 &&
          player.y + player.height <= enemy.y + game.cameraY + 10
        ) {
          // Убиваем врага
          enemy.isAlive = false;
          score += 5;
          player.velocityY = game.jumpSpeed * 0.75; // Отскок после убийства
        } else {
          // Игра окончена
          gameState = "gameOver";
        }
      }
    }
  }
}

function createPlatform(x, y, width, height, color, type) {
  return {
    x: x,
    y: y,
    width: width,
    height: height,
    color: color,
    type: type,
    isBroken: false,
    speed: 0,
    direction: 0,
    sound: null,
  };
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  game.cameraY = -player.y + canvas.height / 2;
}

// Создаем изображение для игрока (если еще не создано)
const playerImage = new Image();

function renderMenu() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Платформер", canvas.width / 2, canvas.height / 2 - 50);
  ctx.fillText("Нажмите, чтобы начать", canvas.width / 2, canvas.height / 2);

  // Показываем селектор скинов только в меню
  const skinSelector = document.getElementById("skinSelector");
  if (skinSelector) {
    skinSelector.style.display = "flex";
  }
}

function renderGameOver() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Игра окончена", canvas.width / 2, canvas.height / 2 - 50);

  ctx.font = "20px Arial";
  ctx.fillText(
    "Нажмите, чтобы перезапустить",
    canvas.width / 2,
    canvas.height / 2
  );
  showGameOverUI();
  removeSkinSelector();
}

function getPlatformColor(type) {
  switch (type) {
    case "text":
      return "#FFFFFF";
    case "photo":
      return "#FFD700";
    case "video":
      return "#00FF00";
    case "booster":
      return "#FF00FF";
    default:
      return "#FFFFFF";
  }
}

function generatePlatform() {
  const types = ["text", "photo", "video", "booster"];
  const type = types[Math.floor(Math.random() * types.length)];

  const highestPlatform = platforms.reduce(
    (min, p) => (p.y < min.y ? p : min),
    { y: Infinity }
  );
  const baseY = platforms.length > 0 ? highestPlatform.y : game.cameraY;

  const verticalGap =
    platformSettings.minVerticalGap +
    Math.random() *
      (platformSettings.maxVerticalGap - platformSettings.minVerticalGap);

  const platform = createPlatform(
    Math.random() * (canvas.width - 100),
    baseY - verticalGap,
    100,
    20,
    getPlatformColor(type),
    type
  );

  switch (type) {
    case "photo":
      platform.isBroken = false;
      break;
    case "video":
      platform.speed = 50;
      platform.direction = Math.random() > 0.5 ? 1 : -1;
      break;
    case "booster":
      break;
  }

  return platform;
}

function startGame() {
  gameState = "playing";
  document.body.classList.add("playing");
  document.body.className = "";
  document.body.classList.add("gameState-" + gameState);

  removeSkinSelector();
  hideGameOverUI();

  platforms.length = 0;
  platformsPassed = 0;
  score = 0;
  lastPlatformTouched = null;
  touchedPlatforms = [];
  enemies.length = 0;

  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - 150;
  player.velocityY = 0;
  player.isJumping = false;
  player.wasJumping = false;

  const initialPlatform = createPlatform(
    canvas.width / 2 - 50,
    player.y + player.height,
    100,
    20,
    getPlatformColor("text"),
    "text"
  );
  platforms.push(initialPlatform);

  for (let i = 1; i < game.maxPlatforms; i++) {
    const platform = generatePlatform();
    const lastPlatform = platforms[platforms.length - 1];
    platform.y = lastPlatform
      ? lastPlatform.y -
        (platformSettings.minVerticalGap +
          Math.random() *
            (platformSettings.maxVerticalGap - platformSettings.minVerticalGap))
      : player.y - 200 + game.cameraY;
    platforms.push(platform);
  }

  generateEnemies();

  game.cameraY = -player.y + canvas.height * 0.75;
  resizeCanvas();
}

function restartGame() {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - 150;
  player.velocityY = 0;
  player.isJumping = false;
  platforms.length = 0;
  enemies.length = 0;
  game.cameraY = 0;
  platformsPassed = 0;
  score = 0;
  lastPlatformTouched = null;
  touchedPlatforms = [];

  hideGameOverUI();
  startGame();
}

function resetGame() {
  platforms.length = 0;
  enemies.length = 0;
  platformsPassed = 0;
  score = 0;
  lastPlatformTouched = null;
  touchedPlatforms = [];
  player.velocityY = 0;
  player.isJumping = false;
  gameState = "menu";
  game.cameraY = 0;
}

canvas.onclick = function (event) {
  // Игнорируем клики по UI элементам
  if (event.target.closest("#gameOverUI")) return;

  if (gameState === "menu") {
    startGame();
  } else if (gameState === "gameOver") {
    restartGame();
  }

  document.body.classList.remove("playing");
  document.body.className = "";
  document.body.classList.add("gameState-" + gameState);
};

document.addEventListener("keydown", (event) => {
  game.keys[event.code] = true;
  if (event.code === "Space" && !player.isJumping) {
    player.velocityY = game.jumpSpeed;
    player.isJumping = true;
  }
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    const touchX = event.touches[0].clientX;

    if (touchX < canvas.width / 2) {
      game.keys["ArrowLeft"] = true;
      game.keys["ArrowRight"] = false;
    } else {
      game.keys["ArrowRight"] = true;
      game.keys["ArrowLeft"] = false;
    }

    event.preventDefault();
  },
  {
    passive: true,
  }
);

canvas.addEventListener("touchend", (event) => {
  game.keys["ArrowLeft"] = false;
  game.keys["ArrowRight"] = false;
});

document.addEventListener("keyup", (event) => {
  game.keys[event.code] = false;
});

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (typeof renderStaticBackground === "function") renderStaticBackground();

  if (gameState === "menu") {
    renderMenu();
  } else if (gameState === "gameOver") {
    renderGameOver();
  } else {
    platforms.forEach((platform) => {
      ctx.fillStyle = platform.color;
      ctx.fillRect(
        platform.x,
        platform.y + game.cameraY,
        platform.width,
        platform.height
      );
    });

    renderEnemies();

    ctx.drawImage(
      playerImage,
      player.x,
      player.y + game.cameraY,
      player.width,
      player.height
    );

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Счет: " + score, 10, 30);
  }

  if (game.isPaused && gameState === "playing") {
    renderPauseScreen();
  }
}

function update(deltaTime) {
  if (gameState !== "playing") return;
  if (game.isPaused) return;

  if (game.keys["ArrowLeft"]) {
    player.x -= (player.speed * deltaTime) / 1000;
  }
  if (game.keys["ArrowRight"]) {
    player.x += (player.speed * deltaTime) / 1000;
  }

  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x > canvas.width - player.width) {
    player.x = canvas.width - player.width;
  }

  player.velocityY += (game.gravity * deltaTime) / 1000;
  player.y += (player.velocityY * deltaTime) / 1000;

  let targetCameraY = -player.y + canvas.height * 0.25;

  if (targetCameraY < -1000) {
    targetCameraY = -1000;
  }

  game.cameraY += (targetCameraY - game.cameraY) * 0.1;

  updateEnemies(deltaTime);
  checkEnemyCollisions();

  platforms.forEach((platform) => {
    if (platform.type === "video") {
      platform.x += (platform.speed * platform.direction * deltaTime) / 1000;

      if (platform.x < 0) {
        platform.x = 0;
        platform.direction = 1;
      }
      if (platform.x > canvas.width - platform.width) {
        platform.x = canvas.width - platform.width;
        platform.direction = -1;
      }
    }
  });

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];

    if (checkCollision(player, platform)) {
      player.y = platform.y - player.height;
      player.velocityY = game.jumpSpeed;
      player.isJumping = false;
    }
  }

  checkGameOver();
}

function checkCollision(player, platform) {
  const collision =
    player.x < platform.x + platform.width &&
    player.x + player.width > platform.x &&
    player.y + player.height >= platform.y &&
    player.y + player.height <= platform.y + 10;

  if (collision) {
    player.isJumping = false;
    player.wasJumping = false;

    if (!touchedPlatforms.includes(platform)) {
      score++;
      touchedPlatforms.push(platform);
    }

    switch (platform.type) {
      case "text":
        player.velocityY = game.jumpSpeed;
        break;
      case "photo":
        if (!platform.isBroken) {
          player.velocityY = game.jumpSpeed;
          platform.isBroken = true;
          setTimeout(
            () => platforms.splice(platforms.indexOf(platform), 1),
            500
          );
        }
        break;
      case "video":
        player.velocityY = game.jumpSpeed;
        break;
      case "booster":
        player.velocityY = game.jumpSpeed * 1.5;
        break;
    }
    return true;
  }

  return false;
}

function checkGameOver() {
  if (player.y > canvas.height) {
    gameState = "gameOver";
  }
}

function renderPauseScreen() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Пауза", canvas.width / 2, canvas.height / 2);
}

function gameLoop(timestamp) {
  const deltaTime = timestamp - game.lastTime;
  game.lastTime = timestamp;

  document.body.className = "";
  document.body.classList.add("gameState-" + gameState);

  if (gameState === "menu") {
    renderMenu();
  } else if (gameState === "playing") {
    update(deltaTime);
    render();
  } else if (gameState === "gameOver") {
    renderGameOver();
  }

  requestAnimationFrame(gameLoop);
}

resizeCanvas();
requestAnimationFrame(gameLoop);

// Добавляем после создания pauseButton
const createGameOverUI = () => {
  const gameOverUI = document.createElement("div");
  gameOverUI.id = "gameOverUI";
  gameOverUI.style.display = "none";

  const restartBtn = document.createElement("button");
  restartBtn.id = "restartButton";
  restartBtn.textContent = "⟳ Перезапустить";

  const menuBtn = document.createElement("button");
  menuBtn.id = "menuButton";
  menuBtn.textContent = "≡ Главное меню";

  gameOverUI.append(restartBtn, menuBtn);
  document.body.appendChild(gameOverUI);

  // Обработчики событий
  restartBtn.addEventListener("click", () => {
    restartGame();
    hideGameOverUI();
  });

  menuBtn.addEventListener("click", () => {
    gameState = "menu";
    hideGameOverUI();
    removeSkinSelector(); // На случай если были скрыты
    resetGame(); // Полный сброс игры
  });
};

// Сразу создаем UI при загрузке
createGameOverUI();

// Добавляем функции управления видимостью
const showGameOverUI = () => {
  const ui = document.getElementById("gameOverUI");
  if (ui) ui.style.display = "flex";
};

const hideGameOverUI = () => {
  const ui = document.getElementById("gameOverUI");
  if (ui) ui.style.display = "none";
};

// Добавляем переменные для отслеживания касаний
let touchStartX = null;
let touchEndX = null;

// Функция для обработки начала касания
function handleTouchStart(event) {
  touchStartX = event.touches[0].clientX;
}

// Функция для обработки перемещения касания
function handleTouchMove(event) {
  touchEndX = event.touches[0].clientX;
}

// Функция для обработки окончания касания
function handleTouchEnd(event) {
  // Вычисляем разницу между начальной и конечной точкой касания
  const swipeDistance = touchEndX - touchStartX;

  // Определяем направление движения
  const swipeThreshold = 50; // Минимальное расстояние для определения свайпа

  if (swipeDistance > swipeThreshold) {
    // Движение вправо
    console.log("Right");
    game.keys["ArrowRight"] = true;
    game.keys["ArrowLeft"] = false;
    setTimeout(() => (game.keys["ArrowRight"] = false), 100); // Отпускаем клавишу через 100мс
  } else if (swipeDistance < -swipeThreshold) {
    // Движение влево
    console.log("Left");
    game.keys["ArrowLeft"] = true;
    game.keys["ArrowRight"] = false;
    setTimeout(() => (game.keys["ArrowLeft"] = false), 100); // Отпускаем клавишу через 100мс
  }

  // Сбрасываем значения
  touchStartX = null;
  touchEndX = null;
}

// Добавляем обработчики событий касания к canvas
canvas.addEventListener("touchstart", handleTouchStart, false);
canvas.addEventListener("touchmove", handleTouchMove, false);
canvas.addEventListener("touchend", handleTouchEnd, false);

let currentSkinIndex = 0;
const skinPaths = [
  "assets/skins/skin1.png",
  "assets/skins/skin2.png",
  "assets/skins/skin3.png",
];

function createSkinSelector() {
  const skinSelector = document.createElement("div");
  skinSelector.id = "skinSelector";
  skinSelector.style.display = "none"; // Скрываем по умолчанию

  const prevSkinButton = document.createElement("button");
  prevSkinButton.id = "prevSkin";
  prevSkinButton.textContent = "←";

  const skinImageElement = document.createElement("img");
  skinImageElement.id = "skinImage";
  skinImageElement.src = skinPaths[currentSkinIndex];

  const nextSkinButton = document.createElement("button");
  nextSkinButton.id = "nextSkin";
  nextSkinButton.textContent = "→";

  skinSelector.append(prevSkinButton, skinImageElement, nextSkinButton);
  document.body.appendChild(skinSelector);

  // Обработчики событий
  prevSkinButton.addEventListener("click", () => {
    currentSkinIndex =
      (currentSkinIndex - 1 + skinPaths.length) % skinPaths.length;
    skinImageElement.src = skinPaths[currentSkinIndex];
    playerImage.src = skinPaths[currentSkinIndex];
  });

  nextSkinButton.addEventListener("click", () => {
    currentSkinIndex = (currentSkinIndex + 1) % skinPaths.length;
    skinImageElement.src = skinPaths[currentSkinIndex];
    playerImage.src = skinPaths[currentSkinIndex];
  });
  playerImage.src = skinPaths[0];
}

function removeSkinSelector() {
  const skinSelector = document.getElementById("skinSelector");
  if (skinSelector) {
    skinSelector.style.display = "none"; // Скрываем вместо удаления
  }
}

// Вызовите эту функцию при инициализации игры
createSkinSelector();
