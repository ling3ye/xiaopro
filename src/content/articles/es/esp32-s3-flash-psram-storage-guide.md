---
title: "Antes de comprar, mira bien: sufijos del ESP32-S3, Flash, PSRAM y precios aproximados en yuanes (con comparación del C3)"
domain: hardware
platforms: ["cross-platform"]
format: "cheatsheet"
date: 2026-11-10
intro: "Sufijos como N4, N8R2 o N16R8 dicen exactamente dos cosas: el número tras la N es Flash y el número tras la R es PSRAM. Esta guía pone en una sola tabla las capacidades y los precios aproximados (en yuanes) de cinco placas habituales, y explica cómo elegir."
tags: ["ESP32-S3", "ESP32-C3", "PSRAM", "Flash", "selección de placa de desarrollo", "ESP-IDF"]
relatedBoards: ["esp32s3"]
image: "https://img.lingflux.com/2026/11/bf80e841c5e9fb342ebc387e1e68edf8.jpg"
---

> Hoja de referencia rápida. Las cinco son placas completas que funcionan en cuanto se enchufa el USB-C. Las capacidades son nominales y los precios son cifras aproximadas en yuanes chinos (CNY), válidas solo para comparar órdenes de magnitud.

## 00 Tres frases para recordar

1. **El sufijo solo describe capacidad.** `N16R8` = 16 MB de Flash + 8 MB de PSRAM. `N` es Flash, `R` es PSRAM y el número son MB. No tiene nada que ver con «generación» ni con «gama alta o baja».
2. **La Flash no es memoria.** La Flash es el disco: no se borra al cortar la corriente y guarda firmware y recursos. Lo único que puedes reservar con `malloc()` es la SRAM interna (512 KB en el S3) más la PSRAM. Por mucha Flash que haya, no compensa «no tener PSRAM».
3. **Misma capacidad ≠ mismo precio.** Dos placas de unos ¥26 y ¥62 tienen Flash y PSRAM idénticas; la diferencia se paga en RF, control de calidad y documentación (sección 04).

Las cinco placas: **cuatro ESP32-S3** — S3 SuperMini FH4R2, S3 N16R8 MINI, XIAO S3 / Sense, XIAO S3 Plus; **una ESP32-C3** — C3 SuperMini, un control de otra arquitectura, no un sustituto de la misma clase. El `S3` / `C3` delante del modelo indica la familia del chip; no lo confundas con el sufijo de capacidad que va detrás.

## 01 Tres capas, tres tipos de espacio

Un «ESP32-S3» puede referirse a tres cosas distintas:

- **Chip**: ESP32-S3FH4R2, ESP32-S3R8, ESP32-C3FN4 — dado desnudo en QFN; la Flash y la PSRAM pueden ir dentro del encapsulado. Con eso en la mano todavía hay que diseñar la placa, ajustar la RF y poner antena.
- **Módulo**: como el WROOM-1 — chip + Flash en el módulo + cristal + jaula de apantallamiento + antena en PCB + certificación RF. Un nombre con WROOM suele referirse a esta capa.
- **Placa de desarrollo**: añade USB-C, LDO, botones, tiras de pines y antena — se enchufa y funciona. **Las cinco placas de este artículo están en esta capa**, sin módulos desnudos: solo comparando dentro de la misma capa tienen sentido el precio y los GPIO.

<svg viewBox="0 0 900 350" width="100%" style="height:auto" role="img" aria-label="Las tres capas —chip, módulo y placa de desarrollo— y en cuál cae cada nombre de placa">
  <title>Figura 1 · Tres capas y cómo descifrar los nombres</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">Un mismo nombre «ESP32-S3» puede significar tres cosas muy distintas　·　Muestra del artículo: 4 placas S3 + 1 control C3</text>
  <rect x="20" y="40" width="860" height="52" rx="8" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="38" y="62" font-size="13" font-weight="600" fill="var(--ink)">① Chip (dado)</text>
  <text x="38" y="80" font-size="12" fill="var(--ink-2)">ESP32-S3FH4R2 / ESP32-S3R8 / ESP32-C3FN4 · encapsulado QFN · Flash y PSRAM pueden ir dentro del chip</text>
  <text x="862" y="70" font-size="12" text-anchor="end" fill="var(--pen)">Invisible; hay que diseñar la placa</text>
  <rect x="20" y="102" width="860" height="52" rx="8" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="38" y="124" font-size="13" font-weight="600" fill="var(--ink)">② Módulo</text>
  <text x="38" y="142" font-size="12" fill="var(--ink-2)">WROOM-1 = chip + Flash en el módulo + cristal + jaula + antena en PCB + certificación RF</text>
  <text x="862" y="132" font-size="12" text-anchor="end" fill="var(--accent)">Ninguna de las cinco lo es</text>
  <rect x="20" y="164" width="860" height="52" rx="8" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="38" y="186" font-size="13" font-weight="600" fill="var(--ink)">③ Placa de desarrollo</text>
  <text x="38" y="204" font-size="12" fill="var(--ink-2)">Dado o módulo + USB-C + LDO + botones + pines + antena = se enchufa y funciona</text>
  <text x="862" y="194" font-size="12" text-anchor="end" fill="var(--green)">Las cinco están en esta capa</text>
  <line x1="20" y1="234" x2="880" y2="234" stroke="var(--line-2)" stroke-width="1"/>
  <text x="20" y="256" font-size="13" fill="var(--ink-2)">Descifrado del nombre: el sufijo indica «capacidad», no «nivel de modelo»</text>
  <rect x="20" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="288" font-size="12" font-weight="600" fill="var(--ink)">ESP32-S3FH4R2</text>
  <text x="34" y="306" font-size="11" fill="var(--ink-2)">F=Flash en el encapsulado · H=dado de alta temperatura</text>
  <text x="34" y="322" font-size="11" fill="var(--ink-2)">4=4 MB Flash · R2=2 MB PSRAM</text>
  <rect x="312" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="326" y="288" font-size="12" font-weight="600" fill="var(--ink)">S3 N16R8 MINI</text>
  <text x="326" y="306" font-size="11" fill="var(--ink-2)">Dado ESP32-S3R8 + 16 MB Flash en placa</text>
  <text x="326" y="322" font-size="11" fill="var(--ink-2)">N16 es Flash en placa, no un módulo WROOM</text>
  <rect x="604" y="268" width="276" height="66" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="618" y="288" font-size="12" font-weight="600" fill="var(--ink)">XIAO S3 Plus</text>
  <text x="618" y="306" font-size="11" fill="var(--ink-2)">El mismo dado ESP32-S3R8 + 16 MB Flash</text>
  <text x="618" y="322" font-size="11" fill="var(--ink-2)">El sobreprecio paga tamaño / conector / ecosistema</text>
