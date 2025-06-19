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

/* 💡 화면/스케일 관련 전역 */
let vW = 640, vH = 480;      // 원본 비디오 해상도
let s = 1;                   // 비디오 → 스크린 배율
let offX = 0, offY = 0;      // 크롭 오프셋
const baseTapDist = 30;      // 원본(640×480) 기준 핑거탭 거리

/* ---------- 로더 진행 관리 ---------- */
let loadedCnt = 0;
const totalToLoad = tracks.length + 2; // 사운드 3 + 효과음 + HandPose
function updateLoader() {
  loadedCnt++;
  const percent = Math.floor((loadedCnt / totalToLoad) * 100);

  const loaderEl = document.getElementById('loader');
  const percentEl = document.getElementById('percent');
  const barEl = document.getElementById('bar');

  if (percentEl) percentEl.textContent = percent + '%';
  if (barEl) barEl.style.width = percent + '%';

  if (loadedCnt >= totalToLoad && loaderEl) {
    setTimeout(() => loaderEl.style.display = 'none', 500);
  }
}

/* ---------- preload : 사운드 ---------- */
function preload() {
  for (let i = 0; i < tracks.length; i++) {
    sound[i] = loadSound(tracks[i], updateLoader);
  }
  effectSound = loadSound('src/effect1.mp3', updateLoader);
}

/* ---------- setup ---------- */
function setup() {
  createCanvas(windowWidth, windowHeight);        // 💡 풀스크린
  frameRate(30);

  video = createCapture(VIDEO);
  video.size(vW, vH);                             // 고정 크기
  video.hide();

  handPose = ml5.handPose(video, () => {
    handPose.detectStart(video, gotHands);
    updateLoader();
  });

  noStroke();
}

/* ---------- 창 크기 변경 ---------- */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/* ---------- 스케일 & 오프셋 계산 ---------- */
function updateScale() {
  const canvasAR = width / height;
  const videoAR = vW / vH;

  if (canvasAR > videoAR) {        // 가로가 더 긴 경우 → 상·하 크롭
    s = width / vW;
    offX = 0;
    offY = (height - vH * s) / 2;
  } else {                         // 세로(모바일) → 좌·우 크롭
    s = height / vH;
    offX = (width - vW * s) / 2;
    offY = 0;
  }
}

/* ---------- 비디오 좌표 → 화면 좌표 ---------- */
function v2s(pt) {
  // 비디오는 좌우 반전해서 그릴 거라 x 축을 거울처럼 뒤집어 준다
  const x = offX + (vW - pt.x) * s;  // 💡 수정: 반전 계산 개선
  const y = pt.y * s + offY;
  return createVector(x, y);
}

/* ---------- 마우스 클릭 ---------- */
function mousePressed() {
  if (!isStarted) {
    isStarted = true;
    playTrack(currentTrack);
  } else {
    currentTrack = (currentTrack + 1) % tracks.length;
    playTrack(currentTrack);
  }
}

/* ---------- 오디오 컨트롤 ---------- */
function playTrack(idx) {
  // 모든 사운드 정지
  for (let i = 0; i < sound.length; i++) {
    if (sound[i] && sound[i].isPlaying()) {
      sound[i].stop();
    }
  }

  // 선택된 트랙 재생
  if (sound[idx]) {
    sound[idx].loop();
  }
}

/* ---------- draw ---------- */
function draw() {
  updateScale();   // 매 프레임 갱신 (orientation 바뀔 때 대비)

  /* --- 비디오 렌더 (좌우 반전, 크롭) --- */
  push();
  translate(offX + vW * s, offY);
  scale(-1, 1);  // 좌우 반전
  image(video, 0, 0, vW * s, vH * s);
  pop();

  /* --- 손 인식 & 효과 --- */
  if (hands.length) {
    const hand = hands[0];
    const indexTip = v2s(hand.keypoints[8]);
    const thumbTip = v2s(hand.keypoints[4]);

    /* 트레일 */
    indexTrail.push(indexTip.copy());
    if (indexTrail.length > maxTrailLength) indexTrail.shift();

    /* 사운드 파라미터 */
    if (isStarted && sound[currentTrack]?.isPlaying()) {
      const pan = map(indexTip.x, 0, width, -1, 1);
      const rate = map(indexTip.y, 0, height, 1.5, 0.5);
      sound[currentTrack].pan(pan);
      sound[currentTrack].rate(rate);
    }

    /* 핑거 탭 */
    const tapDist = baseTapDist * s;            // 💡 배율 반영
    if (dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y) < tapDist) {
      if (!isStarted) { isStarted = true; playTrack(currentTrack); }
      if (effectSound) {
        effectSound.stop();
        effectSound.play();
        effectSound.pan(map(indexTip.x, 0, width, -1, 1));
        effectSound.rate(map(indexTip.y, 0, height, 1.5, 0.5));
      }

      // 파티클 효과 (스케일 반영)
      for (let i = 0; i < 20; i++) {
        fill(255, 80);
        ellipse(random(indexTip.x - 30 * s, indexTip.x + 30 * s),
          random(indexTip.y - 30 * s, indexTip.y + 30 * s),
          random(5 * s, 15 * s));
      }
    }

    /* 손끝 표시 */
    fill(255);
    ellipse(indexTip.x, indexTip.y, 15 * s);
  }

  /* 트레일 렌더 */
  for (let i = 0; i < indexTrail.length; i++) {
    const pt = indexTrail[i];
    fill(255, map(i, 0, indexTrail.length - 1, 0, 40));
    ellipse(pt.x, pt.y, map(i, 0, indexTrail.length - 1, 0, 10 * s));
  }

  /* UI 텍스트 (화면 크기에 맞춰 조정) */
  const txtSize = max(12, min(width, height) / 50);  // 💡 더 작은 기본 크기
  textSize(txtSize);
  fill(255);

  const margin = txtSize * 0.5;  // 마진도 스케일에 맞춰
  const lineHeight = txtSize * 1.3;

  let ty = margin + txtSize;  // 텍스트가 화면을 벗어나지 않도록 width 체크
  const maxTextWidth = width - margin * 2;

  if (!isStarted) {
    text('Click to start sound', margin, ty);
    ty += lineHeight * 1.5;
  }

  text('setlist:', margin, ty);
  ty += lineHeight;

  // 긴 텍스트는 줄바꿈 처리
  const track1 = '1. [초보자 수련장] 용기있는 한걸음';
  const track2 = '2. [도트누리 스테이지 1] I Love PSG!!!';
  const track3 = '3. [상점] Where am I (arranged ver)';

  text(track1, margin, ty); ty += lineHeight;
  text(track2, margin, ty); ty += lineHeight;
  text(track3, margin, ty); ty += lineHeight;

  text('Current Track: ' + (currentTrack + 1), margin, ty);
}

/* ---------- HandPose 결과 ---------- */
function gotHands(results) { hands = results; }