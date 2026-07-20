---
title: "Instalar ESP-IDF v6.0.2 en macOS (del error de `brew install` a que VSCode por fin reconozca el setup)"
domain: hardware
platforms: ["mac"]
format: "tutorial"
relatedBoards: ["esp32s3"]
date: 2026-07-20
intro: "¿La terminal instala ESP-IDF sin problema, pero la extensión de VSCode te suelta un setup not found por más que la recargas? Aquí va el recorrido completo, paso a paso por los pozos reales que me encontré: instalar eim desde Homebrew, instalar ESP-IDF v6.0.2 con EIM, limpiar los restos que vienen de Windows y llegar hasta la verdadera causa del «setup not found» de la extensión, que es simplemente que una clave de configuración está en el sitio equivocado. Los comandos y los mensajes de error son los reales, tal cual salieron, para que puedas copiarlos y buscarlos cuando te toque a ti."
tags: ["instalar ESP-IDF", "ESP-IDF macOS", "EIM", "ESP32-S3", "VSCode setup not found", "configuración ESP-IDF"]
image: https://img.lingflux.com/2026/07/79ed5dc15e35419e612ab982e595d127.png
---

# Instalar ESP-IDF v6.0.2 en macOS: del error de `brew install` a que VSCode reconozca el setup

Ya me había puesto a instalar ESP-IDF manualmente un par de veces, y las dos me quedé a medias en algún punto. Así que esta vez me dije: lo hago desde cero y le pongo el microscopio a cada error. Pues bien, una vez terminado el camino queda clarísimo: el problema no es «instalar ESP-IDF» en sí, sino cinco trampas repartidas en sitios que no tienen nada que ver entre sí: instalar la herramienta con Homebrew, el acceso a red de EIM, instalar el plugin correcto en VSCode, cuatro archivos del proyecto que venían heredados de Windows y, por último, la forma en que la extensión de VSCode lee su configuración. Cuando todo marcha en la terminal, VSCode te sigue escupiendo el temido "setup not found": ese es el quebradero de cabeza que más tiempo chupa, y justo por eso es el protagonista de este artículo.

Lo que sigue es el diario de los pozos según me los fui encontrando. Los comandos y los errores son los que salieron de verdad, así que si te aparece el mismo mensaje puedes copiarlo tal cual para buscarlo, o pasarle este artículo junto con tu error a la IA y dejar que te lo explique siguiendo este guion.

> **Antes de arrancar, revisa los números de versión.** Entre la rama v5.x y la v6.0.2, ESP-IDF cambió el método de instalación: el clásico `install.sh` se sustituyó por EIM. Y entre la 1.x y la 2.x, la extensión de VSCode reescribió por completo la lógica con la que busca el setup. Si tus versiones no son estas, sobre todo el paso 4 sobre la configuración de la extensión, lo más probable es que no te sirva ni un poco.

## Versiones del entorno

| Ítem | Versión |
|---|---|
| Sistema | macOS, Apple Silicon (chip de la serie M) |
| ESP-IDF | v6.0.2 |
| Herramienta de instalación | EIM 0.17.1 |
| Extensión VSCode | espressif.esp-idf-extension 2.1.0 |
| Chip objetivo | ESP32-S3 |

Las rutas del artículo llevan mi nombre de usuario, `shawn`. Si vas a copiar y pegar comandos, sustitúyelo por el tuyo (te basta con escribir `whoami` en la terminal para verlo). Otra cosa: yo tengo Clash corriendo como proxy en `127.0.0.1:7890`. Si no necesitas proxy, basta con que quites las variables de entorno con `PROXY` y el parámetro `--mirror` de los comandos; el resto del flujo es exactamente igual.

## Mapa de la ruta

Cinco pasos, y cuanto más adelante, más escondido está el pozo:

| Paso | Qué hay que hacer | Síntoma típico |
|---|---|---|
| 0 | Instalar la propia herramienta `eim` con Homebrew | Un aviso de confianza que mucha gente confunde con error |
| 1 | Instalar ESP-IDF v6.0.2 con `eim` | Dos pozos: red y número de versión |
| 2 | Instalar la extensión ESP-IDF en VSCode | Hay un montón de plugins con el mismo nombre, y es facilísimo equivocarse |
| 3 | Limpiar los archivos heredados de Windows del proyecto | Solo te afecta si el proyecto llegó desde Windows |
| 4 | Hacer que la extensión de VSCode reconozca el setup instalado | El pozo más escondido de todo el artículo y el que más gente atasca |

