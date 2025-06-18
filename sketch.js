let handPose;
let video;
let hands = [];

let indexTrail = [];
let maxTrailLength = 40;

let sound = [];
let effectSound;
let currentTrack = 0;
let isStarted = false;

function preload() {
  handPose = ml5.handPose();
  sound[0] = loadSound('src/003. [초보자 수련장] 용기있는 한걸음.mp3');
  sound[1] = loadSound('src/036. [도트누리 스테이지 1] I Love PSG!!!.mp3');
  sound[2] = loadSound('src/009. [상점] Where am I (arranged ver).mp3');
  effectSound = loadSound('src/effect1.mp3');
}

function setup() {
  createCanvas(640, 480);
  frameRate(30);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  handPose.detectStart(video, gotHands);
  noStroke();
}

function mousePressed() {
  if (!isStarted) {
    isStarted = true;
    playTrack(currentTrack);
  }
}

function playTrack(index) {
  if (index >= sound.length) {
    currentTrack = 0;
    index = 0;
  }

  sound[index].play();
  sound[index].onended(() => {
    currentTrack++;
    playTrack(currentTrack);
  });
}

function draw() {

  // UI 텍스트
  fill(255);
  textSize(14);
  text('Click to start sound', 10, 20);
  text('setlist:', 10, 50);
  text('1. [초보자 수련장] 용기있는 한걸음', 10, 70);
  text('2. [도트누리 스테이지 1] I Love PSG!!!', 10, 90);
  text('3. [상점] Where am I (arranged ver)', 10, 110);
  text('Current Track: ' + (currentTrack + 1), 10, 130);

  // 비디오 미러링
  translate(video.width, 0);
  scale(-1, 1);

  image(video, 0, 0, 640, 480);

  // 손 인식 되었을 때
  if (hands.length > 0) {
    let hand = hands[0];
    let indexTip = hand.keypoints[8];
    let thumbTip = hand.keypoints[4];

    // 트레일 업데이트
    indexTrail.push(createVector(indexTip.x, indexTip.y));
    if (indexTrail.length > maxTrailLength) indexTrail.shift();

    // 트레일 색상 연동
    let ITxG = map(indexTip.x, 0, width, 0, 100);
    let ITyR = map(indexTip.y, 0, height, 100, 0);
    tint(ITyR, ITxG, 100, 20);

    // 곡 재생 중이면 사운드 제어
    if (isStarted && sound[currentTrack]?.isPlaying()) {
      let pan = map(indexTip.x, 0, width, -1.0, 1.0);
      let rate = map(indexTip.y, 0, height, 1.5, 0.5);
      sound[currentTrack].pan(constrain(pan, -1.0, 1.0));
      sound[currentTrack].rate(constrain(rate, 0.5, 1.5));
    }

    // 손가락 거리 측정 → 효과음 + 입자
    let d = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
    if (d < 30) {
      // 효과음
      effectSound.stop();
      effectSound.play();

      // 효과음에도 팬/레이트 적용
      let fxPan = map(indexTip.x, 0, width, -1.0, 1.0);
      let fxRate = map(indexTip.y, 0, height, 1.5, 0.5);
      effectSound.pan(constrain(fxPan, -1.0, 1.0));
      effectSound.rate(constrain(fxRate, 0.5, 1.5));

      // 파티클 효과
      for (let i = 0; i < 20; i++) {
        fill(255, 255, 255, 80);
        let fx = random(indexTip.x - 30, indexTip.x + 30);
        let fy = random(indexTip.y - 30, indexTip.y + 30);
        ellipse(fx, fy, random(5, 15));
      }
    }

    // 손끝 시각화
    ellipse(indexTip.x, indexTip.y, 15);
  }

  // 트레일 그리기
  for (let i = 0; i < indexTrail.length; i++) {
    let pt = indexTrail[i];
    let size = map(i, 0, indexTrail.length - 1, 0, 10);
    let alpha = map(i, 0, indexTrail.length - 1, 0, 40);
    fill(255, 255, 255, alpha);
    ellipse(pt.x, pt.y, size);
  }
}

function gotHands(results) {
  hands = results;
}
