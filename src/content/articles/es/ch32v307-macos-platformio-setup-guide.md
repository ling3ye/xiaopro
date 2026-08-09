---
title: 'Conquistando el CH32V307 en Mac desde cero: diario de trampas, de "el toolchain te suelta un montón de virus de Windows" a "el LED parpadea y el puerto serie habla"'
domain: hardware
platforms: ["mac"]
format: "tutorial"
date: 2026-08-08
intro: "¿Montas desde cero el entorno de desarrollo del CH32V307 en Mac y, tras instalar la plataforma en PlatformIO, el toolchain te planta un puñado de .exe de Windows? Este artículo es el diario tal cual de la trampa real: cambiar a mano al toolchain RISC-V nativo de macOS, levantar la cuarentena de Gatekeeper y dejar funcionando la grabación por el WCH-Link de a bordo, hasta desenterrar la verdadera causa de que «compile, grabe, el puerto serie saque texto y aun así el LED se niegue a encenderse»: el LED de usuario sale de fábrica sin estar conectado al MCU. Todos los comandos y errores son de ejecuciones reales; los 10 tropezaderos que me encontré se destapan uno por uno, para que quien venga de Arduino/ESP llegue con la vacuna puesta."
tags: ["CH32V307", "PlatformIO", "WCH-Link", "RISC-V", "desarrollo embebido macOS", "microcontrolador RISC-V", "WCH", "programación CH32V macOS"]
image: https://img.lingflux.com/2026/08/d9106f173bc51c93033527dd5e206b04.png
---

> Lingshun Lab · Serie de caídas en la trampa embebidas
>
> Hardware: **CH32V307V-EVT-R1** (depurador WCH-Link de a bordo, chip RISC-V de WCH)
> Sistema: **macOS (Apple Silicon, arm64)**
> Herramientas: VSCode + PlatformIO
> Objetivo: montar el entorno de desarrollo desde 0, hacer parpadear un LED y conseguir que el puerto serie hable — el «Hello World» indiscutido del mundo embebido

## Antes de arrancar: por qué existe este artículo

Primero voy a presentar al «personaje» de este artículo, para que cuando luego leas alguna operación mía no acabes murmurando «¿este tío ha programado microcontroladores alguna vez?».

Llevo ya unos cuantos años trasteando con Arduino y ESP-IDF; hacer parpadear un LED, conectarse al WiFi o correr MQTT es memoria muscular para mí: con los ojos cerrados soy capaz de encender un LED. Así que cuando cayó en mis manos esta CH32V307, iba pensando: «en el fondo es cambiar de chip, ¿qué tan difícil puede ser encender un LED?».

Pues la realidad me dio un buen repaso. Los «ajustes de fábrica» del ecosistema CH32 no tienen nada que ver con ese universo de Arduino y ESP donde «conectas, grabas, escribes lo correcto y se enciende»:

- **Hasta para grabar un programa hace falta sacar a un grabador específico.** En Arduino o ESP32 un solo cable USB cubre alimentación, grabación y puerto serie; en CH32, en cambio, aparece por sorpresa un depurador de a bordo llamado **wlink**, y solo para entender «con qué derecho puede colar el firmware dentro del chip» me dio unas cuantas vueltas.
- **El LED de a bordo resulta que ni siquiera está conectado al MCU.** En Arduino el LED integrado viene soldado al pin 13, y con un `digitalWrite(13, HIGH)` se enciende; el LED de usuario de esta placa… **viene con el cable «cortado» de fábrica, sin estar conectado a ningún pin**, así que toca tender un puente con un cable Dupont para que se digne a encenderse.
- **El puerto serie también te exige saber a qué puerta llamar.** La ESP32 en cuanto la conectas ya es un puerto serie USB, lo que ves es lo que hay; la CH32, en cambio, por defecto tira por un USART1 virtualizado por el depurador, y si no atinas con el puerto te queda un silencio absoluto que te obliga a mirar el monitor vacío dudando de si la placa estará muerta.

En ese momento entendí de primera mano lo que es «un veterano cayendo de hocico»: llevo más de diez años encendiendo LEDs y me atasqué con un microcontrolador RISC-V hasta dudar de mi vida entera, casi convencido de que todo lo aprendido de sistemas embebidos estos años lo había tirado por la borda.

Así que esto no es solo un «tutorial», sino también el **diario de trampas** de un viejo usuario de Arduino/ESP jugando por primera vez con CH32. Esos fallos de novato míos que a un manitas le parecerán absurdos van a quedar aquí tal cual — porque para ti, que también vienes de Arduino/ESP, lo más probable es que los pises igual. Con la vacuna puesta de antemano, las trampas siguientes te resultarán familiares.

---

Dicho el personaje, volvamos al tema. Si buscas «CH32V307 + Windows», encuentras el MounRiver Studio oficial, lo instalas y a funcionar; si buscas «CH32V307 + Linux», el toolchain oficial también te lo resuelve sin drama.

Pero si buscas «CH32V307 + macOS»… lo más probable es que te quedes en silencio. La documentación está desperdigada y toda llena de trampas ocultas. El chip en sí da la talla —núcleo RISC-V de 32 bits, hasta 144 MHz, una relación calidad-precio que deja atrás a un montón de MCU ARM— pero en Mac es «niña bonita de nadie».

Este artículo es la crónica completa de cómo monté en Mac, desde cero, el entorno de desarrollo de la CH32V307: cayendo en cada trampa y rellenándola, hasta lograr encender el LED y dejar el puerto serie funcionando. **No me salto ni una trampa**, porque lo más probable es que tú pises las mismas; poniéndolas todas sobre la mesa te ahorro un montón de desvíos. El código concreto lo tengo en GitHub (enlace al final), aquí me encargo de explicar a fondo el «por qué lo hice así».

Avance del final feliz: compilación OK, grabación OK, el LED de la placa parpadeando a ritmo fijo, y el monitor serie escupiendo a la vez:

```
CH32V307 iniciado, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

Para llegar de «no hay nada» a esa imagen, por el camino caí en por lo menos **8 trampas**. Sigue leyendo: no se queda ni una fuera.

### Tabla de contenidos

- [1. Conoce al protagonista: CH32V307V-EVT-R1](#1-conoce-al-protagonista-ch32v307v-evt-r1)
- [2. La idea general: cómo se ve esta toolchain](#2-la-idea-general-como-se-ve-esta-toolchain)
- [3. Manos a la obra: de instalar VSCode a conocer el comando pio](#3-manos-a-la-obra-de-instalar-vscode-a-conocer-el-comando-pio)
- [4. Instalar la plataforma CH32V (y la primera trampa pequeña)](#4-instalar-la-plataforma-ch32v-y-la-primera-trampa-pequena)
- [5. La trampa gorda: ¿por qué te instala un montón de .exe?](#5-la-trampa-gorda-por-que-te-instala-un-monton-de-exe)
- [6. Escapando de la trampa: cambiar al toolchain nativo de macOS](#6-escapando-de-la-trampa-cambiar-al-toolchain-nativo-de-macos)
- [7. Levantar la cuarentena de Gatekeeper](#7-levantar-la-cuarentena-de-gatekeeper-si-no-macos-lo-tomara-por-un-virus)
- [8. Verificar que el toolchain realmente corre](#8-verificar-que-el-toolchain-realmente-corre)
- [9. Crear el primer proyecto: conociendo platformio.ini](#9-crear-el-primer-proyecto-conociendo-platformioini)
- [10. La primera compilación](#10-la-primera-compilacion)
- [11. Configurar pio como comando global](#11-configurar-pio-como-comando-global)
- [12. Conexión de hardware y grabación](#12-conexion-de-hardware-y-grabacion)
- [13. Trampa 1: compila y graba bien, pero el puerto serie está en silencio absoluto](#13-trampa-1-compila-y-graba-bien-pero-el-puerto-serie-esta-en-silencio-absoluto)
- [14. Trampa 2 (la más gorda del artículo): el puerto serie ya habla, pero el LED se niega a encenderse](#14-trampa-2-la-mas-grande-del-articulo-el-puerto-serie-ya-habla-pero-el-led-se-niega-a-encenderse)
- [15. Cuando todo funcione: cómo queda el main.c completo](#15-cuando-todo-funcione-como-queda-el-mainc-completo)
- [16. Tabla resumen de trampas](#16-tabla-resumen-de-trampas)
- [17. Cheatsheet de comandos y rutas clave](#17-cheatsheet-de-comandos-y-rutas-clave)
- [18. Construye tu propia «lógica de desarrollo CH32»](#18-construye-tu-propia-logica-de-desarrollo-ch32-para-el-proximo-proyecto-a-copiar-y-pegar)
- [19. Preguntas frecuentes (FAQ)](#19-preguntas-frecuentes-faq)
- [20. Qué más explorar cuando ya tengas todo funcionando](#20-que-mas-explorar-cuando-ya-tengas-todo-funcionando)
- [21. Referencias](#21-referencias)

---

## 1. Conoce al protagonista: CH32V307V-EVT-R1

Antes de arrancar, dedícale dos minutos a conocer la placa, porque el 90 % de las trampas del resto del artículo tienen que ver con su «personalidad».

| Característica | Notas |
| --- | --- |
| Chip principal | CH32V307VCT6, núcleo QingKe V4F de WCH, RISC-V de 32 bits, hasta **144 MHz**, paquete LQFP80 |
| Flash real | **288 KB** (pero PlatformIO compila por defecto con Flash 256 KB + SRAM 64 KB; más adelante explico por qué no hace falta tocarlo) |
| Depurador de a bordo | **WCH-Link** (en realidad está «hecho» con un chip CH32V305, efecto equivalente al WCH-LinkE oficial) |
| Puerto USB | un solo USB-C cubre alimentación, depuración y puerto serie virtual |
| LED de usuario | dos unidades, LED1 y LED2 — **⚠️ por defecto están flotando, ¡sin conexión al MCU!** (la trampa más gorda del artículo; sección 14 a fondo) |
| Pulsador de usuario KEY | también flotando por defecto |
| LED de alimentación | 1 unidad, se enciende fijo al dar corriente; no tiene nada que ver con tu código — mucha gente lo ve encenderse al conectar y cree que «ya ha parpadeado», cuando en realidad solo es el piloto de corriente |

Hay otro detalle fácil de pasar por alto en la placa: entre el chip del depurador integrado (CH32V305) y el chip objetivo (CH32V307), de fábrica vienen puenteados con **4 jumpers** (los serigrafados `RX1-TX0`, `TX1-RX0`, `DIO-DIO0`, `CLK-CLK0`), que se encargan de «pasar al otro lado del puente» la señal SWIO y las señales del puerto serie del depurador al chip objetivo.

> ⚠️ **Estos 4 jumpers vienen puestos de fábrica; no se te ocurra quitarlos.** Si lo haces, en el mejor de los casos no graba, y en el peor el puerto serie desaparece sin dejar rastro. Te pondrás a pensar que es tu código, cuando en realidad es un cable físico que se ha ido — y pasarte media hora tirándote de los pelos para descubrir que eran los jumpers no mola, no preguntes cómo lo sé.

Bueno, presentados los actores, vamos a montar el entorno.

---

## 2. La idea general: cómo se ve esta toolchain

Primero un «retrato de familia», para dejar claro quién manda sobre quién:

```
┌──────────────────────────────────────────────────────────┐
│  Extensión VSCode + PlatformIO IDE (GUI: compilar/grabar/ │
│  depurar/puerto serie)                                    │
│                          │                                │
│                   PlatformIO Core (CLI pio)               │
│                          │                                │
│            ┌─────────────┴──────────────┐                 │
│       Plataforma ch32v (community: Community-PIO-CH32V)   │
│            │                             │                 │
│   ┌────────┼─────────┬───────────┐       │                 │
│ toolchain  wlink    openocd    board     │                 │
│(RISC-V GCC)(grabar)(depurar) (def. placa)│                │
└──────────────────────────────────────────┘
                     │ USB
        CH32V307V-EVT-R1 (WCH-Link de a bordo)