---

## Paso 0: instalar primero la herramienta `eim`

`e` viene de «ESP-IDF Manager»: es la herramienta oficial de Espressif para instalar y gestionar ESP-IDF. Lo bueno frente al viejo `install.sh` es que permite tener varias versiones de ESP-IDF conviviendo sin pisarse. Para instalarla, primero añades un tap de Homebrew (un repositorio de terceros) y luego la instalas:

Guía oficial de instalación de EIM:
https://dl.espressif.com/dl/eim/index.html

```bash
brew tap espressif/eim
brew install eim
```

La primera vez que corrí `brew install eim` me saltó este aviso:

```
Error: Refusing to load formula espressif/eim/eim from untrusted tap espressif/eim.
Run `brew trust --formula espressif/eim/eim` or `brew trust espressif/eim` to trust it.
```

> **Esto no es un fallo de instalación, sino una confirmación de seguridad de Homebrew.** Las versiones recientes de Homebrew no confían por defecto en taps de terceros (cualquier fuente fuera del repositorio oficial). La primera vez que usas algo de un tap de terceros te aparece este mensaje, pidiéndote que confirmes si te fías. El tap `espressif` es oficial, así que puedes confiar sin miedo:

```bash
brew trust espressif/eim
```

Después de ejecutar eso, vuelve a lanzar `brew install eim` y ahora sí instala. Si antes del `brew install` te sale una lista larguísima de paquetes que no tienen nada que ver con eim (utilidades de barra de menús, renombradores con IA y demás), es simplemente Homebrew avisándote de cuántos paquetes tienes desactualizados: no le hagas caso, haz scroll hasta la línea del error real.

Para terminar, comprueba que ha quedado bien instalado:

```bash
eim --version
```

Si te escupe un número de versión sin quejarse, este paso está listo y puedes pasar a instalar ESP-IDF en serio.

---

## Paso 1: instalar ESP-IDF v6.0.2 con EIM

Con la herramienta lista, una sola orden te instala ESP-IDF:

```bash
HTTPS_PROXY=http://127.0.0.1:7890 \
HTTP_PROXY=http://127.0.0.1:7890 \
ALL_PROXY=socks5://127.0.0.1:7890 \
eim install -i v6.0.2 -t esp32s3 -n true \
  --idf-mirror https://git.espressif.com.cn \
  --pypi-mirror https://pypi.mirrors.ustc.edu.cn/simple
```

Qué hace cada parámetro:

- `-i v6.0.2`: la versión a instalar, **con el prefijo `v` obligatorio**. Más abajo explico por qué;
- `-t esp32s3`: el chip objetivo;
- `-n true`: modo no interactivo, si no se queda esperando a que pulses Enter;
- `--idf-mirror` / `--pypi-mirror`: mirrors para China, el código fuente baja del mirror oficial de Espressif en China y los paquetes de Python del mirror de la USTC; si no lo necesitas, basta con quitarlos;
- las tres variables `PROXY`: sirven para que EIM, internamente, salga a través del proxy al tocar git. El porqué lo cuento en el pozo 1.

El comando parece simple, pero la primera vez me caí en dos pozos de esos que por fuera parecen que todo va bien y por debajo se están cayendo a un lado.

### Pozo 1: el proxy puesto en git no vale, EIM no lo lee

Por dentro, EIM tira del código fuente del IDF con la librería `gix` de Rust, que no hace el menor caso a `git config --global http.proxy`. Solo mira las variables de entorno del sistema `HTTPS_PROXY`, `HTTP_PROXY` y `ALL_PROXY`. Si tu proxy vive únicamente en el archivo de configuración de git y no tienes las variables equivalentes, `gix` intenta ir por conexión directa, falla una y otra vez, y el log se llena de líneas como esta:

