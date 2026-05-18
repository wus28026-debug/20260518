let video;
let handPose;
let hands = [];

// 遊戲狀態變數
let gameState = "WAITING"; // WAITING, COUNTING, RESULT
let timer = 3;
let lastTick = 0;
let userChoice = "";
let aiChoice = "";
let resultMessage = "準備好了嗎？";
let choices = ["石頭", "剪刀", "布"];

// 三戰二勝變數
let playerScore = 0;
let aiScore = 0;
let matchWinner = ""; // "PLAYER", "AI"

// 定義手指連線的路徑群組 (0-4 大拇指, 5-8 食指, 9-12 中指, 13-16 無名指, 17-20 小拇指)
const FINGER_PARTS = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20]
];

function preload() {
  // 初始化 HandPose 模型，並設定影像水平翻轉（鏡像）
  handPose = ml5.handPose({ flipped: true });
}

function gotHands(results) {
  hands = results;
}

function setup() {
  // 1. 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  
  // 2. 擷取攝影機影像，並設定鏡像翻轉
  video = createCapture(VIDEO, { flipped: true });
  video.hide();

  // 開始偵測手部
  handPose.detectStart(video, gotHands);
}

function draw() {
  // 3. 背景顏色為黑色
  background(0);

  // 4. 計算顯示尺寸為全螢幕寬高的 50%
  let displayW = windowWidth * 0.5;
  let displayH = windowHeight * 0.5;
  
  // 5. 計算視窗置中的座標偏移量
  let xOffset = (windowWidth - displayW) / 2;
  let yOffset = (windowHeight - displayH) / 2;

  // 在視窗中間顯示攝影機影像
  image(video, xOffset, yOffset, displayW, displayH);

  // 6. 處理手部辨識繪圖
  if (hands.length > 0) {
    // 辨識目前手勢
    let currentGesture = recognizeGesture(hands[0]);

    // 在非結果畫面時，即時更新玩家顯示的手勢
    if (gameState !== "RESULT") {
      userChoice = currentGesture;
    }

    // 功能需求：比讚（👍）啟動遊戲
    if (gameState === "WAITING" && currentGesture === "讚") {
      // 如果上一場比賽結束了，重置比分
      if (matchWinner !== "") {
        playerScore = 0;
        aiScore = 0;
        matchWinner = "";
      }
      gameState = "COUNTING";
      timer = 3;
      lastTick = millis();
      aiChoice = "?";
    }

    for (let hand of hands) {
      // 設定骨骼連線顏色與粗細
      stroke(hand.handedness === "Left" ? [255, 0, 255] : [255, 255, 0]);
      strokeWeight(2); // 細線
      noFill();

      // 繪製每一段手指的連線
      for (let part of FINGER_PARTS) {
        for (let i = 0; i < part.length - 1; i++) {
          let p1 = hand.keypoints[part[i]];
          let p2 = hand.keypoints[part[i + 1]];
          let x1 = map(p1.x, 0, video.width, xOffset, xOffset + displayW);
          let y1 = map(p1.y, 0, video.height, yOffset, yOffset + displayH);
          let x2 = map(p2.x, 0, video.width, xOffset, xOffset + displayW);
          let y2 = map(p2.y, 0, video.height, yOffset, yOffset + displayH);
          line(x1, y1, x2, y2);
        }
      }
    }
  }

  drawUI();
  handleTimer();
}

// 手勢辨識邏輯
function recognizeGesture(hand) {
  // 取得關鍵點 (Index: 8-Tip, 6-Pip; Middle: 12-Tip, 10-Pip; etc.)
  let k = hand.keypoints;
  
  // 偵測「讚」：大拇指指尖高於關節，且其他四指收起
  let thumbUp = k[4].y < k[3].y && k[4].y < k[2].y;
  let indexUp = k[8].y < k[6].y;
  let middleUp = k[12].y < k[10].y;
  let ringUp = k[16].y < k[14].y;
  let pinkyUp = k[20].y < k[18].y;

  if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) return "讚";
  if (indexUp && middleUp && ringUp && pinkyUp) return "布";
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "剪刀";
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return "石頭";
  return "未定義";
}