</svg>

> **Figura 1** · Un mismo «ESP32-S3» puede ser tres cosas distintas; el sufijo indica capacidad, no nivel de modelo.

No mezcles los **tres tipos de espacio**:

- **Flash = el disco.** Guarda firmware, fuentes y recursos web; sobrevive al corte de corriente. Quad SPI, hasta 80 MHz según especificación. **No es memoria.**
- **PSRAM = la tarjeta de memoria enchufable.** Guarda arrays grandes, framebuffers y búferes de TLS y JSON; se vacía al apagar, es más lenta que la SRAM interna y queda inaccesible un momento mientras se borra o escribe la Flash.
- **SRAM interna = el bolsillo.** La más rápida y la más pequeña. Las cuatro placas S3 tienen **512 KB** (más 384 KB de ROM y 16 KB de RTC SRAM); la C3 tiene **400 KB** (16 KB de ellos como caché) + 384 KB de ROM + 8 KB de RTC SRAM.

Así que cuando una ficha dice «8 MB de PSRAM y 8 MB de Flash integrados», la PSRAM está dentro del encapsulado y la Flash es un dado Quad SPI soldado aparte en la placa. **Por grande que sea la Flash, no es espacio reservable con `malloc()`.**

Los tres puntos que más se malinterpretan en una ficha técnica:

| Redacción habitual | Lectura correcta | Cómo comprobarlo |
|---|---|---|
| «512 KB SRAM» en una placa S3 | El S3 tiene 512 KB; el ESP32-C3 tiene 400 KB | Mira la CPU: Xtensa LX7 doble núcleo a 240 MHz es S3; RISC-V mononúcleo a 160 MHz es C3 |
| «8 MB de Flash integrados» | Normalmente en placa, no dentro del chip | Busca la referencia completa; solo una `F` implica Flash en el encapsulado |
| «Si el nombre lleva WROOM es un módulo» | Puede ser solo un código de capacidad reutilizado | Comprueba si hay un módulo pequeño con jaula en la placa; en diseños de dado desnudo se ve el chip principal |

## 02 Descifrado del sufijo: nueve códigos forman una tabla de 3×3

Nueve códigos de pedido parecen nueve cosas distintas, pero en realidad son una tabla de 3×3:

- **`N` = Flash en el módulo**: `N4` 4 MB, `N8` 8 MB, `N16` 16 MB. El dado va en la PCB del módulo por Quad SPI y no se borra al cortar la corriente.
- **`R` = PSRAM dentro del encapsulado del chip**: `R2` 2 MB (Quad, 4 líneas), `R8` 8 MB (Octal, 8 líneas). Sin `R` no hay PSRAM.
- 3 niveles de Flash × 3 niveles de PSRAM = 9 modelos.

El error más frecuente al comparar precios: `N8R8` y `N16R8` tienen la misma PSRAM; solo cambia la Flash.

<svg viewBox="0 0 900 406" width="100%" style="height:auto" role="img" aria-label="Desglose del sufijo N16R8 del ESP32-S3-WROOM-1 y la matriz de nueve modelos formada por Flash 4/8/16 y PSRAM nada/2/8">
  <title>Figura 2 · Desglose del sufijo y la matriz 3×3 de los nueve modelos</title>
  <text x="20" y="22" font-size="13" fill="var(--ink-2)">Un sufijo solo dice dos cosas: tras la N va la Flash, tras la R la PSRAM; tres niveles por eje dan nueve modelos</text>
  <rect x="20" y="42" width="246" height="64" rx="7" fill="var(--card)" stroke="var(--line)" stroke-width="1"/>
  <text x="34" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">ESP32-S3-WROOM-1</text>
  <text x="34" y="84" font-size="11" fill="var(--ink-2)">La serie de módulos en sí: antena en PCB</text>
  <text x="34" y="100" font-size="11" fill="var(--ink-2)">La variante U (1U) cambia a conector U.FL</text>
  <rect x="274" y="42" width="290" height="64" rx="7" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="288" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">N16　→　Flash 16 MB</text>
  <text x="288" y="84" font-size="11" fill="var(--ink-2)">Dado Quad SPI en la PCB del módulo</text>
  <text x="288" y="100" font-size="11" fill="var(--ink-2)">No se borra; guarda firmware y recursos</text>
  <rect x="572" y="42" width="308" height="64" rx="7" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="586" y="64" font-size="12.5" font-weight="600" fill="var(--ink)">R8　→　PSRAM 8 MB</text>
  <text x="586" y="84" font-size="11" fill="var(--ink-2)">PSRAM Octal dentro del encapsulado, 8 líneas</text>
  <text x="586" y="100" font-size="11" fill="var(--ink-2)">Se vacía al apagar; para framebuffers y heap</text>
  <text x="20" y="136" font-size="11" fill="var(--ink-3)">Filas = nivel de PSRAM　Columnas = nivel de Flash</text>
  <text x="276" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 4 MB</text>
  <text x="498" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 8 MB</text>
  <text x="720" y="136" font-size="12" text-anchor="middle" fill="var(--ink-2)">Flash 16 MB</text>
  <rect x="20" y="166" width="5" height="20" rx="2" fill="var(--accent)"/>
  <text x="34" y="181" font-size="12.5" font-weight="600" fill="var(--ink)">Sin PSRAM</text>
  <rect x="20" y="230" width="5" height="20" rx="2" fill="var(--pen)"/>
  <text x="34" y="245" font-size="12.5" font-weight="600" fill="var(--ink)">2 MB Quad</text>
  <rect x="20" y="294" width="5" height="20" rx="2" fill="var(--green)"/>
  <text x="34" y="309" font-size="12.5" font-weight="600" fill="var(--ink)">8 MB Octal</text>
  <rect x="170" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="276" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4</text>
  <text x="276" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB en ejecución</text>
  <rect x="392" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="498" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8</text>
  <text x="498" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB en ejecución</text>
  <rect x="614" y="148" width="212" height="56" rx="6" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="720" y="174" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16</text>
  <text x="720" y="192" font-size="11" text-anchor="middle" fill="var(--ink-2)">0,5 MB en ejecución</text>
  <rect x="170" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="276" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R2</text>
  <text x="276" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB en ejecución</text>
  <rect x="392" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="498" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R2</text>
  <text x="498" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB en ejecución</text>
  <rect x="614" y="212" width="212" height="56" rx="6" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="720" y="238" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R2</text>
  <text x="720" y="256" font-size="11" text-anchor="middle" fill="var(--ink-2)">2,5 MB en ejecución</text>
  <rect x="170" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="276" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N4R8</text>
  <text x="276" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB en ejecución</text>
  <rect x="392" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="498" y="302" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N8R8</text>
  <text x="498" y="320" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB en ejecución</text>
  <rect x="614" y="276" width="212" height="56" rx="6" fill="var(--green-tint)" stroke="var(--green)" stroke-width="2.5"/>
  <text x="720" y="300" font-size="13.5" font-weight="600" text-anchor="middle" fill="var(--ink)">N16R8</text>
  <text x="720" y="318" font-size="11" text-anchor="middle" fill="var(--ink-2)">8,5 MB en ejecución</text>
  <rect x="760" y="284" width="44" height="18" rx="4" fill="var(--card)" stroke="var(--green)" stroke-width="1"/>
  <text x="782" y="297" font-size="10.5" text-anchor="middle" fill="var(--green)">base</text>
  <text x="20" y="358" font-size="12" fill="var(--ink-2)">Fila R8: ocupa GPIO33~37, límite de temperatura ambiente 65 °C; las otras seis casillas: GPIO33~37 libres, límite 85 °C.</text>
  <text x="20" y="378" font-size="12" fill="var(--ink-2)">R8 solo lleva la PSRAM a 8 líneas; la Flash sigue en Quad SPI de 4 líneas. La Flash de 8 líneas es territorio del WROOM-2.</text>
  <text x="20" y="398" font-size="12" fill="var(--ink-3)">Memoria en ejecución = SRAM interna 512 KB + capacidad de PSRAM; la Flash no cuenta como memoria.</text>
