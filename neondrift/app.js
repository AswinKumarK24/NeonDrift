/**
 * NEON DRIFT - WebGL Graphics Engine & Procedural Rendering
 * Powered by Three.js (ES Modules). Integrates high-fidelity particle systems,
 * procedural models, infinite scrolling grids, dynamic chase cams, and lighting.
 */

import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { GameController } from './game.js';

class GraphicsEngine {
  constructor() {
    this.game = new GameController();
    
    // WebGL Elements
    this.canvas = document.getElementById('game-canvas');
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    
    // Lights
    this.ambientLight = null;
    this.dirLight = null;
    this.thrusterLight = null; // Dynamically follows ship
    
    // Meshes & Procedural Props
    this.playerShipGroup = null; // Container group for rotation tilts
    this.shipMesh = null; // Active nested mesh
    this.scrollingGrids = []; // Double grid helper for seamless loop
    this.roadBorderLines = null;
    this.pillars = []; // Roadside environment pillars
    this.pillarCount = 12;
    this.obstacleMeshes = new Map(); // Maps game obstacle IDs to Three.js Meshes
    
    // Particle Trails System
    this.particles = [];
    this.maxParticles = 80;
    this.particleGroup = null;

    // Timing
    this.clock = new THREE.Clock();
    this.prevElapsedTime = 0;
  }

  init() {
    // Initialize Game Logic & State
    this.game.init();

    // 1. Setup Three.js Context
    this.scene = new THREE.Scene();
    
    // Set initial phase 1 dark ambient fog
    const initialColor = this.game.phases[1].fogColor;
    this.scene.background = new THREE.Color(initialColor);
    this.scene.fog = new THREE.FogExp2(initialColor, 0.014);

    // 2. Setup Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    this.camera.position.set(0, 3.5, 6); // Menu camera start position

    // 3. Setup WebGL Renderer with full antialiasing
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // 4. Populate Scene Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0x00ffff, 1.2);
    this.dirLight.position.set(5, 15, -10);
    this.scene.add(this.dirLight);

    // Point light under engine exhaust for pulsing light effect
    this.thrusterLight = new THREE.PointLight(0x00ffff, 2.0, 15);
    this.thrusterLight.position.set(0, 0, 1.5);
    this.scene.add(this.thrusterLight);

    // 5. Construct Scrolling Roads
    this.createInfiniteRoads();

    // 6. Build Procedural Environment Props (Pillars)
    this.createEnvironmentPillars();

    // 7. Instantiate Player Ship container
    this.playerShipGroup = new THREE.Group();
    this.scene.add(this.playerShipGroup);
    this.buildActiveShip();

    // Particle Group
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    // 8. Bind Listeners & Core Handlers
    this.setupInputHandlers();
    window.addEventListener('resize', () => this.handleResize());

    // 9. Kickstart Rendering Loop
    this.clock.start();
    this.animate();
  }

  // ==========================================================================
  // PROCEDURAL GEOMETRY BUILDERS
  // ==========================================================================

