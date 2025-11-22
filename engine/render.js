// render.js - Rendering functions for the pseudo-3D engine

/**
 * Render a complete frame
 */
export function renderFrame(ctx, config, state, road) {
  const { width, height } = config.screen;
  
  // Clear sky and grass
  drawBackground(ctx, width, height);
  
  // Calculate visible segments
  const baseSegment = road.findSegment(state.camera.z);
  const drawDistance = config.drawDistance || 300;
  
  // Render road segments from far to near (painter's algorithm)
  renderRoadSegments(ctx, road, baseSegment, drawDistance, width, height, state);
  
  // Render sprites (sorted by depth)
  renderSprites(ctx, road, baseSegment, drawDistance, state);
  
  // Render player car
  renderPlayerCar(ctx, width, height, state);
  
  // Debug overlay
  if (config.debug) {
    drawDebugOverlay(ctx, width, height, state, road);
  }
}

/**
 * Draw sky and grass background
 */
function drawBackground(ctx, width, height) {
  // Sky
  ctx.fillStyle = '#72D7EE';
  ctx.fillRect(0, 0, width, height / 2);
  
  // Ground/grass
  ctx.fillStyle = '#10AA10';
  ctx.fillRect(0, height / 2, width, height / 2);
}

/**
 * Render road segments from far to near
 */
function renderRoadSegments(ctx, road, baseSegment, drawDistance, width, height, state) {
  const baseIndex = baseSegment.index;
  
  // Limit drawDistance to available segments
  const maxDraw = Math.min(drawDistance, road.segments.length - 1);
  
  // Draw from far to near to avoid overdraw issues
  for (let n = maxDraw; n > 0; n--) {
    const segment = road.segments[(baseIndex + n) % road.segments.length];
    const prevSegment = road.segments[(baseIndex + n - 1) % road.segments.length];
    
    // Skip segments behind camera
    if (segment.screen.scale <= 0) continue;
    
    // Draw grass on both sides
    drawGrass(ctx, segment, prevSegment, width, height);
    
    // Draw road surface
    drawRoadSegment(ctx, segment, prevSegment, width, height);
    
    // Draw rumble strips
    if (n % 3 === 0) {
      drawRumbleStrips(ctx, segment, prevSegment, width, height);
    }
    
    // Draw lane markers
    if (n % 4 === 0) {
      drawLaneMarkers(ctx, segment, prevSegment, width, height);
    }
  }
}

/**
 * Draw grass polygon for a segment
 */
function drawGrass(ctx, segment, prevSegment, width, height) {
  const y1 = prevSegment.screen.y;
  const y2 = segment.screen.y;
  
  ctx.fillStyle = segment.color.grass;
  ctx.fillRect(0, y1, width, y2 - y1);
}

/**
 * Draw road segment as a trapezoid
 */
function drawRoadSegment(ctx, segment, prevSegment, width, height) {
  const x1 = prevSegment.screen.x;
  const y1 = prevSegment.screen.y;
  const w1 = prevSegment.screen.w;
  
  const x2 = segment.screen.x;
  const y2 = segment.screen.y;
  const w2 = segment.screen.w;
  
  ctx.fillStyle = segment.color.road;
  drawTrapezoid(ctx, x1 - w1/2, y1, w1, x2 - w2/2, y2, w2);
}

/**
 * Draw rumble strips on road edges
 */
function drawRumbleStrips(ctx, segment, prevSegment, width, height) {
  const x1 = prevSegment.screen.x;
  const y1 = prevSegment.screen.y;
  const w1 = prevSegment.screen.w;
  
  const x2 = segment.screen.x;
  const y2 = segment.screen.y;
  const w2 = segment.screen.w;
  
  const rumbleWidth = w1 * 0.1;
  const rumbleWidth2 = w2 * 0.1;
  
  ctx.fillStyle = segment.color.rumble;
  
  // Left rumble
  drawTrapezoid(ctx, x1 - w1/2 - rumbleWidth, y1, rumbleWidth, 
                x2 - w2/2 - rumbleWidth2, y2, rumbleWidth2);
  
  // Right rumble
  drawTrapezoid(ctx, x1 + w1/2, y1, rumbleWidth, 
                x2 + w2/2, y2, rumbleWidth2);
}