```

![](https://img.lingflux.com/2026/08/73dff7f41fe1d3c38d06447b98a39f2b.png)

**En una frase**: la extensión de PlatformIO en VSCode es la interfaz, pero quien hace el trabajo de verdad es la herramienta de línea de comandos `pio`; y `pio` depende a su vez de una plataforma comunitaria llamada `Community-PIO-CH32V`, que empaqueta todo junto —compilador (toolchain) + herramienta de grabación (wlink) + herramienta de depuración (openocd) + parámetros de placa (board)— para que, en teoría, con instalarlo una vez ya funcione.

Esta plataforma comunitaria es un lujazo: soporta nativamente toda la familia CH32V003/103/203/30x, y además te ofrece varios frameworks para elegir, como la biblioteca de periféricos oficial de WCH (noneos-sdk), FreeRTOS, RT-Thread, Arduino o ch32fun.

Pero —y aquí viene el giro más gordo de todo el artículo— **esta plataforma viene configurada por defecto pensando en usuarios de Windows**, así que cuando la instalen en macOS lo más probable es que se queden de piedra. En qué sentido se quedan de piedra, lo veremos en seguida.

---

## 3. Manos a la obra: de instalar VSCode a conocer el comando pio

### Step 0: confirma el entorno base

Abre la terminal y tócale un poco las pulseras:

```bash
python3 --version          # necesita ser 3.x
brew --version              # Homebrew, no imprescindible pero muy recomendable
uname -m                    # en Apple Silicon debe devolver arm64; en Intel Mac, x86_64
```

Luego instala VSCode + la extensión PlatformIO:

1. Descarga e instala VSCode desde https://code.visualstudio.com/.
2. Abre VSCode, icono de «Extensiones» en la barra izquierda → busca `PlatformIO IDE` → Install.
3. Cuando termina, la extensión vuelca PlatformIO Core en `~/.platformio/` (unos cientos de MB, con su propio virtualenv de Python); abajo a la derecha verás una barra de progreso, dale unos minutos de paciencia.

Cuando termine, en la barra izquierda aparecerá un icono con forma de hormiga —es el logo de PlatformIO (su mascota es, literalmente, una hormiga).

### Step 1: encuentra el comando pio, que está escondido

Tras instalar la extensión, el comando `pio` ya existe, solo que no está en el PATH del sistema: si escribes `pio` en la terminal, no lo encuentra. En realidad vive aquí:

```bash
~/.platformio/penv/bin/pio
```

Verifícalo:

```bash
~/.platformio/penv/bin/pio --version
# PlatformIO Core, version 6.1.19
```

Para que sea más cómodo teclear, define una variable temporal (solo vive en la ventana actual de la terminal):

```bash
PIO=~/.platformio/penv/bin/pio
```

A partir de aquí, cada vez que veas `$PIO` en los comandos del artículo, me refiero a esta ruta. Cuando todo esté listo, en el paso 9 lo convertiremos en comando global para que baste con escribir `pio`.

---

## 4. Instalar la plataforma CH32V (y la primera trampa pequeña)

Instala la plataforma comunitaria con el gestor de paquetes de PlatformIO:

```bash
$PIO pkg install -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git
```

En este paso hay dos detalles donde es facilísimo patinar:

> **Trampa 1: fácil equivocarse con el nombre de la organización.** El nombre correcto de la organización en GitHub es `Community-PIO-CH32V` (ojo, lleva las tres letras **PIO** en el medio, en mayúsculas). Muchos artículos y posts antiguos por ahí escriben `community-ch32v` (sin PIO), y si lo copias tal cual te suelta un error bastante frustrante:
> ```
> remote: Repository not found.
> ```
> Copia `Community-PIO-CH32V` tal cual, sin inventar.

> **Trampa 2: usar el comando anticuado.** Los tutoriales antiguos son muy fans de `pio platform install ...`, un comando que en las versiones nuevas de PlatformIO está **deprecado** y suelta un `This command is deprecated`. A día de hoy se usa `pio pkg install -g -p <dirección>` por norma.

Al lanzar el comando va tirando de la plataforma, el toolchain RISC-V, openocd y wlink, cuatro paquetes. Todo pinta bien y el log no se queja. **Pero no tires las palmas todavía** — la trampa gorda viene ahora.

---

## 5. La trampa gorda: ¿por qué te instala un montón de `.exe`

Esta es la sección con más sustancia del artículo, y donde la inmensa mayoría de usuarios de macOS se atascan y empiezan a dudar de su vida.

Tras instalar la plataforma, echamos un ojo al toolchain que se ha descargado localmente:

```bash
ls ~/.platformio/packages/toolchain-riscv/bin/ | head
# riscv-none-embed-addr2line.exe
# riscv-none-embed-ar.exe
# riscv-none-embed-as.exe
# ...
```

Y ahora la herramienta de grabación wlink:

```bash
file ~/.platformio/packages/tool-wlink/wlink.exe
# PE32 executable (console) Intel 80386, for MS Windows
```

¿Lo ves? Todo son **`.exe`** —binarios PE32 de Windows de toda la vida—, que en macOS no son más que chatarra: ni se abren con doble clic, y mucho menos compilan código. La sensación al verlo por primera vez es más o menos: «yo estoy en Mac, ¿por qué me mandas cosas de Windows, de qué vamos?».

### A la raíz: el problema vive en `platform.json`

Abre el archivo de configuración de esta plataforma y mírale las tripas:

```bash
cat ~/.platformio/platforms/ch32v/platform.json | python3 -m json.tool | grep -A3 toolchain-riscv
```

El resultado es este:

```json
"toolchain-riscv": {
  "type": "toolchain",
  "owner": "platformio",
  "version": "https://github.com/Community-PIO-CH32V/toolchain-riscv-windows.git"
}
```

**Caso resuelto**: el archivo de configuración de esta plataforma tiene **escrito a fuego** el origen del toolchain como `toolchain-riscv-windows.git`, y la herramienta de grabación wlink igual, con la rama `#windows`. Al instalar, PlatformIO no es lo suficientemente listo para mirar «qué sistema usas», sino que instala lo que pone el archivo, mandando la versión de Windows a todo el mundo — incluyéndonos a los pobres macusers.

**La buena noticia**: la misma organización `Community-PIO-CH32V` lleva tiempo publicando repos nativos de macOS; simplemente no son el valor por defecto. Con la raíz ya localizada, la patched correspondiente cae por su propio peso — **bastará con sustituir manualmente esos dos paquetes de Windows por sus versiones nativas de macOS**. Cómo se hace y en qué fijarse en cada paso, lo verás en el siguiente capítulo.

---

## 6. Escapando de la trampa: cambiar al toolchain nativo de macOS

### 6.1 Sustituir el compilador RISC-V

Primero borra la versión errónea de Windows:

```bash
rm -rf ~/.platformio/packages/toolchain-riscv
```

Luego instala la versión nativa de macOS:

```bash
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/toolchain-riscv-mac.git
```

Si todo va bien verás algo así:

```
Tool Manager: toolchain-riscv@1.80200.190731+sha.99cb62f has been installed!
```

Tras instalarlo puedes comprobar que su `package.json` dice `"system": ["darwin_x86_64", "darwin_arm64"]`, lo que confirma que es para macOS; el nombre del paquete sigue siendo `toolchain-riscv`, así que reemplaza sin fricción a la versión de Windows anterior.

> **¿Por qué este paso usa la rama `main` y no la rama `gcc12`, que parece más nueva?**
>
> Aquí hay un detalle técnico bastante escurridizo. El script de build de la plataforma (`builder/main.py`) lleva esta lógica:
> ```python
> is_gcc_12 = platform.get_package_version("toolchain-riscv").split(".")[1].startswith("12")
> compiler_triple = "riscv-wch-elf" if is_gcc_12 else "riscv-none-embed"
> ```
> Traducido a cristiano: el script mira el **segundo segmento del número de versión** del toolchain que tengas instalado; si es tipo `1.8.x`, asume que el prefijo del ejecutable del compilador es `riscv-none-embed-gcc`; si es `1.12.x`, asume que es `riscv-wch-elf-gcc`. Estos dos prefijos se corresponden con nombres de ejecutables completamente distintos, así que si te equivocas, el comando que el script de build intenta invocar no existe en el disco y peta directamente.
>
> La rama `main` instala justo la versión `1.80200.190731` (que equivale a gcc 8.2.0), la misma que la versión de Windows que la plataforma traía codificada por defecto, así que dispara la rama `riscv-none-embed` —exactamente lo que el script esperaba—. Cero riesgo, la opción más estable.

Tras la instalación hay un detalle a tener en cuenta:

