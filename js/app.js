/**
 * GÉNESIS 19 · Arranque de la experiencia.
 *
 * Dos modos:
 *   - RA (por defecto): MindAR reconoce la lámina impresa y ancla el meteorito sobre ella.
 *   - Demo (?demo en la URL): sin cámara; la lámina se ve como una hoja sobre una mesa virtual.
 *     Sirve para revisar la escena en el computador y para mostrarla si no hay lámina impresa.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { crearMeteorito } from './escena.js';

const MODELO = './assets/meteorito_genesis19.glb';
const MARCADOR_MIND = './assets/targets.mind';      // generado con el compilador de MindAR
const LAMINA_IMG = './assets/marcador_genesis19.jpg';
// Dónde está el meteorito DIBUJADO en la lámina (centro = 0,0; ancho = 1; alto = 1.5).
// El 3D aparece exactamente encima del dibujo, como si saliera de la página.
const POS_EN_LAMINA_X = -0.04;
const POS_EN_LAMINA_Y = -0.44;

const $ = (id) => document.getElementById(id);
const pantalla = $('inicio'), aviso = $('aviso'), controles = $('controles'), errorEl = $('error');
const esDemo = new URLSearchParams(location.search).has('demo');

function mostrarError(texto) {
  pantalla.hidden = false; errorEl.hidden = false; errorEl.textContent = texto;
  $('btnIniciar').disabled = false; $('btnIniciar').textContent = 'Intentar de nuevo';
}

function prepararRenderer(renderer, scene) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
}

// ------------------------------------------------------------------ modo RA
async function iniciarRA() {
  const { MindARThree } = await import('mindar-image-three');
  const mindar = new MindARThree({
    container: $('ar'),
    imageTargetSrc: MARCADOR_MIND,
    uiLoading: 'no', uiScanning: 'no', uiError: 'no',
    filterMinCF: 0.0001, filterBeta: 0.001,   // suaviza el temblor del seguimiento
  });
  const { renderer, scene, camera } = mindar;
  prepararRenderer(renderer, scene);

  const escena = await crearMeteorito(MODELO);
  escena.raiz.rotation.x = Math.PI / 2;            // +Y de la escena = hacia afuera de la página
  escena.raiz.position.set(POS_EN_LAMINA_X, POS_EN_LAMINA_Y, 0);
  const ancla = mindar.addAnchor(0);
  ancla.group.add(escena.raiz);

  let visto = false, visible = false;
  ancla.onTargetFound = () => {
    visible = true; aviso.hidden = true; controles.hidden = false;
    if (!visto) { visto = true; escena.reiniciar(); }
  };
  ancla.onTargetLost = () => { visible = false; aviso.hidden = false; };
  $('btnRepetir').onclick = () => escena.reiniciar();

  await mindar.start();                             // pide permiso de cámara
  pantalla.hidden = true; aviso.hidden = false;

  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(reloj.getDelta(), 0.05);
    if (visible) escena.actualizar(dt);
    renderer.render(scene, camera);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) reloj.getDelta(); });
}

// ------------------------------------------------------------------ modo demo
async function iniciarDemo() {
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  $('ar').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x15110f);
  prepararRenderer(renderer, scene);

  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.01, 50);
  camera.position.set(0.9, 1.5, 1.9);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.2, 0.3); controls.enableDamping = true;

  // Mesa y hoja con la lámina
  const mesa = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.8 }));
  mesa.rotation.x = -Math.PI / 2; mesa.position.y = -0.002; scene.add(mesa);
  const hoja = new THREE.Mesh(new THREE.PlaneGeometry(816 / 560, 1056 / 560), new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.9 }));
  hoja.rotation.x = -Math.PI / 2; hoja.position.set(0, -0.001, (528 - (88 + 420)) / 560); scene.add(hoja);   // la imagen está 20 px por encima del centro de la hoja
  const tex = await new THREE.TextureLoader().loadAsync(LAMINA_IMG); tex.colorSpace = THREE.SRGBColorSpace;
  const lamina = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  lamina.rotation.x = -Math.PI / 2; scene.add(lamina);

  const escena = await crearMeteorito(MODELO);
  escena.raiz.position.set(POS_EN_LAMINA_X, 0, -POS_EN_LAMINA_Y);   // en el plano XZ, abajo de la imagen = +Z
  scene.add(escena.raiz);
  $('btnRepetir').onclick = () => escena.reiniciar();

  pantalla.hidden = true; controles.hidden = false;
  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  });
  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    escena.actualizar(Math.min(reloj.getDelta(), 0.05));
    controls.update(); renderer.render(scene, camera);
  });
  window.__listo = true;
}

// ------------------------------------------------------------------ inicio
$('btnIniciar').addEventListener('click', async () => {
  $('btnIniciar').disabled = true; $('btnIniciar').textContent = 'Cargando…'; errorEl.hidden = true;
  try {
    await (esDemo ? iniciarDemo() : iniciarRA());
  } catch (e) {
    console.error(e);
    const msg = String(e && (e.message || e.name) || e);
    if (/Permission|NotAllowed/i.test(msg)) mostrarError('No se pudo usar la cámara. Revisa que el navegador tenga permiso y vuelve a intentarlo.');
    else if (/targets\.mind|404|Failed to fetch/i.test(msg)) mostrarError('Falta el archivo del marcador (assets/targets.mind). Compílalo con la herramienta de MindAR.');
    else mostrarError('Algo falló al iniciar: ' + msg);
  }
});
if (esDemo) $('btnIniciar').textContent = 'Ver demo';
