# GÉNESIS 19 · Experiencia de realidad aumentada

Prototipo WebAR del meteorito de *Génesis 19* (Lauren Chonps). El lector apunta el celular
a la lámina de la página 5 y el meteorito cae sobre la ilustración, impacta y queda humeando.

- **Tecnología:** MindAR 1.2.5 (seguimiento de imagen) + three.js r160, cargados desde jsDelivr.
- **Sin instalación:** funciona en el navegador (Chrome en Android, Safari en iPhone).
- **Requisito:** HTTPS. GitHub Pages lo da gratis.

## Estructura

```
index.html                      Pantalla de inicio, avisos y botón «Repetir caída»
js/app.js                       Arranque: modo RA (cámara + MindAR) y modo demo (?demo)
js/escena.js                    Meteorito, caída, fuego, impacto, brasas y humo
assets/meteorito_genesis19.glb  Modelo 3D (2,4 MB)
assets/marcador_genesis19.png   Imagen de la lámina, para compilar el marcador
assets/marcador_genesis19.jpg   La misma imagen, liviana, para el modo demo
assets/targets.mind             ← FALTA: se genera en el paso 1
```

## 1. Compilar el marcador (una sola vez)

1. Abre el compilador oficial de MindAR:
   <https://hiukim.github.io/mind-ar-js-doc/tools/compile>
   (si el enlace cambió, entra a la documentación de MindAR y busca *Image Targets Compiler*).
2. Sube `assets/marcador_genesis19.png`. Usa este archivo, no una foto ni una captura de la página.
3. Pulsa **Start** y espera a que termine (1–2 minutos).
4. El compilador muestra los puntos que detectó. Deberían cubrir casi toda la imagen.
   Si se concentran solo en los árboles, avísame para reforzar el detalle del suelo.
5. Descarga el archivo. Renómbralo `targets.mind` y ponlo en la carpeta `assets/`.

## 2. Publicar en GitHub Pages

1. En GitHub crea un repositorio nuevo, público, por ejemplo `genesis19-ra`.
2. Sube **todo el contenido de esta carpeta** (incluido `assets/targets.mind`):
   *Add file → Upload files*, arrastra los archivos y carpetas y pulsa *Commit changes*.
3. Ve a *Settings → Pages*. En *Source* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarda.
4. Espera uno o dos minutos. La dirección queda así:
   `https://TU-USUARIO.github.io/genesis19-ra/`

## 3. Probar

- **En el computador, sin cámara:** abre `https://TU-USUARIO.github.io/genesis19-ra/?demo`.
  Verás la lámina sobre una mesa virtual y la caída del meteorito. Arrastra para girar la vista.
- **En el celular:** abre la dirección sin `?demo`, pulsa **Abrir cámara**, acepta el permiso
  y apunta a la lámina impresa.

Consejos para la lámina impresa: papel mate (el satinado refleja la luz), buena iluminación
y encuadrar la ilustración completa la primera vez.

## 4. Código QR de la lámina

Genera el QR con la dirección pública (sin `?demo`) en cualquier generador gratuito.
Descárgalo en PNG o SVG y reemplaza `[QR]` y `[URL DE LA EXPERIENCIA]` en la lámina del diseño.

## Ajustes rápidos

| Qué cambiar | Dónde | Valor actual |
|---|---|---|
| Tamaño del meteorito | `js/escena.js` → `AJUSTES.escala` | `0.21` |
| Duración de la caída | `js/escena.js` → `AJUSTES.duracionCaida` | `1.6` s |
| Brillo de las grietas en reposo | `js/escena.js` → `AJUSTES.brilloReposo` | `4` |
| Cantidad de humo, fuego y brasas | `js/escena.js` → `particulas…` | 34 / 70 / 40 |
| Posición sobre el dibujo | `js/app.js` → `POS_EN_LAMINA_X / _Y` | `-0.04 / -0.44` |
| Suavizado del seguimiento | `js/app.js` → `filterMinCF`, `filterBeta` | `0.0001 / 0.001` |

Unidades: 1 = el ancho de la ilustración impresa; su alto mide 1.5.

## Qué está en el modelo y qué está en el código

- **En el GLB:** geometría, texturas PBR, brillo de las grietas y la animación de rotación,
  que aquí se usa como el giro durante la caída.
- **En el código:** la trayectoria de la caída, el fuego, el destello, la onda expansiva,
  las brasas, el humo, la quemadura sobre la página y el enfriamiento de las grietas.

## Problemas conocidos

- **«Falta el archivo del marcador»:** falta `assets/targets.mind` o tiene otro nombre.
- **La cámara no abre:** la página debe abrirse por HTTPS y el navegador debe tener permiso de cámara.
  En iPhone, usa Safari.
- **El meteorito tiembla:** baja `filterBeta` o sube la iluminación. Con poca luz el seguimiento empeora.