> ⚠️ **Este compilador gcc8 es, en realidad, un binario x86_64**: está compilado para Intel Mac, no para Apple Silicon nativo arm64. El motivo es sencillo: xPack (el empaquetador aguas arriba del toolchain) en la época de gcc8 aún no publicaba builds arm64. Así que en un Mac de la serie M este compilador se ejecuta traducido a través de **Rosetta 2**. Suena poco «nativo», pero en la práctica compila perfectamente; no le des más vueltas. La primera vez, el sistema te pedirá instalar Rosetta; lo instalas y fuera.

### 6.2 Sustituir la herramienta de grabación wlink

Misma operación, cambia la versión de Windows de wlink por la nativa de macOS:

```bash
rm -rf ~/.platformio/packages/tool-wlink
$PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_arm64
```

> Si estás en un Mac antiguo con chip Intel, el nombre de la rama cambia a `mac_x64`:
> ```bash
> $PIO pkg install -g -t https://github.com/Community-PIO-CH32V/tool-wlink.git#mac_x64
> ```

Al terminar lo confirma con:

```
Tool Manager: tool-wlink@0.23.241116+sha.0c802d4 has been installed!
```

> **openocd se toca poco, está bien tal cual.** `openocd` (la herramienta de depuración) viene del registro oficial de PlatformIO, no se tira directamente de `Community-PIO-CH32V`, y el registro ya sabe asignar la arquitectura según el sistema operativo, así que en Apple Silicon se instala directamente en su versión arm64 nativa. Se puede verificar:
> ```bash
> file ~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd
> # Mach-O 64-bit executable arm64  ✅ tranquilo, este está bien
> ```

### 6.3 Corrección importante: al final lo que queda estable y usable es gcc12 / arm64 nativo

Llegados a este punto tengo que meter una verdad como un puño, y además una **autocorrección**: el razonamiento de la sección 6.1 sobre «por qué usar la rama `main` (gcc8)» era una conclusión **teórica** que saqué simplemente de leer el código del script de build — la lógica del script no estaba mal, pero para saber «qué versión te conviene instalar» no basta con leer código; al final hay que compilar, grabar y correr en la placa real para darlo por bueno.

**Revisando a fondo el entorno que finalmente funcionó en placa —compilación, grabación y ejecución reales— sale esto: la versión realmente estable, y además nativa arm64 para Apple Silicon (sin necesidad alguna de Rosetta), es gcc 12.2.0, con prefijo de ejecutable `riscv-wch-elf-gcc`.** Lo que yo temía —«la rama gcc12 será problemática, a lo mejor el ejecutable correspondiente ni existe»— en la práctica no se sostiene: este toolchain no solo existe, sino que es la versión más completa, más reciente y más fina de toda la familia, y encima trae GDB de serie, todo de una tacada.

Así que la conclusión se invierte: **si vas a instalar ahora, instala directamente gcc 12.2.0 / arm64 nativo / `riscv-wch-elf-gcc` como objetivo.** La rama gcc8/x86_64 vía Rosetta de la sección 6.1 se queda como mensaje de emergencia —«si lo que te instaló es esta versión, tampoco te asustes, funciona igual»— pero no hace falta ir a por ella a propósito.

La razón por la que dejo en el artículo este proceso de «metí la pata y luego me corrijo» en lugar de borrarlo en silencio es que de por sí es una lección valiosa: **leer el script de build y los patrones de versiones te ayuda a entender «por qué pasa esto», pero la conclusión de «qué versión instalar» al final se valida compilando y grabando de verdad; fiarse solo de la lectura del código te lleva a conclusiones demasiado conservadoras.**

### 6.4 Entorno final confirmado: especificación técnica completa

Lo que sigue lo obtuve reventando a fondo el entorno que realmente compiló y cargó en la placa; te recomiendo usar esta configuración como referencia:

| Categoría | Componente / campo | Valor |
| --- | --- | --- |
| Compilador | Nombre | xPack GNU RISC-V Embedded GCC (**versión personalizada de WCH**, la misma que viene con MounRiver Studio) |
| Compilador | Nombre del ejecutable | `riscv-wch-elf-gcc` (toda la suite comparte el prefijo `riscv-wch-elf-`) |
| Compilador | Versión de GCC | **12.2.0** |
| Compilador | Triple objetivo (target triple) | `riscv-wch-elf` |
| Compilador | Host de build/ejecución | `aarch64-apple-darwin23.6.0` (**nativo de Apple Silicon**, sin pasar por Rosetta) |
| Compilador | ABI por defecto | `ilp32` (32 bits, convención de llamada con coma flotante por software) |
| Compilador | ARCH por defecto | `rv32imac` (I enteros / M producto-cociente / A atómicas / C instrucciones comprimidas) |
| Compilador | ISA spec | 2.2, multilib habilitado |
| Compilador | Modelo de hilos | single (bare metal, sin sistema operativo) |
| Compilador | Librería estándar de C | **newlib 4.2.0** (de aquí viene la implementación de funciones como `printf`) |
| Compilador | binutils (ensamblador/enlazador) | **GNU binutils 2.38** (`as`, `ld.bfd`, `objcopy` vienen de aquí) |
| Compilador | Depurador | el toolchain ya trae `riscv-wch-elf-gdb`, no hace falta instalar nada aparte |
| Compilador | Ruta de los binarios | `~/.platformio/packages/toolchain-riscv/bin/` |
| Compilador | sysroot | `~/.platformio/packages/toolchain-riscv/riscv-wch-elf/` |
| Compilador | Paquete PIO / versión del paquete | `toolchain-riscv` @ `1.120200.220829` |
| Compilador | Origen | xPack (`riscv-none-elf-gcc-xpack`), construido sobre GCC 12.2.0 aguas arriba |
| Entorno de build | PlatformIO Core | 6.1.19 |
| Entorno de build | Plataforma platform-ch32v | 1.1.0 (mantenida por Community-PIO-CH32V) |
| Entorno de build | Framework framework-wch-noneos-sdk | 2.30000.0 (biblioteca de periféricos estándar de WCH, bare metal) |
| Entorno de build | Sistema de build | PlatformIO interno (basado en SCons + Python) |
| Entorno de build | Chip objetivo | CH32V307VCT6, ChipID `0x30700568`, QingKe V4F @144 MHz |
| Entorno de carga | Herramienta de carga | **wlink 0.1.1** (la realmente en uso; paquete PIO `tool-wlink` @ `0.23.241116`) |
| Entorno de carga | Protocolo de carga | `wlink` (lo que se configura con `upload_protocol` en `platformio.ini`) |
| Entorno de carga | Firmware del depurador | WCH-Link v2.18 (v38), hardware basado en CH32V305 |
| Entorno de carga | Alternativa: OpenOCD | `0.11.0+dev-snapshot` (2026-02-28), paquete PIO `2.1100.260228` |
| Entorno de carga | Alternativa: wchisp | `0.2.3`, paquete PIO `0.23.240914` |
| Entorno de carga | Alternativa: minichlink | `0.1.0` |

> No lo confundas: **la versión real del compilador es GCC 12.2.0**; `1.120200.220829` es la numeración que le da PlatformIO por su cuenta (más o menos `1.` + `12.2.0` + `0` + fecha de empaquetado `220829`), no la versión del compilador en sí. No mezcles las dos.

**Suite completa del toolchain** (todas comparten el prefijo `riscv-wch-elf-`, 30 ejecutables, se instalan de una vez):

- **Compilación y enlazado habituales**: `gcc` `g++` `c++` `cpp` `ld` `ld.bfd` `as`
- **Procesado de binarios**: `objcopy` `objdump` `readelf` `nm` `size` `strip` `strings` `addr2line`
- **Herramientas de archivo**: `ar` `ranlib` `gcc-ar` `gcc-nm` `gcc-ranlib`
- **Depuración / análisis**: `gdb` `gdb-py3` `gprof` `gcov` `gcov-tool` `gcov-dump`
- **Otros**: `gfortran` `elfedit` `c++filt` `lto-dump`

Esta lista no hace falta aprendérsela de memoria; déjala como diccionario de consulta — por ejemplo, si el día de mañana quieres ver cuánto ocupa una función tras compilar, busca `riscv-wch-elf-size`; para desensamblar y ver las instrucciones generadas, `riscv-wch-elf-objdump -d`. Todas estas herramientas ya están tranquilamente esperándote en `~/.platformio/packages/toolchain-riscv/bin/` desde el momento en que instalaste el toolchain.

### 6.5 Seguir y actualizar la versión del compilador: dónde ver la última y cómo subir

El toolchain no se instala una vez y adiós; la versión comunitaria sigue actualizándose. Pero para entender «cómo ir a por la última» hay que asumir antes una realidad que vuelve loco a cualquiera: **tu compilador es una «muñeca rusa de tres capas» y, encima, con dos «últimas versiones» distintas.**

**Primero lo claro: estructura de tres capas + dos «últimas versiones»**

| Capa | Qué es | Última actual | Ritmo de actualización |
| --- | --- | --- | --- |
| ① La que usas tú en PIO (personalizada WCH) | Lleva el triple `riscv-wch-elf` + parches exclusivos de WCH para el núcleo QingKe | **GCC 12.2.0** (lo que te has instalado) | **Casi no se mueve**, lleva tiempo anclada en 12.2.0 |
| ② El empaquetador de ① | Community-PIO-CH32V reempaqueta ① como paquete PIO | Igual (release `riscv-none-embed-gcc 12.2.0-3`) | Sigue a ① |
| ③ Aguas arriba (vanilla) | GCC RISC-V genérico de xPack, **sin los parches de WCH** | **GCC 15.2.0** (2025-10-23) | Se actualiza sin parar, pegado a GNU GCC aguas arriba |

> **Aviso clave**: cuando por ahí dicen «la versión comunitaria sigue actualizándose», se refieren a la capa ③ (xPack, ya en 15.2.0), no a la capa ① (personalizada de WCH, aún en 12.2.0) que es la que de verdad usas para CH32V. Las dos líneas **no se pueden mezclar**: si sustituyes tu compilador actual por xPack 15.2.0 pierdes los parches exclusivos de WCH para el núcleo QingKe, y ciertas características de CH32V pueden dejar de funcionar. **Para desarrollar con CH32V, sigue ① y ②; no te lanzas a ciegas sobre la última de ③.**
>
> De regalo, una pequeña habilidad: la cadena de identidad completa de tu compilador, `riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0`, se lee de un vistazo en tres datos — `wch-elf` es la marca de personalización WCH, `xPack` es el empaquetador aguas arriba, y `arm64` confirma que es la versión nativa de Apple Silicon.