```
WARN - Attempt N failed: "Failed to fetch: Failed to consume the pack sent by the remote"
```

Después de fallar tres veces, `gix` hace marcha atrás y recurre al git del sistema (que sí entiende el `git config` y sí sale por el proxy). Así que lo más probable es que al final termine instalando, pero te cepillas varios minutos de más y, encima, el clone resultado del fallback no queda del todo limpio. Lo cómodo es poner las variables del proxy directamente en el comando desde el principio y que `gix` acierte a la primera, sin esperar a esos tres fallos.

### Pozo 2: la versión sin la `v` da error

Los tags de release del repositorio oficial de Espressif llevan todos el formato `v6.0.2`, con la `v` por delante, y el parámetro `-i` de EIM se usa tal cual como nombre de tag en git. Si escribes `-i 6.0.2` (sin la v), te suelta:

```
fatal: Remote branch 6.0.2 not found in upstream origin
```

Este mensaje también lo emite el git del sistema cuando toma el relevo del `gix`: simplemente no encuentra en el remoto una rama llamada `6.0.2` (sin la v). Escrito como `-i v6.0.2` va fenómeno. Si no estás seguro de cómo se llama el tag de una versión concreta, mira primero qué hay en el remoto:

```bash
git ls-remote --tags https://git.espressif.com.cn/espressif/esp-idf.git 'v6.0*'
```

### Cómo verificar que quedó bien instalado

```bash
eim list
# Deberías ver v6.0.2 (selected)

source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py --version
# Si imprime ESP-IDF v6.0.2, está listo
```

### Dónde queda cada cosa después de instalar

La estructura de directorios que deja EIM no se parece a la del método clásico. Más adelante vamos a referenciar estas rutas una y otra vez, así que conviene tenerlas en la cabeza:

```
Fuente del IDF       ~/.espressif/v6.0.2/esp-idf
Toolchain            ~/.espressif/tools/
Python venv          ~/.espressif/tools/python/v6.0.2/venv
Script de activación ~/.espressif/tools/activate_idf_v6.0.2.sh
Manifiesto de EIM    ~/.espressif/tools/eim_idf.json
```

Vale la pena destacar dónde queda el virtualenv de Python: está escondido en `tools/python/v6.0.2/venv`, no en el `python_env/` de la raíz del proyecto que solían usar las versiones antiguas. La primera vez que lo buscas, casi seguro te rallas.

---

## Paso 2: instalar la extensión ESP-IDF en VSCode

Con la terminal lista, vuelve a VSCode, abre el panel de extensiones (`Cmd+Shift+X`) y busca «ESP-IDF».

> **En este paso muchísima gente se equivoca, así que revisa bien el publicador.** Los resultados te van a mostrar varios plugins con nombres parecidos e iconos casi idénticos, y si te guías solo por el nombre es facilísimo pinchar en el incorrecto. Coteja estos datos y, si todo cuadra, recién entonces dale a instalar:

| Campo | Contenido |
|---|---|
| Nombre de la extensión | ESP-IDF |
| Publicador | Espressif Systems |
| Web del publicador | espressif.com |
| Instalaciones | 1,582,039 |
| Valoraciones | 145 reseñas |
| Descripción | Develop and debug applications for Espressif chips with ESP-IDF |

**Fíate del publicador, no del nombre.** El publicador tiene que ser **Espressif Systems**, el dominio **espressif.com** y el número de instalaciones, del orden de millones: esas tres señas son las que delatan al plugin oficial. Si te instalas otro, las claves de configuración que verás en el paso 4 (`idf.eimIdfJsonPath`, `idf.currentSetup` y demás) igual ni existen, o se comportan de forma totalmente distinta, y luego el debugging se vuelve un misterio. La causa de raíz, casi siempre, es que el plugin no era el correcto desde el principio.

Cuando lo tengas instalado, reinicia VSCode (o `Cmd+Shift+P` → `Reload Window`) para que la extensión se active, y recién entonces sigue adelante.

---

## Paso 3: si el proyecto viene de Windows, limpia primero estos tres archivos

