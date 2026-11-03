/**
 * GÉNESIS 19 · Escena del meteorito (compartida por el modo RA y el modo demo).
 *
 * Coordenadas: todo cuelga de `raiz`. En `raiz`, el eje +Y apunta hacia AFUERA de la página
 * (hacia el lector) y 1 unidad = el ANCHO de la lámina impresa. El modo RA gira `raiz`
 * para que coincida con el ancla de MindAR; el modo demo la usa tal cual.
 *
 * Secuencia: caída con fuego (DURACION_CAIDA) → impacto (destello, onda, brasas) →
 * reposo humeante con las grietas enfriándose.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --------------------------------------------------------------- parámetros
export const AJUSTES = {
  escala: 0.21,                 // el modelo mide ~2 m; 0.21 → ~42 % del ancho de la lámina
  reposo: new THREE.Vector3(0, 0.18, 0),     // centro del meteorito ya posado
  // Punto de partida de la caída. Y = altura sobre la página (hacia el lector);
  // Z negativo = hacia arriba de la ilustración. Así entra "desde el cielo del bosque"
  // y no pasa por delante de la cámara.
  inicioCaida: new THREE.Vector3(0.45, 0.9, -1.4),
  duracionCaida: 1.6,           // segundos
  brilloCaida: 6,               // fuerza emisiva al rojo vivo durante la caída
  tamHalo: 0.32,                // resplandor alrededor de la bola de fuego
  brilloReposo: 4,              // la del archivo GLB
  segundosEnfriado: 4,
  particulasFuego: 70,
  particulasBrasas: 40,
  particulasHumo: 34,
};

// --------------------------------------------------------------- texturas procedurales
function texturaRadial(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [p, col] of stops) grd.addColorStop(p, col);
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texturaHumo() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 34 + Math.random() * 60, y = 34 + Math.random() * 60, r = 18 + Math.random() * 30;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.30)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const easeIn = (t) => t * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);

// --------------------------------------------------------------- escena
export async function crearMeteorito(urlModelo) {
  const raiz = new THREE.Group();

  // Luces: pensadas para verse bien sobre papel bajo luz ambiente.
  raiz.add(new THREE.HemisphereLight(0xd8d2ca, 0x2a1d16, 1.6));
  const sol = new THREE.DirectionalLight(0xfff1e0, 2.0); sol.position.set(1.5, 3, 1.2); raiz.add(sol);
  const contra = new THREE.DirectionalLight(0x8fa6ff, 0.8); contra.position.set(-2, 1, -2); raiz.add(contra);
  const calor = new THREE.PointLight(0xff5a1a, 0, 1.2, 2); raiz.add(calor);

  // Modelo
  const gltf = await new GLTFLoader().loadAsync(urlModelo);
  const pivote = new THREE.Group(); raiz.add(pivote);
  const modelo = gltf.scene; modelo.scale.setScalar(AJUSTES.escala); pivote.add(modelo);
  let material = null; modelo.traverse((o) => { if (o.isMesh) material = o.material; });
  const mixer = new THREE.AnimationMixer(modelo);
  const giro = gltf.animations[0] ? mixer.clipAction(gltf.animations[0]) : null;   // «Rotacion_Lenta» del GLB
  if (giro) giro.play();

  // Quemadura sobre la página (aparece con el impacto)
  const quemadura = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({ map: texturaRadial([[0, 'rgba(8,5,4,0.85)'], [0.45, 'rgba(20,10,6,0.45)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, depthWrite: false }));
  quemadura.rotation.x = -Math.PI / 2; quemadura.position.y = 0.002; raiz.add(quemadura);

  // Resplandor que acompaña la bola de fuego
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texturaRadial([[0, 'rgba(255,220,150,1)'], [0.25, 'rgba(255,120,40,0.7)'], [1, 'rgba(255,60,0,0)']]),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  raiz.add(halo);

  // Onda expansiva
  const onda = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48),
    new THREE.MeshBasicMaterial({ color: 0xffa060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  onda.rotation.x = -Math.PI / 2; onda.position.y = 0.004; raiz.add(onda);

  // Sistemas de partículas sencillos con sprites (baratos para el móvil)
  const texFuego = texturaRadial([[0, 'rgba(255,240,200,1)'], [0.3, 'rgba(255,140,40,0.85)'], [0.7, 'rgba(200,40,0,0.3)'], [1, 'rgba(0,0,0,0)']], 64);
  const texHumo = texturaHumo();
  function sistema(n, tex, opciones) {
    const lista = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, ...opciones }));
      s.visible = false; raiz.add(s);
      lista.push({ s, vida: 0, dur: 1, v: new THREE.Vector3(), tam: 0.1, activo: false });
    }
    return lista;
  }
  const fuego = sistema(AJUSTES.particulasFuego, texFuego, { blending: THREE.AdditiveBlending });
  const brasas = sistema(AJUSTES.particulasBrasas, texFuego, { blending: THREE.AdditiveBlending });
  const humo = sistema(AJUSTES.particulasHumo, texHumo, { color: 0x6a625c });
  let iFuego = 0;

  // --------------------------------------------------------------- estado
  let t = 0, impactado = false;
  const posCaida = new THREE.Vector3();

  function reiniciar() {
    t = 0; impactado = false;
    for (const p of [...fuego, ...brasas, ...humo]) { p.activo = false; p.s.visible = false; }
    quemadura.material.opacity = 0; onda.visible = false; calor.intensity = 0;
    if (giro) { giro.paused = false; giro.timeScale = 14; }      // giro rápido durante la caída
    pivote.rotation.set(0, 0, 0);
    raiz.visible = true;
  }

  function impacto() {
    impactado = true;
    if (giro) giro.paused = true;
    onda.visible = true; onda.scale.setScalar(0.01); onda.material.opacity = 0.9;
    for (const p of brasas) {
      const a = Math.random() * Math.PI * 2, v = 0.4 + Math.random() * 0.9;
      p.activo = true; p.vida = 0; p.dur = 0.6 + Math.random() * 0.9; p.tam = 0.02 + Math.random() * 0.035;
      p.s.position.copy(AJUSTES.reposo).setY(0.05);
      p.v.set(Math.cos(a) * v, 0.6 + Math.random() * 1.2, Math.sin(a) * v);
      p.s.visible = true;
    }
    // el humo empieza escalonado para que la columna no aparezca de golpe
    humo.forEach((p, i) => { p.activo = true; p.vida = -i * 0.18; p.dur = 5 + Math.random() * 1.5; p.semilla = Math.random() * 10; });
  }

  function actualizar(dt) {
    t += dt;
    mixer.update(dt);
    const D = AJUSTES.duracionCaida;

    if (t < D) {
      // ---- caída
      const k = easeIn(t / D);
      posCaida.lerpVectors(AJUSTES.inicioCaida, AJUSTES.reposo, k);
      pivote.position.copy(posCaida);
      material.emissiveIntensity = AJUSTES.brilloCaida;
      halo.visible = true; halo.position.copy(posCaida);
      const th = AJUSTES.tamHalo * (1 + 0.15 * Math.sin(t * 40)); halo.scale.set(th, th, 1);
      halo.material.opacity = 0.7;
      // emitir fuego desde la posición actual (la estela queda atrás porque cada sprite se queda donde nació)
      for (let k2 = 0; k2 < 3; k2++) {
        const p = fuego[iFuego++ % fuego.length];
        p.activo = true; p.vida = 0; p.dur = 0.35 + Math.random() * 0.35; p.tam = 0.10 + Math.random() * 0.08;
        p.s.position.copy(posCaida).add(new THREE.Vector3((Math.random() - .5) * .12, (Math.random() - .5) * .12, (Math.random() - .5) * .12));
        p.v.set(0, 0.05, 0); p.s.visible = true;
      }
    } else {
      if (!impactado) impacto();
      pivote.position.copy(AJUSTES.reposo);
      halo.visible = false;
      const tr = t - D;
      // enfriamiento progresivo de las grietas + pulso leve de calor
      const enfr = Math.min(1, tr / AJUSTES.segundosEnfriado);
      material.emissiveIntensity = THREE.MathUtils.lerp(AJUSTES.brilloCaida, AJUSTES.brilloReposo, easeOut(enfr))
        + 0.35 * Math.sin(t * 2.1) * Math.sin(t * 0.7);
      calor.position.set(0, 0.08, 0.15); calor.intensity = THREE.MathUtils.lerp(3, 0.6, enfr);
      quemadura.material.opacity = Math.min(1, tr * 3);
      if (onda.visible) {
        const ko = Math.min(1, tr / 0.7);
        onda.scale.setScalar(0.05 + ko * 0.55); onda.material.opacity = 0.9 * (1 - ko);
        if (ko >= 1) onda.visible = false;
      }
    }

    // ---- partículas
    for (const p of fuego) {
      if (!p.activo) continue;
      p.vida += dt; const L = p.vida / p.dur;
      if (L >= 1) { p.activo = false; p.s.visible = false; continue; }
      p.s.position.addScaledVector(p.v, dt);
      const s = p.tam * (1 - 0.6 * L); p.s.scale.set(s, s, 1); p.s.material.opacity = 0.75 * (1 - L);
    }
    for (const p of brasas) {
      if (!p.activo) continue;
      p.vida += dt; const L = p.vida / p.dur;
      if (L >= 1) { p.activo = false; p.s.visible = false; continue; }
      p.v.y -= 2.2 * dt;                                 // gravedad
      p.s.position.addScaledVector(p.v, dt);
      if (p.s.position.y < 0.01) { p.s.position.y = 0.01; p.v.multiplyScalar(0.3); }
      p.s.scale.set(p.tam, p.tam, 1); p.s.material.opacity = 1 - L;
    }
    for (const p of humo) {
      if (!p.activo) continue;
      p.vida += dt;
      if (p.vida < 0) continue;
      let L = p.vida / p.dur;
      if (L >= 1) { p.vida = 0; L = 0; p.semilla = Math.random() * 10; }   // la columna es continua
      p.s.visible = true;
      const y = 0.3 + L * 1.6;
      const deriva = Math.sin(t * 0.5 + p.semilla * 3) * 0.08 * L + L * L * 0.3;
      p.s.position.set(-0.04 + deriva, y, 0.03 * Math.cos(p.semilla));
      const s = 0.1 + L * 0.6; p.s.scale.set(s, s, 1);
      p.s.material.opacity = Math.min(1, L * 6) * (1 - L) * 0.5;
      p.s.material.rotation = p.semilla + L;
    }
  }

  reiniciar();
  return { raiz, actualizar, reiniciar };
}
