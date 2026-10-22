import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PHRASES } from './phrases'

const COUNT = 2000
const CELLS = 16 // the atlas is a 16×16 grid of glyphs
const CELL = 96

// Letters from eight writing systems; each instance picks one.
const GLYPHS = Array.from(
  [
    'AaBbEeGgMmRrSsTt',
    'अआकखगजतदनपमयरलवसह',
    'ابتجدرسعفقلمنهوي',
    '語中日愛言文字話心道',
    'あいうかきさしたなカキサ',
    '한글말사랑',
    'ДЖЯФЩЮ',
    'ΩΣΔλπ',
    'กขคงจ',
    'אבגש',
    'অআকতম',
    'அகதம',
  ].join(''),
).slice(0, CELLS * CELLS)

function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  // No 2D canvas means no 3D either; the error boundary leaves the still image in place.
  if (!ctx) throw new Error('No 2D canvas')
  return ctx
}

function makeAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = CELLS * CELL
  const ctx = context(canvas)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${CELL * 0.62}px "Noto Sans Devanagari Variable", "Instrument Sans Variable", system-ui, sans-serif`
  GLYPHS.forEach((g, i) => {
    ctx.fillText(g, (i % CELLS) * CELL + CELL / 2, Math.floor(i / CELLS) * CELL + CELL / 2)
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  tex.anisotropy = 4
  return tex
}

/** Points on a sphere, evenly spread (Fibonacci lattice). */
function spherePoints(radius: number): Float32Array {
  const out = new Float32Array(COUNT * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const a = i * golden
    out.set([Math.cos(a) * r * radius, y * radius, Math.sin(a) * r * radius], i * 3)
  }
  return out
}

/**
 * Where each glyph goes to spell the phrase: the phrase is drawn on a hidden canvas and every glyph is
 * given one of its filled pixels, so the letters of many scripts together write it in one.
 */
function phrasePoints(text: string, font: string, width: number): Float32Array {
  const W = 640
  const H = 160
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = context(canvas)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 110
  do {
    ctx.font = `700 ${size}px ${font}`
    size -= 6
  } while (ctx.measureText(text).width > W * 0.94 && size > 30)
  ctx.direction = /[֐-ࣿ]/.test(text) ? 'rtl' : 'ltr'
  ctx.fillText(text, W / 2, H / 2)
  const data = ctx.getImageData(0, 0, W, H).data
  const filled: [number, number][] = []
  for (let y = 0; y < H; y += 3)
    for (let x = 0; x < W; x += 3) if ((data[(y * W + x) * 4 + 3] ?? 0) > 128) filled.push([x, y])
  const out = new Float32Array(COUNT * 3)
  const scale = width / W
  for (let i = 0; i < COUNT; i++) {
    const [x, y] = filled[Math.floor((i / COUNT) * filled.length)] ?? [W / 2, H / 2]
    // A little depth jitter keeps the word from looking like a flat sticker.
    out.set([(x - W / 2) * scale, -(y - H / 2) * scale, 1.2 + (Math.random() - 0.5) * 0.15], i * 3)
  }
  return out
}

const vertex = /* glsl */ `
  attribute vec3 aSphere;
  attribute vec3 aTarget;
  attribute float aGlyph;
  attribute float aSeed;
  uniform float uMorph;
  uniform float uTime;
  uniform float uSize;
  uniform mat4 uSpin;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDepth;
  varying float vMorph;

  void main() {
    // Each glyph leaves a little after the one before, so the change ripples through the sphere.
    float t = smoothstep(aSeed * 0.45, aSeed * 0.45 + 0.55, uMorph);
    vec3 sphere = (uSpin * vec4(aSphere, 1.0)).xyz;
    // Drift a little while on the sphere.
    sphere += normalize(aSphere) * sin(uTime * 1.3 + aSeed * 40.0) * 0.03;
    vec3 pos = mix(sphere, aTarget, t);
    // Swirl on the way, so the letters fly rather than slide.
    pos += vec3(sin(aSeed * 31.0), cos(aSeed * 17.0), sin(aSeed * 7.0)) * sin(t * 3.14159) * 0.6;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float size = uSize * mix(1.0, 0.55, t);
    mv.xy += position.xy * size; // billboard: always faces the camera
    gl_Position = projectionMatrix * mv;
    float cell = 1.0 / ${CELLS.toFixed(1)};
    vec2 origin = vec2(mod(aGlyph, ${CELLS.toFixed(1)}), floor(aGlyph / ${CELLS.toFixed(1)})) * cell;
    vUv = vec2(origin.x, 1.0 - origin.y - cell) + uv * cell;
    vSeed = aSeed;
    vDepth = sphere.z;
    vMorph = t;
  }