**Si tu proyecto lo acabas de crear desde cero, puedes saltarte este paso.** Pero si lo trajiste de un Windows, casi seguro vas a tropezar aquí: tres archivos guardan rutas específicas de Windows que en macOS dejan de valer inmediatamente.

### ① `.vscode/settings.json`

Sustituye las rutas tipo `C:\...`, los nombres de puerto serie (por ejemplo `COM22`) y los números de versión viejos por los valores reales de tu macOS:

```jsonc
{
  "idf.espIdfPath": "/Users/shawn/.espressif/v6.0.2/esp-idf",
  "idf.toolsPath":  "/Users/shawn/.espressif",
  "idf.pythonInstallPath": "/Users/shawn/.espressif/tools/python/v6.0.2/venv/bin/python",
  "idf.port": "/dev/cu.usbmodemXXXXXXXXXXX",
  "idf.customExtraVars": { "IDF_TARGET": "esp32s3" },
  "idf.flashType": "UART"
}
```

Para averiguar el nombre de tu puerto serie:

```bash
ls /dev/cu.usb*
```

### ② `.vscode/c_cpp_properties.json`

El `compilerPath` apunta al `xtensa-esp32s3-elf-gcc.exe` de Windows, y la versión de la toolchain seguramente también está vieja. Hay que poner la ruta del gcc real de macOS. Mi consejo: no dejes la ruta escrita a fuego, apóyate en la variable `toolsPath` y así no tienes que tocarlo en cada actualización:

```jsonc
"compilerPath": "${config:idf.toolsPath}/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc"
```

Ese fragmento `esp-15.2.0_20251204` no se copia a lo loco: mira qué carpeta tienes realmente bajo `~/.espressif/tools/xtensa-esp-elf/` y pon exactamente la que veas.

### ③ `dependencies.lock` — el que más gente se olvida

Es el archivo de bloqueo que genera idf-component-manager (el gestor de componentes). El que se generó en Windows usa el viejo formato v2.0.0 y, dentro, anota la **ruta absoluta** de cada componente local, por ejemplo la carpeta del autor original:

```yaml
espressif/esp_lcd_touch:
  source:
    path: C:\Users\PC\Desktop\...\espressif__esp_lcd_touch
    type: local
```

Al correr reconfigure en macOS esa ruta evidentemente no existe, y aparece:

```
CMake Error: The "path" field in the manifest file ... does not point to a directory.
```

Este archivo es, en el fondo, una caché autogenerada. Lo más rápido es borrarlo y dejar que se regenere solo:

```bash
rm dependencies.lock
rm -rf build
source ~/.espressif/tools/activate_idf_v6.0.2.sh
idf.py reconfigure
```

Al regenerarse pasa al formato v3.0.0, las rutas quedan locales, y los componentes del registry se descargan de nuevo bajo `managed_components/`.

**Hasta aquí, el `idf.py build` por terminal ya tendría que compilar sin protestar.** Si sigue fallando, el problema no está en estos archivos y hay que mirar en otro sitio.

---

## Paso 4: la extensión de VSCode dice "setup not found" (el verdadero cuello de botella)

Con la terminal funcionando, yo ya cantaba victoria. Pero al abrir VSCode me topé con que la barra de estado se quedaba todo el rato con este mensaje:

```
Current ESP-IDF setup is not found.
```

Recargué la ventana un par de veces, toqué varias claves que parecían relacionadas, ni cosquillas le hicieron. Hasta que me puse a ojear el código fuente de la extensión (el archivo `dist/extension.js`) y por fin entendí la lógica completa que sigue para encontrar el setup:

1. Lee la lista de setups instalados a partir del archivo `eim_idf.json` apuntado por `idf.eimIdfJsonPath`;
2. usa el valor de `idf.currentSetup` para buscar coincidencia por ruta dentro de esa lista;
3. si no la encuentra, recorre la lista entera por si alguno pasa la validación;
4. solo si todo lo anterior falla, escupe el "not found".

Todo este baile necesita que la lista del paso 1 se haya cargado, claro. Di dos vueltas en falso antes de dar con la causa real: la primera, para que te hagas una idea, la puedes saltar; la segunda es la que de verdad hay que cambiar. Lo digo por adelantado para que, al seguir el artículo, no te quedes con la duda de si tocar o no:

