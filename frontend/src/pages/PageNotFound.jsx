import { useRef, useEffect } from "react";
import * as THREE from "three";

/* ──────────────────────────────────────────
   Simplex Noise GLSL (injected into shaders)
────────────────────────────────────────── */
const NOISE_GLSL = `
vec3 _m289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 _m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 _perm(vec4 x){return _m289(((x*34.)+1.)*x);}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g; vec3 i1=min(g,l.zxy); vec3 i2=max(g,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-.5;
  i=_m289(i);
  vec4 p=_perm(_perm(_perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  vec4 j=p-49.*floor(p*(1./7.))*(1./7.);
  vec4 x_=floor(j*(1./7.)); vec4 y_=floor(j-7.*x_);
  vec4 x2_=(x_*2.+.5)/7.-1.; vec4 y2_=(y_*2.+.5)/7.-1.;
  vec4 h=1.-abs(x2_)-abs(y2_);
  vec4 b0=vec4(x2_.xy,y2_.xy); vec4 b1=vec4(x2_.zw,y2_.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=1.79284291400159-.85373472095314*vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/* ──────────────────────────────────────────
   Custom Hook — Three.js Scene
────────────────────────────────────────── */
function useThreeScene(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 0, 7);

    // ── Star Field ──
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(8000 * 3);
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 300;
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true })));

    // ── Distorted Torus ──
    const torusGeo = new THREE.TorusGeometry(1.6, 0.45, 64, 128);
    const torusMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:   { value: 0 },
        uColor1: { value: new THREE.Color("#6366f1") },
        uColor2: { value: new THREE.Color("#06b6d4") },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vPos;
        varying vec3 vNormal;
        ${NOISE_GLSL}
        void main() {
          vNormal = normal;
          vec3 p = position;
          float n = snoise(p * 0.6 + uTime * 0.25) * 0.22;
          p += normal * n;
          vPos = p;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec3 vPos;
        varying vec3 vNormal;
        void main() {
          vec3 light = normalize(vec3(3., 4., 5.));
          float d = max(dot(normalize(vNormal), light), 0.1);
          float t = clamp((vPos.y + 2.) / 4., 0., 1.);
          vec3 col = mix(uColor1, uColor2, t) * d;
          col += vec3(0.08, 0.06, 0.2) * (1. - d);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    scene.add(torus);

    // ── Orbiting Spheres ──
    const orbitGroup = new THREE.Group();
    const orbitData = [
      { color: 0x6366f1, r: 2.8, speed: 0.30, offset: 0 },
      { color: 0x06b6d4, r: 3.1, speed: 0.40, offset: Math.PI * 0.5 },
      { color: 0xf472b6, r: 3.4, speed: 0.50, offset: Math.PI },
      { color: 0xfbbf24, r: 3.7, speed: 0.60, offset: Math.PI * 1.5 },
    ];
    const orbiters = orbitData.map(({ color, r, speed, offset }) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 32, 32),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3 })
      );
      orbitGroup.add(mesh);
      return { mesh, r, speed, offset };
    });
    scene.add(orbitGroup);

    // ── Grid Floor ──
    const grid = new THREE.GridHelper(40, 40, 0x1e1b4b, 0x1e1b4b);
    grid.position.y = -3.5;
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    scene.add(grid);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pt1 = new THREE.PointLight(0x6366f1, 3, 20);
    pt1.position.set(-3, 3, 3);
    scene.add(pt1);
    const pt2 = new THREE.PointLight(0x06b6d4, 3, 20);
    pt2.position.set(3, -2, 2);
    scene.add(pt2);

    // ── Mouse Parallax ──
    let mouse = { x: 0, y: 0 };
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Resize ──
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animation Loop ──
    const clock = new THREE.Clock();
    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      torusMat.uniforms.uTime.value = t;
      torus.rotation.x = t * 0.18 + mouse.y * 0.3;
      torus.rotation.y = t * 0.22 + mouse.x * 0.3;
      torus.position.y = Math.sin(t * 0.7) * 0.25;

      orbiters.forEach(({ mesh, r, speed, offset }) => {
        const a = t * speed + offset;
        mesh.position.set(Math.cos(a) * r, Math.sin(a * 0.7) * 0.8, Math.sin(a) * r * 0.5);
        mesh.rotation.y = t * 1.5;
      });

      orbitGroup.rotation.y = t * 0.1 + mouse.x * 0.15;
      grid.position.y = -3.5 + Math.sin(t * 0.3) * 0.1;
      scene.rotation.y = mouse.x * 0.04;
      scene.rotation.x = mouse.y * 0.02;

      camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.05;
      camera.position.y += (-mouse.y * 0.3 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);
}

/* ──────────────────────────────────────────
   NotFound Page Component
────────────────────────────────────────── */
export default function PageNotFound() {
  const canvasRef = useRef(null);
  useThreeScene(canvasRef);

  return (
    <>
      {/* ── Tailwind keyframes (add to global CSS or index.css) ──
          @keyframes fadeUp {
            from { opacity:0; transform:translateY(32px); }
            to   { opacity:1; transform:translateY(0); }
          }
          @keyframes pulse-glow {
            0%,100% { text-shadow: 0 0 30px rgba(99,102,241,0.6), 0 0 60px rgba(99,102,241,0.3); }
            50%      { text-shadow: 0 0 60px rgba(99,102,241,1),   0 0 120px rgba(99,102,241,0.5); }
          }
          .fade-up   { animation: fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) both; }
          .fade-up-2 { animation: fadeUp 0.9s 0.15s cubic-bezier(0.22,1,0.36,1) both; }
          .fade-up-3 { animation: fadeUp 0.9s 0.30s cubic-bezier(0.22,1,0.36,1) both; }
          .fade-up-4 { animation: fadeUp 0.9s 0.45s cubic-bezier(0.22,1,0.36,1) both; }
          .glow-404  { animation: pulse-glow 3s ease-in-out infinite; }
      */}

      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />

      {/* Radial vignette overlay */}
      <div
        className="fixed inset-0 z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(2,6,23,0.7) 100%)" }}
      />

      {/* UI Content */}
      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center text-center px-6">

        {/* 404 */}
        <h1
          className="fade-up glow-404 font-mono font-bold text-indigo-400 select-none"
          style={{ fontSize: "clamp(6rem,18vw,14rem)", lineHeight: 1, letterSpacing: "-0.04em" }}
        >
          404
        </h1>

        {/* Divider */}
        <div className="fade-up-2 w-24 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent my-6" />

        {/* Headline */}
        <h2 className="fade-up-2 text-2xl md:text-3xl font-semibold text-white mb-3">
          Lost in the void
        </h2>

        {/* Description */}
        <p className="fade-up-3 text-slate-400 text-sm md:text-base max-w-sm leading-relaxed mb-10">
          The page you're looking for drifted into deep space. It might have
          been moved, deleted, or never existed.
        </p>

        {/* Buttons */}
        <div className="fade-up-4 flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-7 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #6366f1, #06b6d4)",
              boxShadow: "0 0 30px rgba(99,102,241,0.4)",
            }}
          >
            ← Go Home
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-7 py-3 rounded-xl font-semibold text-sm text-slate-300 border border-slate-700 bg-slate-900/50 backdrop-blur-sm hover:border-indigo-500 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Report Issue
          </button>
        </div>

        {/* Status badge */}
        <div className="fade-up-4 mt-12 flex items-center gap-2 text-xs text-slate-600 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse inline-block" />
          ERROR_CODE: 404 · SECTOR: NULL · COORDS: ∅
        </div>
      </div>
    </>
  );
}