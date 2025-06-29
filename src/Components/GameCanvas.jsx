import React, { useEffect, useRef, useState } from 'react';
import bgImgSrc from '../assets/ships/pexels-kaip-1341279.jpg';
import playerImgSrc from '../assets/ships/h2.png';
import enemyImgSrc from '../assets/ships/v3.png';
import healthPackImgSrc from '../assets/ships/bullet-health.png';
import fireSoundSrc from '../assets/sounds/laser-104024.mp3';
import playerLaserImgSrc from "../assets/lasers/green-fire.png";
import enemyLaserImgSrc from "../assets/lasers/red-fire.png";
import explosionGifSrc from '../assets/effects/enmy-explosion.png';


const MAX_HEALTH = 100;
const MAX_ENEMIES = 5;
const SPAWN_INTERVAL = 2000;
const ENEMY_FIRE_INTERVAL = 4500;
const HEALTH_PACK_INTERVAL = 10000;
const SPAWN_RANGE = 200;

const FRAME_SIZE = 64;         // Width/height of one frame
const FRAME_COUNT = 25;        // Total frames in sprite sheet
const SPRITE_COLUMNS = 5;      // Number of columns in the sheet
const FRAME_DURATION = 30;     // ms per frame

const GameCanvas = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const scoreRef = useRef(0);
  const playerRef = useRef(null);

  let explosions = [];

  useEffect(() => {
    let bgY = 0;
    const bgSpeed = 30;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // load images
    const bgImg = new Image(); bgImg.src = bgImgSrc;
    const playerImg = new Image(); playerImg.src = playerImgSrc;
    const enemyImg = new Image(); enemyImg.src = enemyImgSrc;
    const healthPackImg = new Image(); healthPackImg.src = healthPackImgSrc;
    const playerLaserImg = new Image();
    playerLaserImg.src = playerLaserImgSrc;
    const enemyLaserImg = new Image();
    enemyLaserImg.src = enemyLaserImgSrc;
    const explosionGif = new Image();
    explosionGif.src = explosionGifSrc;


    // load sound
    const fireSound = new Audio(fireSoundSrc);

    // game state
    const player = { x: canvas.width / 2 - 40, y: canvas.height - 120, width: 90, height: 90, speed: 200, bullets: [], health: MAX_HEALTH };
    playerRef.current = player;
    let enemies = [];
    let enemyBullets = [];
    let healthPacks = [];
    const keys = {};

    // intervals
    const spawnId = setInterval(() => spawnEnemy(), SPAWN_INTERVAL);
    const fireId = setInterval(() => enemyFire(), ENEMY_FIRE_INTERVAL);
    const hpId = setInterval(() => spawnHealthPack(), HEALTH_PACK_INTERVAL);

    function spawnEnemy() {
      if (enemies.length < MAX_ENEMIES && !gameOver) {
        const cx = canvas.width / 2;
        const x = Math.random() * (SPAWN_RANGE * 2) + (cx - SPAWN_RANGE);
        enemies.push({
          x,
          baseX: x,
          y: -60,
          width: 60,
          height: 60,
          speed: 0.5,
          waveOffset: Math.random() * 1000
        });
      }
    }
    function enemyFire() {
      if (!gameOver) enemies.forEach(e => {
        enemyBullets.push({ x: e.x + e.width / 2 - 6, y: e.y + e.height, width: 12, height: 32, speed: 80 });

      });
    }
    function spawnHealthPack() {
      if (!gameOver) {
        const x = Math.random() * (canvas.width - 40);
        healthPacks.push({ x, y: -40, width: 40, height: 40, speed: 1 });
      }
    }
    function shoot() {
      if (!gameOver) {
        player.bullets.push({ x: player.x + player.width / 2 - 5, y: player.y, width: 10, height: 30, speed: 300 });

        fireSound.currentTime = 0;
        fireSound.play();
      }
    }
    function checkCollision(a, b) {
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    function updateGame(dt) {
      if (gameOver) return;

      // player move
      if (keys.ArrowLeft) player.x -= player.speed * dt;
      if (keys.ArrowRight) player.x += player.speed * dt;
      if (keys.ArrowUp) player.y -= player.speed * dt;
      if (keys.ArrowDown) player.y += player.speed * dt;
      player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
      player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

      // bullets
      player.bullets = player.bullets.filter(b => b.y > 0);
      player.bullets.forEach(b => b.y -= b.speed * dt);

      // enemies
      enemies.forEach((e, ei) => {
        e.y += e.speed;
        e.x = e.baseX + Math.sin((performance.now() + e.waveOffset) / 500) * 20;
        if (e.y > canvas.height) enemies.splice(ei, 1);
        if (checkCollision(e, player)) {
          enemies.splice(ei, 1);
          player.health = Math.max(0, player.health - 1);
          if (navigator.vibrate) navigator.vibrate(200);
          if (player.health <= 0) handleGameOver();
        }

        // Check collision with bullets
        player.bullets.forEach((b, bi) => {
          if (checkCollision(e, b)) {
            explosions.push({
              x: e.x,
              y: e.y,
              width: e.width,
              height: e.height,
              startTime: performance.now()
            });
            enemies.splice(ei, 1);
            player.bullets.splice(bi, 1);
            scoreRef.current++;
            setScore(scoreRef.current);
          }
        });
      });

      // enemy bullets
      enemyBullets = enemyBullets.filter(b => b.y < canvas.height);
      enemyBullets.forEach((b, bi) => {
        b.y += b.speed * dt;
        if (checkCollision(b, player)) {
          enemyBullets.splice(bi, 1);
          const healthLow = Math.floor(Math.random() * 5) + 1;
          player.health = Math.max(0, player.health - healthLow);
          if (navigator.vibrate) navigator.vibrate(200);
          if (player.health === 0) handleGameOver();
        }
      });

      // health packs
      healthPacks.forEach((hp, i) => {
        hp.y += hp.speed;
        if (checkCollision(hp, player)) {
          const refill = Math.ceil(Math.random() * 15);
          player.health = Math.min(MAX_HEALTH, player.health + refill);
          healthPacks.splice(i, 1);
        } else if (hp.y > canvas.height) healthPacks.splice(i, 1);
      });

      // filter expired explosions
      explosions = explosions.filter(ex => (performance.now() - ex.startTime) < FRAME_COUNT * FRAME_DURATION);


      bgY += bgSpeed * dt;
      if (bgY >= canvas.height) bgY = 0;
    }


    function drawGame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bgImg, 0, bgY - canvas.height, canvas.width, canvas.height);
      ctx.drawImage(bgImg, 0, bgY, canvas.width, canvas.height);
      ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

      player.bullets.forEach(b => {
        ctx.drawImage(playerLaserImg, b.x, b.y, b.width, b.height);
      });

      enemies.forEach(e => ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height));

      enemyBullets.forEach(b => {
        ctx.drawImage(enemyLaserImg, b.x, b.y, b.width, b.height);
      });
      healthPacks.forEach(hp => ctx.drawImage(healthPackImg, hp.x, hp.y, hp.width, hp.height));

      explosions.forEach(ex => {
        const elapsed = performance.now() - ex.startTime;
        const frameIndex = Math.floor(elapsed / FRAME_DURATION);

        if (frameIndex < FRAME_COUNT) {
          const sx = (frameIndex % SPRITE_COLUMNS) * FRAME_SIZE;
          const sy = Math.floor(frameIndex / SPRITE_COLUMNS) * FRAME_SIZE;
          ctx.drawImage(
            explosionGif,
            sx, sy, FRAME_SIZE, FRAME_SIZE,
            ex.x, ex.y, ex.width, ex.height
          );
        }
      });

      // health bar
      const bw = 200, bh = 20;
      const x = canvas.width - bw - 10; // 10px from the right edge
      const y = 40;

      ctx.fillStyle = 'grey';
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = 'lime';
      ctx.fillRect(x, y, bw * (player.health / MAX_HEALTH), bh);
      ctx.strokeStyle = 'white';
      ctx.strokeRect(x, y, bw, bh);
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText(`Health: ${player.health}/${MAX_HEALTH}`, x, y - 2);
      explosions.forEach(ex => {
        ctx.drawImage(explosionGif, ex.x, ex.y, ex.width, ex.height);
      });
    }

    let last = performance.now();
    function loop(time) { const dt = (time - last) / 1000; last = time; updateGame(dt); drawGame(); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);

    const down = e => { keys[e.key] = true; if (e.key === ' ') shoot(); };
    const up = e => { keys[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    function handleGameOver() {
      setGameOver(true);
      clearInterval(spawnId); clearInterval(fireId); clearInterval(hpId);
    }

    return () => {
      clearInterval(spawnId); clearInterval(fireId); clearInterval(hpId);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [gameOver]);

  const restartGame = () => {
    window.location.reload();
  };

  return <>
    <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
    {!gameOver && <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', fontSize: 20, fontFamily: 'Arial' }}>Score: {score}</div>}
    {gameOver && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
      <h1>Game Over</h1>
      <p>Your score: {score}</p>
      <button onClick={restartGame} style={{ padding: '10px 20px', fontSize: '16px' }}>Restart</button>
    </div>}
  </>;
};

export default GameCanvas;