- **Rodeo uno: no hace falta tocar nada, léelo para entender el mecanismo y sigue;**
- **Rodeo dos: aquí sí hay que meter mano, esto es el arreglo de verdad.**

### Rodeo uno (no hace falta tocar, solo entender): qué debería llevar `idf.currentSetup`

La descripción oficial de esta clave reza «Current ESP-IDF setup id in eim_idf.json path», así que a primera vista parece que deba llevar un ID (un número). Pero, si miras el código, cuando la extensión selecciona un setup lo que escribe es esto:

```js
await _o("idf.currentSetup", c.idfPath, ConfigurationTarget.WorkspaceFolder, e)
```

Lo que guarda es `idfPath`, o sea, una **ruta**, no un número. Así que, si esta clave aparece en tu configuración de workspace, tendría esta pinta:

```jsonc
"idf.currentSetup": "/Users/shawn/.espressif/v6.0.2/esp-idf"
```

Pero ojo, **esta clave no tienes que tocarla a mano**: no es la causa del problema. Si la lista de setups del rodeo dos carga correctamente, la extensión solita recorre, encuentra el único v6.0.2 que tienes y reescribe `currentSetup` con la ruta. Lo cuento aquí solo para que entiendas qué pinta esa clave cuando la veas, no para que la cambies porque «tenga mala pinta». Lo que hay que cambiar de verdad es lo del siguiente rodeo.

### Rodeo dos (aquí sí se opera): el scope de `idf.eimIdfJsonPath` está mal

Las claves de configuración de VSCode tienen distintos ámbitos (scopes), y el de `idf.eimIdfJsonPath` es **`application`**: significa que **sólo se lee desde el settings.json global de User**, no desde el `.vscode/settings.json` del proyecto. Escribirla ahí no sirve para nada.

Yo llevaba un rato poniendo `eimIdfJsonPath` en la configuración del workspace, con lo cual la extensión jamás llegaba a cargar `eim_idf.json` y la lista del paso 1 estaba siempre vacía. Y con la lista vacía da igual lo que lleve `currentSetup`, que nunca va a cuadrar. Ese era el motivo real de que mis dos Reload previos no sirvieran de nada.

> **El arreglo: mueve `idf.eimIdfJsonPath` a la configuración global.**

La ruta del settings.json global de VSCode en macOS es:

```
~/Library/Application Support/Code/User/settings.json
```

Ábrelo con tu editor y añade esta línea:

```jsonc
"idf.eimIdfJsonPath": "/Users/shawn/.espressif/tools/eim_idf.json"
```

En el `.vscode/settings.json` del proyecto deja únicamente `idf.currentSetup` (con la ruta del IDF). Y por favor, no dejes también `eimIdfJsonPath` en el workspace: aunque lo pongas, no funciona, y solo te genera la falsa sensación de tenerlo bien configurado.

Después de cambiar, abre la paleta con `Cmd+Shift+P` y elige **Reload Window**. Al terminar la recarga, la barra de estado debería mostrar la versión de ESP-IDF y el chip objetivo; si es así, la extensión por fin ha encontrado tu setup.

Si después del Reload te sigue fallando, mira el log en vivo de la extensión: `Cmd+Shift+P` → `Output`, y en el desplegable de arriba a la derecha del panel elige el canal **ESP-IDF**. Lo que sale ahí es bastante más expresivo que la frase de la barra de estado.

### ¿No estás seguro del scope de una clave? Míralo, no lo adivines

El scope de cada clave de una extensión de VSCode está declarado en su propio `package.json`. En vez de suponerlo, cuatro líneas de Python te lo sacan:

```bash
python3 -c "
import json
p = json.load(open('/Users/shawn/.vscode/extensions/espressif.esp-idf-extension-2.1.0/package.json'))
cfg = p['contributes']['configuration']
props = {}
if isinstance(cfg, list):
    for c in cfg:
        props.update(c.get('properties', {}))
else:
    props = cfg.get('properties', {})
for k in ['idf.eimIdfJsonPath', 'idf.currentSetup', 'idf.espIdfPath']:
    print(k, '->', props.get(k, {}).get('scope', 'window (por defecto)'))
"
```