**Cómo comprobar qué versión tienes instalada**

```bash
# 1. ver la versión del paquete PIO (la numeración propia de PlatformIO; no es la versión del compilador)
pio pkg list | grep -i riscv

# 2. ver la identidad completa del compilador (versión, triple objetivo, ABI, ARCH, host de build — la más recomendada para memorizar)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc -v

# 3. ver la versión de la librería de C (newlib) — printf está implementado aquí
grep "_NEWLIB_VERSION" ~/.platformio/packages/toolchain-riscv/riscv-wch-elf/include/_newlib_version.h

# 4. ver la versión de binutils (ensamblador/enlazador)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-ld.bfd --version

# 5. ver en qué fuente «clava» el toolchain el platform.json (decide qué repositorio se tira al actualizar)
grep -A3 '"toolchain-riscv"' ~/.platformio/platforms/ch32v/platform.json
```

**Dónde ver las últimas versiones (tres canales, ordenados por relevancia para ti)**

- **Canal 1: WCH oficial / MounRiver (el verdadero aguas arriba de la versión personalizada de WCH, el más relevante).** El triple `riscv-wch-elf` y los parches del núcleo de WCH tienen su origen en el MounRiver Studio oficial de WCH — la información de build del compilador lleva una ruta tipo `/Users/mrs/...` (mrs = MounRiver Studio), esa es la pista. La página de descarga está en `www.mounriver.com` (busca «MounRiver Studio» y la sección de toolchains), y el repositorio oficial del SDK está en `github.com/openwch`. La serie actual del toolchain de MRS es v1.91 (textualmente, el release notes de Community-PIO-CH32V lo pone como "Update toolchain to v1.91").
- **Canal 2: empaquetado de Community-PIO-CH32V (lo que de verdad usas en PIO).** Básicamente reempaqueta el toolchain de WCH/MounRiver como paquete PlatformIO; seguir sus releases te enteras en primicia de cuándo hay versión nueva por el lado PIO: `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`. Para recibir aviso cuanto antes, en la esquina superior derecha pulsa Watch → Custom → Releases, o suscríbete al RSS: `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases.atom`.
- **Canal 3: xPack aguas arriba (vanilla, lo más rápido de actualizar, solo para estar al tanto)**: releases en `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack/releases`, con el historial más completo en `npmjs.com/package/@xpack-dev-tools/riscv-none-elf-gcc`; actualmente la última es 15.2.0-1.1.

**Cómo actualizar (y una trampa que hay que esquivar)**

```bash
# actualizar toda la plataforma ch32v (incluye framework y toolchain; solo cambia de verdad cuando Community-PIO-CH32V publica una versión nueva)
pio pkg update -g -p https://github.com/Community-PIO-CH32V/platform-ch32v.git

# o actualizar solo el paquete del toolchain
pio pkg update -g -t toolchain-riscv
```

> ⚠️ **Trampa que evitar al actualizar (conecta con la Q3 del FAQ, capítulo 19):** como vimos en el capítulo 5, `platform.json` codifica el origen del toolchain **como un repositorio de Windows**. Quiere esto decir que si lanzas `pio pkg update` o reinstalas la plataforma entera, lo más probable es que la versión nativa de macOS que tanto te costó poner **se sobrescriba de vuelta a la versión de Windows**. Si te pasa, vuelve a pasar por los pasos de sustitución de 6.1 / 6.2; y si lo quieres solucionar de raíz, hazte un fork del repositorio de la plataforma, cambia `platform.json` para que apunte a la versión de macOS por defecto y a dormir.
>
> Refuerzo de la dirección correcta: actualizas para pillar la nueva versión del **toolchain personalizado de WCH** que sigue Community-PIO-CH32V, no para irte detrás de xPack 15.2.0. Para CH32V dentro de PIO, toma siempre ① y ② (versión personalizada WCH) como referencia.

---

## 7. Levantar la cuarentena de Gatekeeper (si no, macOS lo tomará por un «virus»)

macOS lleva un mecanismo de seguridad por el cual cualquier ejecutable descargado por red (también cuenta `git clone`) se marca con una etiqueta de cuarentena llamada `com.apple.quarantine`. Si un archivo marcado no está firmado por Apple, al ejecutarlo el sistema lo intercepta y te suelta un error que suele ser así:

```
"xxx" cannot be opened because the developer cannot be verified
```

O, más expeditivo:

```
killed: 9
```

Tanto el compilador como el grabador que acabamos de instalar entran de lleno en el perfil «sin firma y descargado por red», así que conviene quitarles la etiqueta de cuarentena por adelantado:

```bash
xattr -dr com.apple.quarantine ~/.platformio/packages/toolchain-riscv
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-wlink
xattr -dr com.apple.quarantine ~/.platformio/packages/tool-openocd-riscv-wch
```

> `-r` es recursivo: limpia la cuarentena de todos los archivos del directorio; y aunque un archivo no la tenga, el comando no se queja, así que es una de esas operaciones «por si acaso» que no hacen daño. Ejecuta con tranquilidad.

---

## 8. Verificar que el toolchain realmente corre

Tras instalar, no vuelques un proyecto todavía; dedícale diez segundos a confirmar que las tres piezas clave se ejecutan:

```bash
# compilador (según la versión final confirmada en el capítulo 6: gcc 12.2.0, arm64 nativo, no necesita Rosetta)
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# riscv-wch-elf-gcc (xPack GNU RISC-V Embedded GCC arm64) 12.2.0

# si lo que te instaló resulta ser la versión antigua gcc8/x86_64, cambia comando y salida en consecuencia:
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
# riscv-none-embed-gcc (xPack GNU RISC-V Embedded GCC x86_64) 8.2.0

# herramienta de grabación (arm64 nativo)
~/.platformio/packages/tool-wlink/wlink --version
# wlink 0.1.1

# herramienta de depuración (opcional, arm64 nativo)
~/.platformio/packages/tool-openocd-riscv-wch/bin/openocd --version
```

> **Recordatorio sobre Rosetta:** la versión gcc12/arm64 nativa, en teoría, no necesita Rosetta para nada. Pero si lo que te instaló es la versión antigua gcc8/x86_64, en la primera llamada puede salirte un diálogo del sistema ofreciendo instalar Rosetta 2; dile que sí, es una operación única y no te lo vuelve a preguntar. Con que los comandos de arriba devuelvan un número de versión, el entorno queda confirmado.

---

## 9. Crear el primer proyecto: conociendo `platformio.ini`

### 9.1 Qué pinta tiene la estructura del proyecto

El esqueleto de un proyecto PlatformIO minimalista se compone de dos cosas:

```
ch32v307-test/
├── platformio.ini      # archivo de configuración del proyecto; «qué chip, qué framework y cómo se graba» va todo aquí
└── src/
    └── main.c           # tu firmware, punto de entrada del programa
```

Crear un proyecto vacío desde la línea de comandos también funciona (si prefieres el asistente gráfico «New Project» dentro de VSCode, el resultado es exactamente el mismo):

```bash
$PIO project init -d ~/ch32v307-test --board ch32v307_evt
```

### 9.2 `platformio.ini` destripado línea por línea

Es el archivo de configuración más importante de todo el proyecto; vas a tratar con él en cada proyecto nuevo, así que vale la pena destriparlo a fondo. Sería algo así:

```ini
[env]
platform = ch32v
framework = noneos-sdk
monitor_speed = 115200
; depurador WCH-Link de a bordo; wlink es una herramienta de grabación con soporte nativo para macOS arm64
upload_protocol = wlink

[env:ch32v307_evt]
board = ch32v307_evt
; configuración de fábrica de la EVT-R1: Flash 256K + SRAM 64K (coincide con el valor por defecto del board, no hace falta sobreescribirlo)
; para cambiar a 288K Flash / 32K SRAM u otra distribución, primero hay que modificar las option bytes con la herramienta de WCH,
; y luego descomentar aquí para sincronizar:
; board_upload.maximum_size = 294912
; board_upload.maximum_ram_size = 32768
```

Vamos una a una:

- **`[env]`**: el «área de configuración común» — lo que pongas debajo aplica a todos los entornos (env). Si tu proyecto más adelante va a soportar varias placas distintas, dejar aquí los parámetros comunes te ahorra repetir.
- **`platform = ch32v`**: le dice a PlatformIO qué plataforma usar — la comunidad `Community-PIO-CH32V` que estuvimos peleando todo el rato para instalar.
- **`framework = noneos-sdk`**: selecciona la biblioteca estándar de periféricos oficial de WCH (desarrollo bare metal, sin scheduler de sistema operativo); el framework de entrada más clásico y con más documentación. El paquete asociado es `framework-wch-noneos-sdk`, y la versión que en este artículo se ha confirmado funcional es `2.30000.0`. Si más adelante quieres jugar con multitarea, cambia esta línea por `freertos` o `rt-thread` sin tocar casi nada más — una de las ventajas del ecosistema PlatformIO.
- **`monitor_speed = 115200`**: la velocidad del monitor de puerto serie (`pio device monitor`). **Este número tiene que coincidir con el que pasas a `USART_Printf_Init()` en tu código**; si no cuadran, lo que sale por el puerto serie es una masa ininteligible —una trampita clásica para recién llegados.
- **`upload_protocol = wlink`**: le dice a PlatformIO qué herramienta usar para grabar el programa en la placa. Hay más de un protocolo disponible (más abajo, en el capítulo 12, hay una tabla completa); para usuarios de macOS arm64 lo más fácil es `wlink`, que es el soportado nativamente.
- **`[env:ch32v307_evt]`**: un entorno concreto — el nombre es libre, pero por costumbre se alinea con el modelo de placa para que sea más fácil de gestionar.
- **`board = ch32v307_evt`**: el modelo concreto de placa; PlatformIO carga a partir de aquí toda la definición de pines, el tamaño de Flash/RAM, el reloj por defecto, etc.
- **Las líneas comentadas de Flash/RAM**: aquí se esconde un detalle que vuelve loco a uno — el chip de esta placa EVT-R1 tiene físicamente **288 KB** de Flash, pero el `board` por defecto entrega **256 KB**. No corras a cambiarlo: no es un bug. La configuración de fábrica de las option bytes ya reparte la memoria como 256 KB de Flash + 64 KB de SRAM, justo lo que trae el `board` por defecto, así que en fase de aprendizaje no hace falta tocar estas dos líneas. Cuando de verdad necesites exprimir los 288 KB completos, primero tendrás que cambiar las option bytes del chip con la herramienta oficial de WCH y luego venir aquí a sincronizar estas dos líneas — es una operación avanzada, en fase de entrada déjala correr.