  buildActiveShip() {
    // Clear out previous nested mesh inside ship group
    if (this.shipMesh) {
      this.playerShipGroup.remove(this.shipMesh);
    }

    const shipGroup = new THREE.Group();
    const avatarIndex = this.game.selectedAvatarIndex;
    const colorTheme = this.game.avatarStats[avatarIndex].color;
    
    // Shiny, emission materials for sci-fi look
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.1,
      metalness: 0.95
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorTheme),
    });

    if (avatarIndex === 0) {
      // --------------------------------------------------------
      // MODEL 1: CYAN SHADOW (Sleek Delta-Wing)
      // --------------------------------------------------------
      // Triangular center hull
      const hullGeo = new THREE.ConeGeometry(0.48, 1.8, 4);
      hullGeo.rotateX(Math.PI / 2); // Align forward
      hullGeo.rotateY(Math.PI / 4); // Boxy rotate
      const hull = new THREE.Mesh(hullGeo, hullMaterial);
      shipGroup.add(hull);

      // Swept wing panels
      const wingGeo = new THREE.BoxGeometry(1.7, 0.05, 0.7);
      const wing = new THREE.Mesh(wingGeo, hullMaterial);
      wing.position.set(0, -0.05, -0.15);
      shipGroup.add(wing);

      // Thruster base
      const engineGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8);
      engineGeo.rotateX(Math.PI / 2);
      const engine = new THREE.Mesh(engineGeo, glowMaterial);
      engine.position.set(0, 0, 0.9);
      shipGroup.add(engine);

      // Neon lines on wings
      const linesGeo = new THREE.BoxGeometry(1.6, 0.08, 0.08);
      const lines = new THREE.Mesh(linesGeo, glowMaterial);
      lines.position.set(0, -0.02, 0.1);
      shipGroup.add(lines);

    } else if (avatarIndex === 1) {
      // --------------------------------------------------------
      // MODEL 2: MAGENTA PULSE (Advanced Ring-Drive Core)
      // --------------------------------------------------------
      // Spherical center cabin
      const cabinGeo = new THREE.SphereGeometry(0.36, 16, 16);
      const cabin = new THREE.Mesh(cabinGeo, hullMaterial);
      shipGroup.add(cabin);

      // Outer revolving thruster ring
      const ringGeo = new THREE.TorusGeometry(0.68, 0.05, 8, 32);
      const ring = new THREE.Mesh(ringGeo, glowMaterial);
      ring.position.set(0, 0, 0.1);
      // Give static unique tilt
      ring.rotation.x = Math.PI / 12;
      shipGroup.add(ring);

      // Left-right wing support rods
      const rodGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
      rodGeo.rotateZ(Math.PI / 2);
      const rods = new THREE.Mesh(rodGeo, hullMaterial);
      shipGroup.add(rods);

      // Dual-exhaust thrusters
      const thrusterGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8);
      thrusterGeo.rotateX(Math.PI / 2);
      
      const leftThruster = new THREE.Mesh(thrusterGeo, glowMaterial);
      leftThruster.position.set(-0.55, 0, 0.3);
      const rightThruster = new THREE.Mesh(thrusterGeo, glowMaterial);
      rightThruster.position.set(0.55, 0, 0.3);
      
      shipGroup.add(leftThruster);
      shipGroup.add(rightThruster);

    } else {
      // --------------------------------------------------------
      // MODEL 3: TOXIC APEX (Aggressive Heavy Interceptor)
      // --------------------------------------------------------
      // Rectangular box core
      const coreGeo = new THREE.BoxGeometry(0.48, 0.35, 1.6);
      const core = new THREE.Mesh(coreGeo, hullMaterial);
      shipGroup.add(core);

      // Angled side armor plates
      const plateGeo = new THREE.BoxGeometry(0.12, 0.72, 1.2);
      
      const leftPlate = new THREE.Mesh(plateGeo, hullMaterial);
      leftPlate.position.set(-0.46, 0.08, -0.1);
      leftPlate.rotation.y = -Math.PI / 24;
      
      const rightPlate = new THREE.Mesh(plateGeo, hullMaterial);
      rightPlate.position.set(0.46, 0.08, -0.1);
      rightPlate.rotation.y = Math.PI / 24;
      
      shipGroup.add(leftPlate);
      shipGroup.add(rightPlate);

      // Connect struts
      const strutGeo = new THREE.BoxGeometry(0.9, 0.06, 0.3);
      const strut = new THREE.Mesh(strutGeo, hullMaterial);
      shipGroup.add(strut);

      // Heavy back engine exhaust
      const heavyEngineGeo = new THREE.BoxGeometry(0.24, 0.2, 0.35);
      const heavyEngine = new THREE.Mesh(heavyEngineGeo, glowMaterial);
      heavyEngine.position.set(0, 0, 0.8);
      shipGroup.add(heavyEngine);
      
      // Upper green spoiler fins
      const finGeo = new THREE.BoxGeometry(0.9, 0.04, 0.4);
      const fin = new THREE.Mesh(finGeo, glowMaterial);
      fin.position.set(0, 0.3, 0.4);
      shipGroup.add(fin);
    }

    // Assign mesh and register to scene hierarchy
    this.shipMesh = shipGroup;
    this.playerShipGroup.add(this.shipMesh);
    
    // Recolor dynamic light to reflect ship highlight
    this.thrusterLight.color.set(colorTheme);
  }

  createInfiniteRoads() {
    // Generate two large GridHelpers scrolling end-to-end
    const roadWidth = 12;
    const roadLength = 150;
    
    // Dark glowing shader grid system
    const grid1 = new THREE.GridHelper(roadLength, 35, 0x555588, 0x1f1f3a);
    grid1.position.set(0, -0.8, -roadLength / 2);
    // Align horizontally flat
    grid1.scale.x = roadWidth / roadLength; 
    
    const grid2 = new THREE.GridHelper(roadLength, 35, 0x555588, 0x1f1f3a);
    grid2.position.set(0, -0.8, -roadLength * 1.5);
    grid2.scale.x = roadWidth / roadLength;

    this.scene.add(grid1);
    this.scene.add(grid2);
    
    this.scrollingGrids.push(grid1, grid2);

    // Glowing Neon Lane Edge lines
    const materialEdge = new THREE.MeshBasicMaterial({ color: 0x00a8ff });
    const edgeGeoL = new THREE.BoxGeometry(0.12, 0.05, 300);
    const edgeGeoR = new THREE.BoxGeometry(0.12, 0.05, 300);
    
    const borderL = new THREE.Mesh(edgeGeoL, materialEdge);
    borderL.position.set(-6, -0.8, -100);
    const borderR = new THREE.Mesh(edgeGeoR, materialEdge);
    borderR.position.set(6, -0.8, -100);
    
    this.scene.add(borderL);
    this.scene.add(borderR);
    this.roadBorderLines = { borderL, borderR, materialEdge };
  }

  createEnvironmentPillars() {
    const pGeo = new THREE.BoxGeometry(0.8, 18, 0.8);
    // Translucent glowing wireframes on sides
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x001530
    });

    for (let i = 0; i < this.pillarCount; i++) {
      const pillar = new THREE.Mesh(pGeo, pMat);
      
      // Alternate left and right edges
      const side = (i % 2 === 0) ? -1 : 1;
      const x = (8.5 + Math.random() * 3) * side;
      // Staggered depth distribution
      const z = -(i * 25) - Math.random() * 10;
      
      pillar.position.set(x, 7.8, z);
      this.scene.add(pillar);
      this.pillars.push(pillar);
    }
  }

  // ==========================================================================
  // INPUT CONTROLS & LISTENERS
  // ==========================================================================

  setupInputHandlers() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (this.game.state === 'PLAYING') {
        if (e.key === 'a' || e.key === 'ArrowLeft') {
          this.game.steer('LEFT');
        } else if (e.key === 'd' || e.key === 'ArrowRight') {
          this.game.steer('RIGHT');
        }
      }
    });

    // Landing UI button triggers
    document.getElementById('start-game-btn').addEventListener('click', () => {
      this.game.playSfxSelect();
      this.game.startGame();
    });

    document.getElementById('restart-game-btn').addEventListener('click', () => {
      this.game.playSfxSelect();
      
      // Clean up existing obstacles
      this.clearAllObstacles();
      
      // Restart game state
      this.game.startGame();
      
      // Build selected ship (to match choice during selection)
      this.buildActiveShip();
    });

    // Touch layout triggers
    document.getElementById('tap-zone-left').addEventListener('click', () => {
      this.game.steer('LEFT');
    });
    
    document.getElementById('tap-zone-right').addEventListener('click', () => {
      this.game.steer('RIGHT');
    });
  }

  clearAllObstacles() {
    this.obstacleMeshes.forEach(mesh => {
      this.scene.remove(mesh);
    });
    this.obstacleMeshes.clear();
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ==========================================================================
  // PARTICLE EMITTER SYSTEMS
  // ==========================================================================

  spawnExhaustParticles() {
    const avatarIndex = this.game.selectedAvatarIndex;
    const activeColor = this.game.avatarStats[avatarIndex].color;
    
    // Choose spawn positions relative to the ship group's current visual coordinate
    const exhaustZ = 0.95; 
    let spawnPositions = [];

    if (avatarIndex === 1) {
      // Dual engines
      spawnPositions.push(new THREE.Vector3(this.game.playerX - 0.55, this.game.shipYOffset, exhaustZ));
      spawnPositions.push(new THREE.Vector3(this.game.playerX + 0.55, this.game.shipYOffset, exhaustZ));
    } else {
      // Single center engine
      spawnPositions.push(new THREE.Vector3(this.game.playerX, this.game.shipYOffset, exhaustZ));
    }

    spawnPositions.forEach(pos => {
      // Find standard box or build one
      const size = 0.08 + Math.random() * 0.07;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(activeColor),
        transparent: true,
        opacity: 0.8
      });
      const mesh = new THREE.Mesh(geo, mat);
      
      // Jitter starting position
      mesh.position.copy(pos);
      mesh.position.x += (Math.random() - 0.5) * 0.15;
      mesh.position.y += (Math.random() - 0.5) * 0.12;
      
      this.particleGroup.add(mesh);
      
      // Store particle details
      this.particles.push({
        mesh: mesh,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.04,
        vz: 0.15 + this.game.currentSpeed * 0.35, // Move backward relative to speed
        life: 1.0,
        decay: 0.035 + Math.random() * 0.035
      });
    });

    // Enforce max capacity
    while (this.particles.length > this.maxParticles) {
      const p = this.particles.shift();
      this.particleGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
  }

  spawnCrashExplosion() {
    const avatarIndex = this.game.selectedAvatarIndex;
    const activeColor = this.game.avatarStats[avatarIndex].color;
    
    // Massive cloud burst!
    for (let i = 0; i < 90; i++) {
      const size = 0.1 + Math.random() * 0.16;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(activeColor),
        transparent: true,
        opacity: 0.95
      });
      
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        this.game.playerX + (Math.random() - 0.5) * 0.6,
        this.game.shipYOffset + (Math.random() - 0.5) * 0.4,
        0
      );

      this.particleGroup.add(mesh);

      // Random spherical vector direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 0.12 + Math.random() * 0.28;

      this.particles.push({
        mesh: mesh,
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.sin(phi) * Math.sin(theta) * speed,
        vz: Math.cos(phi) * speed,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.015
      });
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        // Move coordinates
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.position.z += p.vz;
        
        // Dynamic scaling and fade
        p.mesh.scale.setScalar(p.life);
        p.mesh.material.opacity = p.life * 0.85;
      }
    }
  }

  // ==========================================================================
  // REALTIME RENDERING LOOP & STATE INTERPOLATIONS
  // ==========================================================================

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Sync Game Logic Loop
    const prevState = this.game.state;
    this.game.update();
    const activeState = this.game.state;

    // Detect state trigger events
    if (prevState === 'PLAYING' && activeState === 'CRASHED') {
      this.spawnCrashExplosion();
      this.playerShipGroup.visible = false; // Hide ship on explosion
    } else if (prevState !== 'PLAYING' && activeState === 'PLAYING') {
      this.playerShipGroup.visible = true; // Recover ship
      this.clearAllObstacles();
    }

    // 2. Synchronize visual color/fog scales with active phase
    this.renderDynamicEnvironments(delta);

    // 3. Move camera based on gameState
    this.updateCameraController(elapsedTime);

    // 4. Update avatar geometry translations
    if (this.game.state === 'PLAYING') {
      this.playerShipGroup.position.x = this.game.playerX;
      this.playerShipGroup.position.y = this.game.shipYOffset;
      
      // Responsive roll tilt when switching lanes
      const laneDelta = this.game.targetX - this.game.playerX;
      this.shipMesh.rotation.z = -laneDelta * 0.12; // Snap rotate
      this.shipMesh.rotation.y = laneDelta * 0.08; // Yaw steer look
      this.shipMesh.rotation.x = Math.sin(elapsedTime * 4) * 0.05; // Light pitch
      
      // Dynamic pulsing engine spot light
      this.thrusterLight.position.set(this.game.playerX, this.game.shipYOffset, 1.2);
      this.thrusterLight.intensity = 1.6 + Math.sin(elapsedTime * 35) * 0.5;

      // Exhaust particle triggers
      this.spawnExhaustParticles();
    } else if (this.game.state === 'MENU' || this.game.state === 'STARTING') {
      // Revolving idling ship
      this.playerShipGroup.position.x = 0;
      this.playerShipGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.15;
      
      // Rebuild the ship if model index changes during select carousel
      const currentActiveIndex = this.game.selectedAvatarIndex;
      if (this.prevActiveIndex !== currentActiveIndex) {
        this.buildActiveShip();
        this.prevActiveIndex = currentActiveIndex;
      }

      this.shipMesh.rotation.y = elapsedTime * 0.5;
      this.shipMesh.rotation.z = 0;
      this.shipMesh.rotation.x = Math.sin(elapsedTime * 0.8) * 0.1;
      
      this.thrusterLight.position.set(0, Math.sin(elapsedTime * 1.5) * 0.15, 1.2);
      this.thrusterLight.intensity = 1.0;
    }

    // 5. Update engine trail particle dynamics
    this.updateParticles();

    // 6. Draw obstacle objects synced from Game Controller pool
    this.renderSyncObstacles();

    // 7. Fire Renderer frame
    this.renderer.render(this.scene, this.camera);
  }

  updateCameraController(elapsedTime) {
    if (this.game.state === 'PLAYING') {
      // Dynamic Chase cam: Positioned behind, matching ship coordinates with slight delay (lerp)
      const targetCamX = this.game.playerX * 0.55;
      const targetCamY = 1.8 + (this.game.currentSpeed * 0.2); // Elevate camera as speed scales
      const targetCamZ = 4.8;
      
      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;
      
      // Look down track ahead, tilting target looking direction on steer
      const targetLookX = this.game.playerX * 0.35;
      const targetLookY = 0.2;
      const targetLookZ = -15;
      
      const lookAtTarget = new THREE.Vector3(targetLookX, targetLookY, targetLookZ);
      
      // Smooth look rotation
      const currentRotation = new THREE.Quaternion().copy(this.camera.quaternion);
      this.camera.lookAt(lookAtTarget);
      const targetRotation = new THREE.Quaternion().copy(this.camera.quaternion);
      
      this.camera.quaternion.copy(currentRotation).slerp(targetRotation, 0.1);

    } else if (this.game.state === 'MENU') {
      // Wide sweeping idle view of ship floating in dark neon space
      const radius = 3.6;
      const speed = 0.35;
      this.camera.position.x = Math.sin(elapsedTime * speed) * radius;
      this.camera.position.y = 1.2 + Math.sin(elapsedTime * 0.5) * 0.5;
      this.camera.position.z = Math.cos(elapsedTime * speed) * radius;
      
      this.camera.lookAt(0, 0, 0);
    }
  }

  renderDynamicEnvironments(delta) {
    const phaseInfo = this.game.phases[this.game.currentPhase];
    const themeRGB = new THREE.Color(phaseInfo.color);
    
    // 1. Transition fog color smoothly
    const currentFogColor = this.scene.fog.color;
    currentFogColor.lerp(new THREE.Color(phaseInfo.fogColor), 0.02);
    this.scene.background.copy(currentFogColor);

    // Dynamic light color shifts
    this.dirLight.color.lerp(themeRGB, 0.02);

    // 2. Adjust scrolling tracks
    if (this.game.state === 'PLAYING') {
      // Loop over and offset both grid layers based on forward game speed
      this.scrollingGrids.forEach(grid => {
        grid.position.z += this.game.currentSpeed;
        
        // Seamless boundaries: Teleport back ahead when slipping behind camera Z
        if (grid.position.z > 50) {
          grid.position.z -= 300; // Reset length
        }
      });

      // Match track edge visual color with selected phase colors
      this.roadBorderLines.materialEdge.color.lerp(themeRGB, 0.05);

      // 3. Move background environmental pillars to give sense of extreme movement
      this.pillars.forEach(pillar => {
        pillar.position.z += this.game.currentSpeed;
        
        // Recirculate pillars
        if (pillar.position.z > 15) {
          pillar.position.z = -180 - Math.random() * 50;
          // Randomize sides
          const side = Math.random() > 0.5 ? -1 : 1;
          pillar.position.x = (8.5 + Math.random() * 4) * side;
        }
      });
    } else {
      // Slow grid motion on menu
      this.scrollingGrids.forEach(grid => {
        grid.position.z += 0.05;
        if (grid.position.z > 50) grid.position.z -= 300;
      });
      this.roadBorderLines.materialEdge.color.lerp(themeRGB, 0.05);
    }
  }

  // ==========================================================================
  // SYNC RENDER WITH LOGICAL POOL
  // ==========================================================================

  renderSyncObstacles() {
    const currentPhaseColor = new THREE.Color(this.game.phases[this.game.currentPhase].color);

    // Sync three.js visual meshes with logical elements in game.obstacles pool
    this.game.obstacles.forEach(obs => {
      let visualMesh = this.obstacleMeshes.get(obs.id);

      if (!visualMesh) {
        // Build new geometry based on obstacle type
        let geo, mat;

        if (obs.type === 'LASER') {
          // Purple/Pink glowing sliding laser beam
          geo = new THREE.CylinderGeometry(0.18, 0.18, obs.height, 12);
          mat = new THREE.MeshBasicMaterial({
            color: 0xd900ff,
            transparent: true,
            opacity: 0.85
          });
          
          visualMesh = new THREE.Mesh(geo, mat);
          
          // Add neon outline helper cylinder
          const glowGeo = new THREE.CylinderGeometry(0.24, 0.24, obs.height, 8);
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.35,
            side: THREE.BackSide
          });
          const glowMesh = new THREE.Mesh(glowGeo, glowMat);
          visualMesh.add(glowMesh);

        } else if (obs.type === 'GLITCH') {
          // Dynamic Aggressive Red grid trap
          geo = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
          mat = new THREE.MeshBasicMaterial({
            color: 0xff003c,
            wireframe: true
          });
          
          visualMesh = new THREE.Mesh(geo, mat);

          // Add a translucent inner solid red box
          const innerGeo = new THREE.BoxGeometry(obs.width * 0.9, obs.height * 0.9, obs.depth * 0.9);
          const innerMat = new THREE.MeshBasicMaterial({
            color: 0xff003c,
            transparent: true,
            opacity: 0.4
          });
          const innerSolid = new THREE.Mesh(innerGeo, innerMat);
          visualMesh.add(innerSolid);

        } else {
          // Phase 1 Wall: Box structure with colorful neon wire edges
          geo = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
          // Sleek glossy structural box
          mat = new THREE.MeshStandardMaterial({
            color: 0x060814,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x020308
          });
          
          visualMesh = new THREE.Mesh(geo, mat);
          
          // Add Edge helper line glow
          const edges = new THREE.EdgesGeometry(geo);
          const lineMat = new THREE.LineBasicMaterial({
            color: currentPhaseColor,
            linewidth: 2 // Width is ignored in WebGL implementations, but good practice
          });
          const lineSegments = new THREE.LineSegments(edges, lineMat);
          visualMesh.add(lineSegments);
        }

        // Add to active scene and registry map
        this.scene.add(visualMesh);
        this.obstacleMeshes.set(obs.id, visualMesh);
      }

      // Update positions
      // Three.js maps Z coordinates inversely (spawn at -200 means far, Z=0 is screen)
      // Map coordinates to mesh
      const obsHeight = obs.height;
      const renderY = -0.8 + (obsHeight / 2); // Sit on flat grid floor
      
      visualMesh.position.set(obs.x, renderY, obs.z);

      // Handle visibility of Glitch traps (Phase 3)
      if (obs.type === 'GLITCH') {
        visualMesh.visible = obs.isVisible;
        
        // Randomize micro-rotations to simulate glitched matrix structure
        if (obs.isVisible) {
          visualMesh.rotation.y = Math.sin(this.clock.getElapsedTime() * 45) * 0.05;
          visualMesh.rotation.x = Math.cos(this.clock.getElapsedTime() * 30) * 0.04;
        }
      } else if (obs.type === 'LASER') {
        // Slow laser self-rotation
        visualMesh.rotation.y += 0.04;
      }

      // Sync obstacle wire colors dynamically in case phase transitions occur
      if (obs.type === 'WALL' && visualMesh.children[0]) {
        visualMesh.children[0].material.color.copy(currentPhaseColor);
      }
    });

    // Remove old mesh representations that are deactivated
    this.obstacleMeshes.forEach((mesh, id) => {
      const isExists = this.game.obstacles.some(o => o.id === id);
      if (!isExists) {
        this.scene.remove(mesh);
        
        // Recursively dispose geometry and materials
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
        
        mesh.children.forEach(child => {
          child.geometry.dispose();
          child.material.dispose();
        });

        this.obstacleMeshes.delete(id);
      }
    });
  }
}

// Instantiate and start graphics pipeline on document mount
window.addEventListener('DOMContentLoaded', () => {
  const engine = new GraphicsEngine();
  engine.init();
});