---

## Chuleta rápida

### Dónde va cada clave de configuración

| Clave | Scope | Dónde escribirla |
|---|---|---|
| `idf.eimIdfJsonPath` | application | settings global de User |
| `idf.currentSetup` | resource | `.vscode/settings.json` del proyecto |
| `idf.espIdfPath` / `idf.toolsPath` / `idf.pythonInstallPath` | window | Da igual en workspace o global |

### Rutas importantes

```
Fuente del IDF        ~/.espressif/v6.0.2/esp-idf
Toolchain             ~/.espressif/tools/
xtensa gcc            ~/.espressif/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin/xtensa-esp32s3-elf-gcc
Python venv           ~/.espressif/tools/python/v6.0.2/venv/bin/python
Script de activación  source ~/.espressif/tools/activate_idf_v6.0.2.sh
Manifiesto de EIM     ~/.espressif/tools/eim_idf.json
Settings global       ~/Library/Application Support/Code/User/settings.json
```

### Comandos habituales

```bash
brew tap espressif/eim                              # añade el tap oficial
brew trust espressif/eim                            # confiar la primera vez en un tap de terceros
brew install eim                                    # instala eim en sí

eim list                                              # lista las versiones instaladas
eim install -i v6.0.2 -t esp32s3 -n true ...          # instala ESP-IDF (parámetros del paso 1)

source ~/.espressif/tools/activate_idf_v6.0.2.sh      # activa el entorno ESP-IDF en el shell actual
idf.py set-target esp32s3                             # define el chip objetivo
idf.py reconfigure                                    # solo corre la configuración de cmake y genera compile_commands.json
idf.py build                                          # compila
idf.py -p /dev/cu.usbmodemXXXX flash monitor          # flashea y abre el monitor de puerto serie
```

---

## Orden para diagnosticar: si te atascan, descarta por capas

Si no sabes por dónde empezar, ve descartando en este orden. Es muchísimo más rápido que probar a ciegas:

1. **¿Consigues instalar `eim` con `brew install eim`?** Si no, fíjate si pide `brew trust`: si es así, confía y listo, mira el paso 0;
2. **¿Te corre `idf.py --version`?** Si no, el problema está en la instalación o en la activación del entorno, mira el paso 1;
3. **¿Lo que te aparece buscando en el panel de extensiones de VSCode pinta bien?** Si tras instalar ves que las claves no cuadran o el plugin no se comporta como cuenta este artículo, confirma primero que el publicador sea Espressif Systems: lo más probable es que te hayas equivocado de plugin desde el principio, mira el paso 2;
4. **¿Te pasa `idf.py reconfigure`?** Si no, el problema está en los archivos del proyecto, sobre todo en `dependencies.lock`, mira el paso 3;
5. **¿La terminal va bien pero VSCode dice setup not found?** El problema está en la configuración de la extensión, sobre todo en el scope de `eimIdfJsonPath`, mira el paso 4.

Dos desvíos típicos, para que no pierdas el tiempo:

- el tag v6.0.2 no viene acompañado de un archivo `version.txt`. **No** es que el clone haya quedado incompleto: la extensión tampoco lee ese archivo, así que no te rayes si no lo encuentras;
- el valor de `idf.currentSetup` casi nunca es la causa de un setup not found. Si te salta ese error, no te lances a cambiarlo: primero confirma que `eimIdfJsonPath` vive en el settings global y no en el de workspace.

---

Si tras seguir el recorrido sigues atascado, lo más seguro es que sea un desajuste de versiones: la forma de instalar ESP-IDF y la lógica con la que la extensión de VSCode busca el setup han cambiado varias veces en los últimos años, y los tutoriales antiguos no siempre encajan con las versiones nuevas. Mi consejo es que reúnas tu versión real de ESP-IDF, la de EIM, la de la extensión y el mensaje de error concreto, lo metas todo junto en la IA y le pidas que siga el guion «instalar herramienta → instalar IDF → limpiar archivos del proyecto → configurar extensión» de este artículo. Suele dar con la capa problemática bastante más rápido que si te pones a buscar el error palabra por palabra.