</svg>

> **Figura 2** · Los nueve modelos son exactamente estas nueve casillas — no hay una décima; y curiosamente la casilla con más capacidad (`N16R8`) es la de límite térmico más bajo.

Fuera de las nueve casillas hay varias denominaciones que en las páginas de distribuidores suelen mezclarse:

| Denominación | Relación con las nueve combinaciones | Flash | PSRAM | Temperatura ambiente |
|---|---|---|---|---|
| `-1U` (p. ej. `1U-N16R8`) | Las nueve casillas valen igual; solo se cambia la antena de PCB por un conector U.FL | igual | igual | igual |
| `H4` | Referencia de alta temperatura sin PSRAM | 4 MB Quad | ninguna | −40~105 °C |
| `N16R16VA` | Capacidad extra grande fuera de la tabla, SPI a 1,8 V | 16 MB Quad | 16 MB Octal | −40~65 °C |
| WROOM-2 `N16R8V` / `N32R8V` / `N32R16V` | Otra línea de producto; la Flash también va a 8 líneas | 16 / 32 MB Octal | 8 / 16 MB Octal | −40~65 °C |

`1U` solo se diferencia de la versión sin `U` en la antena: con `U` hay un conector U.FL para antena externa, 18,0×19,2×3,2 mm; sin `U` hay antena en PCB, 18,0×25,5×3,1 mm. Si necesitas enjaular el equipo y sacar la antena fuera, elige la primera. La tabla de capacidades es la misma, pero cambian el espacio libre de seguridad y la ruta de certificación del conjunto.

Dos trampas habituales:

- **`R8` solo lleva la PSRAM a 8 líneas; la Flash sigue siendo Quad SPI de 4 líneas.** El «Octal» del nombre se refiere a la PSRAM; la Flash a 8 líneas pertenece al WROOM-2.
- **En los códigos oficiales no existe `N6`.** En el WROOM-1 la Flash solo viene en 4 / 8 / 16 MB. Con un sufijo fuera de tabla, verifica la referencia completa en el datasheet: no adivines por el nombre.

Ordenadas todas con `N16R8` como base:

| Combinación | Flash | PSRAM | Diferencia frente a `N16R8` | Memoria en ejecución | Límite de temperatura |
|---|---|---|---|---|---|
| `N16R8` | 16 MB | 8 MB Octal | base | 8,5 MB | 65 °C |
| `N8R8` | 8 MB | 8 MB Octal | 8 MB menos de Flash | 8,5 MB | 65 °C |
| `N4R8` | 4 MB | 8 MB Octal | 12 MB menos de Flash | 8,5 MB | 65 °C |
| `N16R2` | 16 MB | 2 MB Quad | 6 MB menos de PSRAM, baja de 8 a 4 líneas | 2,5 MB | 85 °C |
| `N8R2` | 8 MB | 2 MB Quad | 6 MB menos de PSRAM; 8 MB menos de Flash | 2,5 MB | 85 °C |
| `N4R2` | 4 MB | 2 MB Quad | 6 MB menos de PSRAM; 12 MB menos de Flash | 2,5 MB | 85 °C |
| `N16` | 16 MB | ninguna | 8 MB menos de PSRAM | 0,5 MB | 85 °C |
| `N8` | 8 MB | ninguna | 8 MB menos de PSRAM; 8 MB menos de Flash | 0,5 MB | 85 °C |
| `N4` | 4 MB | ninguna | 8 MB menos de PSRAM; 12 MB menos de Flash | 0,5 MB | 85 °C |

Tres cosas:

1. **La PSRAM es el gran salto.** 0 → 2 → 8 MB significa memoria en ejecución de 0,5 / 2,5 / 8,5 MB. De `N16` a `N16R2` el aumento es de 5×, y de `N16R2` a `N16R8` otro 3,4×; al pasar de Quad a Octal las líneas de datos van de 4 a 8.
2. **La Flash crece en pasos iguales.** 4 / 8 / 16 MB, sin ningún efecto sobre la memoria en ejecución: más Flash solo deja más sitio para firmware, fuentes y recursos web. Así que `N16R2` frente a `N8R8` no es cuestión de cuál «es mayor»: una tiene más disco y la otra más memoria.
3. **Capacidad y límites van en direcciones opuestas.** La fila R8 tiene la mayor capacidad y, sin embargo, el límite térmico más bajo (65 °C), y además se lleva GPIO33~37; las que no tienen PSRAM llegan a 85 °C con el pinout más completo. ¿Quieres a la vez 8 MB de PSRAM y 85 °C? En estas nueve casillas no existe: o bajas a R2, o activas ECC en la R8 (perdiendo otro 1/16 de capacidad).

