/**
 * NEON DRIFT - Core Game Logic & Audio Synthesizer
 * Fully modular game controller handling scoring, difficulty progression,
 * 3-lane grid kinematics, obstacle spawns, and procedural retro sound effects.
 */

export class GameController {
  constructor() {
    // Game States: 'MENU', 'STARTING', 'PLAYING', 'CRASHED'
    this.state = 'MENU';
    
    // Kinematics and Lanes
    this.lanes = [-3.0, 0.0, 3.0]; // X coordinates for Left, Center, Right
    this.currentLane = 1; // Start in center lane (Index 1)
    this.playerX = 0; // Current visual X coordinate (interpolates to target)
    this.targetX = 0;
    this.laneSpeed = 0.22; // Snappy interpolation factor (lerp weight)
    this.shipYOffset = 0; // Floating hover height
    
    // Progression & Difficulty
    this.distance = 0;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('neondrift_highscore')) || 0;
    this.speedMultiplier = 1.0;
    this.baseSpeed = 0.65; // Movement speed along Z track
    this.currentSpeed = this.baseSpeed;
    this.currentPhase = 1;
    
    // Phase settings
    this.phases = {
      1: {
        name: 'PHASE 1 // COOL BLUE',
        color: '#00ffff',
        fogColor: 0x001535,
        targetDistance: 1000,
        spawnInterval: 90, // Spawning every N frames
        speedMultiplier: 1.0
      },
      2: {
        name: 'PHASE 2 // PURPLE PULSE',
        color: '#d900ff',
        fogColor: 0x1d0035,
        targetDistance: 2500,
        spawnInterval: 75,
        speedMultiplier: 1.35
      },
      3: {
        name: 'PHASE 3 // GLITCH AGGRESSOR',
        color: '#ff003c',
        fogColor: 0x30000a,
        targetDistance: Infinity,
        spawnInterval: 55,
        speedMultiplier: 1.8
      }
    };
    
    // Selected Avatar Index
    this.selectedAvatarIndex = 0;
    this.avatarStats = [
      { name: 'CYAN SHADOW', color: '#00ffff', model: 'sleek' },
      { name: 'MAGENTA PULSE', color: '#d900ff', model: 'chrono' },
      { name: 'TOXIC APEX', color: '#39ff14', model: 'heavy' }
    ];
    
    // Obstacle Management
    this.obstacles = [];
    this.spawnTimer = 0;
    this.obstaclePoolSize = 15;
    this.trackLength = 220; // Maximum distance objects spawn at
    
    // Audio Context Setup
    this.audioCtx = null;
    this.bgmNode = null;
    this.muted = localStorage.getItem('neondrift_muted') === 'true';
    
