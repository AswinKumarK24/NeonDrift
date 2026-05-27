import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Shield, Sparkles, Volume2, VolumeX, Zap, AlertTriangle, Play, RotateCcw } from 'lucide-react';

// Custom scanline and CRT filter styles injected in the component
const GLITCH_CSS = `
@keyframes crt-glitch {
  0% { transform: translate(0) skew(0); filter: hue-rotate(0deg) saturate(1); }
  10% { transform: translate(-2px, 1px) skew(-3deg); filter: hue-rotate(90deg) saturate(1.5); }
  20% { transform: translate(2px, -1px) skew(2deg); filter: hue-rotate(180deg) saturate(1.2); }
  30% { transform: translate(0) skew(0); }
  100% { transform: translate(0) skew(0); }
}
.crt-screen {
  position: relative;
  overflow: hidden;
}
.crt-screen::after {
  content: " ";
  display: block;
  position: absolute;
  top: 0; left: 0; bottom: 0; right: 0;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  z-index: 20;
  background-size: 100% 4px, 6px 100%;
  pointer-events: none;
}
.glitch-active {
  animation: crt-glitch 0.2s infinite;
}
`;

// ADVANCED PROCEDURAL SYNTHWAVE GENERATOR
// Uses pure Web Audio API nodes. Absolutely robust, zero network, zero dependencies.
class ProceduralSynthwave {
  constructor(ctx, analyser) {
    this.ctx = ctx;
    this.analyser = analyser;
    this.isPlaying = false;
    this.tempo = 125; // BPM
    this.stepTime = 60 / this.tempo / 4; // 16th notes
    this.currentStep = 0;
    this.schedulerId = null;
    this.gainNode = null;
    
    // Setup master volume
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.35; // Nice background level
    this.gainNode.connect(analyser);
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.schedulerId) {
      clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
  }

  setVolume(val) {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  scheduler() {
    if (!this.isPlaying) return;
    
    while (this.nextStepTime < this.ctx.currentTime + 0.1) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepTime;
      this.currentStep = (this.currentStep + 1) % 16;
    }
    
    this.schedulerId = setTimeout(() => this.scheduler(), 25);
  }

  scheduleStep(step, time) {
    // 1. Synth Bassline (classic driving eighth notes)
    // Synthwave Cyberpunk Bassline: Root, Root, Octave, Octave
    const bassSequence = [55, 55, 110, 110, 65, 65, 130, 130, 73, 73, 146, 146, 82, 82, 164, 164]; // HZ
    const bassHz = bassSequence[step];
    
    if (step % 2 === 0) {
      this.triggerBass(bassHz, time, this.stepTime * 1.5);
    }

    // 2. Synthesized Drum Loop
    // Beat 1: Kick, Beat 2: Snare, Beat 3: Kick, Beat 4: Snare
    // Hi-Hats on every upbeat
    if (step === 0 || step === 8 || step === 10) {
      this.triggerKick(time);
    }
    
    if (step === 4 || step === 12) {
      this.triggerSnare(time);
    }

    if (step % 4 === 2) {
      this.triggerHihat(time);
    }

    // 3. Synth Arpeggiator Lead
    // High-pass dynamic scale arpeggio
    const melodySequence = [
      329.63, 392.00, 440.00, 523.25,
      392.00, 440.00, 523.25, 587.33,
      440.00, 523.25, 587.33, 659.25,
      523.25, 587.33, 659.25, 783.99
    ];
    
    // Let's play melody notes dynamically
    if (step % 4 === 0 || (step % 2 === 1 && Math.random() > 0.4)) {
      // Shift scale based on absolute game time to change progressions
      const pitchMultiplier = 1 + (Math.floor(this.ctx.currentTime / 8) % 4) * 0.12;
      const melodyHz = melodySequence[(step + Math.floor(this.ctx.currentTime / 4)) % 16] * pitchMultiplier;
      this.triggerLead(melodyHz, time, this.stepTime * 0.8);
    }
  }

  triggerBass(hz, time, duration) {
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(hz, time);
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(hz * 0.5, time); // Sub-bass

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(4, time);
    filter.frequency.setValueAtTime(100, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + 0.05);
    filter.frequency.exponentialRampToValueAtTime(150, time + duration);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + duration);
    osc2.start(time);
    osc2.stop(time + duration);
  }

  triggerKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  triggerSnare(time) {
    // Create noise buffer
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    // Add a snappy body oscillator
    const snap = this.ctx.createOscillator();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(180, time);
    snap.frequency.exponentialRampToValueAtTime(80, time + 0.06);

    const snapGain = this.ctx.createGain();
    snapGain.gain.setValueAtTime(0.4, time);
    snapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.gainNode);

    snap.connect(snapGain);
    snapGain.connect(this.gainNode);

    noise.start(time);
    noise.stop(time + 0.2);
    snap.start(time);
    snap.stop(time + 0.1);
  }

  triggerHihat(time) {
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  triggerLead(hz, time, duration) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(hz, time);

    filter.type = 'lowpass';
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(1500, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + duration);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Interactive retro feedback
  triggerInteractionBeep(hz) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  triggerCrashSound() {
    // Low rumble hit + noise explosion
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.5);
  }

  triggerCollectBeep() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.setValueAtTime(900, this.ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }
}