### 9.3 Leer la plantilla `main.c` que genera PlatformIO: monta tu «lógica de desarrollo CH32»

Esta es la sección clave de las claves. La primera vez que abres el `main.c` autogenerado por PlatformIO, mucha gente se asusta con el bloque de `#if defined(...)` del principio y piensa «qué exageración». No temas, vamos a destriparlo y verás que no es para tanto; además, una vez lo entiendes, da igual el chip de WCH que te caiga en las manos: entiendes el patrón al instante.

La plantilla empieza así (extracto):

```c
// ① según la macro de compilación, escoge automáticamente la cabecera del chip actual
#if defined(CH32V003)
#include <ch32v00x.h>
#elif defined(CH32V10X)
#include <ch32v10x.h>
#elif defined(CH32V30X) || defined(CH32V31X)
#include <ch32v30x.h>
// ... detrás vienen V20X / X035 / L103 / H417 y unas cuantas ramas más
#endif
#include <debug.h>   // ← esta línea es clave: ofrece init de USART, retardos y redirección de printf
```

**¿Por qué el código tiene este aspecto?** Porque la plantilla de PlatformIO es un único código compartido por **toda la familia de chips de WCH** — CH32V003, CH32V307, CH32X035… decenas de chips comparten el mismo esqueleto `main.c`, y una ristra de `#if defined(...)` «adivina» en tiempo de compilación qué chip estás usando, para luego hacer `#include` de la cabecera oficial correspondiente. Estas macros las define por detrás la combinación `platform = ch32v` + `board = ch32v307_evt`, no tienes que escribir nada a mano.

**Para nuestra CH32V307**, lo que de verdad se activa son solo dos líneas:

```c
#include <ch32v30x.h>   // definición de periféricos de la serie CH32V30X (registros, GPIO_InitTypeDef, etc., vienen de aquí)
#include <debug.h>      // la biblioteca auxiliar de depuración clave
```

Una vez ves esto, todo el bloque de `#if defined` deja de ser «lógica complicada» y pasa a ser «un selector entre opciones». Pillado el patrón, cuando el día de mañana te caiga cualquier placa nueva de la familia CH32 y veas una plantilla parecida, ya no te echarás para atrás. **Es lo que llamo la «lógica de desarrollo CH32»: primero mira a qué cabecera de serie corresponde la placa, y luego qué helpers ofrece `debug.h`.**

### 9.4 Qué esconde `debug.h` por dentro

Esta cabecera viene con el SDK oficial de WCH y la usa prácticamente cualquier proyecto de CH32. Conocer de antemano las funciones que ofrece te ahorra un montón de dolores de cabeza:

```c
void Delay_Init(void);                        // inicializa el timer del sistema usado para retardos
void Delay_Us(uint32_t n);                    // retardo en microsegundos
void Delay_Ms(uint32_t n);                    // retardo en milisegundos
void USART_Printf_Init(uint32_t baudrate);    // inicializa USART1 y redirige printf a él
```

El `debug.c` de acompañamiento (también del SDK, no tienes que escribirlo tú) implementa la función `_write()` que la librería estándar de C exige, y la conecta a USART1. **Eso significa que no tienes que escribir nada de redirección: basta con llamar una vez a `USART_Printf_Init(115200)` para que cualquier `printf(...)` posterior se imprima por el puerto serie** — algo que mucha gente nueva en microcontroladores pasa por alto y que es comodísimo. Cuando pises la trampa del «puerto serie sin salida» que viene más adelante, esta línea de código se te grabará.

### 9.5 Un ejemplo mínimo que «compila pero no hace nada»

Antes de meternos en el Hello World, vamos a un código de parpadeo básico para sentir el patrón habitual del manejo de GPIO en CH32:

```c
#include <ch32v30x.h>   // cabecera de la serie CH32V30X; la configuración del board decide cuál se incluye
#include <debug.h>

#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);   // configura el grupo de prioridades de interrupción (apertura estándar)
    SystemCoreClockUpdate();                          // refresca la variable del reloj del sistema (también apertura estándar)
    Delay_Init();                                     // inicializa la funcionalidad de retardos

    GPIO_InitTypeDef GPIO_InitStructure = {0};

    BLINKY_CLOCK_ENABLE;                               // ① primero «dale corriente» al periférico GPIOA (habilita su reloj)
    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0;           // ② selecciona el pin PA0
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;    // ③ modo: salida push-pull
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;   // ④ velocidad de conmutación
    GPIO_Init(GPIOA, &GPIO_InitStructure);              // ⑤ vuelca la configuración a los registros

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(GPIOA, GPIO_Pin_0, ledState);   // pone el nivel de PA0 a ledState
        ledState ^= 1;                                 // invierte el nivel, así en la próxima vuelta va al contrario
        Delay_Ms(500);                                  // espera 500 ms para dar la sensación de «parpadeo»
    }
}
```

**Apúntate esta secuencia fija de cuatro pasos para inicializar un GPIO**; para inicializar cualquier otro periférico en proyectos CH32, todo es variación de este patrón:

1. **Habilita el reloj.** La familia STM32 (la biblioteca de periféricos de CH32 es casi un calco de la biblioteca estándar de STM32) tiene un rasgo: todos los periféricos están «sin corriente» por defecto, y antes de usarlos hay que habilitar manualmente el reloj correspondiente con `RCC_XXXClockCmd(...)`. Si se te olvida, el periférico es un adorno: por mucho que lo configures, no reacciona.
2. **Rellena el struct.** Declara un `XXX_InitTypeDef` y va rellenando modo, velocidad y demás parámetros uno a uno.
3. **Llama a `XXX_Init()`.** «Alimenta» el struct a la función de inicialización correspondiente para que los parámetros acaben escritos en los registros del chip.
4. **Trabaja dentro de `while(1)`.** Manipula el periférico con las funciones de lectura/escritura que toquen (por ejemplo `GPIO_WriteBit`).

Bueno, teoríaEnough; vamos a compilar y grabar en serio. Y entonces descubrirás que, aunque el código sea correcto sobre el papel, en la práctica te esperan trampas «inesperadas».

---

## 10. La primera compilación

Con todo listo, lanza la compilación:

```bash
$PIO run -d ~/ch32v307-test        # o, después de hacer cd al directorio del proyecto, simplemente pio run
```

La primera compilación descarga automáticamente el framework `noneos-sdk` de WCH (con todo el código fuente de los drivers de periféricos); tarda un poco, entre 30 y 60 segundos. La salida de una compilación exitosa es así:

```
Linking .pio/build/ch32v307_evt/firmware.elf
RAM:   [          ]   3.2% (used 2080 bytes from 65536 bytes)
Flash: [          ]   0.7% (used 1728 bytes from 262144 bytes)
Building .pio/build/ch32v307_evt/firmware.bin
========================= [SUCCESS] Took 47.36 seconds =========================
```

Cuando veas el `[SUCCESS]` en verde, significa que toda la cadena —VSCode, pio y el compilador nativo de macOS— está perfectamente conectada. Merece un aplauso. Los artefactos de compilación están en `.pio/build/ch32v307_evt/`:

- `firmware.elf`: con símbolos de depuración completos; el que se usa para depurar.
- `firmware.bin`: binario puro; el que se graba en la placa.

Merece la pena echarle un ojo a las dos barras (uso de RAM/Flash); cuando en el capítulo 13 añadamos `printf`, el uso de Flash pegará un salto visible — completely normal, no te asustes; en el 13 cuento por qué.

---

## 11. Configurar `pio` como comando global

Teclear una y otra vez la cadena `~/.platformio/penv/bin/pio` es un coñazo, así que creamos un enlace simbólico a un directorio que ya esté en el PATH del sistema. En Mac con Apple Silicon, Homebrew se instala por defecto en `/opt/homebrew/bin`, y ese directorio suele ser escribible por el usuario actual (que pertenece al grupo admin):

```bash
if [ -w /opt/homebrew/bin ]; then
  ln -sf ~/.platformio/penv/bin/pio /opt/homebrew/bin/pio
  ln -sf "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" /opt/homebrew/bin/code
fi
```

Verifícalo:

```bash
pio --version      # PlatformIO Core, version 6.1.19
code --version     # número de versión de VSCode
```

> Si tu `/opt/homebrew/bin` no es escribible (raro), busca otro directorio propio con permiso de escritura, por ejemplo `~/.local/bin`, y mételo en el PATH del shell:
> ```bash
> mkdir -p ~/.local/bin
> ln -sf ~/.platformio/penv/bin/pio ~/.local/bin/pio
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
> ```
> Recuerda que tras tocar `~/.zshrc` tienes que abrir una ventana nueva de terminal o ejecutar `source ~/.zshrc` para que surta efecto.

A partir de aquí, en cualquier sitio del artículo donde veas `$PIO` o `~/.platformio/penv/bin/pio`, puedes escribir simplemente `pio`.

---

## 12. Conexión de hardware y grabación

### 12.1 Cableado: elige bien el puerto USB

La EVT-R1 suele llevar dos puertos USB, **y para grabar y depurar hay que conectar el que va al WCH-Link de a bordo** (la serigrafía suele poner DEBUG / Link / WCH-Link), no el etiquetado como USB-Device; los dos puertos tienen funciones completamente distintas y, si te equivocas, en el gestor de dispositivos no aparece ni trace. macOS trae su propio driver CDC para el puerto serie: enchufas y a funcionar, sin drivers extra — una alegría frente a Windows.

### 12.2 Los dos modos del WCH-Link

El chip depurador WCH-Link tiene dos modos de funcionamiento: **modo RV** (para chips RISC-V) y **modo DAP** (para chips ARM). La CH32V307 es de núcleo RISC-V, así que para grabar correctamente el depurador debe estar en **modo RV**. La placa sale por defecto en modo RV; si la grabación falla sistemáticamente, puedes confirmar o cambiar de modo con el comando `wlink` o con la herramienta oficial de WCH:

```bash
# lista los dispositivos WCH-Link conectados actualmente
pio pkg exec -- wlink list          # o, directamente, wlink list (siempre que la ruta esté en el PATH)
```

