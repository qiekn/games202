# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Project

No build step. Serve `index.html` via any static HTTP server:
```bash
# Option A: VS Code "Live Server" extension
# Option B:
npx http-server . -p 8000
```

## Architecture

This is GAMES202 Homework 1 — a raw WebGL 1.0 real-time renderer (no bundler, no modules). All JS is loaded via `<script defer>` tags in `index.html`; order matters.

### Rendering Pipeline

`engine.js` → `GAMES202Main()` sets up scene, camera (THREE.PerspectiveCamera + OrbitControls), lights, and the render loop.

`WebGLRenderer` drives a two-pass pipeline per light:
1. **Shadow pass** — renders `shadowMeshes` to an FBO depth texture (`ShadowMaterial` / `shadowShader/`)
2. **Camera pass** — renders `meshes` with Phong shading + shadow lookup (`PhongMaterial` / `phongShader/`)

`MeshRender` owns the GL program, binds uniforms/attributes/textures, and issues draw calls.

### Key Abstractions

- **Material** (`src/materials/Material.js`) — base class holding uniform map and shader sources; subclasses (`PhongMaterial`, `ShadowMaterial`) configure specific uniform sets
- **Shader / Compile** (`src/shaders/Shader.js`) — wraps GL program creation, uniform/attribute location lookup
- **FBO** (`src/textures/FBO.js`) — framebuffer object for shadow map render target (resolution set by global `resolution` in engine.js)
- **Light** — `DirectionalLight.CalcLightMVP()` computes the light-space MVP matrix; this is a core homework TODO
- **loadOBJ** — async loader that creates `MeshRender` instances and registers them with the renderer

### Homework TODOs (the functions to implement)

All in GLSL unless noted:

| Function | File | Purpose |
|---|---|---|
| `CalcLightMVP()` | `src/lights/DirectionalLight.js` | Build model→light-clip matrix (JS, uses gl-matrix `mat4`) |
| `useShadowMap()` | `src/shaders/phongShader/phongFragment.glsl` | Basic hard shadow via depth comparison |
| `PCF()` | same | Percentage-closer filtering (soft shadow edges) |
| `findBlocker()` | same | Average blocker depth for PCSS |
| `PCSS()` | same | Percentage-closer soft shadows |

Shadow coordinate is passed via `vPositionFromLight`; depth is packed/unpacked with `unpack()`.

### Third-party Libraries (in `lib/`)

THREE.js (camera/controls only, not for rendering), gl-matrix (mat4/vec3), dat.gui, OBJ/MTL loaders.
