// LoadingScreen.jsx
// npm install three
// Add keyframes below to your index.css

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────
   Simplex Noise GLSL (injected into shader)
───────────────────────────────────────── */
const NOISE_GLSL = `
vec3 _m3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 _m4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 _pm(vec4 x){return _m4(((x*34.)+1.)*x);}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;vec3 i1=min(g,l.zxy);vec3 i2=max(g,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-.5;
  i=_m3(i);
  vec4 p=_pm(_pm(_pm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  vec4 j=p-49.*floor(p*(1./7.))*(1./7.);
  vec4 x_=floor(j*(1./7.));vec4 y_=floor(j-7.*x_);
  vec4 xn=(x_*2.+.5)/7.-1.;vec4 yn=(y_*2.+.5)/7.-1.;
  vec4 h=1.-abs(xn)-abs(yn);
  vec4 b0=vec4(xn.xy,yn.xy);vec4 b1=vec4(xn.zw,yn.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=1.79284291400159-.85373472095314*vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/* ─────────────────────────────────────────
   Step Config
───────────────────────────────────────── */
const STEPS = [
  "Initializing engine",
  "Loading assets",
  "Compiling shaders",
  "Syncing modules",
  "Launching UI",
];

/* ─────────────────────────────────────────
   Three.js Scene Hook
───────────────────────────────────────── */
function useThreeScene(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    camera.position.set(0, 0, 5.5);

    // Star field
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(6000 * 3);
    for (let i = 0; i < starPos.length; i++)
      starPos[i] = (Math.random() - 0.5) * 200;
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.13,
          sizeAttenuation: true,
        }),
      ),
    );

    // Distorted core sphere
    const sphereGeo = new THREE.SphereGeometry(1, 128, 128);
    const sphereMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color("#6366f1") },
        uColor2: { value: new THREE.Color("#06b6d4") },
        uColor3: { value: new THREE.Color("#f472b6") },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal; varying vec3 vPos;
        ${NOISE_GLSL}
        void main() {
          vNormal = normal;
          vec3 p = position;
          float n = snoise(p * 1.2 + uTime * 0.4) * 0.28
                  + snoise(p * 2.5 + uTime * 0.6) * 0.12;
          p += normal * n;
          vPos = p;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
        }`,
      fragmentShader: `
        uniform vec3 uColor1, uColor2, uColor3;
        uniform float uTime;
        varying vec3 vNormal, vPos;
        void main() {
          vec3 light = normalize(vec3(2., 3., 4.));
          float d = max(dot(normalize(vNormal), light), 0.05);
          float t = clamp((vPos.y + 1.4) / 2.8, 0., 1.);
          float s = clamp((sin(uTime * 0.7) + 1.) / 2., 0., 1.);
          vec3 col = mix(mix(uColor1, uColor2, t), uColor3, s * 0.35) * d;
          col += vec3(.05, .03, .15) * (1. - d);
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // Wireframe icosahedron
    const ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.9, 1),
      new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      }),
    );
    scene.add(ico);

    // Torus rings
    const t1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.012, 8, 100),
      new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      }),
    );
    t1.rotation.x = Math.PI / 2.8;
    scene.add(t1);

    const t2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.01, 8, 120),
      new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.12,
      }),
    );
    t2.rotation.x = Math.PI / 1.6;
    t2.rotation.y = Math.PI / 4;
    scene.add(t2);

    // Floating particles
    const pCount = 180;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pBase = new Float32Array(pCount * 3);
    const pPhase = new Float32Array(pCount);
    for (let i = 0; i < pCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 1.2;
      pBase[i * 3] = pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pBase[i * 3 + 1] = pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pBase[i * 3 + 2] = pPos[i * 3 + 2] = r * Math.cos(phi);
      pPhase[i] = Math.random() * Math.PI * 2;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMesh = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: 0x818cf8,
        size: 0.06,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
      }),
    );
    scene.add(pMesh);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pt1 = new THREE.PointLight(0x6366f1, 4, 12);
    pt1.position.set(-3, 2, 3);
    scene.add(pt1);
    const pt2 = new THREE.PointLight(0x06b6d4, 3, 12);
    pt2.position.set(3, -2, 2);
    scene.add(pt2);

    // Mouse parallax
    let mx = 0,
      my = 0;
    const onMouse = (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      sphereMat.uniforms.uTime.value = t;
      sphere.rotation.y = t * 0.15 + mx * 0.2;
      sphere.rotation.x = t * 0.08 + my * 0.15;
      ico.rotation.y = t * 0.12;
      ico.rotation.x = t * 0.07;
      t1.rotation.z = t * 0.25;
      t2.rotation.z = -t * 0.18;
      t2.rotation.x = Math.PI / 1.6 + Math.sin(t * 0.3) * 0.2;

      const pa = pGeo.attributes.position.array;
      for (let i = 0; i < pCount; i++) {
        const ph = pPhase[i] + t * 0.4;
        pa[i * 3] = pBase[i * 3] + Math.sin(ph) * 0.08;
        pa[i * 3 + 1] = pBase[i * 3 + 1] + Math.cos(ph * 1.3) * 0.08;
        pa[i * 3 + 2] = pBase[i * 3 + 2] + Math.sin(ph * 0.8) * 0.06;
      }
      pGeo.attributes.position.needsUpdate = true;

      camera.position.x += (mx * 0.35 - camera.position.x) * 0.04;
      camera.position.y += (-my * 0.25 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      scene.rotation.y = t * 0.015;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);
}

/* ─────────────────────────────────────────
   LoadingScreen Component
───────────────────────────────────────── */
export default function LoadingScreen({ onDone }) {
  const canvasRef = useRef(null);
  useThreeScene(canvasRef);

  const [pct, setPct] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [digits, setDigits] = useState("000");

  // Progress milestones
  useEffect(() => {
    const milestones = [0, 18, 42, 67, 83, 100];
    const delays = [0, 600, 1100, 1800, 2700, 3800];
    const timers = milestones.map((target, i) =>
      setTimeout(() => {
        setPct(target);
        if (i < STEPS.length) setStepIdx(i);
      }, delays[i]),
    );
    const doneTimer = setTimeout(() => setDone(true), 4400);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
  }, []);

  // Animated digit counter
  useEffect(() => {
    let current = 0;
    const target = pct;
    const tick = () => {
      if (current < target) {
        current = Math.min(
          current + Math.ceil((target - current) * 0.12 + 1),
          target,
        );
        setDigits(String(current).padStart(3, "0"));
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, [pct]);

  const handleEnter = () => {
    setFadeOut(true);
    setTimeout(() => onDone?.(), 650);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden ${fadeOut ? "animate-fade-out" : "animate-fade-in"}`}
      style={{ background: "#020617" }}
    >
      {/* Backgrounds */}
      <div className="grid-bg" />
      <div className="radial-vignette" />

      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />

      {/* Scanline overlay */}
      <div className="fixed inset-0 z-10 overflow-hidden pointer-events-none scanline-overlay">
        <div className="scanline" />
      </div>

      {/* Main Content */}
      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center">
        {/* Orbital Rig */}
        <div
          className="relative flex items-center justify-center mb-10 anim-float"
          style={{ width: 220, height: 220 }}
        >
          {/* Pulse rings */}
          {[90, 120, 155].map((size, i) => (
            <div
              key={i}
              className="ring"
              style={{
                width: size,
                height: size,
                top: "50%",
                left: "50%",
                borderColor: [
                  "rgba(99,102,241,0.35)",
                  "rgba(6,182,212,0.2)",
                  "rgba(244,114,182,0.15)",
                ][i],
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${2.4 + i * 0.5}s`,
              }}
            />
          ))}
          {/* Core glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-full anim-core-glow"
            style={{
              width: 52,
              height: 52,
              background:
                "radial-gradient(circle,#a5b4fc 0%,#6366f1 45%,#4f46e5 100%)",
            }}
          />
          {/* Orbiters */}
          <div className="orbit-wrapper" style={{ top: "50%", left: "50%" }}>
            <div className="orbiter orbiter-1" />
            <div className="orbiter orbiter-2" />
            <div className="orbiter orbiter-3" />
          </div>
        </div>

        {/* Brand */}
        <p
          className="text-indigo-600 tracking-[0.22em] uppercase text-xs mb-2 anim-fade-up-1"
          style={{ fontFamily: "'Space Mono',monospace" }}
        >
          ✦ Initializing System
        </p>
        <h1
          className="text-white font-bold mb-1 anim-fade-up-2 anim-glitch"
          style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: "clamp(2rem,6vw,3.5rem)",
            letterSpacing: "-0.03em",
            textShadow: "0 0 40px rgba(99,102,241,0.5)",
          }}
        >
          3D_UI_STUDIO
        </h1>
        <p className="text-slate-600 text-sm tracking-wide mb-10 anim-fade-up-3">
          Next-generation visual interface
        </p>

        {/* Progress Block */}
        <div className="anim-fade-up-4" style={{ width: "min(420px,86vw)" }}>
          {/* Label + Counter */}
          <div className="flex items-center justify-between mb-2.5">
            <span
              className="text-slate-600 text-xs tracking-wide"
              style={{ fontFamily: "'Space Mono',monospace" }}
            >
              {STEPS[stepIdx]}…
            </span>
            <span
              className="font-bold text-2xl bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"
              style={{ fontFamily: "'Space Mono',monospace" }}
            >
              {digits}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full h-1 rounded-full overflow-hidden border"
            style={{
              background: "rgba(99,102,241,0.12)",
              borderColor: "rgba(99,102,241,0.15)",
            }}
          >
            <div className="progress-fill" />
          </div>

          {/* Step Dots */}
          <div className="flex items-center justify-between mt-4">
            {STEPS.map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className={`status-dot ${i < stepIdx ? "dot-done" : i === stepIdx ? "dot-active" : "dot-wait"}`}
                />
                <span
                  className="text-[10px] hidden sm:block"
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    color: i <= stepIdx ? "#64748b" : "#1e293b",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Enter Button */}
        {done && (
          <button
            onClick={handleEnter}
            className="mt-10 px-8 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 anim-scale-in"
            style={{
              background: "linear-gradient(135deg,#6366f1,#06b6d4)",
              boxShadow: "0 0 28px rgba(99,102,241,0.5)",
            }}
          >
            Enter Experience →
          </button>
        )}
      </div>

      {/* Corner Marks */}
      <div className="corner-mark cm-tl fixed z-30" />
      <div className="corner-mark cm-tr fixed z-30" />
      <div className="corner-mark cm-bl fixed z-30" />
      <div className="corner-mark cm-br fixed z-30" />

      {/* Bottom Status Bar */}
      <div
        className="fixed bottom-5 left-0 right-0 flex items-center justify-center gap-6 z-30"
        style={{ animation: "fadeIn 1s 1s both" }}
      >
        {["SYS: ONLINE", "GPU: ACTIVE", "v2.4.1"].map((label, i) => (
          <>
            {i > 0 && <span key={`d${i}`} className="w-px h-3 bg-slate-800" />}
            <span
              key={label}
              className="text-[11px] text-slate-800 tracking-widest"
              style={{ fontFamily: "'Space Mono',monospace" }}
            >
              {label}
            </span>
          </>
        ))}
      </div>
    </div>
  );
}