### 12.3 A grabar

**Método 1: línea de comandos**

```bash
cd ~/ch32v307-test
pio run -t upload
```

Aquí entra en juego el `upload_protocol = wlink` que configuraste en `platformio.ini` — PlatformIO invoca la herramienta wlink nativa de macOS, que a través del WCH-Link vuelca `firmware.bin` al chip.

**Método 2: interfaz gráfica de VSCode**

Abre la carpeta del proyecto; en la barra de herramientas de PlatformIO abajo a la izquierda hay una ristra de iconos, pulsa la flecha (Upload). El efecto es el mismo que en la línea de comandos — si te va más el ratón, adelante.

Al grabar con éxito, `wlink` imprime información detallada del depurador y del chip que vale su peso en oro:

```
04:17:53 [INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
04:17:53 [INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
04:17:53 [INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
04:17:54 [INFO] Flash done
04:17:54 [INFO] Now reset...
```

La primera línea, `v2.18(v38)`, es la versión de firmware de tu depurador WCH-Link; en la tercera puedes ver el tamaño real de Flash del chip (288 KB, enlazando con lo que comentamos en el capítulo 9), además del UID único del chip — útil si alguna vez serializas productos.

### 12.4 Qué protocolo de grabación elegir

La definición del `board` admite varios protocolos de grabación, cada uno para su momento:

| Protocolo | Herramienta subyacente | Notas |
|---|---|---|
| `wch-link` | openocd (`0.11.0+dev-snapshot`, paquete PIO `2.1100.260228`) | protocolo por defecto, accede al WCH-Link a través de openocd |
| `wlink` | wlink (versión `0.1.1`, paquete PIO `tool-wlink@0.23.241116`) | **el recomendado para usuarios de macOS**: nativo, ligero y rápido; es el protocolo que se usa en este artículo |
| `minichlink` | minichlink (`0.1.0`) | otra herramienta ligera mantenida por la comunidad, opción alternativa |
| `isp` | wchisp (`0.2.3`, paquete PIO `0.23.240914`) | graba por modo USB Bootloader; requiere poner BOOT0 en alto para entrar en el bootloader, ideal si no tienes WCH-Link |

### 12.5 Depuración (breakpoints, paso a paso)

Dentro de VSCode, **F5** arranca la sesión de depuración (por debajo collaboration entre openocd + RISC-V GDB); puedes poner breakpoints, ejecutar paso a paso y ver en tiempo real variables y registros. El archivo SVD con la descripción de registros de la placa (`CH32V307xx.svd`) ya viene referenciado en la configuración del board, así que la visualización de los registros de periféricos funciona out of the box sin configuración extra. Esto da de sí para un artículo entero, así que aquí lo dejo apuntado; con esto tienes de sobra.

---

## 13. Trampa 1: compila y graba bien, pero el puerto serie está en silencio absoluto

Tras dejar funcionando el toolchain y grabar con éxito, mucha gente da el éxito por hecho, abre el monitor del puerto serie entusiasmada — y se queda de piedra.

### Síntoma

```bash
pio run              # compilación OK ✅
pio run -t upload    # grabación OK ✅
pio device monitor   # abrir el monitor del puerto serie → en blanco, ni fantasma
```

Compila sin errores, grabación confirmada, monitor conectado al `/dev/cu.usbmodem***` correcto (el dispositivo de puerto serie virtualizado por el WCH-Link de a bordo), y aun así **ni una letra**. Llegados a este punto es muy fácil empezar a sospechar del baudrate, del driver, incluso de si la placa estará muerta.

### Causa raíz: facilísima

Abres el código y lo entiendes en un suspiro — **la plantilla que PlatformIO genera por defecto no inicializa el puerto serie para nada, ni lleva una sola línea de `printf`**. Es puramente un «configura un GPIO → bucle while que invierte el nivel → retardo», un programa de parpadeo limpio que de principio a fin no manda ni un byte por el puerto serie. Que el monitor no reciba nada es lo lógico — el circuito no está roto, es el código que no tiene intención de hablarte.

> El puerto serie virtualizado por el WCH-Link de a bordo (VCP, virtual COM port, en la jerga) está puenteado por defecto al **USART1 del chip objetivo (PA9 = TX, PA10 = RX)**. El camino físico está totalmente despejado; lo que pasa es que tu programa no manda nada.

### Solución: añadir inicialización + printf

En el capítulo 9 ya conociste `USART_Printf_Init()` de `debug.h`; ahora le toca el turno protagonista. Dos líneas y listo:

```c
Delay_Init();

// USART1 (PA9/PA10) sale por el puerto serie virtual del WCH-Link de a bordo; el _write del SDK ya redirige printf aquí
USART_Printf_Init(115200);
printf("CH32V307 iniciado, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);
```

Y dentro del `while(1)`, una línea de impresión para ver en tiempo real que el programa corre:

```c
while (1) {
    GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
    printf("LED %u\r\n", ledState);
    ledState ^= 1;
    Delay_Ms(100);
}
```

Recompila y graba; el puerto serie cobra vida al instante:

```
CH32V307 iniciado, SystemCoreClock = 144000000 Hz
LED 0
LED 1
LED 0
...
```

> **Apunte pequeño:** al añadir `printf`, el uso de Flash salta de alrededor del 0,7 % (1728 bytes) a aproximadamente el 2,8 % (unos 7440 bytes), porque `printf` arrastra al firmware toda la lógica de formateo de cadenas. Es completamente normal: `printf` nunca ha sido «gratis»; es trueque de espacio por experiencia de depuración. No te agobies por esos pocos KB.

### Para las próximas veces: el orden para depurar «sin salida por el puerto serie»

Convertimos lo aprendido en una checklist genérica para guardar y consultar cuando el problema se repita:

1. **¿De verdad llamas a `USART_Printf_Init` y escribes un `printf` en algún sitio?** (la trampa más común y más olvidada del artículo; empieza por aquí)
2. **¿Está bien el baudrate?** El `USART_Printf_Init(115200)` del código tiene que casar con el `monitor_speed` de `platformio.ini`; si cambias uno y olvidas el otro, lo que llega es basura o silencio.
3. **¿No estará apagada por accidente la función de puerto serie virtual del WCH-Link?** (se comprueba con la herramienta oficial WCH-LinkUtility de WCH)
4. **¿Lo que quieres de verdad es «que el propio chip sea un puerto USB» (USB CDC)?** Si es sí, es otra historia que requiere un stack de firmware USB, completamente distinta del USART1 puenteado por WCH-Link del que hablamos aquí. No lo mezcles.

---

## 14. Trampa 2 (la más gorda del artículo): el puerto serie ya habla, pero el LED se niega a encenderse

Esta es la trampa más desquiciante de todo el periplo, porque **casi no tiene que ver con el software**: es un problema puro de diseño de hardware, por mucho que tu código esté impecable. Dale un poco de paciencia a esta sección y te ahorra por lo menos media hora tirándote de los pelos mirando el código.

### Síntoma

En este punto el puerto serie imprime sin problema (lo que demuestra que el firmware está corriendo con normalidad, sin bloqueos ni HardFault), **pero en la placa no hay manera de ver parpadear ningún LED**.

### Causa raíz: el LED de usuario de a bordo viene «con el cable cortado» de fábrica

**Los dos LED de usuario de esta placa (serigrafiados LED1 y LED2) vienen de fábrica sin conexión a ningún pin del MCU, totalmente al aire.** En concreto: solo tienen un extremo unido a GND; el otro es una isla en forma de pad desnudo o agujero de tira de pines, esperando a que tú tiendas el cable. No es un defecto puntual de alguna placa; el esquema oficial de WCH (`CH32V30xSCH.pdf`) viene así de fábrica.

Es decir: **da igual que tu código invierta PC1, PD0 o PA0; mientras no tires un cable Dupont físico de ese pin al pad del LED, el LED no se enciende jamás. Es un problema de hardware puro: por bonito que sea tu código, no hay manera.**

No soy el único en caer; hay varias fuentes independientes que lo corroboran: la documentación oficial de Zephyr para esta placa deja claro que «el LED de a bordo no está conectado al SoC por diseño», y una guía en chino sobre la CH32V307EVT-R1 de WCH también menciona que los dos LED de usuario no están cableados a ningún GPIO y que el usuario tiene que tirar los cables a mano para encenderlos. El pulsador de usuario KEY de a bordo es igual: flotando, con la misma trampa repetida.

> **Lo único que en esta placa sí viene conectado y encendido por defecto es el piloto de alimentación** — el que se enciende fijo en cuanto conectas el USB; no tiene nada que ver con tu código. Es facilísimo confundirlo con «ya he hecho parpadear un LED», cuando en realidad no lo controla el MCU.

### Arreglo: dos pasos, software y hardware

**Paso 1: elige el pin que vas a invertir**

El código de ejemplo de GPIO del propio WCH usa por convención el pin **PA0** — el que más documentación y discusión comunitaria acumula, y el que menos trampas extra esconde; por eso en el código alineamos el pin del parpadeo a PA0:

```c
// el LED de usuario de la EVT-R1 está flotando por defecto (sin conexión al MCU); hace falta un cable Dupont puenteano PA0 con LED1 para que se encienda
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)
```

> ⚠️ **Una trampa colateral pequeña:** si vienes de otro puerto (por ejemplo PC1, el que traía la plantilla original) y lo cambias a PA0, **recuerda sincronizar también la línea de habilitación de reloj a `RCC_APB2Periph_GPIOA`**. Yo caí en esto en carne propia: cambié solo la definición del pin y olvidé sincronizar la habilitación de reloj con GPIOA; resultado, el reloj del periférico GPIOA ni se encendió, y PA0 no se movió un ápice. Estuve dando vueltas al código hasta descubrir que era un «cambiar una cosa, olvidar otra». Tras tocar la configuración del puerto, repasa siempre todo el conjunto de macros; no dejes a medias.

**Paso 2: tiende un cable Dupont físico (dos opciones)**