Las cinco placas caen limpiamente en la tabla:

- `S3 N16R8 MINI`, `XIAO S3 Plus` → equivalentes a `N16R8`
- `XIAO S3 / Sense` → equivalente a `N8R8`
- `S3 SuperMini FH4R2` → equivalente a `N4R2`, pero con su Flash también dentro del encapsulado (la `F` de la referencia) y el dado de grado de alta temperatura (la `H`)
- `C3 SuperMini` → fuera de la tabla: el ESP32-C3 es otra línea de arquitectura con 4 MB de Flash y sin PSRAM; el chip ni siquiera la soporta

## 03 Panorama de capacidades

Cada una de las cinco placas ocupa una casilla: `N16R8`, `N8R8`, `N4R2`, más la C3 fuera de tabla. Las cuatro S3 (Xtensa LX7 doble núcleo a 240 MHz, con FPU e instrucciones vectoriales); la C3 (RISC-V mononúcleo a 160 MHz, sin PSRAM y sin soporte en el chip). Las tres últimas S3 usan el mismo dado ESP32-S3R8: solo cambian entre 8 MB y 16 MB de Flash en placa.

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Gráfico de barras apiladas de la capacidad total de Flash más PSRAM para las cinco placas y las nueve combinaciones de módulo WROOM-1, en la misma escala hasta 24 MB">
  <title>Figura 3 · Flash + PSRAM totales: cinco placas frente a nueve combinaciones de módulo (misma escala, MB)</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">Azul = Flash (disco)　Verde = PSRAM (memoria)　Naranja = solo Flash, sin PSRAM</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Placas · las cinco del artículo</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="420" y1="48" x2="420" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="820" y1="48" x2="820" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="100" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="69" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="69" font-size="11.0" fill="var(--accent)">sin PSRAM</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="100" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="111" font-size="11.5" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="94" width="50" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="111" font-size="11.0" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="111" font-size="11.0" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="200" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="153" font-size="11.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="136" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="153" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="153" font-size="11.0" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="195" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="178" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="195" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="195" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="400" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="237" font-size="11.5" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="220" width="200" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="237" font-size="11.0" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="237" font-size="11.0" fill="var(--ink-3)">24 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Combinaciones de módulo · nueve variantes WROOM-1</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Misma escala: las cuatro placas S3 coinciden con tres casillas</text>
  <text x="206" y="301" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="301" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="288" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="720" y="301" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="829" y="301" font-size="10.5" fill="var(--ink-3)">24 MB</text>
  <text x="206" y="331" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="331" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="318" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="520" y="331" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="629" y="331" font-size="10.5" fill="var(--ink-3)">16 MB</text>
  <text x="206" y="361" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="361" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="348" width="200" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="420" y="361" font-size="10.5" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="529" y="361" font-size="10.5" fill="var(--ink-3)">12 MB</text>
  <text x="206" y="391" font-size="11.5" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="400" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="420" y="391" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <rect x="620" y="378" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="645" y="391" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="679" y="391" font-size="10.5" fill="var(--ink-3)">18 MB</text>
  <text x="206" y="421" font-size="11.5" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="200" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="320" y="421" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <rect x="420" y="408" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="445" y="421" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="479" y="421" font-size="10.5" fill="var(--ink-3)">10 MB</text>
  <text x="206" y="451" font-size="11.5" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="100" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="270" y="451" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <rect x="320" y="438" width="50" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="345" y="451" font-size="10.5" text-anchor="middle" fill="var(--ink)">2 MB</text>
  <text x="379" y="451" font-size="10.5" fill="var(--ink-3)">6 MB</text>
  <text x="206" y="481" font-size="11.5" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="400" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="420" y="481" font-size="11" text-anchor="middle" fill="var(--ink)">16 MB</text>
  <text x="629" y="481" font-size="10.5" fill="var(--accent)">sin PSRAM</text>
  <text x="206" y="511" font-size="11.5" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="200" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="320" y="511" font-size="11" text-anchor="middle" fill="var(--ink)">8 MB</text>
  <text x="429" y="511" font-size="10.5" fill="var(--accent)">sin PSRAM</text>
  <text x="206" y="541" font-size="11.5" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="100" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="270" y="541" font-size="11" text-anchor="middle" fill="var(--ink)">4 MB</text>
  <text x="329" y="541" font-size="10.5" fill="var(--accent)">sin PSRAM</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="420" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">16</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">24 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">Las longitudes coinciden una a una: las placas no añaden almacenamiento — el módulo elegido marca el techo; la C3 y las N16 / N8 / N4 no tienen PSRAM.</text>
</svg>

> **Figura 3** · Arriba las cinco placas, abajo las nueve combinaciones de módulo: las longitudes coinciden una a una. Los totales difieren hasta 6×, pero el tramo azul es disco, no memoria.

La «memoria en ejecución» (SRAM interna + PSRAM) es lo que el programa puede reservar de verdad, y su longitud depende solo de la PSRAM:

<svg viewBox="0 0 900 616" width="100%" style="height:auto" role="img" aria-label="Gráfico de barras de la memoria en ejecución utilizable para las cinco placas y las nueve combinaciones de módulo: cuatro niveles 0,4, 0,5, 2,5 y 8,5 MB">
  <title>Figura 4 · Espacio realmente utilizable como memoria en ejecución: cinco placas y nueve combinaciones</title>
  <text x="20" y="18" font-size="13" fill="var(--ink-2)">SRAM interna + PSRAM; la Flash no cuenta. Naranja = 0,4~0,5 MB　Azul = 2,5 MB　Verde = 8,5 MB</text>
  <text x="20" y="40" font-size="12" font-weight="600" fill="var(--ink)">Placas · las cinco del artículo</text>
  <rect x="220" y="48" width="600" height="508" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="353" y1="48" x2="353" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="487" y1="48" x2="487" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="620" y1="48" x2="620" y2="556" stroke="var(--line)" stroke-width="1"/>
  <line x1="753" y1="48" x2="753" y2="556" stroke="var(--line)" stroke-width="1"/>
  <text x="206" y="69" font-size="12.5" text-anchor="end" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="26.7" height="24" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="256" y="69" font-size="12.0" fill="var(--accent)">0,4 MB (solo SRAM interna)</text>
  <text x="206" y="111" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="94" width="166.7" height="24" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="111" font-size="12.0" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="153" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="136" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="153" font-size="12.0" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="195" font-size="12.5" text-anchor="end" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="178" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="195" font-size="12.0" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="237" font-size="12.5" text-anchor="end" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="220" width="566.7" height="24" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="237" font-size="12.0" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <line x1="20" y1="256" x2="880" y2="256" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="20" y="276" font-size="12" font-weight="600" fill="var(--ink)">Combinaciones de módulo · nueve variantes WROOM-1</text>
  <text x="880" y="276" font-size="11.5" text-anchor="end" fill="var(--ink-3)">Misma escala: niveles de 0,5 / 2,5 / 8,5 MB, uno a uno con las placas</text>
  <text x="206" y="301" font-size="11" text-anchor="end" fill="var(--ink)">N16R8</text>
  <rect x="220" y="288" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="301" font-size="10.5" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="331" font-size="11" text-anchor="end" fill="var(--ink)">N8R8</text>
  <rect x="220" y="318" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="331" font-size="10.5" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="361" font-size="11" text-anchor="end" fill="var(--ink)">N4R8</text>
  <rect x="220" y="348" width="566.7" height="18" rx="3" fill="var(--green-tint)" stroke="var(--green)" stroke-width="1"/>
  <text x="777" y="361" font-size="10.5" text-anchor="end" fill="var(--ink)">8,5 MB</text>
  <text x="206" y="391" font-size="11" text-anchor="end" fill="var(--ink)">N16R2</text>
  <rect x="220" y="378" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="391" font-size="10.5" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="421" font-size="11" text-anchor="end" fill="var(--ink)">N8R2</text>
  <rect x="220" y="408" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="421" font-size="10.5" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="451" font-size="11" text-anchor="end" fill="var(--ink)">N4R2</text>
  <rect x="220" y="438" width="166.7" height="18" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="377" y="451" font-size="10.5" text-anchor="end" fill="var(--ink)">2,5 MB</text>
  <text x="206" y="481" font-size="11" text-anchor="end" fill="var(--ink)">N16</text>
  <rect x="220" y="468" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="481" font-size="10.5" fill="var(--accent)">0,5 MB</text>
  <text x="206" y="511" font-size="11" text-anchor="end" fill="var(--ink)">N8</text>
  <rect x="220" y="498" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="511" font-size="10.5" fill="var(--accent)">0,5 MB</text>
  <text x="206" y="541" font-size="11" text-anchor="end" fill="var(--ink)">N4</text>
  <rect x="220" y="528" width="33.3" height="18" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1"/>
  <text x="262" y="541" font-size="10.5" fill="var(--accent)">0,5 MB</text>
  <text x="220" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="353" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">2</text>
  <text x="487" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">4</text>
  <text x="620" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">6</text>
  <text x="753" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">8</text>
  <text x="820" y="576" font-size="12" text-anchor="middle" fill="var(--ink-3)">9 MB</text>
  <text x="20" y="600" font-size="12" fill="var(--ink-3)">El nivel superior es unas 21× el inferior; los 0,5 MB extra vienen de la SRAM interna, por eso N4 / N8 / N16 solo superan a la C3 en 0,1 MB.</text>
</svg>

> **Figura 4** · Lo que de verdad puedes `malloc()` es la memoria en ejecución: cuatro niveles — 0,4 / 0,5 / 2,5 / 8,5 MB — con hasta ~21× de diferencia. Los modelos sin `R` se quedan en ese pequeño trozo de SRAM interna.

Para hacerse una idea de la escala: un fotograma RGB565 de 320×240 ocupa unos 150 KB — 2 MB de PSRAM guardan unos 13 fotogramas y 8 MB unos 53; diez segundos de audio mono a 16 kHz / 16 bits son unos 320 KB — 2 MB dan para unos 60 s y 8 MB para unos 250 s. «Flash suficiente» nunca sustituye a «memoria suficiente».

| Dimensión | S3 SuperMini FH4R2 | S3 N16R8 MINI | XIAO S3 / Sense | XIAO S3 Plus | C3 SuperMini |
|---|---|---|---|---|---|
| **Serie** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-S3** | **ESP32-C3** (control) |
| Chip principal | ESP32-S3FH4R2 | ESP32-S3R8 | ESP32-S3R8 | ESP32-S3R8 | ESP32-C3FN4 |
| CPU | doble núcleo 240 MHz | doble núcleo 240 MHz | doble núcleo 240 MHz | doble núcleo 240 MHz | mononúcleo 160 MHz |
| Flash | 4 MB (en el encapsulado) | 16 MB (en placa) | 8 MB (en placa) | 16 MB (en placa) | 4 MB (en el encapsulado) |
| PSRAM | 2 MB Quad | 8 MB Octal | 8 MB Octal | 8 MB Octal | ninguna, no soportada |
| RAM interna | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 512 KB SRAM | 400 KB SRAM |
| Memoria en ejecución | 2,5 MB | 8,5 MB | 8,5 MB | 8,5 MB | 0,4 MB |
| Almacenamiento total | 6 MB | 24 MB | 16 MB | 24 MB | 4 MB |
| GPIO utilizables | ~11 | ~20 | 11 (Sense +2) | 18 | 11 |
| Temperatura de trabajo | −40~85 °C | −40~65 °C | −20~65 °C | −20~65 °C | −40~85 °C |
| Precio aproximado | ~¥22 | ~¥26 | ~¥54 | ~¥62 | ~¥12 |

Las cuatro S3 tienen exactamente la misma RAM interna; solo cambian Flash y PSRAM. La C3 es otra línea de arquitectura: sin USB OTG, sin interfaz LCD ni de cámara, sin instrucciones vectoriales, y sin forma de conseguir PSRAM añadiendo Flash. Está aquí para mostrar la diferencia de arquitectura, no como sustituto.

## 04 Sumando los precios

> **Criterio de precios**: **~¥12 / ¥22 / ¥26 / ¥54 / ¥62** (yuanes chinos) provienen de canales minoristas públicos en 2026-11, redondeados con algo de margen para cubrir impuestos, envío, ofertas y diferencias de bundle. No son precios oficiales ni cotizaciones en tiempo real: solo sirven para comparar órdenes de magnitud. Distintos mercados y distintos momentos pueden diferir varias veces; rija siempre el precio local real.