/**
 * Draw lane markers
 */
function drawLaneMarkers(ctx, segment, prevSegment, width, height) {
  const x1 = prevSegment.screen.x;
  const y1 = prevSegment.screen.y;
  const w1 = prevSegment.screen.w;
  
  const x2 = segment.screen.x;
  const y2 = segment.screen.y;
  const w2 = segment.screen.w;
  
  const laneWidth = w1 * 0.05;
  const laneWidth2 = w2 * 0.05;
  
  ctx.fillStyle = segment.color.lane;
  
  // Center lane marker
  drawTrapezoid(ctx, x1 - laneWidth/2, y1, laneWidth, 
                x2 - laneWidth2/2, y2, laneWidth2);
}

/**
 * Helper to draw a trapezoid (for road segments)
 */
function drawTrapezoid(ctx, x1, y1, w1, x2, y2, w2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + w1, y1);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.fill();
}

/**
 * Render sprites sorted by depth
 */
function renderSprites(ctx, road, baseSegment, drawDistance, state) {
  const sprites = [];
  
  // Limit drawDistance to available segments
  const maxDraw = Math.min(drawDistance, road.segments.length);
  
  // Collect all visible sprites
  for (let n = 0; n < maxDraw; n++) {
    const segment = road.segments[(baseSegment.index + n) % road.segments.length];
    
    if (segment.sprites.length > 0) {
      for (const sprite of segment.sprites) {
        if (segment.screen.scale > 0) {
          sprites.push({
            segment: segment,
            sprite: sprite
          });
        }
      }
    }
  }
  
  // Sort sprites by depth (far to near)
  sprites.sort((a, b) => b.segment.z - a.segment.z);
  
  // Draw sprites
  for (const item of sprites) {
    drawSprite(ctx, item.sprite, item.segment, state);
  }
}

/**
 * Draw a single sprite (placeholder as rectangle)
 */
function drawSprite(ctx, sprite, segment, state) {
  const scale = segment.screen.scale;
  const spriteX = segment.screen.x + (sprite.offset * segment.screen.w);
  const spriteY = segment.screen.y;
  
  // Scale sprite size based on distance
  const spriteWidth = sprite.width * scale;
  const spriteHeight = sprite.height * scale;
  
  // Draw placeholder rectangle
  ctx.fillStyle = sprite.color || '#FF0000';
  ctx.fillRect(spriteX - spriteWidth/2, spriteY - spriteHeight, 
               spriteWidth, spriteHeight);
}

/**
 * Render player car at bottom of screen
 */
function renderPlayerCar(ctx, width, height, state) {
  const carWidth = 80;
  const carHeight = 60;
  const carX = width / 2 + state.player.x * 10; // Scale player x position
  const carY = height - 100;
  
  // Draw simple car placeholder
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(carX - carWidth/2, carY - carHeight/2, carWidth, carHeight);
  
  // Draw car outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(carX - carWidth/2, carY - carHeight/2, carWidth, carHeight);
}

/**
 * Draw debug overlay with telemetry
 */
export function drawDebugOverlay(ctx, width, height, state, road) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 250, 150);
  
  ctx.fillStyle = '#00FF00';
  ctx.font = '14px monospace';
  
  const segment = road.findSegment(state.camera.z);
  
  const lines = [
    `FPS: 60 (fixed)`, // Fixed timestep ensures consistent 60Hz physics
    `Player X: ${state.player.x.toFixed(2)}`,
    `Player Z: ${state.player.z.toFixed(2)}`,
    `Speed: ${state.player.speed.toFixed(2)}`,
    `Segment: ${segment.index}`,
    `Camera Z: ${state.camera.z.toFixed(2)}`
  ];
  
  lines.forEach((line, i) => {
    ctx.fillText(line, 20, 30 + i * 20);
  });
}