export default function GameCanvas({ token, userProfile, onGameSync }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // React states to bind UI
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [shardsCollected, setShardsCollected] = useState(0);
  const [health, setHealth] = useState(3);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [highScore, setHighScore] = useState(userProfile?.high_score || 0);
  const [isGlitched, setIsGlitched] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // References to keep game loop variables without re-triggering React renders
  const gameRef = useRef({
    isPlaying: false,
    speed: 0.8,
    maxSpeed: 2.2,
    distance: 0,
    health: 3,
    score: 0,
    shardsCollected: 0,
    currentLane: 1, // 0 = Left, 1 = Center, 2 = Right
    targetLaneX: 0,
    avatarX: 0,
    lanePositions: [-4, 0, 4],
    
    // Scene objects
    scene: null,
    camera: null,
    renderer: null,
    clock: null,
    
    // Custom meshes
    avatar: null,
    avatarParts: [],
    gridFloor: null,
    splines: [],
    splineMeshes: [],
    sun: null,
    skyscrapers: [],
    
    // Spawns
    obstacles: [],
    collectibles: [],
    particles: [],
    
    // Timing & Audio
    audioContext: null,
    analyser: null,
    proceduralSynth: null,
    lastSpawnTime: 0,
    spawnInterval: 1.5, // seconds
    laneCurvesOffset: 0,
    
    // Settings (passed from profile)
    chassis: 'sleek',
    glow: 'cyan',
    trail: 'streak'
  });



  // Color mapper for aesthetics
  const getGlowColor = (colorName) => {
    switch (colorName) {
      case 'cyan': return 0x00ffff;
      case 'magenta': return 0xff00ff;
      case 'lime': return 0x00ff88;
      case 'gold': return 0xffbb00;
      default: return 0x00ffff;
    }
  };

  const getGlowColorHex = (colorName) => {
    switch (colorName) {
      case 'cyan': return '#00ffff';
      case 'magenta': return '#ff00ff';
      case 'lime': return '#00ff88';
      case 'gold': return '#ffbb00';
      default: return '#00ffff';
    }
  };



  function moveLane(dir) {
    const newLane = Math.max(0, Math.min(2, gameRef.current.currentLane + dir));
    if (newLane !== gameRef.current.currentLane) {
      gameRef.current.currentLane = newLane;
      gameRef.current.targetLaneX = gameRef.current.lanePositions[newLane];
      // Quick pitch change to the audio bass sequencer on movement for response
      if (gameRef.current.proceduralSynth) {
        gameRef.current.proceduralSynth.triggerInteractionBeep(300 + newLane * 100);
      }
    }
  };





  function disposeScene(scene) {
    scene.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => mat.dispose());
      } else {
        object.material.dispose();
      }
    });
  };

  // BUILD ENVIRONMENT: Cyber sun, grid floor, RAM tower buildings
  function buildVaporwaveEnvironment() {
    const scene = gameRef.current.scene;

    // 1. Cyber Giant Grid Sun
    // A flat glowing circle at the horizon
    const sunGeom = new THREE.CircleGeometry(45, 64);
    
    // Custom shader-like glowing material for scanlines
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    
    const sun = new THREE.Mesh(sunGeom, sunMat);
    sun.position.set(0, 5, -250);
    scene.add(sun);
    gameRef.current.sun = sun;

    // Horizontal bars to give the vaporwave sun horizon scanlines
    const sunStripeGroup = new THREE.Group();
    for (let i = -35; i < 40; i += 8) {
      if (i < -5) continue; // Scanline cuts in lower half
      const stripeGeom = new THREE.BoxGeometry(100, 3 - (i * 0.02), 1);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0x0c0114 });
      const stripe = new THREE.Mesh(stripeGeom, stripeMat);
      stripe.position.set(0, i, -249);
      sunStripeGroup.add(stripe);
    }
    scene.add(sunStripeGroup);

    // 2. Wireframe Grid Floor
    const gridHelper = new THREE.GridHelper(500, 120, 0x00ffff, 0x550055);
    gridHelper.position.set(0, -1, -150);
    scene.add(gridHelper);
    gameRef.current.gridFloor = gridHelper;

    // 3. Component Skyscrapers flanking the lanes
    const skyscraperGroup = new THREE.Group();
    const itemColors = [0x00ffff, 0xff00ff, 0x00ff88];

    // Left side skyscrapers
    for (let i = 0; i < 15; i++) {
      const zPos = -30 - i * 25;
      const xPos = -15 - Math.random() * 25;
      const towerHeight = 15 + Math.random() * 30;
      const towerWidth = 4 + Math.random() * 6;
      
      const geom = new THREE.BoxGeometry(towerWidth, towerHeight, towerWidth);
      const wireframe = new THREE.EdgesGeometry(geom);
      const matColor = itemColors[i % 3];
      const mat = new THREE.LineBasicMaterial({ color: matColor, linewidth: 2 });
      const boxLine = new THREE.LineSegments(wireframe, mat);
      boxLine.position.set(xPos, towerHeight / 2 - 1, zPos);
      
      skyscraperGroup.add(boxLine);
      gameRef.current.skyscrapers.push({
        mesh: boxLine,
        baseY: towerHeight / 2 - 1,
        baseScaleY: 1,
        freqIndex: i % 10
      });
    }

    // Right side skyscrapers
    for (let i = 0; i < 15; i++) {
      const zPos = -30 - i * 25;
      const xPos = 15 + Math.random() * 25;
      const towerHeight = 15 + Math.random() * 30;
      const towerWidth = 4 + Math.random() * 6;
      
      const geom = new THREE.BoxGeometry(towerWidth, towerHeight, towerWidth);
      const wireframe = new THREE.EdgesGeometry(geom);
      const matColor = itemColors[(i + 1) % 3];
      const mat = new THREE.LineBasicMaterial({ color: matColor, linewidth: 2 });
      const boxLine = new THREE.LineSegments(wireframe, mat);
      boxLine.position.set(xPos, towerHeight / 2 - 1, zPos);
      
      skyscraperGroup.add(boxLine);
      gameRef.current.skyscrapers.push({
        mesh: boxLine,
        baseY: towerHeight / 2 - 1,
        baseScaleY: 1,
        freqIndex: (i + 5) % 10
      });
    }

    scene.add(skyscraperGroup);
  };

  // DYNAMIC LANES (SPLINE THREADS)
  function createSplineLanes() {
    const scene = gameRef.current.scene;
    const game = gameRef.current;

    // Clear old splines if recreating
    if (game.splineMeshes.length > 0) {
      game.splineMeshes.forEach(mesh => scene.remove(mesh));
      game.splineMeshes = [];
      game.splines = [];
    }

    const pointsCount = 40;
    const length = 350;

    // Create 3 parallel tracks moving forwards (negative Z)
    for (let l = 0; l < 3; l++) {
      const xOffset = game.lanePositions[l];
      const controlPoints = [];

      for (let i = 0; i < pointsCount; i++) {
        const z = -i * (length / pointsCount);
        // The splines dynamically curve using sine waves
        const x = xOffset + Math.sin(i * 0.4) * 0.8;
        const y = 0;
        controlPoints.push(new THREE.Vector3(x, y, z));
      }

      // Create a smooth CatmullRomCurve3 out of the points
      const spline = new THREE.CatmullRomCurve3(controlPoints);
      game.splines.push(spline);

      // Create glowing neon tube geometry
      const tubeGeom = new THREE.TubeGeometry(spline, 120, 0.18, 8, false);
      const glowMat = new THREE.MeshBasicMaterial({
        color: l === 1 ? 0xff00ff : 0x00ffff,
        transparent: true,
        opacity: 0.75
      });

      const tubeMesh = new THREE.Mesh(tubeGeom, glowMat);
      scene.add(tubeMesh);
      game.splineMeshes.push(tubeMesh);
    }
  };

  // PRODUCED DYNAMIC AVATAR ("THE LINKER")
  function createAvatar() {
    const scene = gameRef.current.scene;
    const game = gameRef.current;

    // Clear old avatar
    if (game.avatar) {
      scene.remove(game.avatar);
      game.avatarParts = [];
    }

    const avatarGroup = new THREE.Group();
    const glowColor = getGlowColor(game.glow);

    // Dynamic meshes based on Chassis
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0e061c,
      roughness: 0.1,
      metalness: 0.9,
      emissive: glowColor,
      emissiveIntensity: 1.5,
      flatShading: true
    });

    const lightMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.9
    });

    if (game.chassis === 'sleek') {
      // Sleek: floating glass polygons/aerodynamic segments
      // Torso
      const torso = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), mat);
      torso.position.set(0, 1.2, 0);
      avatarGroup.add(torso);
      game.avatarParts.push(torso);

      // Head
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 6), mat);
      head.position.set(0, 1.9, 0);
      head.rotation.x = Math.PI;
      avatarGroup.add(head);
      game.avatarParts.push(head);

      // Left/Right hands (disjointed floating capsules)
      const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), mat);
      lHand.position.set(-0.8, 1.2, 0);
      avatarGroup.add(lHand);
      game.avatarParts.push(lHand);

      const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), mat);
      rHand.position.set(0.8, 1.2, 0);
      avatarGroup.add(rHand);
      game.avatarParts.push(rHand);

      // Glowing light joints between segments
      const jointLine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), lightMat);
      jointLine.position.set(0, 1.6, 0);
      avatarGroup.add(jointLine);

      const handJointL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), lightMat);
      handJointL.rotation.z = Math.PI / 2.5;
      handJointL.position.set(-0.4, 1.2, 0);
      avatarGroup.add(handJointL);

      const handJointR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), lightMat);
      handJointR.rotation.z = -Math.PI / 2.5;
      handJointR.position.set(0.4, 1.2, 0);
      avatarGroup.add(handJointR);

    } else if (game.chassis === 'bulky') {
      // Bulky: blocky geometric heavy components
      // Chest plate
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat);
      torso.position.set(0, 1.1, 0);
      avatarGroup.add(torso);
      game.avatarParts.push(torso);

      // Big shoulders
      const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mat);
      shoulderL.position.set(-0.65, 1.4, 0);
      avatarGroup.add(shoulderL);
      game.avatarParts.push(shoulderL);

      const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mat);
      shoulderR.position.set(0.65, 1.4, 0);
      avatarGroup.add(shoulderR);
      game.avatarParts.push(shoulderR);

      // Cube Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
      head.position.set(0, 1.75, 0);
      avatarGroup.add(head);
      game.avatarParts.push(head);

      // Leg Blocks
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), mat);
      legL.position.set(-0.35, 0.5, 0);
      avatarGroup.add(legL);
      game.avatarParts.push(legL);

      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), mat);
      legR.position.set(0.35, 0.5, 0);
      avatarGroup.add(legR);
      game.avatarParts.push(legR);

      // Bulky Core Glow joints
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), lightMat);
      core.position.set(0, 1.1, 0.2);
      avatarGroup.add(core);

    } else if (game.chassis === 'spiky') {
      // Spiky: crystalline polyhedral shards
      // Crystal Core
      const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), mat);
      torso.position.set(0, 1.2, 0);
      avatarGroup.add(torso);
      game.avatarParts.push(torso);

      // Floating Spiky Head
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), mat);
      head.position.set(0, 1.85, 0);
      avatarGroup.add(head);
      game.avatarParts.push(head);

      // Floating Shards (hands/feet equivalent)
      for (let i = 0; i < 4; i++) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), mat);
        const angle = (i * Math.PI) / 2;
        shard.position.set(Math.cos(angle) * 0.75, 1.0 + Math.sin(angle) * 0.2, 0);
        shard.rotation.z = angle - Math.PI / 2;
        avatarGroup.add(shard);
        game.avatarParts.push(shard);
      }

      // Spiky light links
      const spikyLinks = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 8, 24), lightMat);
      spikyLinks.rotation.x = Math.PI / 2;
      spikyLinks.position.set(0, 1.2, 0);
      avatarGroup.add(spikyLinks);
    }

    // Align base position to starting lane
    avatarGroup.position.set(game.avatarX, 0, -5);
    scene.add(avatarGroup);
    game.avatar = avatarGroup;
  };

  // START RUN GAMEPLAY STATE
  const startGame = () => {
    // Resume audio context
    if (gameRef.current.audioContext && gameRef.current.audioContext.state === 'suspended') {
      gameRef.current.audioContext.resume();
    }

    // Reset scores & ref parameters
    const game = gameRef.current;
    game.isPlaying = true;
    game.isGameOver = false;
    game.health = 3;
    game.score = 0;
    game.shardsCollected = 0;
    game.speed = 0.9;
    game.distance = 0;
    game.currentLane = 1;
    game.avatarX = 0;
    game.targetLaneX = 0;

    // Clear active obstacles and collectibles
    game.obstacles.forEach(o => game.scene.remove(o.mesh));
    game.collectibles.forEach(c => game.scene.remove(c.mesh));
    game.particles.forEach(p => game.scene.remove(p.mesh));
    game.obstacles = [];
    game.collectibles = [];
    game.particles = [];

    // Trigger state binds
    setHealth(3);
    setScore(0);
    setShardsCollected(0);
    setIsGameOver(false);
    setIsPlaying(true);
    setIsGlitched(false);

    // Trigger music synth
    if (musicEnabled && game.proceduralSynth) {
      game.proceduralSynth.start();
    }
  };

  // GAME OVER STATE & BACKEND SYNCHRONIZATION
  const handleGameOver = async () => {
    const game = gameRef.current;
    game.isPlaying = false;
    setIsPlaying(false);
    setIsGameOver(true);

    if (game.proceduralSynth) {
      game.proceduralSynth.stop();
      game.proceduralSynth.triggerCrashSound();
    }

    // Sync high score and collected shards to SQLite backend!
    if (token) {
      setSyncing(true);
      try {
        const res = await fetch('/api/user/game/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            shardsCollected: game.shardsCollected,
            score: Math.floor(game.score)
          })
        });

        if (res.ok) {
          const data = await res.json();
          // Update profile callback instantly
          onGameSync(data.data_shards, data.high_score);
          setHighScore(data.high_score);
        }
      } catch (err) {
        console.error('Failed to sync game results with server:', err);
      } finally {
        setSyncing(false);
      }
    }
  };

  // OBSTACLES & COLLECTIBLES SPAWNING SYSTEM
  const spawnEntities = (delta) => {
    const game = gameRef.current;
    game.lastSpawnTime += delta;

    // Scale spawn speed as game speed goes up
    const adjustedInterval = game.spawnInterval / (game.speed * 0.95);
    
    if (game.lastSpawnTime >= adjustedInterval) {
      game.lastSpawnTime = 0;
      
      const spawnZ = -220; // Spawn far away on the horizon
      const lane = Math.floor(Math.random() * 3);
      const isObstacle = Math.random() < 0.45; // 45% Obstacles, 55% Collectibles

      if (isObstacle) {
        // Red Corrupted Spike Obstacle
        const geom = new THREE.IcosahedronGeometry(0.85, 1);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xff0033,
          emissive: 0xaa0011,
          emissiveIntensity: 1.2,
          roughness: 0.2,
          metalness: 0.8,
          wireframe: true
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(game.lanePositions[lane], 0.4, spawnZ);
        game.scene.add(mesh);
        game.obstacles.push({ mesh, lane, z: spawnZ });
      } else {
        // Cyan/Magenta Glowing Data Packet Collectible
        const geom = new THREE.OctahedronGeometry(0.55, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: lane === 1 ? 0x00ffff : 0xff00ff,
          emissive: lane === 1 ? 0x00bbbb : 0xbb00bb,
          emissiveIntensity: 1.5,
          roughness: 0.1,
          metalness: 0.9
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(game.lanePositions[lane], 0.6, spawnZ);
        game.scene.add(mesh);
        game.collectibles.push({ mesh, lane, z: spawnZ });
      }
    }
  };

  // DETAILED GAME LOGIC UPDATE LOOP
  function updateGameLoop() {
    const game = gameRef.current;
    const delta = game.clock.getDelta();
    
    if (!game.isPlaying) {
      // Simply rotate elements in main/gameover menus for dynamic visuals
      if (game.avatar) {
        game.avatar.rotation.y += delta * 0.5;
        // Slow float
        game.avatar.position.y = 0.2 + Math.sin(game.clock.getElapsedTime() * 1.5) * 0.15;
      }
      if (game.sun) {
        game.sun.scale.setScalar(1.0 + Math.sin(game.clock.getElapsedTime() * 0.4) * 0.05);
      }
      
      // Still render the idle environment
      if (game.renderer && game.scene && game.camera) {
        game.renderer.render(game.scene, game.camera);
      }
      return;
    }

    // 1. Dynamic Game Speed & Score Multipliers
    game.speed = Math.min(game.maxSpeed, game.speed + delta * 0.015);
    game.distance += game.speed * 20 * delta;
    game.score += game.speed * 10 * delta;
    setScore(Math.floor(game.score));

    // 2. FFT Visualizer Engine - Pulsing World Elements
    let fftBass = 1.0;
    let fftTreble = 1.0;
    if (game.analyser) {
      const dataArray = new Uint8Array(game.analyser.frequencyBinCount);
      game.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average frequencies
      // Bass: lower bins 1-8
      let bassSum = 0;
      for (let i = 0; i < 8; i++) bassSum += dataArray[i];
      fftBass = 1.0 + (bassSum / 8) / 255 * 0.8; // scales mesh elements up to 80% based on bass

      // Treble: middle bins 12-32
      let trebleSum = 0;
      for (let i = 12; i < 32; i++) trebleSum += dataArray[i];
      fftTreble = 1.0 + (trebleSum / 20) / 255 * 0.6;
    }

    // Pulse the Neon Sun and Skyscraper RAM blocks to the bass frequencies!
    if (game.sun) {
      game.sun.scale.setScalar(fftBass);
    }
    
    game.skyscrapers.forEach(sky => {
      // Pulse height and position to base frequencies
      const targetScaleY = sky.baseScaleY * fftBass;
      sky.mesh.scale.y = THREE.MathUtils.lerp(sky.mesh.scale.y, targetScaleY, 0.15);
      sky.mesh.position.y = sky.baseY * sky.mesh.scale.y;
    });

    // 3. Dynamic Rhythmic Spine Waving
    // Curvature changes automatically synced to the music beats
    game.laneCurvesOffset += delta * game.speed * 0.8;
    for (let l = 0; l < 3; l++) {
      const spline = game.splines[l];
      const points = spline.points;
      const xOffset = game.lanePositions[l];
      
      for (let i = 1; i < points.length; i++) {
        // Curve Spline nodes left/right over distance in sync with speed & treble frequencies
        const curveFactor = Math.sin(i * 0.25 - game.laneCurvesOffset) * (0.8 * fftTreble);
        points[i].x = xOffset + curveFactor;
      }
      spline.updateArcLengths();

      // Update Tube mesh buffer in real-time
      const newGeom = new THREE.TubeGeometry(spline, 120, 0.18, 8, false);
      game.splineMeshes[l].geometry.dispose();
      game.splineMeshes[l].geometry = newGeom;
    }

    // 4. Smooth Avatar Lane Shifting (Lerp)
    game.avatarX = THREE.MathUtils.lerp(game.avatarX, game.targetLaneX, delta * 15);
    
    // Get exact Y & Z positions of active lane spline curves for responsive 3D tracking
    const activeSpline = game.splines[game.currentLane];
    // Evaluate path at avatar Z (which sits at -5)
    // Map -5 Z coordinate on spline length to ratio 0 to 1
    const splineRatio = 5 / 350;
    const splinePoint = activeSpline.getPointAt(splineRatio);

    if (game.avatar) {
      game.avatar.position.x = game.avatarX;
      // Hover avatar slightly above the tube
      game.avatar.position.y = splinePoint.y + 0.35 + Math.sin(game.clock.getElapsedTime() * 4) * 0.08;

      // Animate Linker segment parts
      game.avatarParts.forEach((part, idx) => {
        part.rotation.y += delta * (1.2 + (idx * 0.2));
        part.rotation.x += delta * (0.4 * idx);
      });
    }

    // 5. Digital Stream Trail Particles
    spawnStreamTrails();

    // 6. Scrolling Grid Floor backward for motion
    if (game.gridFloor) {
      game.gridFloor.position.z += game.speed * 20 * delta;
      if (game.gridFloor.position.z >= 50) {
        game.gridFloor.position.z = -50;
      }
    }

    // 7. Update spawner systems
    spawnEntities(delta);

    // 8. Update obstacle positions & check collisions
    const avatarZ = -5;

    for (let i = game.obstacles.length - 1; i >= 0; i--) {
      const obstacle = game.obstacles[i];
      // Move obstacles towards player along spline curves!
      obstacle.z += game.speed * 42 * delta;
      
      const targetSpline = game.splines[obstacle.lane];
      // Map z position [0 to -350] to [0 to 1] spline ratio
      const zRatio = Math.max(0, Math.min(1, Math.abs(obstacle.z) / 350));
      const posOnSpline = targetSpline.getPointAt(zRatio);
      
      obstacle.mesh.position.set(posOnSpline.x, 0.45, obstacle.z);
      obstacle.mesh.rotation.x += delta * 3.0;
      obstacle.mesh.rotation.y += delta * 1.5;

      // Hit detection
      if (obstacle.z >= avatarZ - 0.5 && obstacle.z <= avatarZ + 0.5 && obstacle.lane === game.currentLane) {
        // Collision Trigger!
        game.scene.remove(obstacle.mesh);
        game.obstacles.splice(i, 1);
        
        triggerGlitchDamage();
        continue;
      }

      // Cleanup past boundaries
      if (obstacle.z > 10) {
        game.scene.remove(obstacle.mesh);
        game.obstacles.splice(i, 1);
      }
    }

    // 9. Update collectibles positions & check collisions
    for (let i = game.collectibles.length - 1; i >= 0; i--) {
      const packet = game.collectibles[i];
      packet.z += game.speed * 42 * delta;

      const targetSpline = game.splines[packet.lane];
      const zRatio = Math.max(0, Math.min(1, Math.abs(packet.z) / 350));
      const posOnSpline = targetSpline.getPointAt(zRatio);

      packet.mesh.position.set(posOnSpline.x, 0.6, packet.z);
      packet.mesh.rotation.y += delta * 4.0;
      packet.mesh.rotation.z += delta * 2.0;

      // Collection hit detection
      if (packet.z >= avatarZ - 0.6 && packet.z <= avatarZ + 0.6 && packet.lane === game.currentLane) {
        game.scene.remove(packet.mesh);
        game.collectibles.splice(i, 1);

        // Score bonus & particles!
        game.shardsCollected += 1;
        setShardsCollected(game.shardsCollected);
        game.score += 150;

        if (game.proceduralSynth) {
          game.proceduralSynth.triggerCollectBeep();
        }

        spawnCollectionExplosion(posOnSpline.x, 0.6, packet.lane);
        continue;
      }

      // Cleanup
      if (packet.z > 10) {
        game.scene.remove(packet.mesh);
        game.collectibles.splice(i, 1);
      }
    }

    // 10. Update floating particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.z += p.velocity.z * delta;
      p.mesh.position.x += p.velocity.x * delta;
      p.mesh.position.y += p.velocity.y * delta;
      p.mesh.position.z += p.velocity.z * delta;

      // Shrink & Fade
      p.mesh.scale.subScalar(delta * p.shrinkSpeed);
      
      if (p.mesh.scale.x <= 0.05 || p.mesh.position.z > 10) {
        game.scene.remove(p.mesh);
        game.particles.splice(i, 1);
      }
    }

    // Finally, render scene
    game.renderer.render(game.scene, game.camera);
  };

  // EMIT SPARK TRAILS BASED ON SELECTED PREFERENCE
  const spawnStreamTrails = () => {
    const game = gameRef.current;
    const glowColor = getGlowColor(game.glow);

    // Throttle spawning
    if (Math.random() > 0.45) {
      const particleGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const mat = new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.9
      });
      
      const particleMesh = new THREE.Mesh(particleGeom, mat);
      
      // Offset slightly behind player's base feet
      const activeSpline = game.splines[game.currentLane];
      const pt = activeSpline.getPointAt(5 / 350);

      if (game.trail === 'streak') {
        // Floating neon streak lines
        particleMesh.scale.set(0.5, 0.5, 3.5);
        particleMesh.position.set(game.avatarX + (Math.random() * 0.3 - 0.15), pt.y + 0.1, -5.2);
        
        game.scene.add(particleMesh);
        game.particles.push({
          mesh: particleMesh,
          velocity: new THREE.Vector3(0, 0, game.speed * 20),
          shrinkSpeed: 1.5
        });

      } else if (game.trail === 'binary') {
        // Floating '0' and '1' binary matrices
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = game.glow === 'lime' ? '#00ff88' : '#00ffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.random() > 0.5 ? '1' : '0', 16, 16);

        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(game.avatarX + (Math.random() * 0.4 - 0.2), pt.y + 0.3, -5.3);
        sprite.scale.setScalar(0.45);

        game.scene.add(sprite);
        game.particles.push({
          mesh: sprite,
          velocity: new THREE.Vector3(Math.random() * 0.5 - 0.25, 0.8 + Math.random() * 0.6, game.speed * 18),
          shrinkSpeed: 0.65
        });

      } else if (game.trail === 'sparks') {
        // Quick exploding digital retro sparks
        for (let i = 0; i < 2; i++) {
          const sparkMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat);
          sparkMesh.position.set(game.avatarX, pt.y + 0.1, -5.2);

          game.scene.add(sparkMesh);
          game.particles.push({
            mesh: sparkMesh,
            velocity: new THREE.Vector3(
              (Math.random() * 4 - 2),
              (Math.random() * 3 + 1),
              game.speed * 15 + (Math.random() * 5)
            ),
            shrinkSpeed: 1.8
          });
        }
      }
    }
  };

  // COLLISION COLLECTION BURST EFFECTS
  const spawnCollectionExplosion = (x, y, lane) => {
    const game = gameRef.current;

    for (let i = 0; i < 8; i++) {
      const geom = new THREE.BoxGeometry(0.18, 0.18, 0.18);
      const mat = new THREE.MeshBasicMaterial({
        color: lane === 1 ? 0x00ffff : 0xff00ff,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, -5);

      // Random expanding directions
      const angle = Math.random() * Math.PI * 2;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * (5 + Math.random() * 8),
        Math.sin(angle) * (5 + Math.random() * 8) + 2,
        Math.random() * 5 - 2
      );

      game.scene.add(mesh);
      game.particles.push({ mesh, velocity, shrinkSpeed: 1.8 });
    }
  };

  // OBSTACLE COLLISION EFFECT: CRT GLITCH & DAMAGE REDUCTION
  const triggerGlitchDamage = () => {
    const game = gameRef.current;
    game.health -= 1;
    setHealth(game.health);

    if (game.proceduralSynth) {
      game.proceduralSynth.triggerCrashSound();
    }

    // Toggle screen CRT static glitch state
    setIsGlitched(true);
    setTimeout(() => setIsGlitched(false), 250);

    if (game.health <= 0) {
      handleGameOver();
    }
  };

  // Sync profile details into ref
  useEffect(() => {
    if (userProfile) {
      gameRef.current.chassis = userProfile.equipped_chassis || 'sleek';
      gameRef.current.glow = userProfile.equipped_glow || 'cyan';
      gameRef.current.trail = userProfile.equipped_trail || 'streak';
      
      const newHighScore = userProfile.high_score || 0;
      const timer = setTimeout(() => {
        setHighScore(prev => prev !== newHighScore ? newHighScore : prev);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [userProfile]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!gameRef.current.isPlaying) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLane(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveLane(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Swipe/Touch controls
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (!touchStartX.current || !gameRef.current.isPlaying) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (diffX > 50) {
      moveLane(1);
    } else if (diffX < -50) {
      moveLane(-1);
    }
    touchStartX.current = null;
  };

  // CORE GAME INIT & SETUP
  useEffect(() => {
    // 1. Initialize CSS for glitch
    if (!document.getElementById('game-glitch-styles')) {
      const style = document.createElement('style');
      style.id = 'game-glitch-styles';
      style.textContent = GLITCH_CSS;
      document.head.appendChild(style);
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 2. Initialize ThreeJS Scene
    const scene = new THREE.Scene();
    
    // Sleek fog for synthwave style grid fading
    scene.fog = new THREE.FogExp2(0x0c0114, 0.007);
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 1.4, 0); // Position player camera inside the grid lane

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Audio FFT initialization
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.connect(audioContext.destination);

    const game = gameRef.current;
    game.scene = scene;
    game.camera = camera;
    game.renderer = renderer;
    game.audioContext = audioContext;
    game.analyser = analyser;
    game.proceduralSynth = new ProceduralSynthwave(audioContext, analyser);

    // 1. Lights
    const ambientLight = new THREE.AmbientLight(0xff00ff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ffff, 1.8);
    dirLight.position.set(5, 15, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xff00ff, 3, 20);
    pointLight.position.set(0, 2, -10);
    scene.add(pointLight);

    // 2. Horizon Sun
    const sunGeom = new THREE.CircleGeometry(30, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xff007f, side: THREE.DoubleSide });
    const sun = new THREE.Mesh(sunGeom, sunMat);
    sun.position.set(0, 8, -200);
    scene.add(sun);
    game.sun = sun;

    // 3. Grid Floor
    const gridHelper = new THREE.GridHelper(300, 80, 0x00ffff, 0xff00ff);
    gridHelper.position.set(0, 0, -100);
    scene.add(gridHelper);
    game.gridFloor = gridHelper;

    // 4. Build Skyscraper towers
    buildVaporwaveEnvironment();

    // 5. Dynamic Splines (Lanes) Setup
    createSplineLanes();

    // 6. Create Avatar
    createAvatar();

    // 7. Start Animation Render Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      updateGameLoop();
    };
    animate();

    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      if (w < 600) {
        camera.fov = 75; // Wider view for vertical mobile screens
      } else {
        camera.fov = 65; // Standard field for landscape screens
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Trigger immediately to set portrait/landscape FOV

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (game.proceduralSynth) {
        game.proceduralSynth.stop();
      }
      if (game.audioContext) {
        game.audioContext.close();
      }
      // Dispose meshes
      disposeScene(scene);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSound = () => {
    const nextState = !musicEnabled;
    setMusicEnabled(nextState);
    if (gameRef.current.proceduralSynth) {
      if (nextState && gameRef.current.isPlaying) {
        gameRef.current.proceduralSynth.start();
      } else {
        gameRef.current.proceduralSynth.stop();
      }
    }
  };

  return (
    <div className={`relative w-full h-[550px] crt-screen rounded-2xl border border-white/10 overflow-hidden shadow-2xl ${isGlitched ? 'glitch-active' : ''}`} ref={containerRef}>
      {/* Three.js Canvas Container */}
      <canvas ref={canvasRef} className="w-full h-full block bg-[#0c0114]"onTouchStart={handleTouchStart}onTouchEnd={handleTouchEnd} />

      {/* Retro HUD Panel (Vaporwave Aesthetics overlay) */}
      {isPlaying && !isGameOver && (
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
          {/* Left panel: Health & Glitch Shield */}
          <div className="flex gap-2 items-center bg-black/60 border border-cyan-500/30 px-4 py-2 rounded-xl backdrop-blur-md">
            <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div className="flex gap-1.5 ml-1">
              {[...Array(3)].map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-sm border transition-all ${
                    idx < health
                      ? 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                      : 'bg-transparent border-gray-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400/80 ml-2">SHIELDCORE</span>
          </div>

          {/* Right panel: High Score & Data Shards */}
          <div className="flex gap-4 items-center">
            <div className="bg-black/60 border border-magenta-500/30 px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-2">
              <Zap className="w-4 h-4 text-pink-400" />
              <div className="text-right">
                <div className="text-[9px] uppercase font-mono tracking-widest text-pink-400/70">SHARDS</div>
                <div className="text-sm font-mono font-bold text-pink-300">{shardsCollected}</div>
              </div>
            </div>

            <div className="bg-black/60 border border-purple-500/30 px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div className="text-right">
                <div className="text-[9px] uppercase font-mono tracking-widest text-purple-400/70">DECRYPT CORE</div>
                <div className="text-sm font-mono font-bold text-purple-300">{score}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Mute HUD Floating Button */}
      {isPlaying && !isGameOver && (
        <button
          onClick={toggleSound}
          className="absolute bottom-4 right-4 z-10 p-3 rounded-full bg-black/60 border border-white/10 hover:border-white/30 text-white backdrop-blur-md pointer-events-auto transition-all"
        >
          {musicEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-gray-500" />}
        </button>
      )}

      {/* Key Tips Overlay */}
      {isPlaying && !isGameOver && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none text-center bg-black/40 border border-white/5 px-4 py-1.5 rounded-full backdrop-blur-sm">
          <span className="text-[10px] font-mono tracking-widest text-white/50">USE ◄ / ► OR A / D OR SWIPE TO SURF THE STREAMS</span>
        </div>
      )}

      {/* START SCREEN PANEL */}
      {!isPlaying && !isGameOver && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col justify-center items-center p-8 z-30">
          <div className="text-center max-w-md animate-fade-in">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4 animate-bounce">
              <Zap className="w-10 h-10 text-cyan-400" />
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 uppercase font-mono mb-2">
              THE LINKER
            </h1>
            <p className="text-gray-400 text-xs font-mono tracking-widest uppercase mb-8">
              Procedural Spline Grid Net // System 1.0
            </p>

            <div className="space-y-4 mb-8 bg-white/5 border border-white/10 p-4 rounded-xl text-left text-xs font-mono text-gray-400">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>CHASSIS TYPE:</span>
                <span className="text-cyan-400 uppercase font-bold">{userProfile?.equipped_chassis || 'sleek'}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>CORE GLOW ENERGY:</span>
                <span style={{ color: getGlowColorHex(userProfile?.equipped_glow || 'cyan') }} className="uppercase font-bold">{userProfile?.equipped_glow || 'cyan'}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span>MATRIX STREAM TRAIL:</span>
                <span className="text-pink-400 uppercase font-bold">{userProfile?.equipped_trail || 'streak'}</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full flex items-center justify-center gap-2 py-4 px-8 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white font-mono text-sm font-bold uppercase rounded-xl border border-white/20 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 transform hover:scale-[1.03]"
            >
              <Play className="w-5 h-5 fill-current" /> CONNECT LINKER
            </button>

            {highScore > 0 && (
              <div className="mt-4 text-xs font-mono tracking-widest text-purple-400/80">
                SYSTEM HIGH RECORD: {highScore} pts
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN PANEL */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col justify-center items-center p-8 z-30">
          <div className="text-center max-w-sm">
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 mb-4 animate-pulse">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>

            <h2 className="text-3xl font-extrabold tracking-widest text-rose-500 uppercase font-mono mb-1">
              CONNECTION INTERRUPTED
            </h2>
            <p className="text-gray-500 text-xs font-mono tracking-wider uppercase mb-8">
              LINKER CHASSIS BUFFER OVERFLOWED
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl font-mono text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">DECRYPT CORE</div>
                <div className="text-xl font-extrabold text-purple-400 mt-1">{score}</div>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl font-mono text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">SHARDS SALVAGED</div>
                <div className="text-xl font-extrabold text-pink-400 mt-1">+{shardsCollected}</div>
              </div>
            </div>

            {syncing && (
              <div className="text-xs font-mono text-cyan-400 animate-pulse mb-4">
                UPLOADING LINKER CORE METRICS...
              </div>
            )}

            <button
              onClick={startGame}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 py-4 px-8 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-mono text-sm font-bold uppercase rounded-xl transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" /> RECONNECT SYSTEM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