<svg viewBox="0 0 900 320" width="100%" style="height:auto" role="img" aria-label="Gráfico de barras horizontales de los precios aproximados de las cinco placas, de unos 12 a unos 62 yuanes">
  <title>Figura 5 · Precio aproximado y capacidad: diferencias dentro del mismo nivel (misma escala)</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Longitud = precio aproximado; dentro = almacenamiento total / memoria en ejecución que compra; la calidad no está en el gráfico</text>
  <rect x="220" y="38" width="600" height="242" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="391" y1="38" x2="391" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="563" y1="38" x2="563" y2="280" stroke="var(--line)" stroke-width="1"/>
  <line x1="734" y1="38" x2="734" y2="280" stroke="var(--line)" stroke-width="1"/>
  <text x="20" y="70" font-size="13" fill="var(--ink)">C3 SuperMini</text>
  <rect x="220" y="52" width="103" height="26" rx="3" fill="var(--accent-tint)" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="230" y="70" font-size="12" fill="var(--ink)">4 MB · 0,4 MB</text>
  <text x="331" y="70" font-size="12" fill="var(--accent)">~¥12</text>
  <text x="20" y="114" font-size="13" fill="var(--ink)">S3 SuperMini FH4R2</text>
  <rect x="220" y="96" width="189" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="114" font-size="12" fill="var(--ink)">6 MB · 2,5 MB</text>
  <text x="417" y="114" font-size="12" fill="var(--pen)">~¥22</text>
  <text x="20" y="158" font-size="13" fill="var(--ink)">S3 N16R8 MINI</text>
  <rect x="220" y="140" width="223" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="158" font-size="12" fill="var(--ink)">24 MB · 8,5 MB</text>
  <text x="451" y="158" font-size="12" fill="var(--pen)">~¥26</text>
  <text x="20" y="202" font-size="13" fill="var(--ink)">XIAO S3 / Sense</text>
  <rect x="220" y="184" width="463" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="202" font-size="12" fill="var(--ink)">16 MB · 8,5 MB</text>
  <text x="691" y="202" font-size="12" fill="var(--pen)">~¥54</text>
  <text x="20" y="246" font-size="13" fill="var(--ink)">XIAO S3 Plus</text>
  <rect x="220" y="228" width="531" height="26" rx="3" fill="var(--pen-tint)" stroke="var(--pen)" stroke-width="1"/>
  <text x="230" y="246" font-size="12" fill="var(--ink)">24 MB · 8,5 MB</text>
  <text x="759" y="246" font-size="12" fill="var(--pen)">~¥62</text>
  <text x="220" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="391" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥20</text>
  <text x="563" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥40</text>
  <text x="734" y="300" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥60</text>
  <text x="20" y="316" font-size="12" fill="var(--ink-3)">Rango ~¥12–62, hasta ~5,2× de diferencia; la longitud refleja solo precio — la RF, la consistencia y la documentación no están en la escala.</text>
</svg>

> **Figura 5** · Dos placas con capacidad y configuración idénticas difieren en ~¥36; esa diferencia viene de fuera de la tabla de capacidades, y el gráfico no puede decir cuál es mejor.

El caso más llamativo: **el S3 N16R8 MINI de ~¥26 y el XIAO S3 Plus de ~¥62 tienen Flash, PSRAM, memoria en ejecución y configuración de firmware idénticas**, con diferencia de ~¥36 (58 %). Repartido en memoria sale a ~¥3,06/MB contra ~¥7,29/MB. El dinero extra paga cosas que están fuera de la tabla de capacidades.

Tres apuntes más:

1. **Precio unitario y precio absoluto suelen apuntar en sentidos contrarios.** La C3 es la más barata en absoluto, pero sin PSRAM sus 0,4 MB salen a ~¥30/MB — diez veces el nivel de 8 MB Octal. La C3 está pensada para bajo consumo y tamaño mínimo.
2. **También hay compensaciones dentro de una misma serie.** El XIAO estándar / Sense de ~¥54 es ~¥8 más barato que el Plus, con la mitad de Flash y 7 GPIO menos; pero el Sense añade cámara, micrófono y SD, y el estándar es más pequeño y tiene U.FL.
3. **El salto entre arquitecturas es el mayor.** C3 → S3 SuperMini FH4R2 cuesta ~¥10 más y pasa la memoria en ejecución de 0,4 a 2,5 MB (6,25×), cambiando a la vez a doble núcleo 240 MHz, instrucciones vectoriales y USB OTG. No es una mejora: es cambiar de arquitectura.

<svg viewBox="0 0 900 420" width="100%" style="height:auto" role="img" aria-label="Diagrama de dispersión de precio aproximado frente a memoria en ejecución, solo dos dimensiones, sin información de calidad">
  <title>Figura 6 · Precio × memoria en ejecución: distribución en dos dimensiones</title>
  <text x="20" y="20" font-size="13" fill="var(--ink-2)">Solo dos dimensiones: precio y memoria en ejecución; la RF, la consistencia de placa, el ecosistema y el mantenimiento a largo plazo no están en los ejes</text>
  <rect x="120" y="50" width="700" height="290" fill="none" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="108" x2="820" y2="108" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="166" x2="820" y2="166" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="224" x2="820" y2="224" stroke="var(--line)" stroke-width="1"/>
  <line x1="120" y1="282" x2="820" y2="282" stroke="var(--line)" stroke-width="1"/>
  <line x1="320" y1="50" x2="320" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="520" y1="50" x2="520" y2="340" stroke="var(--line)" stroke-width="1"/>
  <line x1="720" y1="50" x2="720" y2="340" stroke="var(--line)" stroke-width="1"/>
  <rect x="132" y="60" width="178" height="42" rx="5" fill="var(--card)" stroke="var(--line-2)" stroke-width="1"/>
  <text x="144" y="78" font-size="11" fill="var(--ink)">Solo precio y memoria</text>
  <text x="144" y="94" font-size="11" fill="var(--ink)">sin dimensión de calidad</text>
  <circle cx="240" cy="328" r="5" fill="var(--accent)"/>
  <text x="252" y="332" font-size="12" fill="var(--accent)">C3 SuperMini ~¥12 · 0,4 MB</text>
  <circle cx="340" cy="268" r="5" fill="var(--pen)"/>
  <text x="352" y="272" font-size="12" fill="var(--pen)">S3 SuperMini FH4R2 ~¥22 · 2,5 MB</text>
  <circle cx="380" cy="94" r="5" fill="var(--pen)"/>
  <text x="392" y="80" font-size="12" fill="var(--pen)">S3 N16R8 MINI ~¥26 · 8,5 MB</text>
  <circle cx="660" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="650" y="118" font-size="12" fill="var(--ink-2)">XIAO S3 / Sense ~¥54 · 8,5 MB</text>
  <circle cx="740" cy="94" r="5" fill="var(--ink-3)"/>
  <text x="880" y="76" font-size="12" text-anchor="end" fill="var(--ink-2)">XIAO S3 Plus ~¥62 · 8,5 MB</text>
  <text x="120" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">0</text>
  <text x="320" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥20</text>
  <text x="520" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥40</text>
  <text x="720" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥60</text>
  <text x="820" y="365" font-size="12" text-anchor="middle" fill="var(--ink-3)">~¥70</text>
  <text x="112" y="54" font-size="12" text-anchor="end" fill="var(--ink-3)">10</text>
  <text x="112" y="112" font-size="12" text-anchor="end" fill="var(--ink-3)">8</text>
  <text x="112" y="170" font-size="12" text-anchor="end" fill="var(--ink-3)">6</text>
  <text x="112" y="228" font-size="12" text-anchor="end" fill="var(--ink-3)">4</text>
  <text x="112" y="286" font-size="12" text-anchor="end" fill="var(--ink-3)">2</text>
  <text x="112" y="344" font-size="12" text-anchor="end" fill="var(--ink-3)">0</text>
  <text x="20" y="400" font-size="12" fill="var(--ink-3)">↑ Memoria en ejecución (MB)　→ Precio (¥)　Los tres puntos de 8,5 MB están en la misma línea horizontal: la diferencia de precio no viene del almacenamiento.</text>