- **Opción A (usar el LED1 de a bordo, lo que recomienda WCH):** Coge un cable Dupont, conecta un extremo a **PA0** (el agujero marcado `A0` en la tira de pines tipo Arduino) y el otro al pad que en la placa pone `LED1`. La posición exacta del pad la encuentras en el esquema `CH32V30xSCH.pdf` que viene en el paquete de documentación de la EVT.
- **Opción B (montar tú un LED externo, lo más robusto y visual):** Coge un LED normal, ponle en serie una resistencia limitadora de 330 Ω ~ 1 kΩ, y tiéndalo entre **PA0 y GND**. Si te equivocas de polaridad no pasa nada: como el código no deja de invertir el nivel, mitad del ciclo iluminará en un sentido y la otra mitad en el otro; lo único que cambia es «en qué medio ciclo brilla».

Tras cablear y volver a lanzar `pio run -t upload`, LED1 parpadea con ritmo de 100 ms, y a la vez el puerto serie va sacando `LED 0 / LED 1`. En ese momento es cuando de verdad has coronado el «Hello World». 🎉

> **¿Por qué WCH diseña el LED flotando?** Casi seguro por «dejar al desarrollador la máxima libertad»: puedes cablear el LED o el pulsador al GPIO que te venga bien para tu proyecto, sin estar atado a un pin fijado de fábrica. La intención es buena, pero para un recién llegado que coge la placa por primera vez es hostilísimo — tu primera reacción no suele ser «tengo que tender un cable antes de encender el LED», sino «¿en qué me habré equivocado en el código?».

### Una lección más profunda: primero aclara si es software o hardware

El verdadero valor de esta trampa no es «recuerda que PA0 necesita un cable Dupont», sino una manera de pensar que te sirve para cualquier depuración embebida:

**«Sin respuesta» no equivale a «el código está mal».** Cuando un periférico no responde, lo primero debería ser buscar la manera de demostrar «¿el firmware realmente ha llegado a esa rama de código?», no ponerte a machacar la lógica del código. Aquí se pudo localizar tan rápido como un problema de hardware y no de código gracias a **que el puerto serie ya imprimía** — si el puerto serie imprime con normalidad, el lazo principal está corriendo, no está colgado en ningún sitio; con la capa de software confirmada, lo que queda de «sin respuesta» se acota casi seguro al enlace físico. Por eso conviene, en cualquier proyecto nuevo, dejar funcionando el puerto serie en primer lugar: es la regla más rápida y más visual para descartar fallos.

---

## 15. Cuando todo funcione: cómo queda el `main.c` completo

Combinando los arreglos de las dos trampas anteriores, este es el código completo y funcional, que añade al template original de PlatformIO la inicialización del puerto serie y la impresión:

```c
#include <ch32v30x.h>
#include <debug.h>

// el LED de usuario de la EVT-R1 está flotando por defecto (sin conexión al MCU); hace falta un cable Dupont puenteano PA0 con LED1 para que se encienda
#define BLINKY_GPIO_PORT GPIOA
#define BLINKY_GPIO_PIN GPIO_Pin_0
#define BLINKY_CLOCK_ENABLE RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)

void NMI_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void HardFault_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));
void Delay_Init(void);
void Delay_Ms(uint32_t n);

int main(void)
{
    NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
    SystemCoreClockUpdate();
    Delay_Init();

    // USART1 (PA9/PA10) sale por el puerto serie virtual del WCH-Link de a bordo; el _write del SDK ya redirige printf aquí
    USART_Printf_Init(115200);
    printf("CH32V307 iniciado, SystemCoreClock = %lu Hz\r\n", SystemCoreClock);

    GPIO_InitTypeDef GPIO_InitStructure = {0};
    BLINKY_CLOCK_ENABLE;
    GPIO_InitStructure.GPIO_Pin = BLINKY_GPIO_PIN;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(BLINKY_GPIO_PORT, &GPIO_InitStructure);

    uint8_t ledState = 0;
    while (1)
    {
        GPIO_WriteBit(BLINKY_GPIO_PORT, BLINKY_GPIO_PIN, ledState);
        printf("LED %u\r\n", ledState);
        ledState ^= 1;
        Delay_Ms(100);
    }
}

void NMI_Handler(void) {}
void HardFault_Handler(void) { while (1) {} }
```

Merece la pena decir dos palabras sobre los manejadores de interrupción del final: `NMI_Handler` y `HardFault_Handler` son dos funciones de «cajeta de excepción» comúnísimas en microcontroladores RISC-V/ARM; el modificador `__attribute__((interrupt("WCH-Interrupt-fast")))` le dice al compilador «esto es una rutina de servicio de interrupción, genera el código como tal» (por ejemplo, guardando y restaurando registros automáticamente). Aquí las implementaciones son muy simples — `HardFault_Handler` directamente se queda en `while(1){}` — una estrategia conservadora pero eficaz: si el programa de verdad «se va al garete» y dispara una excepción de hardware, antes que dejar el chip correr en estado erróneo, mejor atascarlo ahí para que puedas conectar el depurador y mirar el estado en el momento del fallo. Más adelante, cuando el proyecto crezca, puedes añadir aquí logs de error, encender un LED de alarma y similares; por ahora basta con que sepas para qué sirven.

El proyecto completo (incluido `platformio.ini`) lo tengo en GitHub; el enlace está al final del artículo, puedes clonarlo y correrlo directamente.

---

## 16. Tabla resumen de trampas

Listamos todas las trampas del artículo, para tenerlas a mano cuando vuelvas a consultar:

| # | Síntoma | Causa raíz | Solución |
| --- | --- | --- | --- |
| 1 | al instalar la plataforma, `repository not found` | nombre de la organización de GitHub mal escrito; debería ser `Community-PIO-CH32V` (con PIO, en mayúsculas) | usar la dirección correcta |
| 2 | `pio platform install` devuelve `deprecated` | la nueva versión de PlatformIO unificó todo en el subcomando `pkg` | pasar a `pio pkg install -g -p <dirección>` |
| 3 (núcleo) | la plataforma se instala bien pero el directorio del toolchain está lleno de `.exe`; la compilación no puede funcionar | `platform.json` codifica el origen del toolchain como un repo de Windows y no detecta el sistema operativo al instalar | borrar la versión Windows e instalar manualmente `toolchain-riscv-mac` y `tool-wlink` (rama `mac_arm64`/`mac_x64`) |
| 4 | instalar la rama equivocada del toolchain y que la compilación se queje de que no encuentra el ejecutable del compilador | el script de build escoge el prefijo del compilador a partir del segundo segmento de la versión del toolchain (`1.8.x` → `riscv-none-embed`, `1.12.x` → `riscv-wch-elf`); la versión instalada y los ejecutables reales no coinciden | primero mira con `ls` cómo se llaman realmente los ejecutables y úsalo en consecuencia |
| 5 | al ejecutar el compilador/grabador, «no se puede verificar al desarrollador» o `killed: 9` | macOS añade el atributo de cuarentena a los binarios sin firma descargados de Internet | `xattr -dr com.apple.quarantine <directorio>` |
| 6 | preocupación de que el compilador x86_64 «no encaje» en Apple Silicon | en sus primeras versiones xPack no publicaba builds arm64 y hacia falta Rosetta 2 | no es problema: tras instalar Rosetta compila con total normalidad |
| 7 | intentar enlazar `pio` a `/usr/local/bin` y fallar | ese directorio pertenece a root y el usuario normal no tiene permiso de escritura | usar `/opt/homebrew/bin` o crear `~/.local/bin` y meterlo en el PATH |
| 8 | compilar y grabar OK, pero el monitor del puerto serie en blanco | la plantilla es solo un bucle de parpadeo, **sin inicializar el puerto serie, sin un solo `printf`** | llamar a `USART_Printf_Init(115200)` y usar `printf` con normalidad (el SDK ya lo redirige a USART1) |
| 9 (la trampa más gorda) | el puerto serie imprime bien pero en la placa no parpadea ningún LED | **el LED de usuario de a bordo viene flotando por defecto, sin conexión al pin del MCU** | tender un cable Dupont puenteano PA0 con LED1 (o montar un LED externo + resistencia en serie a GND) |
| 10 (derivada) | tras cambiar a PA0 el LED sigue sin encenderse | al cambiar de puerto **se olvidó actualizar también el macro de habilitación del reloj** | la definición del puerto y la habilitación del reloj se cambian a la par; al terminar, repasa todo el conjunto |

**El aprendizaje más valioso de estas trampas, en una frase:** en el desarrollo embebido, «sin respuesta» nunca equivale a «código equivocado»; primero afina si es un **problema de software** (¿el firmware realmente llega a esa rama?) o un **problema de hardware** (¿el enlace físico está bien, el periférico está conectado?). Conseguir que el puerto serie hable es la jugada más rápida y la más barata para descartar; déjalo siempre lo primero funcionando.

---

## 17. Cheatsheet de comandos y rutas clave

Los comandos del día a día más usados:

```bash
# === compilar / grabar / monitorizar ===
pio run                # solo compilar
pio run -t upload      # compilar + grabar
pio device monitor      # abrir el monitor del puerto serie (salir con Ctrl+C)

# === consultar la versión de firmware del depurador WCH-Link y la info del chip conectado (lo más útil al depurar problemas de conexión) ===
~/.platformio/packages/tool-wlink/wlink status

# === consultar versiones de cada herramienta ===
~/.platformio/packages/tool-wlink/wlink --version    # versión de la herramienta de grabación
pio --version                                          # versión de PlatformIO Core

# === consultar la versión del compilador (según el entorno final confirmado, el prefijo es riscv-wch-elf-) ===
~/.platformio/packages/toolchain-riscv/bin/riscv-wch-elf-gcc --version
# si lo que te instaló es la versión antigua gcc8/x86_64, cambia el nombre de archivo en consecuencia:
# ~/.platformio/packages/toolchain-riscv/bin/riscv-none-embed-gcc --version
```

Una salida típica de `wlink status`, en la que de un vistazo ves la versión de firmware del depurador, el modelo de chip objetivo, la capacidad real de Flash, el UID y demás — comodísima para depurar conexiones:

```
[INFO] Connected to WCH-Link v2.18(v38) (WCH-LinkE-CH32V305)
[INFO] Attached chip: CH32V30X [CH32V307VCT6] (ChipID: 0x30700568)
[INFO] Chip ESIG: FlashSize(288KB) UID(63-59-9d-a7-14-54-14-55)
[INFO] Flash protected: false
[INFO] RISC-V ISA(misa): Some("RV32ACFIMUX")
[INFO] RISC-V arch(marchid): Some("WCH-V4F")
```

> Si necesitas actualizar el firmware del propio depurador WCH-Link, hace falta la herramienta oficial **WCH-LinkUtility**, que a día de hoy solo existe para Windows, no para Mac — una pequeña espinita del ecosistema macOS que aún clava.