`

const fragment = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec3 uMarigold;
  uniform vec3 uPaper;
  uniform vec3 uIndigo;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDepth;
  varying float vMorph;

  void main() {
    float a = texture2D(uAtlas, vUv).a;
    if (a < 0.05) discard;
    vec3 color = vSeed < 0.55 ? uMarigold : vSeed < 0.85 ? uPaper : uIndigo;
    color = mix(color, uMarigold, vMorph * 0.7);
    // The far side of the sphere fades back; letters in the phrase are fully lit.
    float light = mix(smoothstep(-1.9, 1.6, vDepth) * 0.85 + 0.15, 1.0, vMorph);
    gl_FragColor = vec4(color * light, a * light);
  }
`

/** Builds the instanced glyphs once: one plane per glyph, one draw call for all of them. */
function build() {
  const plane = new THREE.PlaneGeometry(1, 1)
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.index = plane.index
  geometry.setAttribute('position', plane.getAttribute('position'))
  geometry.setAttribute('uv', plane.getAttribute('uv'))
  geometry.instanceCount = COUNT
  const glyph = new Float32Array(COUNT)
  const seed = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) {
    glyph[i] = Math.floor(Math.random() * GLYPHS.length)
    seed[i] = Math.random()
  }
  geometry.setAttribute('aSphere', new THREE.InstancedBufferAttribute(spherePoints(1.6), 3))
  geometry.setAttribute(
    'aTarget',
    new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3),
  )
  geometry.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(glyph, 1))
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uAtlas: { value: makeAtlas() },
      uMorph: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 0.085 },
      uSpin: { value: new THREE.Matrix4() },
      uMarigold: { value: new THREE.Color('#ffb43a') },
      uPaper: { value: new THREE.Color('#eeebe3') },
      uIndigo: { value: new THREE.Color('#7c8cff') },
    },
  })
  const targets = PHRASES.map((p) => phrasePoints(p.text, p.font, 3.4))
  return { geometry, material, targets }
}

type Built = ReturnType<typeof build>
const tiltX = new THREE.Matrix4()

function Glyphs({
  phrase,
  morph,
}: {
  phrase: React.RefObject<number>
  morph: React.RefObject<number>
}) {
  const { pointer } = useThree()
  const built = useMemo(() => build(), [])
  // Everything that changes per frame goes through this ref, the R3F way to animate without re-rendering.
  const scene = useRef<Built>(built)
  const tilt = useRef({ x: 0, y: 0, shown: -1 })

  useEffect(
    () => () => {
      built.geometry.dispose()
      built.material.dispose()
      ;(built.material.uniforms.uAtlas?.value as THREE.Texture | undefined)?.dispose()
    },
    [built],
  )

  useFrame((state, delta) => {
    const { geometry, material, targets } = scene.current
    const u = material.uniforms
    const k = tilt.current
    if (u.uTime) u.uTime.value = state.clock.elapsedTime
    if (u.uMorph) u.uMorph.value = morph.current
    // Swap the phrase only while every glyph is on the sphere, so nothing jumps.
    const target = targets[phrase.current]
    if (target && phrase.current !== k.shown && morph.current < 0.001) {
      const attr = geometry.getAttribute('aTarget') as THREE.InstancedBufferAttribute
      attr.set(target)
      attr.needsUpdate = true
      k.shown = phrase.current
    }
    const ease = Math.min(1, delta * 3)
    k.x += (pointer.y * 0.25 - k.x) * ease
    k.y += (pointer.x * 0.35 - k.y) * ease
    const spin = u.uSpin?.value as THREE.Matrix4 | undefined
    spin
      ?.makeRotationY(state.clock.elapsedTime * 0.12 + k.y)
      .premultiply(tiltX.makeRotationX(0.25 + k.x))
  })

  return <mesh geometry={built.geometry} material={built.material} frustumCulled={false} />
}

/**
 * The hero: a turning globe of glyphs that flies apart and spells one phrase in another language, then
 * re-forms. `phrase` and `morph` are driven by the page (a timeline), so the HTML caption stays in step.
 */
export default function GlyphGlobe({
  phrase,
  morph,
}: {
  phrase: React.RefObject<number>
  morph: React.RefObject<number>
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.2], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <Glyphs phrase={phrase} morph={morph} />
    </Canvas>
  )
}