</svg>

> **Figura 6** · Tres puntos a la misma altura de 8,5 MB: las diferencias de precio no vienen del almacenamiento. Lo que no se ve en el gráfico — RF, control de calidad y documentación — suele ser el origen de la diferencia.

En forma de tabla (la última columna es solo precio por capacidad):

| Modelo | Precio aprox. | Almacenamiento total | Memoria en ejecución | Precio por capacidad (~¥ / MB de ejecución) | Multiplicador de precio |
|---|---|---|---|---|---|
| C3 SuperMini | ~¥12 | 4 MB | 0,4 MB | ~¥30,00 | 1,00× |
| S3 SuperMini FH4R2 | ~¥22 | 6 MB | 2,5 MB | ~¥8,80 | 1,83× |
| S3 N16R8 MINI | ~¥26 | 24 MB | 8,5 MB | ~¥3,06 | 2,17× |
| XIAO S3 / Sense | ~¥54 | 16 MB | 8,5 MB | ~¥6,35 | 4,50× |
| XIAO S3 Plus | ~¥62 | 24 MB | 8,5 MB | ~¥7,29 | 5,17× |

### Qué compra la diferencia de precio

**Los precios son comparables entre placas; la calidad no.** Con el mismo conjunto de 16 MB Flash + 8 MB Octal PSRAM, una placa todavía puede diferir en:

- **RF y antena**: el acoplamiento, el área de keep-out y el ajuste deciden el rendimiento real de WiFi / BLE, y si hay conector U.FL es otra historia. La queja típica de placas baratas — señal débil, inestable tras una pared — no aparece en la ficha técnica; solo se juzga por diseño, certificaciones y RSSI medido.
- **Control de calidad**: protección de alimentación y USB, soldaduras, material de PCB, variación entre lotes — todo ello afecta a la estabilidad a largo plazo y a si aparecerán problemas inexplicables al depurar.
- **Documentación y mantenimiento**: esquemas, pinout, firmware de ejemplo, comunidad, continuidad de suministro. Las placas de marca como XIAO suelen costar más justo aquí, no por Flash ni PSRAM.
- **Conformidad**: los diseños de dado desnudo no pueden apoyarse en la certificación RF de un módulo; la conformidad RF a nivel de placa debe verificarse aparte.

«Obtienes lo que pagas» se cumple en términos generales — **pero no se puede usar al revés**. Caro no significa mejor en todo; prima de marca, sobreprecio de canal y diferencias de bundle también cuentan. Las placas white-label varían varias veces entre mercados, mientras las de marca tienen precios globales bastante uniformes; rehaz la comparación en tu propio mercado.

Un orden más seguro: **primero filtra las placas que «pueden correr» por capacidad, modo de PSRAM y configuración de firmware; compara luego RF, estabilidad, documentación y suministro; y solo entonces mira el precio.**

## 05 Traducir la capacidad a configuración

Las capacidades de la ficha no se convierten por sí solas en firmware que funcione. Cinco interruptores, todos calculables antes de comprar:

1. **Alinear Flash size con el hardware.** `CONFIG_ESPTOOLPY_FLASHSIZE_4MB / 8MB / 16MB` (o Flash Size en Arduino) debe coincidir con el dado de la placa; ponlo demasiado grande y OTA o la inicialización del sistema de archivos pisarán direcciones inexistentes.
2. **Alinear el modo de PSRAM con el cableado.** La 2 MB Quad dentro del encapsulado usa `CONFIG_SPIRAM_MODE_QUAD`; la 8 MB Octal usa `CONFIG_SPIRAM_MODE_OCT`; en Arduino son `QSPI PSRAM` / `OPI PSRAM`. **Si esto está mal, la placa no va lenta: aborta en el arranque.**
3. **Hacer primero la suma de particiones.** Flash no equivale a espacio para firmware: tabla de particiones, nvs, otadata y phy_init ocupan antes una parte, y el resto se reparte entre app y partición de datos. **La doble OTA necesita un slot igual de grande para la siguiente versión** — aproximadamente `app × 2 + partición de datos + gastos fijos`. Un firmware con pila de protocolos y librería gráfica suele ocupar 1~2 MB; al duplicar para OTA te acercas a 4 MB, y reservando 1 MB para fuentes e imágenes te pasas — aquí es donde más caen las placas de 4 MB. Suma primero el tamaño real de tu firmware; si no cabe, sube a 16 MB o vuelve a OTA simple.
4. **Presupuestar búferes de PSRAM.** Framebuffers, búferes de handshake TLS y heaps de JSON y decodificación de imágenes viven en PSRAM; estima «suma de búferes residentes en pico × 1,3» y compáralo con los niveles de 2 MB / 8 MB. Los búferes DMA, pilas de tareas y variables estáticas no pueden ir a PSRAM por defecto: requiere configuración explícita.
5. **Cambiar de target entre arquitecturas.** El C3 es RISC-V, el S3 es Xtensa: `CONFIG_IDF_TARGET`, toolchain y SDK cambian como un conjunto; todos los `CONFIG_SPIRAM_*` no aplican en C3 — simplemente no los pongas.

