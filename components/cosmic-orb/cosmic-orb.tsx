"use client";

import { useEffect, useRef, type CSSProperties } from "react";

const DEFAULTS = {
    size: 320,
    archetype: "auto",
    background: "#05050F",
    palette: {
        anchor: "#6A3CFF",
        colorA: "#3CE0FF",
        colorB: "#A24BFF",
        colorC: "#FF5EA8",
    },
    speed: 50,
    spin: 50,
    lens: true,
    lensAmount: 45,
};

const MAX_DPR = 2;
const MAX_PX = 1280;

const ARCHETYPES = ["spiral", "nebula", "core", "deep"];

interface Palette {
    anchor: string;
    colorA: string;
    colorB: string;
    colorC: string;
}

interface OrbProps {
    size?: number;
    archetype?: "auto" | "spiral" | "nebula" | "core" | "deep";
    background?: string;
    palette?: Palette;
    speed?: number;
    spin?: number;
    lens?: boolean;
    lensAmount?: number;
    style?: CSSProperties;
    [key: string]: any;
}

function toRGB(color: string): [number, number, number] {
    const value = (color ?? "").trim();
    if (value.startsWith("#")) {
        let hex = value.slice(1);
        if (hex.length === 3)
            hex = hex
                .split("")
                .map((c) => c + c)
                .join("");
        const n = parseInt(hex.slice(0, 6), 16);
        return [
            ((n >> 16) & 255) / 255,
            ((n >> 8) & 255) / 255,
            (n & 255) / 255,
        ];
    }
    const m = value.match(/rgba?\(([^)]+)\)/i);
    if (m) {
        const p = m[1].split(",").map((s) => parseFloat(s));
        return [(p[0] || 0) / 255, (p[1] || 0) / 255, (p[2] || 0) / 255];
    }
    return [1, 1, 1];
}

const PHASE = 17.317;

