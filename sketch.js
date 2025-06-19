/* ---------- 글로벌 ---------- */
let handPose, video, hands = [];
let indexTrail = [];
const maxTrailLength = 40;

let tracks = [
  'src/003. [초보자 수련장] 용기있는 한걸음.mp3',
  'src/036. [도트누리 스테이지 1] I Love PSG!!!.mp3',
  'src/009. [상점] Where am I (arranged ver).mp3'
];
let sound = [];
let effectSound;
let currentTrack = 0;
let isStarted = false;

/* 로더 진행 관리 */
let loadedCnt = 0;
const totalToLoad = tracks.length + 2;   // 사운드 3개 + 효과음 + HandPose 모델 1개
function updateLoader() {
  loadedCnt++;
  const pct = int(loadedCnt / totalToLoad * 100);
  document.getElementById('percent').textContent = pct + '%';
  document.getElementById('bar').style.width = pct + '%';

  if (loadedCnt === totalToLoad) {        // 전부 끝!
    const l = document.getElementById('loader');
    l.style.transition = 'opacity .6s';
    l.style.opacity = 0;
    setTimeout(() => l.remove(), 600);
  }
}

/* ---------- preload : 사운드 ---------- */
function preload() {
  // BGM 3곡
  tracks.forEach((p, i) => {
    sound[i] = loadSound(p, updateLoader);
  });
  // 효과음
  effectSound = loadSound('src/effect1.mp3', updateLoader);
}

/* ---------- setup : 비디오 & HandPose 모델 ---------- */
function setup() {
  createCanvas(640, 480);
  frameRate(30);

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // HandPose 모델 로딩 → 완료 시 updateLoader 호출
  handPose = ml5.handPose(video, () => {
    handPose.detectStart(video, gotHands);
    updateLoader();
  });

  noStroke();
}

/* ---------- 마우스 클릭으로 재생 시작 ---------- */
function mousePressed() {
  if (!isStarted) {
    isStarted = true;
    playTrack(currentTrack);
  }
}

/* ---------- 오디오 컨트롤 ---------- */
function playTrack(idx) {
  if (idx >= sound.length) { currentTrack = 0; idx = 0; }
  sound[idx].play();
  sound[idx].onended(() => {
    currentTrack++;
    playTrack(currentTrack);
  });
}

/* ---------- draw ---------- */
function draw() {
  push();
  translate(video.width, 0);
  scale(-1, 1);
  //if var tint() : ?
  image(video, 0, 0);
  // noTint();
  if (hands.length) {
    let hand = hands[0];
    let indexTip = hand.keypoints[8];
    let thumbTip = hand.keypoints[4];

    /* 트레일 */
    indexTrail.push(createVector(indexTip.x, indexTip.y));
    if (indexTrail.length > maxTrailLength) indexTrail.shift();

    /* 사운드 파라미터 */
    if (isStarted && sound[currentTrack]?.isPlaying()) {
      let pan = map(indexTip.x, 0, width, -1, 1);
      let rate = map(indexTip.y, 0, height, 1.5, 0.5);
      sound[currentTrack].pan(pan);
      sound[currentTrack].rate(rate);
    }

    /* 핑거 탭 → 효과음 & 파티클 */
    if (dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y) < 30) {
      if (!isStarted) {
        isStarted = true;
        playTrack(currentTrack);
      }
      effectSound.stop();
      effectSound.play();
      effectSound.pan(map(indexTip.x, 0, width, -1, 1));
      effectSound.rate(map(indexTip.y, 0, height, 1.5, 0.5));

      for (let i = 0; i < 20; i++) {
        fill(255, 80);
        ellipse(random(indexTip.x - 30, indexTip.x + 30),
          random(indexTip.y - 30, indexTip.y + 30),
          random(5, 15));
      }
    }

    /* 손끝 표시 */
    fill(255); ellipse(indexTip.x, indexTip.y, 15);
  }

  /* 트레일 렌더 */
  for (let i = 0; i < indexTrail.length; i++) {
    let pt = indexTrail[i];
    fill(255, map(i, 0, indexTrail.length - 1, 0, 40));
    ellipse(pt.x, pt.y, map(i, 0, indexTrail.length - 1, 0, 10));
  }
  pop();

  /* UI 텍스트 */
  fill(255); textSize(14);
  if (!isStarted) text('Click to start sound', 10, 20);
  text('setlist:', 10, 50);
  text('1. [초보자 수련장] 용기있는 한걸음', 10, 70);
  text('2. [도트누리 스테이지 1] I Love PSG!!!', 10, 90);
  text('3. [상점] Where am I (arranged ver)', 10, 110);
  text('Current Track: ' + (currentTrack + 1), 10, 130);
}

/* ---------- HandPose 결과 ---------- */
function gotHands(results) { 
  hands = results; 
}