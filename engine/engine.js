// engine.js - Main game engine with fixed timestep loop

import { Road } from './road.js';
import { renderFrame } from './render.js';

// Configuration constants
const FIXED_FPS = 60;
const FIXED_TIMESTEP = 1000 / FIXED_FPS; // 16.67ms per frame
const MAX_FRAME_SKIP = 5; // Max updates without render to prevent spiral of death

export class GameEngine {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Merge default config
    this.config = {
      screen: {
        width: config.width || 1280,
        height: config.height || 720
      },
      segmentLength: config.segmentLength || 200,
      roadWidth: config.roadWidth || 2000,
      drawDistance: config.drawDistance || 300,
      cameraHeight: config.cameraHeight || 1000,
      fieldOfView: config.fieldOfView || 100,
      cameraDepth: config.cameraDepth || 1 / Math.tan(((config.fieldOfView || 100) / 2) * Math.PI / 180),
      fogDensity: config.fogDensity || 5,
      trackLength: config.trackLength || 100,
      debug: config.debug !== undefined ? config.debug : true
    };
    
    // Set canvas size
    this.canvas.width = this.config.screen.width;
    this.canvas.height = this.config.screen.height;
    
    // Initialize road
    this.road = new Road({
      segmentLength: this.config.segmentLength,
      roadWidth: this.config.roadWidth,
      trackLength: this.config.trackLength
    });
    
    // Game state
    this.state = {
      player: {
        x: 0, // lateral position (-1 to 1, 0 = center)
        y: 0,
        z: 0, // position along track
        speed: 0,
        maxSpeed: 200,
        accel: 50,
        decel: 80,
        brake: 150,
        steer: 0.02,
        offRoadDecel: 0.5,
        offRoadLimit: 100,
        maxLateralPosition: 1.0 // Road boundaries
      },
      camera: {
        x: 0,
        y: this.config.cameraHeight,
        z: 0
      },
      input: {
        up: false,
        down: false,
        left: false,
        right: false
      }
    };
    
    // Timing
    this.lastTime = 0;
    this.accumulator = 0;
    this.running = false;
    
    // Setup input handlers
    this.setupInput();
  }
  
  /**
   * Setup keyboard input handlers
   */
  setupInput() {
    const keyMap = {
      'ArrowUp': 'up',
      'KeyW': 'up',
      'ArrowDown': 'down',
      'KeyS': 'down',
      'ArrowLeft': 'left',
      'KeyA': 'left',
      'ArrowRight': 'right',
      'KeyD': 'right'
    };
    
    window.addEventListener('keydown', (e) => {
      if (keyMap[e.code]) {
        this.state.input[keyMap[e.code]] = true;
        e.preventDefault();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (keyMap[e.code]) {
        this.state.input[keyMap[e.code]] = false;
        e.preventDefault();
      }
    });
  }
  
  /**
   * Start the game loop
   */
  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    this.running = false;
  }
  
  /**
   * Main game loop with fixed timestep
   */
  loop() {
    if (!this.running) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Add time to accumulator
    this.accumulator += deltaTime;
    
    // Update physics with fixed timestep
    let updates = 0;
    while (this.accumulator >= FIXED_TIMESTEP && updates < MAX_FRAME_SKIP) {
      this.update(FIXED_TIMESTEP / 1000); // Convert to seconds
      this.accumulator -= FIXED_TIMESTEP;
      updates++;
    }
    
    // Prevent spiral of death
    if (this.accumulator > FIXED_TIMESTEP * MAX_FRAME_SKIP) {
      this.accumulator = 0;
    }
    
    // Render current state
    this.render();
    
    // Continue loop
    requestAnimationFrame(() => this.loop());
  }
  
  /**
   * Update game state (called at fixed 60Hz)
   */
  update(dt) {
    const player = this.state.player;
    const input = this.state.input;
    
    // Handle acceleration/braking
    if (input.up) {
      player.speed += player.accel * dt;
    } else if (input.down) {
      player.speed -= player.brake * dt;
    } else {
      player.speed -= player.decel * dt;
    }
    
    // Clamp speed
    player.speed = Math.max(0, Math.min(player.speed, player.maxSpeed));
    
    // Handle steering
    if (input.left) {
      player.x -= player.steer * dt * (player.speed / player.maxSpeed);
    }
    if (input.right) {
      player.x += player.steer * dt * (player.speed / player.maxSpeed);
    }
    
    // Keep player on road (basic collision)
    if (Math.abs(player.x) > player.maxLateralPosition) {
      player.x = Math.sign(player.x) * player.maxLateralPosition;
      player.speed = Math.min(player.speed, player.offRoadLimit);
    }
    
    // Update position along track
    player.z += player.speed * dt;
    
    // Loop track
    const trackLength = this.road.segments.length * this.road.segmentLength;
    if (player.z >= trackLength) {
      player.z -= trackLength;
    }
    
    // Update camera to follow player
    this.state.camera.x = player.x * this.config.roadWidth / 2;
    this.state.camera.z = player.z;
  }
  
  /**
   * Render current frame
   */
  render() {
    // Prepare road segments (calculate screen coordinates)
    this.road.prepare(
      this.state.camera,
      this.config.cameraDepth,
      this.config.screen.width,
      this.config.screen.height
    );
    
    // Render the frame
    renderFrame(
      this.ctx,
      this.config,
      this.state,
      this.road
    );
  }
}

/**
 * Initialize and start the game
 */
export function init(canvasId, config = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas with id "${canvasId}" not found`);
    return null;
  }
  
  const engine = new GameEngine(canvas, config);
  engine.start();
  
  return engine;
}