const vertexShaderSrc = `
attribute vec2 aPos;
attribute vec2 aUV;
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const shaderBody = `
float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
vec4 starfield(vec3 n, float t) {
  float lon = atan(n.z, n.x);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float v1 = fract(uPhase * 7.13);
  float v2 = fract(uPhase * 3.71);
  float v3 = fract(uPhase * 5.37);
  float at = uArch >= 0.0 ? uArch : floor(fract(uPhase * 9.73) * 4.0);
  float isNeb = step(0.5, at) * (1.0 - step(1.5, at));
  float isCore = step(1.5, at) * (1.0 - step(2.5, at));
  float isDeep = step(2.5, at);
  float gb = lat + (0.15 + 0.4 * v1) * sin(lon * (1.0 + floor(v2 * 2.0)) + 1.3)
           + 0.12 * sin(lon * 3.0 + t * 0.1);
  float band = exp(-gb * gb * (5.0 + 10.0 * v3));
  band = mix(band, max(band, 0.8), isNeb);
  band *= 1.0 - 0.85 * isDeep;
  float n1 = sin(lon * 2.0 + sin(lat * 3.0 + t * 0.25) * 1.6 + t * 0.15);
  float n2 = sin(lon * 5.0 - sin(lat * 4.0 - t * 0.2) * 1.2 - t * 0.22 + 2.4);
  float neb = pow(0.5 + 0.5 * n1, 2.0) * (0.45 + 0.55 * pow(0.5 + 0.5 * n2, 2.0));
  float lane = pow(0.5 + 0.5 * sin(lon * 4.0 + lat * 7.0 + sin(lon * 2.0) * 2.0), 3.0);
  float galaxy = band * neb * (1.0 - lane * (0.55 + 0.35 * v2));
  galaxy = clamp(galaxy, 0.0, 1.0);
  vec3 hue = mix(mix(uC0, uC1, v1), mix(uC1, uC2, v3), 0.5 + 0.5 * sin(lon + lat * 2.0 - t * 0.2));
  vec3 hueGrey = vec3(dot(hue, vec3(0.299, 0.587, 0.114)));
  hue = clamp(hueGrey + (hue - hueGrey) * 1.45, 0.0, 1.0);
  vec3 dust = mix(vec3(0.72, 0.78, 0.92), hue, 0.45 + 0.3 * v1 + 0.45 * isNeb);
  vec3 col = dust * galaxy * (0.6 + 0.9 * isNeb);
  float shear = sin(lon * 13.0 + lat * 4.0 - t * 0.35) * sin(lon * 5.0 + t * 0.2);
  col += dust * band * neb * max(shear, 0.0) * 0.14;
  float gb2 = lat - (0.35 + 0.25 * v2) * sin(lon * 2.0 - 1.1) + 0.4;
  float arm = exp(-gb2 * gb2 * 7.0) * neb;
  col += mix(dust, uC1, 0.35) * arm * 0.2;
  vec3 voidGlow = mix(vec3(0.04, 0.03, 0.1), mix(uC0, mix(uC1, uC2, v3), v1) * 0.22, 0.75);
  col += voidGlow * (0.5 + 0.22 * sin(t * 0.4 + lon)) * (0.4 + 0.6 * band);
  col += vec3(1.0, 0.88, 0.68) * pow(band, 4.0) * pow(neb, 2.0) * 0.4;
  float ca = v2 * 6.28318;
  vec3 Cdir = normalize(vec3(cos(ca) * 0.85, 0.6 * (v3 - 0.5), sin(ca) * 0.85));
  float bulge = max(dot(n, Cdir), 0.0);
  col += mix(vec3(1.0, 0.85, 0.6), uC2, 0.25) * (pow(bulge, 14.0) * 1.6 + pow(bulge, 4.0) * 0.5) * isCore;
  float pocket = pow(neb, 5.0) * band * (0.7 + 0.3 * sin(t * 0.6 + lon * 3.0));
  col += mix(uC2, uC0, fract(v1 + 0.5 * sin(lon * 2.0) + 0.5)) * pocket * (0.5 + 0.4 * v2 + 0.8 * isNeb);
  float pocket2 = pow(0.5 + 0.5 * sin(lon * 3.0 + lat * 4.0 - t * 0.18 + 2.0), 6.0) * band;
  col += mix(uC1, uC2, v3) * pocket2 * (0.25 + 0.3 * v1 + 0.5 * isNeb);
  float detail = smoothstep(90.0, 200.0, uRes.y);
  vec2 gg = vec2(lon, lat) * 34.0;
  vec2 gc = floor(gg);
  vec2 gf = fract(gg);
  float gh = h1(gc.x * 3.7 + gc.y * 11.3);
  vec2 gp = vec2(0.2 + 0.6 * h1(gh * 91.0), 0.2 + 0.6 * h1(gh * 47.0));
  float gd = length((gf - gp) * vec2(cos(lat), 1.0));
  float grain = exp(-gd * gd * 700.0 * clamp(uRes.y / 420.0, 0.22, 1.0)) * step(0.3, gh) * (0.15 + 0.85 * band);
  col += vec3(0.88, 0.9, 1.0) * grain * 0.4 * detail;
  float w = clamp(galaxy * 0.7 + pow(band, 4.0) * 0.25, 0.0, 1.0);
  for (int s = 0; s < 3; s++) {
    float K = s == 0 ? 6.0 : (s == 1 ? 11.0 : 19.0);
    vec2 g = vec2(lon, lat) * K;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float hx = h1(cell.x * 13.7 + cell.y * 7.3 + float(s) * 91.0);
    float hy = h1(cell.x * 5.1 + cell.y * 17.9 + float(s) * 37.0);
    vec2 sp = vec2(0.15 + 0.7 * hx, 0.15 + 0.7 * hy);
    float d = length((f - sp) * vec2(cos(lat), 1.0));
    float census = (v2 - 0.5) * 0.2 + 0.35 * isNeb - 0.2 * isCore + 0.3 * isDeep;
    float keep = step((s == 2 ? 0.3 : 0.55) + census, h1(hx * 89.0 + hy * 31.0) + band * 0.25);
    float resFac = clamp(uRes.y / 420.0, 0.22, 1.0);
    float tw = mix(0.92, 0.6 + 0.4 * sin(t * (1.5 + 3.0 * hx) + hx * 40.0), resFac);
    float hz = h1(hx * 53.0 + hy * 71.0 + cell.x);
    float sizeJit = 0.35 + 1.8 * hz * hz;
    float sharp = (s == 0 ? 260.0 : (s == 1 ? 700.0 : 1600.0)) / sizeJit * resFac;
    float star = exp(-d * d * sharp) * keep * tw;
    vec3 tint = mix(vec3(1.0), hx < 0.33 ? vec3(0.85, 0.9, 1.0) : (hx < 0.66 ? vec3(1.0, 0.95, 0.85) : mix(vec3(1.0), uC1, 0.3)), 0.6);
    float bright = (s == 0 ? 1.7 : (s == 1 ? 0.9 : 0.5)) * (0.55 + 0.7 * sizeJit);
    float starFade = mix(s == 2 ? 0.14 : 0.45, 1.0, detail);
    col += tint * star * bright * starFade;
    if (s == 0) {
      float big = smoothstep(1.2, 2.0, sizeJit);
      col += tint * exp(-d * d * 60.0) * 0.18 * big * tw * starFade;
      vec2 dd = (f - sp) * vec2(cos(lat), 1.0);
      float spike = exp(-dd.x * dd.x * 1200.0) * exp(-dd.y * dd.y * 26.0)
                  + exp(-dd.y * dd.y * 1200.0) * exp(-dd.x * dd.x * 26.0);
      col += tint * spike * 0.3 * big * tw * starFade;
      w = max(w, spike * 0.3 * big * starFade);
    }
    w = max(w, star * min(bright, 1.5) * starFade);
  }
  float pa = v1 * 6.28318;
  vec3 P = normalize(vec3(sin(pa) * 0.9, 1.4 * (v2 - 0.5), cos(pa) * 0.9));
  float pd = max(dot(n, P), 0.0);
  float beat = pow(0.5 + 0.5 * sin(t * (1.2 + v3 + 1.5 * uAudio) + v3 * 6.28), 8.0);
  beat = min(1.0, beat + 0.6 * uAudio);
  float pulsarFade = mix(0.45, 1.0, detail);
  col += vec3(0.9, 0.95, 1.0) * (pow(pd, 900.0) * (0.6 + 1.2 * beat) + pow(pd, 110.0) * 0.5 * beat) * pulsarFade;
  w = max(w, pow(pd, 900.0) * (0.5 + 0.5 * beat) * pulsarFade);
  return vec4(min(col, vec3(1.0)), min(w, 1.0));
}
vec4 sphereAt(vec3 n, float spin, float t) {
  float roll = t * 0.13;
  float cr = cos(roll), sr = sin(roll);
  n = vec3(cr * n.x - sr * n.y, sr * n.x + cr * n.y, n.z);
  float tilt = 0.45 + 0.35 * sin(t * 0.24);
  float cx = cos(tilt), sx = sin(tilt);
  n = vec3(n.x, cx * n.y - sx * n.z, sx * n.y + cx * n.z);
  float cs = cos(spin), ss = sin(spin);
  n = vec3(cs * n.x + ss * n.z, n.y, -ss * n.x + cs * n.z);
  return starfield(n, t);
}
vec3 shade(vec2 p) {
  float r = length(p);
#ifndef DUAL_LAYER
  if (r > 1.0) { discard; }
#endif
  float t = uTime * 0.8 + uPhase;
  float rr = min(r, 0.9995);
  float z = sqrt(1.0 - rr * rr);
  vec3 N = vec3(p.x, p.y, z);
  float fres = pow(1.0 - z, 2.4);
  vec3 I = vec3(0.0, 0.0, -1.0);
  vec3 R = refract(I, N, 0.75);
  float dHit = -2.0 * dot(N, R);
  vec3 B = normalize(N + R * dHit);
  float sv = fract(uPhase * 6.31);
  float sw = fract(uPhase * 2.17);
  float tWarp = t
    + (0.9 + 1.3 * sv) * sin(t * (0.09 + 0.07 * sw))
    + (0.5 + 0.8 * sw) * sin(t * (0.21 + 0.09 * sv) + 2.6);
  vec4 front = sphereAt(N, uSpin, tWarp);
#ifdef DUAL_LAYER
  vec4 back = sphereAt(B, uSpin, tWarp * 0.8 + 2.7);
#else
  vec4 back = vec4(0.0);
#endif
  vec3 voidCol = mix(uAnchor * 0.04, uAnchor * 0.35, fres);
  vec3 col = mix(uBg, voidCol, 0.97 - 0.04 * fres);
  float fa = clamp(front.a, 0.0, 1.0);
  float ba = clamp(back.a, 0.0, 1.0);
  col = mix(col, back.rgb, ba * 0.16);
  col = mix(col, front.rgb, fa * 0.85);
  {
    float alon = atan(N.x, N.z);
    float speech = pow(0.5 + 0.5 * sin(alon * 3.0 + sin(alon * 7.0 + t * 1.1) * 0.7 + t * 0.5), 3.0)
                 * (0.55 + 0.45 * sin(alon * 5.0 - t * 0.65 + 1.7));
    float sky = -N.y;
    float hang = smoothstep(-0.15, 0.5, sky);
    float rays = 0.7 + 0.3 * sin(alon * 24.0 + sin(alon * 9.0 - t * 0.8) * 2.0 + t * 1.6);
    float aur = clamp(speech, 0.0, 1.0) * hang * rays * (1.0 + 2.2 * uAudio);
    float av = fract(uPhase * 2.93);
    vec3 aurCol = mix(vec3(0.12, 0.95, 0.55), vec3(0.45, 0.35, 1.0),
                      smoothstep(0.0, 0.95, sky + 0.35 * speech));
    aurCol = mix(aurCol, mix(uC0, uC2, av), 0.15 + 0.4 * av);
    col += aurCol * aur * 0.8;
    float met = 4.5 + 3.5 * fract(uPhase * 4.91);
    float epoch = floor(t / met);
    float ph = fract(t / met);
    vec2 s0 = vec2(-1.1 + 2.2 * h1(epoch * 1.3), 0.85 - 1.4 * h1(epoch * 2.9));
    vec2 sd = normalize(vec2(0.7 + 0.5 * h1(epoch * 4.1), -0.35 - 0.4 * h1(epoch * 5.3)));
    vec2 head = s0 + sd * ph * 2.8;
    vec2 rel = p - head;
    float along = dot(rel, sd);
    float perp = dot(rel, vec2(-sd.y, sd.x));
    float vis = smoothstep(0.0, 0.06, ph) * smoothstep(0.5, 0.32, ph);
    float tail = exp(-perp * perp * 1600.0) * exp(along * 9.0) * step(along, 0.0)
               * smoothstep(-0.5, -0.02, along);
    float headGlow = exp(-dot(rel, rel) * 900.0);
    col += (vec3(1.0) * headGlow * 1.2 + mix(vec3(1.0), uC1, 0.3) * tail * 0.85) * vis;
    vec3 LD = normalize(vec3(0.85 * sin(t * 0.42), 0.45 * sin(t * 0.26 + 1.2), 0.5));
    float diffuse = 0.62 + 0.65 * max(dot(N, LD), 0.0);
    diffuse *= 1.0 + 0.35 * uAudio;
    col *= diffuse;
    vec3 voiceCol = mix(uC1, vec3(1.0, 0.97, 0.9), 0.45);
    col += voiceCol * pow(1.0 - rr, 1.8) * uAudio * 0.5;
    col += (uC1 * 0.7 + vec3(0.12)) * fres * uAudio * 0.65;
    col += col * uAudio * 0.18 * sin(t * 14.0 + rr * 40.0 + uPhase * 7.0);
    float counter = max(dot(N.xy, -LD.xy), 0.0) * fres;
    col += mix(uC0, vec3(0.5, 0.6, 0.9), 0.5) * counter * 0.18;
  }
  vec3 L1 = normalize(vec3(-0.45 + 0.3 * sin(t * 0.34), 0.62 + 0.2 * sin(t * 0.27 + 1.7), 0.64));
  float keyAmp = 0.5 * (0.78 + 0.22 * sin(t * 0.45 + 2.2));
  col += vec3(1.0) * pow(max(dot(N, L1), 0.0), 150.0) * keyAmp;
  vec3 LS = normalize(vec3(sin(t * 0.07) * 0.9, 0.35 + 0.3 * cos(t * 0.05), 0.7));
  col += vec3(1.0) * pow(max(dot(N, LS), 0.0), 7.0) * 0.05;
  vec3 L2 = normalize(vec3(0.52, -0.5 + 0.12 * sin(t * 0.09), 0.69));
  col += vec3(1.0) * pow(max(dot(N, L2), 0.0), 140.0) * 0.25;
  col = mix(col, front.rgb, fa * fres * 0.3);
  float limb = smoothstep(0.94, 1.0, rr);
  col = mix(col, col * 0.85, limb * 0.4);
  return col;
}`;

const fragmentShaderSrc =
    `
