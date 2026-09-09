"use client";

// Ported from ChaoUi/cursor/splash-cursor. The fluid solver is preserved while
// its lifecycle, GPU cleanup and pointer scope are adapted for this app.
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/useInView";
import { useIsTouch, useReducedMotion } from "@/hooks/useMediaQuery";

export type SplashCursorProps = {
  SIM_RESOLUTION?: number;
  DYE_RESOLUTION?: number;
  CAPTURE_RESOLUTION?: number;
  DENSITY_DISSIPATION?: number;
  VELOCITY_DISSIPATION?: number;
  PRESSURE?: number;
  PRESSURE_ITERATIONS?: number;
  CURL?: number;
  SPLAT_RADIUS?: number;
  SPLAT_FORCE?: number;
  SHADING?: boolean;
  COLOR_UPDATE_SPEED?: number;
  BACK_COLOR?: { r: number; g: number; b: number };
  TRANSPARENT?: boolean;
  RAINBOW_MODE?: boolean;
  COLOR?: string;
  /**
   * Upper bound on the device pixel ratio the drawing buffer is sized at.
   * Not in the upstream component, which is fixed at 2 — on a retina display
   * that makes the full-viewport buffer four times the pixels, and this
   * simulation pays for every one of them on every frame. 1 halves each axis;
   * the output is a blurred fluid, so the loss is hard to see.
   */
  PIXEL_RATIO_CAP?: number;
  /** Stop requesting frames after the last interaction has fully dissipated. */
  IDLE_TIMEOUT_MS?: number;
  /** Scope the simulation (and its pointer tracking) to this element instead of the whole viewport. */
  contained?: boolean;
  className?: string;
};

type RGB = { r: number; g: number; b: number };

type PointerState = {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: [number, number, number];
};

type FBO = {
  texture: WebGLTexture | null;
  fbo: WebGLFramebuffer | null;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
  /**
   * Release this buffer's GPU memory. Not in the upstream component, which
   * simply drops the reference — but a WebGLTexture is a handle to driver-side
   * memory that JS garbage collection does not free on any schedule you can
   * rely on. See the leak note on `resizeFBO`.
   */
  dispose: () => void;
};

type DoubleFBO = {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap: () => void;
};

const baseVertexSource = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;

  void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const copySource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;

  void main () {
      gl_FragColor = texture2D(uTexture, vUv);
  }
`;

const clearSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;

  void main () {
      gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

const displaySource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uTexture;
  uniform vec2 texelSize;

  void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      #ifdef SHADING
          vec3 lc = texture2D(uTexture, vL).rgb;
          vec3 rc = texture2D(uTexture, vR).rgb;
          vec3 tc = texture2D(uTexture, vT).rgb;
          vec3 bc = texture2D(uTexture, vB).rgb;

          float dx = length(rc) - length(lc);
          float dy = length(tc) - length(bc);

          vec3 n = normalize(vec3(dx, dy, length(texelSize)));
          vec3 l = vec3(0.0, 0.0, 1.0);

          float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
          c *= diffuse;
      #endif

      float a = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c, a);
  }
`;

const splatSource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;

  void main () {
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
  }
`;

const advectionSource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform vec2 dyeTexelSize;
  uniform float dt;
  uniform float dissipation;

  vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);

      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
  }

  void main () {
      #ifdef MANUAL_FILTERING
          vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
          vec4 result = bilerp(uSource, coord, dyeTexelSize);
      #else
          vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
          vec4 result = texture2D(uSource, coord);
      #endif
      float decay = 1.0 + dissipation * dt;
      gl_FragColor = result / decay;
  }
`;

const divergenceSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;

      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }

      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

const curlSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;

  void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`;

const vorticitySource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;

  void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;

      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;

      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity += force * dt;
      velocity = min(max(velocity, -1000.0), 1000.0);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

const pressureSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;

  void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float C = texture2D(uPressure, vUv).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

const gradientSubtractSource = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;

  void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

function hashCode(s: string) {
  if (s.length === 0) return 0;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function hexToRGB(hex: string): RGB {
  let value = hex.replace("#", "");
  if (value.length === 3) value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
  const n = Number.parseInt(value || "ff0000", 16);
  return { r: (((n >> 16) & 255) / 255) * 0.15, g: (((n >> 8) & 255) / 255) * 0.15, b: ((n & 255) / 255) * 0.15 };
}

function hsvToRGB(h: number, s: number, v: number): RGB {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return { r: v, g: t, b: p };
    case 1: return { r: q, g: v, b: p };
    case 2: return { r: p, g: v, b: t };
    case 3: return { r: p, g: q, b: v };
    case 4: return { r: t, g: p, b: v };
    default: return { r: v, g: p, b: q };
  }
}

function wrap(value: number, min: number, max: number) {
  const range = max - min;
  if (range === 0) return min;
  return ((value - min) % range) + min;
}

/**
 * Full WebGL fluid simulation cursor — dye advected through a divergence-free
 * velocity field, with curl/vorticity confinement and a Jacobi pressure
 * solve, splatted at the pointer on every move or click. Ported from React
 * Bits' SplashCursor (the real Navier-Stokes solver, not an approximation):
 * curl → vorticity confinement → divergence → pressure iterations →
 * gradient subtraction → advection, run every frame in that order.
 *
 * `contained` is the one addition beyond upstream, which is always a fixed
 * full-viewport overlay tracking window-level pointer events — reasonable
 * for a real product page, but a component gallery can't have every visit
 * to this one demo hijack pointer input across the whole site. Contained
 * mode scopes both the canvas and its pointer/resize tracking to the
 * wrapping element instead of `window`.
 */
export function SplashCursor({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1024,
  DENSITY_DISSIPATION = 3.5,
  VELOCITY_DISSIPATION = 2,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 20,
  CURL = 3,
  SPLAT_RADIUS = 0.2,
  SPLAT_FORCE = 6000,
  SHADING = true,
  COLOR_UPDATE_SPEED = 10,
  TRANSPARENT = true,
  RAINBOW_MODE = true,
  COLOR = "#ff0000",
  PIXEL_RATIO_CAP = 2,
  IDLE_TIMEOUT_MS = 2800,
  contained = false,
  className,
}: SplashCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { ref: viewRef, inView } = useInView<HTMLDivElement>({ margin: "150px" });
  const touch = useIsTouch();
  const reducedMotion = useReducedMotion();

  const configRef = useRef({
    SIM_RESOLUTION,
    DYE_RESOLUTION,
    DENSITY_DISSIPATION,
    VELOCITY_DISSIPATION,
    PRESSURE,
    PRESSURE_ITERATIONS,
    CURL,
    SPLAT_RADIUS,
    SPLAT_FORCE,
    SHADING,
    COLOR_UPDATE_SPEED,
    TRANSPARENT,
    RAINBOW_MODE,
    COLOR,
    PIXEL_RATIO_CAP,
    IDLE_TIMEOUT_MS,
  });
  configRef.current = {
    SIM_RESOLUTION,
    DYE_RESOLUTION,
    DENSITY_DISSIPATION,
    VELOCITY_DISSIPATION,
    PRESSURE,
    PRESSURE_ITERATIONS,
    CURL,
    SPLAT_RADIUS,
    SPLAT_FORCE,
    SHADING,
    COLOR_UPDATE_SPEED,
    TRANSPARENT,
    RAINBOW_MODE,
    COLOR,
    PIXEL_RATIO_CAP,
    IDLE_TIMEOUT_MS,
  };

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const rootEl = rootRef.current;
    if (!canvasEl || !rootEl || !inView || touch || reducedMotion) return;
    // Rebound as new consts: TS can't carry the null-check above into the
    // function declarations below (they close over the outer refs, not a
    // narrowed snapshot), but a fresh binding narrows cleanly.
    const canvas = canvasEl;
    const root = rootEl;

    let isActive = true;
    let animationFrameId = 0;
    const config = configRef;

    const params: WebGLContextAttributes = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    };
    let gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
    const isWebGL2 = !!gl;
    if (!gl) gl = (canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params)) as WebGL2RenderingContext | null;
    if (!gl) return;
    const glc = gl;

    let halfFloat: OES_texture_half_float | null = null;
    let supportLinearFiltering: unknown;
    if (isWebGL2) {
      glc.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = glc.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = glc.getExtension("OES_texture_half_float");
      supportLinearFiltering = glc.getExtension("OES_texture_half_float_linear");
    }
    glc.clearColor(0, 0, 0, 1);

    const halfFloatTexType = isWebGL2 ? glc.HALF_FLOAT : halfFloat?.HALF_FLOAT_OES;

    function supportRenderTextureFormat(internalFormat: number, format: number, type: number) {
      const texture = glc.createTexture();
      glc.bindTexture(glc.TEXTURE_2D, texture);
      glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MIN_FILTER, glc.NEAREST);
      glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MAG_FILTER, glc.NEAREST);
      glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_S, glc.CLAMP_TO_EDGE);
      glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_T, glc.CLAMP_TO_EDGE);
      glc.texImage2D(glc.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = glc.createFramebuffer();
      glc.bindFramebuffer(glc.FRAMEBUFFER, fbo);
      glc.framebufferTexture2D(glc.FRAMEBUFFER, glc.COLOR_ATTACHMENT0, glc.TEXTURE_2D, texture, 0);
      const supported = glc.checkFramebufferStatus(glc.FRAMEBUFFER) === glc.FRAMEBUFFER_COMPLETE;
      glc.bindFramebuffer(glc.FRAMEBUFFER, null);
      glc.deleteFramebuffer(fbo);
      glc.deleteTexture(texture);
      return supported;
    }

    function getSupportedFormat(internalFormat: number, format: number, type: number): { internalFormat: number; format: number } | null {
      if (!supportRenderTextureFormat(internalFormat, format, type)) {
        if (isWebGL2) {
          const gl2 = glc as WebGL2RenderingContext;
          if (internalFormat === gl2.R16F) return getSupportedFormat(gl2.RG16F, gl2.RG, type);
          if (internalFormat === gl2.RG16F) return getSupportedFormat(gl2.RGBA16F, gl2.RGBA, type);
        }
        return null;
      }
      return { internalFormat, format };
    }

    let formatRGBA: { internalFormat: number; format: number } | null;
    let formatRG: { internalFormat: number; format: number } | null;
    let formatR: { internalFormat: number; format: number } | null;
    if (isWebGL2) {
      const gl2 = glc as WebGL2RenderingContext;
      formatRGBA = getSupportedFormat(gl2.RGBA16F, gl2.RGBA, halfFloatTexType!);
      formatRG = getSupportedFormat(gl2.RG16F, gl2.RG, halfFloatTexType!);
      formatR = getSupportedFormat(gl2.R16F, gl2.RED, halfFloatTexType!);
    } else {
      formatRGBA = getSupportedFormat(glc.RGBA, glc.RGBA, halfFloatTexType!);
      formatRG = formatRGBA;
      formatR = formatRGBA;
    }
    if (!formatRGBA || !formatRG || !formatR) return;
    const fmtRGBA = formatRGBA;
    const fmtRG = formatRG;
    const fmtR = formatR;

    if (!supportLinearFiltering) {
      config.current.DYE_RESOLUTION = 256;
      config.current.SHADING = false;
    }

    const shaders = new Set<WebGLShader>();
    const programs = new Set<WebGLProgram>();

    function compileShader(type: number, source: string, keywords?: string[]) {
      const withKeywords = keywords ? keywords.map((k) => `#define ${k}\n`).join("") + source : source;
      const shader = glc.createShader(type);
      if (!shader) throw new Error("Unable to create shader");
      glc.shaderSource(shader, withKeywords);
      glc.compileShader(shader);
      shaders.add(shader);
      return shader;
    }

    function createProgram(vertex: WebGLShader, fragment: WebGLShader) {
      const program = glc.createProgram();
      if (!program) throw new Error("Unable to create program");
      glc.attachShader(program, vertex);
      glc.attachShader(program, fragment);
      glc.linkProgram(program);
      programs.add(program);
      return program;
    }

    function getUniforms(program: WebGLProgram) {
      const uniforms: Record<string, WebGLUniformLocation | null> = {};
      const count = glc.getProgramParameter(program, glc.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const info = glc.getActiveUniform(program, i);
        if (info) uniforms[info.name] = glc.getUniformLocation(program, info.name);
      }
      return uniforms;
    }

    class Material {
      vertexShader: WebGLShader;
      fragmentSource: string;
      programs: Record<number, WebGLProgram> = {};
      activeProgram: WebGLProgram | null = null;
      uniforms: Record<string, WebGLUniformLocation | null> = {};
      constructor(vertexShader: WebGLShader, fragmentSource: string) {
        this.vertexShader = vertexShader;
        this.fragmentSource = fragmentSource;
      }
      setKeywords(keywords: string[]) {
        let hash = 0;
        for (const k of keywords) hash += hashCode(k);
        let program = this.programs[hash];
        if (!program) {
          const fragment = compileShader(glc.FRAGMENT_SHADER, this.fragmentSource, keywords);
          program = createProgram(this.vertexShader, fragment);
          this.programs[hash] = program;
        }
        if (program === this.activeProgram) return;
        this.uniforms = getUniforms(program);
        this.activeProgram = program;
      }
      bind() {
        if (this.activeProgram) glc.useProgram(this.activeProgram);
      }
    }

    class Program {
      program: WebGLProgram;
      uniforms: Record<string, WebGLUniformLocation | null>;
      constructor(vertex: WebGLShader, fragment: WebGLShader) {
        this.program = createProgram(vertex, fragment);
        this.uniforms = getUniforms(this.program);
      }
      bind() {
        glc.useProgram(this.program);
      }
    }

    const baseVertexShader = compileShader(glc.VERTEX_SHADER, baseVertexSource);
    const copyShader = compileShader(glc.FRAGMENT_SHADER, copySource);
    const clearShader = compileShader(glc.FRAGMENT_SHADER, clearSource);
    const splatShader = compileShader(glc.FRAGMENT_SHADER, splatSource);
    const advectionShader = compileShader(
      glc.FRAGMENT_SHADER,
      advectionSource,
      supportLinearFiltering ? undefined : ["MANUAL_FILTERING"],
    );
    const divergenceShader = compileShader(glc.FRAGMENT_SHADER, divergenceSource);
    const curlShader = compileShader(glc.FRAGMENT_SHADER, curlSource);
    const vorticityShader = compileShader(glc.FRAGMENT_SHADER, vorticitySource);
    const pressureShader = compileShader(glc.FRAGMENT_SHADER, pressureSource);
    const gradientSubtractShader = compileShader(glc.FRAGMENT_SHADER, gradientSubtractSource);

    const copyProgram = new Program(baseVertexShader, copyShader);
    const clearProgram = new Program(baseVertexShader, clearShader);
    const splatProgram = new Program(baseVertexShader, splatShader);
    const advectionProgram = new Program(baseVertexShader, advectionShader);
    const divergenceProgram = new Program(baseVertexShader, divergenceShader);
    const curlProgram = new Program(baseVertexShader, curlShader);
    const vorticityProgram = new Program(baseVertexShader, vorticityShader);
    const pressureProgram = new Program(baseVertexShader, pressureShader);
    const gradientSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
    const displayMaterial = new Material(baseVertexShader, displaySource);

    const vertexBuffer = glc.createBuffer();
    const indexBuffer = glc.createBuffer();
    if (!vertexBuffer || !indexBuffer) return;
    glc.bindBuffer(glc.ARRAY_BUFFER, vertexBuffer);
    glc.bufferData(glc.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), glc.STATIC_DRAW);
    glc.bindBuffer(glc.ELEMENT_ARRAY_BUFFER, indexBuffer);
    glc.bufferData(glc.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), glc.STATIC_DRAW);
    glc.vertexAttribPointer(0, 2, glc.FLOAT, false, 0, 0);
    glc.enableVertexAttribArray(0);

    function blit(target: FBO | null, clear = false) {
      if (target == null) {
        glc.viewport(0, 0, glc.drawingBufferWidth, glc.drawingBufferHeight);
        glc.bindFramebuffer(glc.FRAMEBUFFER, null);
      } else {
        glc.viewport(0, 0, target.width, target.height);
        glc.bindFramebuffer(glc.FRAMEBUFFER, target.fbo);
      }
      if (clear) {
        glc.clearColor(0, 0, 0, 1);
        glc.clear(glc.COLOR_BUFFER_BIT);
      }
      glc.drawElements(glc.TRIANGLES, 6, glc.UNSIGNED_SHORT, 0);
    }

    function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
      glc.activeTexture(glc.TEXTURE0);
      const texture = glc.createTexture();
      glc.bindTexture(glc.TEXTURE_2D, texture);
      glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MIN_FILTER, param);
      glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MAG_FILTER, param);
      glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_S, glc.CLAMP_TO_EDGE);
      glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_T, glc.CLAMP_TO_EDGE);
      glc.texImage2D(glc.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

      const fbo = glc.createFramebuffer();
      glc.bindFramebuffer(glc.FRAMEBUFFER, fbo);
      glc.framebufferTexture2D(glc.FRAMEBUFFER, glc.COLOR_ATTACHMENT0, glc.TEXTURE_2D, texture, 0);
      glc.viewport(0, 0, w, h);
      glc.clear(glc.COLOR_BUFFER_BIT);

      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        attach(id: number) {
          glc.activeTexture(glc.TEXTURE0 + id);
          glc.bindTexture(glc.TEXTURE_2D, texture);
          return id;
        },
        dispose() {
          glc.deleteFramebuffer(fbo);
          glc.deleteTexture(texture);
        },
      };
    }

    /**
     * Replace a buffer at a new size, copying the old contents across.
     *
     * The `dispose()` is the fix for a leak in the upstream component: it
     * allocated the replacement and dropped the old handle, so every resize
     * left a texture and a framebuffer stranded in GPU memory. One resize is
     * harmless; a `ResizeObserver` firing continuously — dragging a window
     * edge, or dragging the DevTools splitter — is not, and the renderer is
     * killed when the GPU process runs out of memory.
     *
     * Deleting after `blit` is safe: WebGL defers destruction until the object
     * is no longer referenced by an in-flight command, and deleting a bound
     * texture unbinds it from its unit.
     */
    function resizeFBO(target: FBO, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      const newFBO = createFBO(w, h, internalFormat, format, type, param);
      copyProgram.bind();
      glc.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
      blit(newFBO);
      target.dispose();
      return newFBO;
    }

    function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFBO {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param);
      let fbo2 = createFBO(w, h, internalFormat, format, type, param);
      return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read() {
          return fbo1;
        },
        set read(v: FBO) {
          fbo1 = v;
        },
        get write() {
          return fbo2;
        },
        set write(v: FBO) {
          fbo2 = v;
        },
        swap() {
          const t = fbo1;
          fbo1 = fbo2;
          fbo2 = t;
        },
      };
    }

    function resizeDoubleFBO(target: DoubleFBO, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
      if (target.width === w && target.height === h) return target;
      target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
      // The write half is not copied across — it is scratch space, overwritten
      // on the next step — but it still has to be released before it is replaced.
      target.write.dispose();
      target.write = createFBO(w, h, internalFormat, format, type, param);
      target.width = w;
      target.height = h;
      target.texelSizeX = 1 / w;
      target.texelSizeY = 1 / h;
      return target;
    }

    function getResolution(resolution: number) {
      let aspectRatio = glc.drawingBufferWidth / glc.drawingBufferHeight;
      if (aspectRatio < 1) aspectRatio = 1 / aspectRatio;
      const min = Math.round(resolution);
      const max = Math.round(resolution * aspectRatio);
      if (glc.drawingBufferWidth > glc.drawingBufferHeight) return { width: max, height: min };
      return { width: min, height: max };
    }

    let dye: DoubleFBO;
    let velocity: DoubleFBO;
    let divergence: FBO;
    let curl: FBO;
    let pressure: DoubleFBO;

    function initFramebuffers() {
      const simRes = getResolution(config.current.SIM_RESOLUTION);
      const dyeRes = getResolution(config.current.DYE_RESOLUTION);
      const texType = halfFloatTexType!;
      const filtering = supportLinearFiltering ? glc.LINEAR : glc.NEAREST;
      glc.disable(glc.BLEND);

      dye = dye
        ? resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, fmtRGBA.internalFormat, fmtRGBA.format, texType, filtering)
        : createDoubleFBO(dyeRes.width, dyeRes.height, fmtRGBA.internalFormat, fmtRGBA.format, texType, filtering);

      velocity = velocity
        ? resizeDoubleFBO(velocity, simRes.width, simRes.height, fmtRG.internalFormat, fmtRG.format, texType, filtering)
        : createDoubleFBO(simRes.width, simRes.height, fmtRG.internalFormat, fmtRG.format, texType, filtering);

      // These three hold no state worth carrying across a resize, so they are
      // rebuilt rather than resized — which means on every call but the first
      // there is an existing set to release. Upstream rebuilt them the same way
      // and released nothing, so a resize leaked these four buffers too.
      divergence?.dispose();
      curl?.dispose();
      pressure?.read.dispose();
      pressure?.write.dispose();

      divergence = createFBO(simRes.width, simRes.height, fmtR.internalFormat, fmtR.format, texType, glc.NEAREST);
      curl = createFBO(simRes.width, simRes.height, fmtR.internalFormat, fmtR.format, texType, glc.NEAREST);
      pressure = createDoubleFBO(simRes.width, simRes.height, fmtR.internalFormat, fmtR.format, texType, glc.NEAREST);
    }

    function updateKeywords() {
      displayMaterial.setKeywords(config.current.SHADING ? ["SHADING"] : []);
    }

    updateKeywords();
    initFramebuffers();

    function generateColor(): RGB {
      if (!config.current.RAINBOW_MODE) return hexToRGB(config.current.COLOR);
      const c = hsvToRGB(Math.random(), 1, 1);
      return { r: c.r * 0.15, g: c.g * 0.15, b: c.b * 0.15 };
    }

    const pointer: PointerState = {
      id: -1,
      texcoordX: 0.5,
      texcoordY: 0.5,
      prevTexcoordX: 0.5,
      prevTexcoordY: 0.5,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: [0, 0, 0],
    };

    function correctRadius(radius: number) {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) radius *= aspectRatio;
      return radius;
    }

    function splat(x: number, y: number, dx: number, dy: number, color: RGB) {
      splatProgram.bind();
      glc.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
      glc.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
      glc.uniform2f(splatProgram.uniforms.point, x, y);
      glc.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
      glc.uniform1f(splatProgram.uniforms.radius, correctRadius(config.current.SPLAT_RADIUS / 100));
      blit(velocity.write);
      velocity.swap();

      glc.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
      glc.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
      blit(dye.write);
      dye.swap();
    }

    function splatPointer(p: PointerState) {
      const dx = p.deltaX * config.current.SPLAT_FORCE;
      const dy = p.deltaY * config.current.SPLAT_FORCE;
      splat(p.texcoordX, p.texcoordY, dx, dy, { r: p.color[0], g: p.color[1], b: p.color[2] });
    }

    function clickSplat(p: PointerState) {
      const color = generateColor();
      color.r *= 10;
      color.g *= 10;
      color.b *= 10;
      const dx = 10 * (Math.random() - 0.5);
      const dy = 30 * (Math.random() - 0.5);
      splat(p.texcoordX, p.texcoordY, dx, dy, color);
    }

    function correctDeltaX(delta: number) {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio < 1) delta *= aspectRatio;
      return delta;
    }
    function correctDeltaY(delta: number) {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) delta /= aspectRatio;
      return delta;
    }

    function updatePointerDownData(p: PointerState, id: number, posX: number, posY: number) {
      p.id = id;
      p.down = true;
      p.moved = false;
      p.texcoordX = posX / canvas.width;
      p.texcoordY = 1 - posY / canvas.height;
      p.prevTexcoordX = p.texcoordX;
      p.prevTexcoordY = p.texcoordY;
      p.deltaX = 0;
      p.deltaY = 0;
      const c = generateColor();
      p.color = [c.r, c.g, c.b];
    }

    function updatePointerMoveData(p: PointerState, posX: number, posY: number, color: [number, number, number]) {
      p.prevTexcoordX = p.texcoordX;
      p.prevTexcoordY = p.texcoordY;
      p.texcoordX = posX / canvas.width;
      p.texcoordY = 1 - posY / canvas.height;
      p.deltaX = correctDeltaX(p.texcoordX - p.prevTexcoordX);
      p.deltaY = correctDeltaY(p.texcoordY - p.prevTexcoordY);
      p.moved = Math.abs(p.deltaX) > 0 || Math.abs(p.deltaY) > 0;
      p.color = color;
    }

    function scaleByPixelRatio(input: number) {
      const ratio = Math.min(window.devicePixelRatio || 1, Math.max(config.current.PIXEL_RATIO_CAP, 0.5));
      return Math.floor(input * ratio);
    }

    function resizeCanvas() {
      const rect = contained ? root.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
      const width = scaleByPixelRatio(rect.width);
      const height = scaleByPixelRatio(rect.height);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
      }
      return false;
    }

    let lastUpdateTime = Date.now();
    let colorUpdateTimer = 0;

    function calcDeltaTime() {
      const now = Date.now();
      const dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
      lastUpdateTime = now;
      return dt;
    }

    function updateColors(dt: number) {
      colorUpdateTimer += dt * config.current.COLOR_UPDATE_SPEED;
      if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        const c = generateColor();
        pointer.color = [c.r, c.g, c.b];
      }
    }

    function applyInputs() {
      if (pointer.moved) {
        pointer.moved = false;
        splatPointer(pointer);
      }
    }

    function step(dt: number) {
      glc.disable(glc.BLEND);

      curlProgram.bind();
      glc.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      glc.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(curl);

      vorticityProgram.bind();
      glc.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      glc.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
      glc.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
      glc.uniform1f(vorticityProgram.uniforms.curl, config.current.CURL);
      glc.uniform1f(vorticityProgram.uniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      divergenceProgram.bind();
      glc.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      glc.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      clearProgram.bind();
      glc.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
      glc.uniform1f(clearProgram.uniforms.value, config.current.PRESSURE);
      blit(pressure.write);
      pressure.swap();

      pressureProgram.bind();
      glc.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      glc.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
      for (let i = 0; i < config.current.PRESSURE_ITERATIONS; i++) {
        glc.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      gradientSubtractProgram.bind();
      glc.uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      glc.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
      glc.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();

      advectionProgram.bind();
      glc.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (!supportLinearFiltering) glc.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      const velocityId = velocity.read.attach(0);
      glc.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
      glc.uniform1i(advectionProgram.uniforms.uSource, velocityId);
      glc.uniform1f(advectionProgram.uniforms.dt, dt);
      glc.uniform1f(advectionProgram.uniforms.dissipation, config.current.VELOCITY_DISSIPATION);
      blit(velocity.write);
      velocity.swap();

      if (!supportLinearFiltering) glc.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      glc.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
      glc.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
      glc.uniform1f(advectionProgram.uniforms.dissipation, config.current.DENSITY_DISSIPATION);
      blit(dye.write);
      dye.swap();
    }

    function drawDisplay(target: FBO | null) {
      const width = target == null ? glc.drawingBufferWidth : target.width;
      const height = target == null ? glc.drawingBufferHeight : target.height;
      displayMaterial.bind();
      if (config.current.SHADING) glc.uniform2f(displayMaterial.uniforms.texelSize, 1 / width, 1 / height);
      glc.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
      blit(target);
    }

    function render(target: FBO | null) {
      glc.blendFunc(glc.ONE, glc.ONE_MINUS_SRC_ALPHA);
      glc.enable(glc.BLEND);
      drawDisplay(target);
    }

    let lastInteractionAt = 0;

    function scheduleFrame() {
      if (!isActive || document.hidden || animationFrameId) return;
      animationFrameId = requestAnimationFrame(updateFrame);
    }

    function wake() {
      lastInteractionAt = performance.now();
      scheduleFrame();
    }

    function updateFrame(now: number) {
      animationFrameId = 0;
      if (!isActive || document.hidden) return;
      const dt = calcDeltaTime();
      if (resizeCanvas()) initFramebuffers();
      updateKeywords();
      updateColors(dt);
      applyInputs();
      step(dt);
      render(null);
      if (now - lastInteractionAt < config.current.IDLE_TIMEOUT_MS) scheduleFrame();
    }

    // Window-level tracking lets the contained canvas stay behind interactive
    // hero content. Pointer coordinates outside the canvas are ignored below.
    const target = window;

    function getOffset(clientX: number, clientY: number) {
      if (!contained) return { x: scaleByPixelRatio(clientX), y: scaleByPixelRatio(clientY) };
      const rect = root.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
      return { x: scaleByPixelRatio(clientX - rect.left), y: scaleByPixelRatio(clientY - rect.top) };
    }

    let firstMove = false;
    function handleMouseDown(e: Event) {
      const me = e as MouseEvent;
      const offset = getOffset(me.clientX, me.clientY);
      if (!offset) return;
      const { x, y } = offset;
      updatePointerDownData(pointer, -1, x, y);
      clickSplat(pointer);
      wake();
    }
    function handleMouseMove(e: Event) {
      const me = e as MouseEvent;
      const offset = getOffset(me.clientX, me.clientY);
      if (!offset) return;
      const { x, y } = offset;
      if (!firstMove) {
        const c = generateColor();
        updatePointerMoveData(pointer, x, y, [c.r, c.g, c.b]);
        firstMove = true;
      } else {
        updatePointerMoveData(pointer, x, y, pointer.color);
      }
      wake();
    }
    function handleTouchStart(e: Event) {
      const te = e as TouchEvent;
      for (const t of Array.from(te.targetTouches)) {
        const offset = getOffset(t.clientX, t.clientY);
        if (!offset) continue;
        const { x, y } = offset;
        updatePointerDownData(pointer, t.identifier, x, y);
        wake();
      }
    }
    function handleTouchMove(e: Event) {
      const te = e as TouchEvent;
      for (const t of Array.from(te.targetTouches)) {
        const offset = getOffset(t.clientX, t.clientY);
        if (!offset) continue;
        const { x, y } = offset;
        updatePointerMoveData(pointer, x, y, pointer.color);
        wake();
      }
    }
    function handleTouchEnd() {
      pointer.down = false;
    }

    target.addEventListener("mousedown", handleMouseDown as EventListener);
    target.addEventListener("mousemove", handleMouseMove as EventListener);
    target.addEventListener("touchstart", handleTouchStart as EventListener);
    target.addEventListener("touchmove", handleTouchMove as EventListener, { passive: false } as AddEventListenerOptions);
    target.addEventListener("touchend", handleTouchEnd);

    function handleVisibilityChange() {
      if (!document.hidden) return;
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Not in the upstream component. A WebGL context can be taken away at any
    // time — the GPU process restarts, the driver resets, another tab exhausts
    // GPU memory — and without this the render loop keeps issuing GL calls
    // against a dead context every frame forever.
    //
    // Stopping the loop is necessary but not sufficient. In non-contained
    // mode this canvas is `fixed inset-0 z-50` — the whole viewport, above
    // ordinary page content. A dead context left in the DOM does not just
    // stop animating; whatever the compositor was showing for that layer can
    // stay on screen, or repaint as a blank/broken frame, sitting over every
    // pixel of the real page underneath it. That reads as "the app is gone"
    // even though the DOM behind it is completely intact — which is exactly
    // why a fixed-position overlay that sits *above* this canvas (the
    // assistant launcher, at z-80) keeps working through it: it was never
    // covered, everything below z-50 was.
    //
    // There is no `webglcontextrestored` handler because there is nothing to
    // restore into: every buffer this component owns was already handed to
    // `initFramebuffers`/`initBlit`, and rebuilding them mid-flight is the
    // same amount of work as a fresh mount. So the loss is treated as
    // permanent — `preventDefault()` is skipped on purpose, which tells the
    // browser not to bother trying to hand the context back — and the canvas
    // is pulled out of the layout entirely rather than left transparent,
    // because "not drawing" and "not there" are different guarantees: the
    // first still depends on the compositor doing the right thing with a
    // dead layer, the second does not depend on anything.
    function handleContextLost() {
      isActive = false;
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
      canvas.style.display = "none";
    }

    canvas.addEventListener("webglcontextlost", handleContextLost);

    const ro = new ResizeObserver(() => {
      if (resizeCanvas()) initFramebuffers();
    });
    if (contained) ro.observe(root);

    return () => {
      isActive = false;
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      ro.disconnect();
      target.removeEventListener("mousedown", handleMouseDown as EventListener);
      target.removeEventListener("mousemove", handleMouseMove as EventListener);
      target.removeEventListener("touchstart", handleTouchStart as EventListener);
      target.removeEventListener("touchmove", handleTouchMove as EventListener);
      target.removeEventListener("touchend", handleTouchEnd);

      // React can reuse this exact canvas after an IntersectionObserver change
      // or a development Strict Mode effect replay. Losing its context here
      // would leave the reused element as a broken gray surface. Release every
      // owned resource explicitly so the live context remains reusable.
      dye.read.dispose();
      dye.write.dispose();
      velocity.read.dispose();
      velocity.write.dispose();
      divergence.dispose();
      curl.dispose();
      pressure.read.dispose();
      pressure.write.dispose();
      glc.deleteBuffer(vertexBuffer);
      glc.deleteBuffer(indexBuffer);
      programs.forEach((program) => glc.deleteProgram(program));
      shaders.forEach((shader) => glc.deleteShader(shader));
    };
  }, [contained, inView, reducedMotion, touch]);

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        viewRef.current = node;
      }}
      className={cn(
        "splash-cursor-container",
        // Input is tracked on window and filtered to this box, so the canvas
        // never competes with the real controls layered above it.
        contained ? "pointer-events-none absolute inset-0 z-[2] overflow-hidden" : "pointer-events-none fixed inset-0 z-50",
        className,
      )}
      aria-hidden
    >
      <canvas ref={canvasRef} className="splash-cursor-canvas block size-full" aria-hidden />
    </div>
  );
}

export default SplashCursor;