También te dejo un mapeo de rutas clave para localizar rápido cuando algo falla:

| Para qué | Ruta |
|---|---|
| PlatformIO Core en sí | `~/.platformio/penv/bin/pio` |
| Plataformas instaladas | `~/.platformio/platforms/ch32v/` |
| Herramientas de toolchain / grabación / depuración | `~/.platformio/packages/{toolchain-riscv,tool-wlink,tool-openocd-riscv-wch}` |
| Archivo de definición del board | `~/.platformio/platforms/ch32v/boards/ch32v307_evt.json` |
| Script de build de la plataforma (donde escarbamos la lógica de triples) | `~/.platformio/platforms/ch32v/builder/main.py` |
| Artefactos de compilación | `<directorio del proyecto>/.pio/build/ch32v307_evt/firmware.{elf,bin}` |

Y de regalo, los parámetros clave del board `ch32v307_evt`:

| Campo | Valor |
|---|---|
| Modelo de MCU | CH32V307VCT6 |
| Frecuencia principal | 144 MHz |
| march / mabi (ABI objetivo de compilación) | rv32imacxw / ilp32 |
| Flash / SRAM (valores por defecto del board) | 256 KB / 64 KB (el chip tiene físicamente 288 KB de Flash; ver explicación en capítulo 9) |
| Depurador de a bordo | WCH-Link |
| USB VID:PID | 1a86:8010 |
| Protocolos de grabación soportados | wch-link, wlink, minichlink, isp |

---

## 18. Construye tu propia «lógica de desarrollo CH32» (para el próximo proyecto, a copiar y pegar)

Después de todo el revoloteo, lo más valioso no es cuántos comandos concretos te has memorizado, sino haberte montado un marco mental reutilizable. Para el próximo proyecto, ya sea con esta misma CH32V307 o con cualquier otra placa nueva de la familia CH32, puedes seguir este patrón:

1. **Confirma primero el trío «plataforma + framework + placa».** Se corresponde con las tres líneas `platform`, `framework`, `board` de tu `platformio.ini`. Con estas tres líneas fijas, PlatformIO ya sabe de dónde bajar el toolchain y con qué mapa de pines compilar.
2. **Tras instalar la plataforma, no corras a escribir código; comprueba que el toolchain sea «de la nacionalidad correcta».** Especialmente en plataformas mantenidas por la comunidad y no por el soporte oficial de primera línea, es muy fácil que solo estén adaptadas a Windows o Linux. Antes de ponerte a escribir, echa un `ls` al directorio del toolchain y un `file` a los binarios clave para confirmar la arquitectura — te ahorra un montón de tiempo de depuración.
3. **Cuando un binario sin firma falle al ejecutar, piensa enseguida en Gatekeeper.** Errores tipo `cannot be opened` o `killed: 9` casi siempre son cosa del atributo de cuarentena; `xattr -dr com.apple.quarantine` y a correr.
4. **Cuando graba y compila bien pero el periférico no responde, separa primero lo software de lo hardware.** Lo más rápido es dejar funcionando el puerto serie: si imprime, el firmware está corriendo; si no, vuelve a revisar si te dejaste algo sin inicializar.
5. **Por defecto, no confíes en que los «periféricos de usuario» de la placa estén conectados.** LED, pulsadores y similares en muchas placas de evaluación están sin cablear por flexibilidad; antes de usarlos, contrasta con el esquema para no acabar culpando a tu código.
6. **Sácale partido a `debug.h` (o a la biblioteca auxiliar que ofrezca tu framework).** Casi todos los SDK de fabricante llevan ya preparadas funciones de retardo y redirección de `printf`; no te fabriques la tuya.
7. **Los números de versión cambian; lo que se copia de verdad es el método de depuración.** El toolchain comunitario se sigue actualizando, y es normal que cuando instales no coincida con el del tutorial; entender el «por qué» pesa más que memorizar el «qué». Este artículo es, él mismo, un ejemplo vivito y coleando.

Apúntate este marco y la próxima vez que te caiga cualquier placa nueva embebida tendrás una rutina para entenderla en nada de tiempo.

---

## 19. Preguntas frecuentes (FAQ)

**Q1: ¿Por qué no usar directamente el MounRiver Studio oficial? ¿No hay versión para Mac?**

A: MounRiver Studio sí ha sacado versión para Mac, pero según los comentarios de la comunidad su OpenOCD integrado da bastantes problemas en Mac; da la sensación de que el port no tuvo pruebas ni adaptación serias. Además es un IDE relativamente cerrado y monolítico, así que no controlas tú la versión del toolchain. PlatformIO se apoya en VSCode, deja el toolchain totalmente bajo tu control, tiene una comunidad activa y te mantiene la misma experiencia entre plataformas; en conjunto, vale la pena pelearse un rato con él.

**Q2: ¿Puedo instalar un toolchain RISC-V con Homebrew y ahorrarme el cambio manual?**

A: Técnicamente sí, pero no lo recomiendo para esta plataforma. El script de build de la plataforma localiza el directorio del toolchain a través del mecanismo de gestión de paquetes de PlatformIO (llamadas tipo `get_package_dir("toolchain-riscv")`); si lo cambias por un toolchain instalado vía Homebrew tienes que escribir configuración extra para sobreescribir el comportamiento por defecto, lo que acaba siendo más costoso. Lo más fácil es atenerse al paquete `toolchain-riscv-mac` mencionado en este artículo.

**Q3: ¿Puede el toolchain volver a la versión Windows tras una actualización de la plataforma?**

A: Sí, puede. Si ejecutas `pio pkg update` o reinstalas la plataforma entera, el `platform.json` trae por defecto la dirección del repositorio de Windows y puede sobrescribir tu versión macOS cuidadosamente instalada. Si te pasa, repite los pasos de sustitución del capítulo 6; o, para rematarlo, hazte un fork del repositorio de la plataforma, cambia `platform.json` para que apunte por defecto a la versión de macOS y a dormir.

**Q4: La compilación da un error de enlace, o se queja de que no encuentra un comando del compilador. ¿De qué viene?**

A: Lo más probable es que la versión del toolchain y el prefijo del ejecutable del compilador no casen (la trampa 4 del capítulo 16). Primero confirma cómo se llama realmente el compilador que te ha instalado (`riscv-wch-elf-gcc` frente al `riscv-none-embed-gcc` de la versión antigua) y asegúrate de que comando y archivo coinciden; la tabla de entorno final del capítulo 6 te sirve de referencia.

**Q5: La grabación se queja de «no encuentra dispositivo WCH-Link». ¿Por dónde tiro?**

A: Sigue este orden: ① confirma que has conectado el USB que va al WCH-Link, no el de USB-Device; ② confirma que el depurador está en modo RV y no en modo DAP; ③ echa un `system_profiler SPUSBDataType | grep -A5 1a86` para ver si el sistema ve bien el dispositivo USB (`1a86:8010` es el VID:PID de este depurador).

**Q6: ¿Qué chips y frameworks soporta esta plataforma? ¿Es fácil cambiar a otra placa más adelante?**

A: En chips cubre CH32V003/103/203/30x, CH32X035, CH56x/57x/58x/59x y unos cuantos más; en frameworks, además del noneos-sdk de este artículo, soporta FreeRTOS, RT-Thread, TencentOS, Harmony LiteOS, Arduino, ch32fun o Zephyr. Cambiar de placa básicamente es tocar las líneas `board` y `framework` de `platformio.ini`; las experiencias de depuración (arquitectura del toolchain, cuarentena de Gatekeeper, periféricos flotando por defecto) casi seguro te siguen sirviendo tal cual.

---

## 20. Qué más explorar cuando ya tengas todo funcionando

El Hello World es solo la línea de salida; cuando lo tengas, puedes seguir bajando:

- **Más GPIO e interrupciones por pulsador:** el pulsador KEY de usuario de a bordo también está flotando; cableado, sirve para practicar interrupciones externas EXTI.
- **USB CDC:** que la propia CH32V307 se enumere como dispositivo USB CDC, sin pasar por el USART1 puenteado por WCH-Link. Es otra historia que requiere un stack USB, contenido avanzado.
- **Exprimir los 288 KB de Flash:** primero cambias las option bytes del chip con la herramienta oficial de WCH, y luego sincronizas las líneas `board_upload.maximum_size` comentadas en `platformio.ini`.
- **Meterte con FreeRTOS / RT-Thread:** cambia `framework` por el RTOS que toque y ponte con la multitarea.
- **Depurar en serio:** con OpenOCD + GDB y los breakpoints de F5 (`pio debug`), técnica afilada de depuración embebida.

---

## 21. Referencias

- Repositorio de la plataforma Community-PIO-CH32V: `github.com/Community-PIO-CH32V/platform-ch32v`
- Paquete del toolchain para macOS: `github.com/Community-PIO-CH32V/toolchain-riscv-mac`
- Releases del toolchain (para seguir las novedades desde el lado PIO): `github.com/Community-PIO-CH32V/toolchain-riscv-windows/releases`
- MounRiver oficial de WCH (el origen del toolchain personalizado + IDE): `www.mounriver.com`
- wlink (rama macOS): `github.com/Community-PIO-CH32V/tool-wlink` (rama `mac_arm64` / `mac_x64`)
- Documentación oficial: `pio-ch32v.readthedocs.io`
- xPack RISC-V GCC (aguas arriba del toolchain): `github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack`
- Proyecto original de wlink: `github.com/ch32-rs/wlink`
- Página oficial del producto en WCH: `www.wch.cn/products/CH32V307.html`
- SDK y ejemplos oficiales de OpenWCH: `github.com/openwch/ch32v307`
- Documentación oficial de Zephyr, donde explica que el LED de esta placa no está conectado
- Documentación oficial de PlatformIO: `docs.platformio.org`

---

*El código completo del proyecto está publicado en GitHub; te invito a clonarlo y correrlo. Si en tus peleas te topas con alguna trampa nueva que no se cubre aquí, te leo en los comentarios —que en Mac seguir habiendo muy poca info sobre CH32V—; cuanta más gente comparta, menos tropezaderos para el siguiente. ¡Que tu LED se encienda cuanto antes! 🎉*

https://github.com/ling3ye/LingShunLAB/tree/main/Handbook/CH32V/CH32V307-EVT-R1/01%20HelloWorld
