// road.js - Road segment definition and projection utilities

// Small epsilon to prevent division by zero
const EPS = 0.001;

/**
 * Segment class represents a slice of road at a given Z position
 */
export class Segment {
  constructor(index, z) {
    this.index = index;
    this.z = z; // world Z coordinate
    this.curve = 0; // road curvature at this segment
    this.color = null; // road color (grass, road, etc.)
    
    // Screen coordinates (calculated during prepare phase)
    this.screen = {
      scale: 0,
      x: 0,
      y: 0,
      w: 0
    };
    
    // Sprites on this segment (cars, signs, etc.)
    this.sprites = [];
  }
}

/**
 * Road class manages all segments and provides projection utilities
 */
export class Road {
  constructor(config) {
    this.segmentLength = config.segmentLength || 200;
    this.roadWidth = config.roadWidth || 2000;
    this.segments = [];
    
    // Generate test track
    this.generateTestTrack(config.trackLength || 100);
  }
  
  /**
   * Generate a simple test track with alternating colors
   */
  generateTestTrack(numSegments) {
    this.segments = [];
    
    for (let i = 0; i < numSegments; i++) {
      const segment = new Segment(i, i * this.segmentLength);
      
      // Alternate road colors for visual feedback
      if (Math.floor(i / 3) % 2 === 0) {
        segment.color = {
          road: '#696969',
          grass: '#10AA10',
          rumble: '#FFFFFF',
          lane: '#CCCCCC'
        };
      } else {
        segment.color = {
          road: '#6B6B6B',
          grass: '#009A00',
          rumble: '#000000',
          lane: '#CCCCCC'
        };
      }
      
      // Add some curves for variety
      if (i > 20 && i < 40) {
        segment.curve = 0.5; // gentle right curve
      } else if (i > 50 && i < 70) {
        segment.curve = -0.7; // gentle left curve
      }
      
      this.segments.push(segment);
    }
  }
  
  /**
   * Find segment at given world Z position
   */
  findSegment(z) {
    const index = Math.floor(z / this.segmentLength) % this.segments.length;
    return this.segments[index];
  }
  
  /**
   * Project world coordinates to screen coordinates
   * @param {object} world - {x, y, z} world coordinates
   * @param {object} camera - {x, y, z} camera position
   * @param {number} cameraDepth - camera depth/FOV
   * @returns {object} {scale, x, y, w, dz} screen projection data
   */
  project(world, camera, cameraDepth) {
    const dz = world.z - camera.z;
    
    // Protect against division by zero
    if (dz < EPS) {
      return { scale: 0, x: 0, y: 0, w: 0, dz: dz };
    }
    
    const scale = cameraDepth / dz;
    const projX = (world.x - camera.x) * scale;
    const projY = (world.y - camera.y) * scale;
    const projW = this.roadWidth * scale;
    
    return {
      scale: scale,
      x: projX,
      y: projY,
      w: projW,
      dz: dz
    };
  }
  
  /**
   * Prepare segments for rendering by calculating screen coordinates
   * Called once per frame before rendering
   */
  prepare(camera, cameraDepth, screenWidth, screenHeight) {
    const baseSegment = this.findSegment(camera.z);
    const baseIndex = baseSegment.index;
    
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const projection = this.project(
        { x: 0, y: 0, z: segment.z },
        camera,
        cameraDepth
      );
      
      // Store screen coordinates for rendering
      segment.screen.scale = projection.scale;
      segment.screen.x = screenWidth / 2 + projection.x;
      segment.screen.y = screenHeight / 2 - projection.y;
      segment.screen.w = projection.w;
    }
  }
}
