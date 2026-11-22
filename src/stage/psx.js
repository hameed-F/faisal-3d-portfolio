import * as THREE from 'three';

// ---------------------------------------------------------------------------
// PS1-style look:
//  1) the scene renders into a small render target (e.g. 360 lines) and is
//     scaled up with nearest-neighbour filtering (chunky, sharp pixels)
//  2) vertices snap to that low-res pixel grid (the PS1 "wobble")
//  3) a post pass adds 15-bit colour + ordered (Bayer) dithering, film grain,
//     a vignette and a dusk colour grade
// ---------------------------------------------------------------------------

export const psxUniforms = {
  uSnapRes: { value: new THREE.Vector2(320, 240) },
  uSnap: { value: 1 },
};

/** Patch a built-in material so its vertices snap to the low-res grid. */
export function psxify(mat, key = '') {
  if (mat.userData.psx) return mat;
  mat.userData.psx = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => {
    prev?.(shader, r);
    shader.uniforms.uSnapRes = psxUniforms.uSnapRes;
    shader.uniforms.uSnap = psxUniforms.uSnap;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uSnapRes;\nuniform float uSnap;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        if (uSnap > 0.5) {
          vec4 sp = gl_Position;
          sp.xyz /= sp.w;
          sp.xy = floor(sp.xy * uSnapRes * 0.5 + 0.5) / (uSnapRes * 0.5);
          sp.xyz *= sp.w;
          gl_Position = sp;
        }`);
  };
  mat.customProgramCacheKey = () => 'psx' + key;
  return mat;
}

/** Lambert material with PS1 vertex snapping, flat shading by default. */
export function psxMat(opts = {}) {
  const { flat = true, ...rest } = opts;
  const m = new THREE.MeshLambertMaterial({ flatShading: flat, ...rest });
  if (m.map) { m.map.magFilter = THREE.NearestFilter; m.map.colorSpace = THREE.SRGBColorSpace; }
  return psxify(m);
}

const POST_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POST_FS = /* glsl */`
  precision highp float;
  uniform sampler2D tScene; uniform vec2 uLowRes; uniform float uTime; uniform float uGrain; uniform float uDither;
  uniform float uVignette; uniform vec3 uShadowTint; uniform vec3 uHighTint; uniform float uFade; uniform float uSilent;
  varying vec2 vUv;
  float bayer4(vec2 p){
    int x = int(mod(p.x, 4.0)); int y = int(mod(p.y, 4.0)); int i = x + y * 4;
    float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
    for (int k=0;k<16;k++){ if(k==i) return m[k]/16.0 - 0.5; } return 0.0;
  }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
  void main(){
    vec2 px = floor(vUv * uLowRes);
    vec3 c = texture2D(tScene, (px + 0.5) / uLowRes).rgb;
    c = pow(max(c, 0.0), vec3(1.0 / 2.2)); // linear -> display
    // dusk grade: tint shadows teal, highlights amber
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c * uShadowTint, c * uHighTint, smoothstep(0.15, 0.85, l));
    // 15-bit colour (5 bits per channel) with ordered dithering
    if (uDither > 0.5) { c += bayer4(px) / 31.0; c = floor(c * 31.0 + 0.5) / 31.0; }
    // film grain (per low-res pixel, changes every frame)
    c += (hash(px + fract(uTime) * 91.7) - 0.5) * uGrain;
    // vignette
    vec2 d = vUv - 0.5; c *= 1.0 - uVignette * dot(d, d) * 2.2;
    if (uSilent > 0.0) { // silent-film look: monochrome, warm paper tint, flicker, scratches, dust
      float l = dot(c, vec3(0.299, 0.587, 0.114)); l = pow(l, 0.92) * 1.08;
      float fl = 0.93 + 0.07 * hash(vec2(floor(uTime * 18.0), 3.1));
      vec3 m = vec3(l) * vec3(1.06, 1.0, 0.86) * fl;
      float sx = hash(vec2(floor(uTime * 9.0), 1.7)); float scratch = step(abs(vUv.x - sx), 0.0012) * step(0.8, hash(vec2(floor(uTime * 9.0), 8.2)));
      float dust = step(0.9985, hash(floor(vUv * vec2(320.0, 180.0)) + floor(uTime * 12.0)));
      m = mix(m, vec3(0.92), scratch * 0.7); m = mix(m, vec3(0.05), dust);
      c = mix(c, m, uSilent); c *= 1.0 - uSilent * 0.35 * dot(d, d) * 2.0;
    }
    c *= uFade;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`;

export class PsxRenderer {
  constructor(canvas, tier) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, depth: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, type: THREE.HalfFloatType });
    this.post = new THREE.ShaderMaterial({
      vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: this.rt.texture }, uLowRes: { value: new THREE.Vector2(4, 4) }, uTime: { value: 0 },
        uGrain: { value: 0.07 }, uDither: { value: 1 }, uVignette: { value: 0.32 },
        uShadowTint: { value: new THREE.Color(0.86, 0.98, 1.06) }, uHighTint: { value: new THREE.Color(1.06, 1.0, 0.9) }, uFade: { value: 1 }, uSilent: { value: 0 },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    this.quad.frustumCulled = false;
    this.postScene = new THREE.Scene(); this.postScene.add(this.quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.setTier(tier);
  }
  setTier(t) {
    this.tier = t;
    this.post.uniforms.uGrain.value = t.grain;
    this.post.uniforms.uDither.value = t.dither ? 1 : 0;
    psxUniforms.uSnap.value = t.snap ? 1 : 0;
    this.resize();
  }
  resize() {
    const w = window.innerWidth; const h = window.innerHeight;
    if (this.tier.native) { // sharp mode: render at the screen's real resolution with MSAA, 1:1 post pass
      const pr = Math.min(window.devicePixelRatio || 1, this.tier.maxPR || 2);
      this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
      const W = Math.round(w * pr); const H = Math.round(h * pr);
      this.rt.samples = this.tier.msaa || 0; this.rt.setSize(W, H);
      this.post.uniforms.uLowRes.value.set(W, H); psxUniforms.uSnapRes.value.set(W, H); this.aspect = w / h; return;
    }
    // Final canvas: cheap blit only, so a modest pixel ratio is enough
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(w, h, false);
    // Low-res buffer keeps the screen's aspect; height fixed by tier (lower on small portrait screens)
    const lowH = Math.round(Math.min(this.tier.renderH, h));
    const lowW = Math.max(1, Math.round(lowH * (w / h)));
    this.rt.setSize(lowW, lowH);
    this.post.uniforms.uLowRes.value.set(lowW, lowH);
    psxUniforms.uSnapRes.value.set(lowW, lowH);
    this.aspect = w / h;
  }
  render(scene, camera, time) {
    this.post.uniforms.uTime.value = time;
    const info = this.renderer.info; info.autoReset = false; info.reset();
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(scene, camera);
    this.stats = { calls: info.render.calls, triangles: info.render.triangles };
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCam);
  }
}