Una configuración típica de 16 MB + Octal tiene este aspecto:

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
```

| Nivel de capacidad | Qué configurar | Efecto práctico |
|---|---|---|
| 16 MB Flash + 8 MB Octal | `FLASHSIZE_16MB` + `MODE_OCT` + `SPEED_80M` | Cabe doble OTA y partición de datos, con recursos holgados |
| 8 MB Flash + 8 MB Octal | Igual, con Flash size en `8MB` | La doble OTA sigue valiendo, pero la partición de datos se reduce notablemente: fuentes e imágenes van contadas |
| 4 MB Flash + 2 MB Quad | `FLASHSIZE_4MB` + `MODE_QUAD` + tabla de particiones de 4 MB | La doble OTA no suele caber; lo normal es OTA simple; recalcula los búferes de PSRAM contra 2 MB |
| 4 MB Flash, sin PSRAM (C3) | `IDF_TARGET=esp32c3` + tabla de particiones de 4 MB | Todos los `SPIRAM_*` no aplican; el presupuesto de memoria es solo SRAM interna |

En una frase: **antes de elegir placa, haz tres cuentas** — ¿caben firmware y recursos en la Flash?, ¿caben los búferes de pico en la PSRAM?, ¿coinciden las opciones de configuración con el hardware real? Si las tres salen, la placa sirve.

## 06 Cómo elegir y qué evitar

**Primero deduce la capacidad a partir de lo que tu programa necesita, y después elige entre las placas que la superan** — no ordenes por precio ni por número en la ficha:

| Lo que tu programa necesita de verdad | Nivel mínimo suficiente | Por qué |
|---|---|---|
| Refresco completo en color o escala de grises, framebuffers multicapa, fuentes e imágenes locales, audio en streaming, o doble OTA más sistema de archivos | 16 MB Flash + 8 MB Octal PSRAM | Los 8,5 MB de memoria en ejecución dejan sitio a framebuffer y TLS, y la Flash guarda dos copias de app más una zona de recursos |
| Refresco completo monocromo, agregación de sensores, OTA simple, algo de JSON | 4 MB Flash + 2 MB Quad PSRAM | 2,5 MB de memoria en ejecución bastan, pero fuentes e imágenes deben ser pequeñas |
| Solo reportar por red, sin UI, priorizando consumo y tamaño | 4 MB Flash, sin PSRAM (C3) | 0,4 MB cubren la pila de protocolos más búferes pequeños, a cambio de bajo consumo y tamaño mínimo |
| Necesitas cámara / micrófono / SD, o estás limitado por formato wearable | XIAO estándar / Sense de 8 MB Flash | Las restricciones relevantes son integración a nivel de placa y número de pines, no la capacidad |

Hay otro criterio que no está en la tabla pero puede descartar placas de golpe: **el rango amplio de temperatura**. La PSRAM Octal de 8 MB está clasificada para −40~65 °C; para 85 °C hay que cambiar a una referencia Quad en encapsulado, o activar ECC (perdiendo 1/16 de capacidad útil). En este punto, la `S3 SuperMini FH4R2` resulta más holgada.

Lista de trampas a evitar:

- La 8 MB Octal PSRAM ocupa **GPIO33~37** — no reutilices pines que la documentación marca como no disponibles.
- La `H` de `FH4R2` solo indica que el dado de Flash es de grado de alta temperatura; **no significa que todo el chip llegue a 105 °C** — el datasheet actual marca −40~85 °C.
- Los diseños de dado desnudo no pueden apoyarse en certificación RF de módulo; para productos, la conformidad RF a nivel de placa debe verificarse aparte. `ESP32-C3FN4` aparece como EOL en la web de Espressif: para diseños nuevos elige una referencia en producción.
- Flash y PSRAM dentro del encapsulado comparten un mismo juego de líneas SPI y los pines están completamente ocupados — **no puede ampliarse almacenamiento externo**; para almacenamiento propio hay que partir de una referencia sin co-empaquetado y diseñar de nuevo.
- El rendimiento real de la antena nunca aparece en la ficha. Si la conexión es inestable o se cae tras paredes, mira primero el keep-out de la antena y si hay conector U.FL, y mide luego RSSI — este tipo de reseñas es común en placas baratas; no lo conviertas en bug de firmware desde el primer momento.

### Costes más allá del precio

Un precio minorista aproximado es solo el punto de partida del hardware. Entre «una placa que enciende» y «un producto que funciona de forma estable años» hay cuatro bloques de coste, ninguno relacionado con «cuántos MB de Flash o PSRAM»: **ingeniería de hardware** (disipación, alimentación y batería, ajuste de antena, EMC del equipo), **ingeniería de software** (adaptación de drivers, dormir/despertar, recuperación de fallos, rollback de OTA, compatibilidad a largo plazo), **certificación de conformidad** (EMC / RF del equipo, acceso a mercado) y **producción y postventa** (rendimiento, consistencia de lotes, repuestos para reparaciones).

Su magnitud varía enormemente según el producto y nunca aparece en la página del producto. Así que este artículo compara **parámetros de hardware en el momento de selección**, no la estructura de costes del producto final: leer bien las especificaciones evita comprar la placa equivocada; lo que aún debes invertir después de que llegue lo decide el propio proyecto.

---

**Fuentes y criterio**: Espressif *ESP32-S3 Series Datasheet v2.2*, tablas 1-1 / 2-14 / 5-11 / 5-12; *ESP32-C3 Series Datasheet*; *ESP32-S3-WROOM-1 & 1U Datasheet*, tablas 1-1 / 1-2 (nueve códigos de pedido, tipos de Flash y PSRAM, rangos de temperatura, dimensiones del módulo); *ESP32-S3-WROOM-2 Datasheet* (SPI a 1,8 V y niveles de 32 MB de Flash); wiki oficial y especificaciones de la serie Seeed Studio XIAO ESP32-S3; documentación pública del fabricante del S3 N16R8 MINI; ESP-IDF *Support for External RAM* y la documentación de configuración de placas de Arduino-ESP32. Las capacidades son nominales; el heap realmente disponible con `malloc()` es algo menor. El ancho de banda de PSRAM, el rango de temperatura y la ocupación de GPIO se rigen por el último datasheet de cada referencia. Los precios de este artículo son **cifras aproximadas en yuanes chinos (CNY)** de canales minoristas públicos, con criterio en la sección 04; no constituyen valoración de calidad ni consejo de compra.