function drawUI() {
  textAlign(CENTER, CENTER);
  fill(255);
  
  if (gameState === "WAITING") {
    // 1. 封面背景遮罩 (讓攝影機畫面變暗以凸顯文字)
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, 0, width, height);
    
    // 2. 繪製主標題
    fill(255, 215, 0); // 金色
    textSize(64);
    textStyle(BOLD);
    text("手勢猜拳大賽", width / 2, height * 0.4);
    
    // 3. 繪製裝飾圖示
    textStyle(NORMAL);
    textSize(60);
    text("✊  ✌️  🖐️", width / 2, height * 0.55);
    
    // 4. 開始提示
    fill(0, 255, 127); // 亮綠色
    textSize(24);
    text("請比出『👍』或 點擊畫面 開始遊戲", width / 2, height * 0.75);
    return; // 封面狀態下不顯示其他的狀態資訊
  }
  
  // 特效處理：若最終勝負已定
  if (matchWinner === "PLAYER") {
    // 獲勝特效：金色紙屑粒子
    for(let i=0; i<15; i++) {
      fill(random(200, 255), random(150, 255), 0);
      circle(random(width), random(height), random(5, 12));
    }
  } else if (matchWinner === "AI") {
    // 失敗特效：紅色閃爍背景
    fill(255, 0, 0, sin(frameCount * 0.2) * 40 + 40);
    rect(0, 0, width, height);
  }

  // 遊戲進行中的標題
  textSize(24);
  textStyle(BOLD);
  text("AI 猜拳大賽", width / 2, 40);
  textStyle(NORMAL);
  
  // 顯示當前比分 (三戰二勝)
  textSize(28);
  fill(255, 215, 0);
  text(`比分 ${playerScore} : ${aiScore}`, width / 2, 80);

  // 顯示玩家與 AI 的狀態
  textSize(32);
  fill(255);
  text(`玩家：${userChoice}`, width * 0.25, height * 0.85);
  text(`AI：${aiChoice}`, width * 0.75, height * 0.85);
  
  // 顯示中間的倒數或結果
  if (gameState === "COUNTING") {
    textSize(120);
    fill(255, 255, 0);
    text(timer, width / 2, height / 2);
  } else if (gameState === "RESULT") {
    textSize(64);
    fill(255, 200, 0);
    text(resultMessage, width / 2, height / 2);
    textSize(16);
    fill(150);
    text("點擊畫面重新開始", width / 2, height / 2 + 80);
  }
}

function handleTimer() {
  if (gameState === "COUNTING") {
    if (millis() - lastTick > 1000) {
      timer--;
      lastTick = millis();
      if (timer === 0) {
        playAI();
      }
    }
  }
}

function playAI() {
  aiChoice = random(choices);
  
  if (userChoice === aiChoice) {
    resultMessage = "平手！";
  } else if (
    (userChoice === "石頭" && aiChoice === "剪刀") ||
    (userChoice === "剪刀" && aiChoice === "布") ||
    (userChoice === "布" && aiChoice === "石頭")
  ) {
    playerScore++;
    resultMessage = "你贏了這一局！";
  } else {
    aiScore++;
    resultMessage = "AI 贏了這一局";
  }

  // 檢查是否達成三戰二勝 (先拿2分者勝)
  if (playerScore === 2) {
    matchWinner = "PLAYER";
    resultMessage = "🏆 最終大勝！ 🏆";
  } else if (aiScore === 2) {
    matchWinner = "AI";
    resultMessage = "🤖 AI 獲得最終勝利";
  }
  
  gameState = "RESULT";
}

function mousePressed() {
  if (gameState === "WAITING" || gameState === "RESULT") {
    // 如果一場三戰二勝結束了，點擊後重置比分重新開始
    if (matchWinner !== "") {
      playerScore = 0;
      aiScore = 0;
      matchWinner = "";
    }
    gameState = "COUNTING";
    timer = 3;
    lastTick = millis();
    aiChoice = "?";
  }
}

// 當視窗大小改變時，自動調整畫布以維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