precision highp float;
#define DUAL_LAYER
varying vec2 vUV;
uniform vec2 uRes;
uniform vec3 uBg;
uniform vec3 uAnchor, uC0, uC1, uC2;
uniform float uTime, uPhase;
uniform float uAudio;
uniform float uSpin;
uniform float uArch;
uniform float uLens;
` +
    shaderBody +
    `
void main() {
  vec2 p = vUV * 2.0 - 1.0;
  if (uLens > 0.0) {
    float r = length(p);
    float ex = exp(2.0 * 1.7724539 * (r - 0.9) / 0.1414214);
    float fall = 0.5 + 0.5 * (ex - 1.0) / (ex + 1.0);
    if (fall > 0.004) {
      float swell = 1.0 + 0.16 * (0.6 * sin(uTime * 0.9 + uPhase)
                                + 0.4 * sin(uTime * 1.7 + uPhase * 1.3));
      float k = uLens * fall * swell;
      float cR = 1.4 * (1.0 + 0.06 * sin(uTime * 1.3 + uPhase));
      float cG = 1.2 * (1.0 + 0.06 * sin(uTime * 1.3 + uPhase + 2.1));
      float cB = 1.0 * (1.0 + 0.06 * sin(uTime * 1.3 + uPhase + 4.2));
      vec3 col = vec3(shade(p * (1.0 - k * cR)).r,
                      shade(p * (1.0 - k * cG)).g,
                      shade(p * (1.0 - k * cB)).b);
      vec2 a2 = min(abs(p), 1.0);
      float lobe = max(abs(a2.x * 0.766 + a2.y * 0.643), abs(a2.x * 0.766 - a2.y * 0.643));
      float glow = 0.65 * pow(clamp((lobe - 0.0707) / 1.3435, 0.0, 1.0), 2.4) * fall;
      glow += 1.02 * clamp(1.0 + (r - 1.0) / 0.15, 0.0, 1.0) * step(r, 1.0) * pow(lobe, 2.0);
      col += vec3(0.25) * min(glow, 1.0);
      gl_FragColor = vec4(col, 1.0);
      return;
    }
  }
  gl_FragColor = vec4(shade(p), 1.0);
}`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
    console.error("[Orb] shader compile failed:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
}

const UNIFORM_NAMES = [
    "uRes",
    "uBg",
    "uAnchor",
    "uC0",
    "uC1",
    "uC2",
    "uTime",
    "uPhase",
    "uAudio",
    "uSpin",
    "uArch",
    "uLens",
];

export default function Orb(props: OrbProps) {
    const {
        size = DEFAULTS.size,
        archetype = DEFAULTS.archetype,
        background = DEFAULTS.background,
        palette = DEFAULTS.palette,
        speed = DEFAULTS.speed,
        spin = DEFAULTS.spin,
        lens = DEFAULTS.lens,
        lensAmount = DEFAULTS.lensAmount,
        ...rest
    } = props;

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const cfgRef = useRef<any>(null);
    cfgRef.current = {
        bg: toRGB(background),
        anchor: toRGB(palette?.anchor ?? DEFAULTS.palette.anchor),
        c0: toRGB(palette?.colorA ?? DEFAULTS.palette.colorA),
        c1: toRGB(palette?.colorB ?? DEFAULTS.palette.colorB),
        c2: toRGB(palette?.colorC ?? DEFAULTS.palette.colorC),
        speed: Math.max(0, speed) / 50,
        spin: Math.max(0, spin) / 50,
        audio: 0,
        arch: archetype === "auto" ? -1 : ARCHETYPES.indexOf(archetype),
        lens: lens ? (Math.max(0, lensAmount) / 100) * 0.2 : 0,
        phase: PHASE,
    };

    useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return;

        const gl = canvas.getContext("webgl", {
            premultipliedAlpha: true,
            alpha: true,
            antialias: true,
        }) as WebGLRenderingContext | null;
        if (!gl) return;

        let prog: WebGLProgram | null = null;
        let u: Record<string, WebGLUniformLocation | null> = {};
        let ready = false;

        const init = () => {
            const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
            const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
            if (!vs || !fs) return;
            const p = gl.createProgram();
            if (!p) return;
            gl.attachShader(p, vs);
            gl.attachShader(p, fs);
            gl.bindAttribLocation(p, 0, "aPos");
            gl.bindAttribLocation(p, 1, "aUV");
            gl.linkProgram(p);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
                console.error("[Orb] link failed:", gl.getProgramInfoLog(p));
                return;
            }
            prog = p;
            u = {};
            for (const name of UNIFORM_NAMES)
                u[name] = gl.getUniformLocation(p, name);

            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([
                    -1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0,
                ]),
                gl.STATIC_DRAW
            );
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            ready = true;
        };

        const onLost = (e: Event) => {
            e.preventDefault();
            ready = false;
        };
        const onRestored = () => init();
        canvas.addEventListener("webglcontextlost", onLost);
        canvas.addEventListener("webglcontextrestored", onRestored);
        init();

        const resize = () => {
            const side = Math.max(
                1,
                Math.min(wrap.clientWidth, wrap.clientHeight)
            );
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
            const px = Math.min(Math.round(side * dpr), MAX_PX);
            if (canvas.width !== px || canvas.height !== px) {
                canvas.width = px;
                canvas.height = px;
            }
        };
        const ro = new ResizeObserver(resize);
        ro.observe(wrap);
        resize();

        const body = {
            spin: 0,
            spinVel: 0,
            spinDir: 1,
            oscSign: 1,
            flipQueued: false,
            audioSmooth: 0,
            audioFast: 0,
            prevA: 0,
            lastT: null as number | null,
        };

        const advance = (tNow: number, cfg: any) => {
            const dt =
                body.lastT === null
                    ? 0
                    : Math.min(0.1, Math.max(0, tNow - body.lastT));
            body.lastT = tNow;

            const target = cfg.audio;
            const slowTau = target > body.audioSmooth ? 0.11 : 0.3;
            body.audioSmooth +=
                (target - body.audioSmooth) *
                (dt > 0 ? 1 - Math.exp(-dt / slowTau) : 0);
            const fastTau = target > body.audioFast ? 0.04 : 0.18;
            body.audioFast +=
                (target - body.audioFast) *
                (dt > 0 ? 1 - Math.exp(-dt / fastTau) : 0);

            const o = (6.31 * cfg.phase) % 1;
            const s =
                0.35 *
                Math.sin(
                    tNow * (0.11 + 0.08 * ((2.17 * cfg.phase) % 1)) + cfg.phase
                );
            const a = body.audioFast;
            const d = Math.sin(tNow * (0.45 + 0.2 * o) + cfg.phase);
            if (Math.sign(d) !== body.oscSign) {
                body.oscSign = Math.sign(d);
                body.flipQueued = true;
            }
            if (body.flipQueued && a < 0.18) {
                body.spinDir = -body.spinDir;
                body.flipQueued = false;
            }
            const targetVel =
                (0.65 * (0.65 + 0.7 * o) * (1 + s) + body.spinDir * a * 2.2) *
                cfg.spin;
            body.spinVel +=
                (targetVel - body.spinVel) *
                (dt > 0 ? 1 - Math.exp(-dt / 0.35) : 0);
            const burst = Math.max(0, a - body.prevA);
            body.prevA = a;
            body.spinVel += body.spinDir * Math.min(6 * burst, 1.4) * dt * 14;
            body.spin += body.spinVel * dt;
        };

        const start = performance.now();
        let raf = 0;
        const tick = () => {
            raf = requestAnimationFrame(tick);
            if (!ready || !prog) return;
            const cfg = cfgRef.current;
            const tNow = ((performance.now() - start) / 1000) * cfg.speed;
            advance(tNow, cfg);

            gl.useProgram(prog);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(u.uRes, canvas.width, canvas.height);
            gl.uniform3f(u.uBg, cfg.bg[0], cfg.bg[1], cfg.bg[2]);
            gl.uniform3f(u.uAnchor, cfg.anchor[0], cfg.anchor[1], cfg.anchor[2]);
            gl.uniform3f(u.uC0, cfg.c0[0], cfg.c0[1], cfg.c0[2]);
            gl.uniform3f(u.uC1, cfg.c1[0], cfg.c1[1], cfg.c1[2]);
            gl.uniform3f(u.uC2, cfg.c2[0], cfg.c2[1], cfg.c2[2]);
            gl.uniform1f(u.uTime, tNow);
            gl.uniform1f(u.uPhase, cfg.phase);
            gl.uniform1f(u.uArch, cfg.arch);
            gl.uniform1f(u.uLens, cfg.lens);
            gl.uniform1f(u.uAudio, body.audioSmooth);
            gl.uniform1f(u.uSpin, body.spin);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            canvas.removeEventListener("webglcontextlost", onLost);
            canvas.removeEventListener("webglcontextrestored", onRestored);
        };
    }, []);

    return (
        <div
            {...rest}
            style={{
                ...rest.style,
                position: "relative",
                width: rest.style?.width ?? size,
                height: rest.style?.height ?? size,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                ref={wrapRef}
                style={{
                    position: "relative",
                    width: size,
                    height: size,
                    flex: "0 0 auto",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    aspectRatio: "1 / 1",
                    boxSizing: "border-box",
                    borderRadius: "50%",
                    overflow: "hidden",
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                    }}
                />
            </div>
        </div>
    );
}