    // Timing and Frame count for sin-wave oscillations
    this.frameCount = 0;
  }

  init() {
    this.updateHighScoreDisplay();
    this.setupMuteButton();
    this.setupCarouselEvents();
  }

  // ==========================================================================
  // WEB AUDIO SYNTHESIZER SYSTEM
  // ==========================================================================
  
  ensureAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('neondrift_muted', this.muted);
    this.updateMuteUI();
    
    if (this.muted) {
      this.stopBgm();
    } else {
      this.ensureAudioContext();
      if (this.state === 'PLAYING') {
        this.playBgm();
      }
    }
  }

  updateMuteUI() {
    const onIcon = document.getElementById('sound-on-icon');
    const offIcon = document.getElementById('sound-off-icon');
    if (this.muted) {
      onIcon.style.display = 'none';
      offIcon.style.display = 'block';
    } else {
      onIcon.style.display = 'block';
      offIcon.style.display = 'none';
    }
  }

  setupMuteButton() {
    this.updateMuteUI();
    const btn = document.getElementById('sound-toggle-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ensureAudioContext();
      this.playSfxSelect();
      this.toggleMute();
    });
  }

  async saveHighScoreToServer(score, distance, avatar) {
    try {
      await fetch('/api/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          score,
          distance,
          avatar
        })
      });
    } catch (err) {
      console.warn('Unable to save high score to server:', err);
    }
  }

  // Synthesize UI Select sound
  playSfxSelect() {
    if (this.muted) return;
    this.ensureAudioContext();
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(950, this.audioCtx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.08);
  }

  // Synthesize Lane Shift sound
  playSfxDrift() {
    if (this.muted) return;
    this.ensureAudioContext();
    
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(3.0, now);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(now + 0.15);
  }

  // Synthesize Crash Explosion
  playSfxCrash() {
    if (this.muted) return;
    this.ensureAudioContext();
    this.stopBgm();
    
    const now = this.audioCtx.currentTime;
    
    // Create white/red noise buffer
    const bufferSize = this.audioCtx.sampleRate * 1.5;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.exponentialRampToValueAtTime(20, now + 1.2);
    
    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);
    
    // Add low bass oscillator boom
    const subOsc = this.audioCtx.createOscillator();
    const subGain = this.audioCtx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(90, now);
    subOsc.frequency.linearRampToValueAtTime(25, now + 0.6);
    
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    
    subOsc.connect(subGain);
    subGain.connect(this.audioCtx.destination);
    
    noise.start();
    subOsc.start();
    
    noise.stop(now + 1.5);
    subOsc.stop(now + 1.5);
  }

  // Synthesize Dynamic Phase Change Sound (Sci-Fi chord arpeggio)
  playSfxLevelUp() {
    if (this.muted) return;
    this.ensureAudioContext();
    
    const now = this.audioCtx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
    
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0.0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.5);
    });
  }

  // Synthwave bass rhythmic generator
  playBgm() {
    if (this.muted) return;
    this.ensureAudioContext();
    this.stopBgm();
    
    const now = this.audioCtx.currentTime;
    
    // We create a custom oscillator synth node loop using setinterval style scheduling.
    // However, to keep it extremely reliable and self-contained in a single Web Audio chain,
    // we generate a rhythmic scheduler that schedules oscillators over time.
    this.bgmNode = {
      active: true,
      oscillators: [],
      timerId: null
    };

    // Tempo in Beats Per Minute
    const bpm = 120;
    const stepDuration = 60 / bpm / 2; // Eighth note interval
    let stepCount = 0;
    
    const scheduleNextBeats = () => {
      if (!this.bgmNode || !this.bgmNode.active) return;
      
      const currentTime = this.audioCtx.currentTime;
      // Schedule notes for the next 0.3 seconds
      const bassSequence = [55.00, 55.00, 55.00, 65.41, 55.00, 55.00, 55.00, 48.99]; // A1, A1, A1, C2, A1, A1, A1, G1
      
      // Determine what notes based on phase
      let noteFreq = bassSequence[stepCount % bassSequence.length];
      if (this.currentPhase === 2) {
        // Shift octave higher / key change (D1 / F1 / G1 equivalents)
        const phase2Seq = [73.42, 73.42, 73.42, 87.31, 73.42, 73.42, 98.00, 87.31];
        noteFreq = phase2Seq[stepCount % phase2Seq.length];
      } else if (this.currentPhase === 3) {
        // Fast intense chromatic scale
        const phase3Seq = [43.65, 43.65, 51.91, 51.91, 48.99, 48.99, 58.27, 58.27];
        noteFreq = phase3Seq[stepCount % phase3Seq.length];
      }

      // Schedule current note
      const osc = this.audioCtx.createOscillator();
      const filter = this.audioCtx.createBiquadFilter();
      const gain = this.audioCtx.createGain();
      
      // Sawtooth baseline with lowpass filter sweep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, currentTime);
      
      // Dynamic sweep based on beat
      filter.type = 'lowpass';
      const filterStart = stepCount % 4 === 0 ? 800 : 350;
      filter.frequency.setValueAtTime(filterStart, currentTime);
      filter.frequency.exponentialRampToValueAtTime(110, currentTime + stepDuration - 0.01);
      
      gain.gain.setValueAtTime(0.24, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, currentTime + stepDuration - 0.01);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start(currentTime);
      osc.stop(currentTime + stepDuration);
      
      // Track scheduled oscillators to clean up
      this.bgmNode.oscillators.push(osc);
      if (this.bgmNode.oscillators.length > 20) {
        this.bgmNode.oscillators.shift();
      }
      
      stepCount++;
      
      // Schedule next call
      this.bgmNode.timerId = setTimeout(scheduleNextBeats, stepDuration * 1000);
    };

    scheduleNextBeats();
  }

  stopBgm() {
    if (this.bgmNode) {
      this.bgmNode.active = false;
      if (this.bgmNode.timerId) clearTimeout(this.bgmNode.timerId);
      this.bgmNode.oscillators.forEach(osc => {
        try { osc.stop(); } catch(e) {}
      });
      this.bgmNode = null;
    }
  }

  // ==========================================================================
  // CAROUSEL & USER INTERFACES
  // ==========================================================================

  setupCarouselEvents() {
    const prevBtn = document.getElementById('prev-avatar-btn');
    const nextBtn = document.getElementById('next-avatar-btn');
    
    prevBtn.addEventListener('click', () => {
      this.playSfxSelect();
      this.rotateCarousel(-1);
    });
    
    nextBtn.addEventListener('click', () => {
      this.playSfxSelect();
      this.rotateCarousel(1);
    });

    // Make card clicks selectable
    const cards = document.querySelectorAll('.avatar-card');
    cards.forEach((card, idx) => {
      card.addEventListener('click', () => {
        if (idx !== this.selectedAvatarIndex) {
          this.playSfxSelect();
          this.selectedAvatarIndex = idx;
          this.updateCarouselUI();
        }
      });
    });
    
    this.updateCarouselUI();
  }

  rotateCarousel(direction) {
    this.selectedAvatarIndex = (this.selectedAvatarIndex + direction + 3) % 3;
    this.updateCarouselUI();
  }

  updateCarouselUI() {
    const cards = document.querySelectorAll('.avatar-card');
    cards.forEach((card, idx) => {
      card.classList.remove('active', 'prev', 'next');
      
      if (idx === this.selectedAvatarIndex) {
        card.classList.add('active');
      } else if (idx === (this.selectedAvatarIndex - 1 + 3) % 3) {
        card.classList.add('prev');
      } else {
        card.classList.add('next');
      }
    });

    // Dynamically update CSS root variables to match selected avatar's color theme
    const activeColor = this.avatarStats[this.selectedAvatarIndex].color;
    document.documentElement.style.setProperty('--theme-color', activeColor);
    
    // Generate glow color from color string
    let glow = 'rgba(0, 255, 255, 0.25)';
    if (this.selectedAvatarIndex === 1) glow = 'rgba(217, 0, 255, 0.25)';
    if (this.selectedAvatarIndex === 2) glow = 'rgba(57, 255, 20, 0.25)';
    document.documentElement.style.setProperty('--theme-glow', glow);
  }

  updateHighScoreDisplay() {
    const scoreText = this.scoreFormatter(this.highScore);
    document.getElementById('high-score-val').textContent = scoreText;
  }

  scoreFormatter(num) {
    return String(Math.floor(num)).padStart(6, '0');
  }

  // ==========================================================================
  // GAME SYSTEM CONTROLLER & CORE LOOP
  // ==========================================================================

  startGame() {
    this.ensureAudioContext();
    this.state = 'PLAYING';
    this.score = 0;
    this.distance = 0;
    this.speedMultiplier = 1.0;
    this.currentPhase = 1;
    this.spawnTimer = 0;
    this.obstacles = [];
    this.currentLane = 1; // Start Center
    this.targetX = this.lanes[this.currentLane];
    this.playerX = this.targetX;
    
    // Switch HUD overlay
    document.getElementById('landing-page').classList.add('fade-out');
    document.getElementById('game-hud').classList.add('active');
    document.getElementById('game-over-modal').classList.remove('active');
    
    // Set active phase visual banner
    this.updatePhaseUI();
    
    // Start procedural looping soundtrack
    this.playBgm();
  }

  update() {
    if (this.state !== 'PLAYING') return;

    this.frameCount++;
    
    // 1. Progress Distance & Scaling Difficulty
    const phaseSetting = this.phases[this.currentPhase];
    const frameSpeed = this.baseSpeed * this.speedMultiplier * phaseSetting.speedMultiplier;
    this.currentSpeed = frameSpeed;
    
    this.distance += frameSpeed * 0.15; // Scaled to look realistic in meters
    this.score += frameSpeed * 1.5; // Gain score as you speed forward
    
    // 2. Linear speed progression inside the current phase
    this.speedMultiplier = 1.0 + (this.distance / 1500);
    if (this.speedMultiplier > 2.8) this.speedMultiplier = 2.8;

    // 3. Interpolate player steering coordinates
    this.playerX += (this.targetX - this.playerX) * this.laneSpeed;

    // Floating ship bobbing effect
    this.shipYOffset = Math.sin(this.frameCount * 0.08) * 0.08;

    // 4. Update HUD Displays
    document.getElementById('hud-distance').textContent = Math.floor(this.distance).toString().padStart(4, '0');
    document.getElementById('hud-score').textContent = this.scoreFormatter(this.score);
    
    const velocityScale = (this.currentSpeed / this.baseSpeed);
    const speedPercent = Math.min((velocityScale - 1) / 3 * 100, 100);
    document.getElementById('speed-bar-fill').style.width = `${speedPercent}%`;
    document.getElementById('hud-multiplier').textContent = `${velocityScale.toFixed(1)}x`;

    // 5. Phase Transitions
    if (this.currentPhase === 1 && this.distance >= this.phases[1].targetDistance) {
      this.transitionToPhase(2);
    } else if (this.currentPhase === 2 && this.distance >= this.phases[2].targetDistance) {
      this.transitionToPhase(3);
    }

    // 6. Spawn & Move Obstacles
    this.handleObstaclePooling();
  }

  transitionToPhase(newPhase) {
    this.currentPhase = newPhase;
    this.playSfxLevelUp();
    this.updatePhaseUI();
    
    // Dynamic overlay shake or signal flash on UI
    const banner = document.getElementById('hud-stage-banner');
    banner.style.animation = 'none';
    setTimeout(() => {
      banner.style.animation = 'neon-blink 1s infinite alternate';
    }, 50);

    // Refresh background beat loop with new theme scales
    if (!this.muted) {
      this.playBgm();
    }
  }

  updatePhaseUI() {
    const phaseInfo = this.phases[this.currentPhase];
    const banner = document.getElementById('hud-stage-banner');
    banner.textContent = phaseInfo.name;
    banner.style.color = phaseInfo.color;
    banner.style.textShadow = `0 0 10px ${phaseInfo.color}`;
  }

  steer(direction) {
    if (this.state !== 'PLAYING') return;

    if (direction === 'LEFT' && this.currentLane > 0) {
      this.currentLane--;
      this.playSfxDrift();
    } else if (direction === 'RIGHT' && this.currentLane < 2) {
      this.currentLane++;
      this.playSfxDrift();
    }
    this.targetX = this.lanes[this.currentLane];
  }

  // ==========================================================================
  // OBSTACLE POOLING & DISPATCH MECHANICS
  // ==========================================================================

  handleObstaclePooling() {
    const phaseSetting = this.phases[this.currentPhase];
    
    // Incremental Spawner Timer
    this.spawnTimer++;
    if (this.spawnTimer >= phaseSetting.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    // Move active obstacles from pool forward
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (!obs.active) continue;

      // Translate obstacle closer on Z-axis
      obs.z += this.currentSpeed;

      // Phase 2 sliding laser logic
      if (obs.type === 'LASER') {
        obs.offsetX += obs.speedX * obs.directionX;
        if (Math.abs(obs.offsetX) > 3.8) {
          obs.directionX *= -1; // Bounce back
        }
        obs.x = obs.baseX + obs.offsetX;
      }

      // Phase 3 Glitch Trap flickering logic
      if (obs.type === 'GLITCH') {
        // Flicker opacity based on trigonometric interval
        obs.flickerTimer++;
        obs.isVisible = (Math.floor(obs.flickerTimer / 8) % 2 === 0);
        
        // Solidify when extremely close to force reflex
        if (this.trackLength - obs.z < 55) {
          obs.isVisible = true;
        }
      }

      // Deactivate obstacles that slip behind the camera view
      if (obs.z > 12) {
        obs.active = false;
        if (obs.meshRef) {
          obs.meshRef.visible = false;
        }
        this.obstacles.splice(i, 1);
      } else {
        // Check exact AABB collision against the player's ship
        this.checkCollision(obs);
      }
    }
  }

  spawnObstacle() {
    // Find available inactive slots or create a new entry
    const laneIndex = Math.floor(Math.random() * 3);
    
    let type = 'WALL'; // Default static box obstacle
    let extraData = {};
    
    if (this.currentPhase === 2) {
      // 40% chance of spawning moving lasers in phase 2
      if (Math.random() < 0.45) {
        type = 'LASER';
        extraData = {
          baseX: this.lanes[laneIndex],
          offsetX: 0,
          speedX: 0.05 + Math.random() * 0.05,
          directionX: Math.random() > 0.5 ? 1 : -1
        };
      }
    } else if (this.currentPhase === 3) {
      // 50% chance of spawning glitch traps in phase 3
      const rand = Math.random();
      if (rand < 0.35) {
        type = 'GLITCH';
        extraData = {
          flickerTimer: 0,
          isVisible: false
        };
      } else if (rand < 0.6) {
        type = 'LASER';
        extraData = {
          baseX: this.lanes[laneIndex],
          offsetX: 0,
          speedX: 0.08 + Math.random() * 0.06,
          directionX: Math.random() > 0.5 ? 1 : -1
        };
      }
    }

    const newObs = {
      id: Date.now() + Math.random().toString(),
      type: type,
      lane: laneIndex,
      x: this.lanes[laneIndex],
      y: 0,
      z: -this.trackLength, // Spawn way ahead at distance
      width: type === 'LASER' ? 1.4 : 1.8,
      height: type === 'LASER' ? 4.0 : 1.6,
      depth: type === 'GLITCH' ? 1.0 : 1.5,
      active: true,
      meshRef: null,
      ...extraData
    };

    this.obstacles.push(newObs);
  }

  checkCollision(obs) {
    // Ship dimensions: centered at playerX, yOffset, Z=0.
    // Approximate Ship box: center [playerX, yOffset, 0]
    // Radius ranges: dx = 0.6, dy = 0.5, dz = 1.0
    const shipMinX = this.playerX - 0.5;
    const shipMaxX = this.playerX + 0.5;
    const shipMinY = this.shipYOffset - 0.3;
    const shipMaxY = this.shipYOffset + 0.3;
    const shipMinZ = -0.9;
    const shipMaxZ = 0.9;

    // Obstacle Box coordinates
    const obsHalfW = obs.width / 2;
    const obsHalfH = obs.height / 2;
    const obsHalfD = obs.depth / 2;
    
    const obsMinX = obs.x - obsHalfW;
    const obsMaxX = obs.x + obsHalfW;
    const obsMinY = obs.y - obsHalfH;
    const obsMaxY = obs.y + obsHalfH;
    
    // Shifted relative to forward track coordinates
    const obsMinZ = -obs.z - obsHalfD;
    const obsMaxZ = -obs.z + obsHalfD;

    // Simple AABB Overlap checks
    const overlapX = (shipMinX <= obsMaxX) && (shipMaxX >= obsMinX);
    const overlapY = (shipMinY <= obsMaxY) && (shipMaxY >= obsMinY);
    const overlapZ = (shipMinZ <= obsMaxZ) && (shipMaxZ >= obsMinZ);

    if (overlapX && overlapY && overlapZ) {
      // Glitch traps are collision-active ONLY when flickered visual solid or close by!
      if (obs.type === 'GLITCH' && !obs.isVisible) {
        return; // Safe drift right through it while ghosted!
      }
      this.triggerCrash();
    }
  }

  triggerCrash() {
    this.state = 'CRASHED';
    this.playSfxCrash();
    
    // Highlight crash UI effects
    document.body.classList.add('game-shake');
    setTimeout(() => {
      document.body.classList.remove('game-shake');
    }, 400);

    // Save and compare high score
    let isNewRecord = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('neondrift_highscore', this.highScore);
      this.updateHighScoreDisplay();
      isNewRecord = true;
    }

    this.saveHighScoreToServer(
      Math.floor(this.score),
      Math.floor(this.distance),
      this.avatarStats[this.selectedAvatarIndex]?.name || 'GUEST'
    );

    // Load values into game over elements
    document.getElementById('over-distance').textContent = `${Math.floor(this.distance)}m`;
    document.getElementById('over-score').innerHTML = `${Math.floor(this.score).toLocaleString()} ${isNewRecord ? '<span class="new-record-tag">NEW RECORD</span>' : ''}`;
    
    let phaseName = 'SECTOR 1';
    if (this.currentPhase === 2) phaseName = 'SECTOR 2';
    if (this.currentPhase === 3) phaseName = 'CORE SECTOR 3';
    document.getElementById('over-phase').textContent = phaseName;
    
    // Switch overlays
    document.getElementById('game-hud').classList.remove('active');
    document.getElementById('game-over-modal').classList.add('active');
  }
}
