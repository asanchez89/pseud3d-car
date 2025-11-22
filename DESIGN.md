# Pseudo-3D Racing Game Engine - Design Document

## Overview

This document describes the architecture of the pseudo-3D racing game engine implemented for the `pseud3d-car` project. The engine provides a robust foundation for creating racing games with proper frame-rate independence, correct rendering order, and scalable sprites.

## Architecture

### Core Components

The engine is split into three main modules:

1. **engine/engine.js** - Main game loop and state management
2. **engine/road.js** - Road segment definition and world-to-screen projection
3. **engine/render.js** - Rendering logic with proper depth sorting

### Key Design Principles

#### 1. Fixed Timestep Game Loop (60Hz)

The engine uses a fixed timestep approach to ensure deterministic physics regardless of display refresh rate:

```javascript
const FIXED_FPS = 60;
const FIXED_TIMESTEP = 1000 / FIXED_FPS; // ~16.67ms
```

**Benefits:**
- Physics simulation is frame-rate independent
- Game behaves identically on 30Hz, 60Hz, 144Hz displays
- Predictable and reproducible gameplay

**Implementation:**
- Accumulator pattern to handle variable frame times
- Maximum frame skip to prevent "spiral of death"
- Update physics at fixed 60Hz, render as fast as possible

#### 2. World-to-Screen Projection

The `project()` function in `road.js` handles all coordinate transformations:

```javascript
project(world, camera, cameraDepth) {
  const dz = world.z - camera.z;
  if (dz < EPS) return { scale: 0, ... };
  
  const scale = cameraDepth / dz;
  const projX = (world.x - camera.x) * scale;
  const projY = (world.y - camera.y) * scale;
  const projW = roadWidth * scale;
  
  return { scale, x: projX, y: projY, w: projW, dz };
}
```

**Key features:**
- Division-by-zero protection with epsilon (EPS)
- Perspective scaling based on depth
- Centralized for consistency across all objects

#### 3. Far-to-Near Rendering (Painter's Algorithm)

Road segments are rendered from farthest to nearest to ensure correct depth sorting:

```javascript
for (let n = drawDistance; n > 0; n--) {
  const segment = road.segments[(baseIndex + n) % segments.length];
  // Draw segment...
}
```

**Benefits:**
- No z-fighting or flickering
- Sprites correctly occlude distant objects
- Simple and efficient (no z-buffer needed)

#### 4. Road Segment Structure

Each road segment represents a horizontal slice of the track:

```javascript
class Segment {
  constructor(index, z) {
    this.z = z;              // World Z position
    this.curve = 0;          // Curvature
    this.color = {...};      // Visual properties
    this.screen = {...};     // Cached screen coords
    this.sprites = [];       // Objects on this segment
  }
}
```

Segments are pre-calculated during the `prepare()` phase each frame.

### Configuration Constants

All tunable parameters are exposed through the config object:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `segmentLength` | 200 | Length of each road segment in world units |
| `roadWidth` | 2000 | Width of the road in world units |
| `drawDistance` | 300 | Number of segments to render ahead |
| `cameraHeight` | 1000 | Camera Y position (height above road) |
| `cameraDepth` | calculated | FOV-based camera depth |
| `trackLength` | 100 | Number of segments in the track |

### Debug Overlay

When `debug: true`, an overlay displays real-time telemetry:

- Fixed FPS (always 60)
- Player X position (lateral)
- Player Z position (along track)
- Current speed
- Current segment index
- Camera Z position

## Testing and Verification

### Local Testing Setup

To test the engine locally:

1. **Start a local HTTP server** (required for ES modules):
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (if http-server is installed)
   npx http-server
   
   # VS Code Live Server extension
   Right-click index.html -> "Open with Live Server"
   ```

2. **Open in browser**:
   ```
   http://localhost:8000/index.html
   ```

3. **Use keyboard controls**:
   - Arrow Keys or WASD to drive
   - ↑/W: Accelerate
   - ↓/S: Brake
   - ←→/A/D: Steer left/right

### Manual Verification Checklist

- [ ] **Road renders correctly**: Road segments draw from far to near without flickering
- [ ] **Frame-rate independence**: Reduce browser FPS (dev tools throttling) - car still drives at same speed
- [ ] **Steering works**: Left/right controls move car laterally
- [ ] **Speed control**: Acceleration and braking respond correctly
- [ ] **Boundaries**: Car cannot drive off-road edges
- [ ] **Track looping**: Car loops back to start after completing track
- [ ] **Debug overlay**: Shows FPS (60), position, speed, segment index
- [ ] **Colors alternate**: Road segments have alternating colors for depth perception
- [ ] **Curves visible**: Track has gentle curves around segments 20-40 and 50-70

### Debugging Tips

1. **Enable debug overlay**: Set `debug: true` in engine initialization
2. **Check console**: Browser console shows initialization message
3. **Verify module loading**: Check network tab for 404s on .js files
4. **Test input**: Debug overlay should show changing values when driving
5. **Frame rate**: Fixed timestep ensures 60Hz physics even if rendering varies
6. **Segment drawing**: Each segment should be a trapezoid getting wider as it approaches

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| White screen | CORS error loading modules | Use HTTP server, not `file://` |
| No input response | JavaScript error | Check browser console for errors |
| Jerky movement | Variable timestep bug | Verify accumulator logic in engine.js |
| Flickering road | Wrong render order | Ensure far-to-near loop direction |
| Sprites behind road | Depth sorting issue | Check sprite rendering happens after road |

## Future Enhancements

This basic engine can be extended with:

- **Collision detection**: Check player position against sprites
- **AI opponents**: Add computer-controlled cars
- **Physics improvements**: Banking on curves, acceleration curves
- **Sprite images**: Replace placeholder rectangles with actual sprites
- **Sound effects**: Engine sounds, collision sounds
- **UI improvements**: Speedometer, lap counter, position indicator
- **Track editor**: Tool to design custom tracks
- **Power-ups**: Boost pads, obstacles
- **Multiplayer**: Network synchronization with deterministic physics

## Code Organization

```
pseud3d-car/
├── index.html           # Entry point, initializes game
├── engine/
│   ├── engine.js        # Game loop, input, state management
│   ├── road.js          # Segment class, projection, road generation
│   └── render.js        # Rendering functions, debug overlay
└── DESIGN.md           # This document
```

## Technical Notes

### Why Fixed Timestep?

Variable timestep causes issues:
- Physics depends on frame rate
- Game runs faster on high-refresh displays
- Inconsistent behavior across devices

Fixed timestep solves this by decoupling physics updates from rendering.

### Why Painter's Algorithm?

For pseudo-3D, painter's algorithm (far-to-near) is simpler and faster than z-buffering:
- No need to sort individual polygons
- Natural for horizontal road segments
- Predictable rendering order
- Easy to insert sprites at correct depth

### Projection Math

The projection formula implements perspective projection:

```
scale = cameraDepth / (worldZ - cameraZ)
screenX = worldX * scale
screenY = worldY * scale
```

This creates the illusion of depth as objects scale based on distance.

## License

This engine implementation is provided as-is for the pseud3d-car project.
