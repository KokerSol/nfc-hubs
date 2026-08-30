# T039 — Comprobaciones en dispositivo real

Cuatro comprobaciones que no se pueden automatizar. Cada una cubre una afirmación que la suite de
tests es estructuralmente incapaz de hacer: un WebKit emulado no es un iPhone, y axe no ve una
habitación a oscuras.

> **Nota 2026-08-28.** El repositorio se movió a la organización `KokerSol`. La URL de producción
> es ahora <https://kokersol.github.io/nfc-hubs/demo/>; la anterior (`diegojs97.github.io`) ya no
> resuelve. Las tres referencias de este documento están corregidas — si sigues este procedimiento
> desde una copia antigua, comprueba la URL antes de grabar ninguna etiqueta.

**Tiempo necesario:** ~30 minutos, más la grabación de la etiqueta.
**Hace falta:** un iPhone, un Android, una etiqueta NFC virgen, una app para grabar etiquetas
(NFC Tools o similar) y una habitación de verdad a oscuras.

Anota los resultados en la tabla del final y haz commit.

---

## Orden de prioridad

Las comprobaciones **mantienen su numeración original** (se referencian desde
`validation-report.md` y desde `tasks.md`), pero aparecen aquí en orden de importancia, no de
número:

| Prioridad | # | Comprobación | Estado (2026-08-08) |
|---|---|---|---|
| 1.ª — **la crítica** | 1 | vCard en iOS Safari | ✅ **PASA.** Riesgo D5 cerrado |
| 2.ª | 4 | Tap NFC, bloqueado y desbloqueado | ✅ **Cerrada.** Pasa en ambos, con umbrales de plataforma distintos y documentados |
| 3.ª | 2 | vCard en Android Chrome | ✅ **PASA** |
| 4.ª | 3 | Contraste nocturno a oscuras | ⬜ Abierta, y de valor limitado hasta que haya un cliente real |

**El riesgo que podía cambiar el plan del proyecto ya no existe.** La comprobación 1 era un riesgo
de **arquitectura** — independiente de qué cliente o qué tema acabe usando el sistema — y ha
pasado: iOS Safari abre el importador de contactos con una vCard generada en el navegador, así que
FR-020 se sostiene tal y como está escrito y el plan B del `.vcf` estático no hace falta. Lo que
queda son restricciones documentadas y una comprobación aplazada a propósito.

> **El orden de prioridad no es el orden de ejecución.** Las comprobaciones 1 y 2 comparten la
> misma preparación temporal, así que si vas a hacerlas las dos en una sentada sale más barato
> hacerlas seguidas, revertir, y luego ir a la 4 y la 3. La prioridad dice qué hacer si solo vas a
> hacer algunas, no en qué orden encadenarlas.

---

## Preparación

### 1. Dónde abrir el hub desde el móvil

Hay dos caminos, y **no son intercambiables**:

| Camino | URL | Sirve para |
|---|---|---|
| **Sitio en producción** *(preferido)* | <https://kokersol.github.io/nfc-hubs/demo/> | Comprobaciones **4 y 3** |
| **Servidor local por LAN** *(alternativa)* | `http://<ip-de-esta-máquina>:8080/demo/` | Comprobaciones **1 y 2**, y todo si estás sin conexión |

**Las comprobaciones 1 y 2 tienen que ir por LAN.** Necesitan datos de contacto de prueba
inventados (paso 2 de abajo), y esos datos **no pueden llegar nunca al sitio en producción**:
publicarlos exigiría hacer commit y push de datos inventados, que es exactamente lo que prohíbe el
Principio VII de la constitución.

Para el camino LAN:

```bash
npm run build
npm run serve            # escucha en todas las interfaces, puerto 8080
```

La dirección de esta máquina:

```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }).IPAddress
```

Los dos dispositivos tienen que estar en la misma red, y el Firewall de Windows puede pedir
permiso para Node — dáselo para redes privadas.

> ⚠ **La LAN es HTTP, no HTTPS.** Si la comprobación 1 falla por LAN, **no concluyas todavía que
> el flujo de vCard está roto**: los navegadores restringen ciertos comportamientos fuera de un
> contexto seguro, y eso sería un falso negativo. Anótalo como «falla en HTTP, sin confirmar en
> HTTPS» y para. Reintentarlo en HTTPS es una decisión aparte, porque el sitio en producción no es
> una opción con datos inventados — habría que servirlos por TLS de otra forma (certificado local
> o túnel temporal) y eso conviene decidirlo a la vista del fallo, no de antemano.

El sitio en producción, en cambio, es HTTPS real y ya está desplegado, así que las comprobaciones
4 y 3 se hacen contra él sin ninguna preparación.

### 2. Datos de contacto temporales (solo para las comprobaciones 1 y 2)

**El hub `demo` no declara ninguna entrada `vcard`.** No es que esté pendiente: es que no existe,
porque el módulo de guardar contacto es opcional y esta instancia no lo activa (FR-017). Además su
teléfono sigue siendo el centinela. Para ejercitar el camino de la vCard hay que activar la
entrada y confirmar el teléfono temporalmente.

Edita `src/businesses/demo/business.json` y haz **dos** cambios.

**a) Confirma el teléfono y mete una coma y un punto y coma en la dirección**, para que la
comprobación ejercite también el escapado:

```diff
   "contact": {
-    "phone": "[PLACEHOLDER - replace]",
-    "address": "Calle del Ejemplo 12, 28013 Madrid",
+    "phone": "+34 600 000 000",
+    "address": "Calle del Ejemplo, 12; 2º izq, 28013 Madrid",
     "website": "https://example.com/"
   },
```

`name` y `website` ya están confirmados, así que con esto los cuatro valores que exige FR-020
quedan completos.

**b) Añade la entrada `vcard` al final del array `entries`:**

```diff
     { "id": "review", "label": "Reseña Google", "type": "review" },
-    { "id": "wifi", "label": "WiFi", "type": "wifi" }
+    { "id": "wifi", "label": "WiFi", "type": "wifi" },
+    { "id": "vcard", "label": "Guardar contacto", "type": "vcard" }
```

Una entrada `vcard` no lleva clave `url` — su destino no es un enlace, es una acción local del
navegador. El esquema la rechaza si se la pones.

Luego `npm run build` y reinicia `npm run serve`. El hub debe pasar de 6 entradas a 7, y la última
debe ser [ES] «Guardar contacto» **sin** distintivo de pendiente.

> ⚠ **Revierte en cuanto termines las comprobaciones que usan estos datos.** Los datos inventados
> no pueden llegar nunca a un commit (Principio VII), y menos aún a un push, que despliega
> automáticamente:
>
> ```bash
> git checkout src/businesses/demo/business.json && npm run build
> npm run audit:placeholders    # tiene que volver a decir 3
> git status                    # business.json no puede aparecer modificado
> ```

---

## Comprobación 1 — Importación de vCard en iOS Safari ✅ PASA

> **RESULTADO (2026-08-08): PASA.** iPhone con **iOS 26.5.2**. iOS Safari abre el importador de
> contactos con la vCard generada en el navegador. **El riesgo D5 queda cerrado y FR-020 se
> sostiene sin enmienda**: el plan B del `.vcf` estático no se necesita.
>
> La advertencia de HTTP de la preparación queda **sin efecto para este resultado**. Avisaba de un
> posible falso negativo *si fallaba* por LAN; un resultado positivo en contexto no seguro no tiene
> esa ambigüedad, porque HTTPS es estrictamente más permisivo. No hace falta repetirla en HTTPS.

Este era el único riesgo técnico sin resolver del proyecto (research.md D5), y es el único de esta
lista que es un riesgo **de arquitectura**: no depende del cliente, ni del tema, ni de qué
entradas elija un local. Si iOS no hubiera abierto el importador de contactos, el módulo de guardar
contacto no funcionaría para nadie, hoy ni con un cliente real dentro de seis meses.

El procedimiento se conserva íntegro: hay que repetirlo con los datos reales de cada cliente que
active la entrada `vcard`, porque lo que se ha verificado es el mecanismo, no los valores.

1. En el **iPhone**, abre **Safari** (no Chrome, no un navegador dentro de otra app) en
   `http://<dirección>:8080/demo/`
2. Comprueba que la última entrada pone [ES] **«Guardar contacto»** y que **no** muestra el
   distintivo de «Pendiente». Si sigue apareciendo, el paso de preparación no ha surtido efecto —
   recompila y recarga.
3. Tócala.

**PASA** si se cumple todo:

- iOS ofrece el fichero o abre Contactos directamente — ni una pestaña en blanco, ni un silencio
- aparece la pantalla de **«Añadir contacto»**, en Contactos
- los cuatro valores están presentes y correctos: nombre del negocio, teléfono, dirección y web
- la dirección se lee como **un solo campo** — `Calle del Ejemplo, 12; 2º izq, 28013 Madrid` — sin
  partirse entre campos ni cortarse en la coma
- no aparece ninguna barra invertida suelta en ningún campo

**Qué anotar si falla — de esto depende lo que pase después:**

| Síntoma | Qué significa |
|---|---|
| No pasa absolutamente nada | El flujo Blob/`download` no está soportado. **Este es el fallo D5.** |
| El fichero se descarga a Archivos pero Contactos no se abre | Soporte parcial; puede ser aceptable, es tu decisión |
| Contactos se abre pero faltan campos | Bug de generación en `vcard.js`, no una limitación de plataforma |
| La dirección se parte en la coma, o se ve `\,` | Bug de escapado RFC 2426 en `vcard.js` |

Anota también: **versión de iOS**, y si tocaste desde Safari directamente o desde un enlace abierto
dentro de otra app. Y recuerda la advertencia de HTTP de la preparación antes de dar por bueno un
fallo.

> ⚠ **Si falla del todo:** el plan B es un `.vcf` estático pre-generado servido como un enlace
> normal. Eso **contradice FR-020**, que exige generación en el navegador. Requiere una enmienda
> de la especificación, no una sustitución silenciosa (`contracts/vcard.md`). Reporta el fallo y
> para — que nadie cambie la implementación por lo bajo.

---

## Comprobación 4 — Tap NFC real, bloqueado y desbloqueado

> **RESULTADO en Android (2026-08-08): pasa desbloqueado; restricción de plataforma confirmada en
> bloqueo.** Android 16, build `BP2A.250605.031.A3`.
>
> - **Desbloqueado: funciona.** El tap abre el hub.
> - **Bloqueado: no pasa absolutamente nada.** Ni notificación, ni reacción del lector. Y **no
>   existe ninguna opción de «leer NFC con la pantalla bloqueada»** en los ajustes de este
>   dispositivo, así que no es una restricción de configuración que el usuario pueda levantar: es
>   comportamiento del sistema operativo y del fabricante.

Esto cierra las dos preguntas que quedaban abiertas: *nada en absoluto* (no una notificación que no
llegó a abrir), y *no hay ajuste que activar*. La distinción importaba porque una notificación sin
abrir habría significado que el lector sí funciona y lo que falta es permiso; el silencio total
significa que el lector está apagado con la pantalla bloqueada, y eso no se configura.

**No es un defecto de este código y no hay nada que arreglar aquí.** Es una restricción de
plataforma que hay que **contarle al cliente** antes de instalar nada: en este dispositivo, y
probablemente en muchos Android, el cliente tiene que desbloquear el móvil antes de acercarlo a la
mesa. FR-010 exige que el hub se abra «sin pasos extra más allá del flujo normal del sistema
operativo» — y desbloquear el móvil *es* el flujo normal de ese sistema operativo, así que el
requisito se cumple.

> **RESULTADO en iPhone (2026-08-08): pasa con la pantalla encendida, bloqueado o no.** iOS 26.5.2.
> Los **tres** estados se probaron directamente:
>
> - **Desbloqueado, pantalla encendida:** lee la etiqueta y abre el hub.
> - **Bloqueado, pantalla encendida** (pantalla de bloqueo a la vista): **lee la etiqueta y abre el
>   hub.** No hace falta desbloquear.
> - **Pantalla apagada / dormida:** no dispara.
>
> Es decir: en iPhone lo que decide **no es el bloqueo, sino si la pantalla está encendida**. Es una
> distinción útil al explicárselo a un cliente, porque no es la que uno esperaría por analogía con
> Android.
>
> Esto es el comportamiento **documentado** de Apple, no un límite de este proyecto: la lectura de
> etiquetas en segundo plano (*Background Tag Reading*, Core NFC) exige que el dispositivo esté «en
> uso», y una pantalla de bloqueo encendida cumple esa condición mientras que una pantalla apagada
> no.

**Los dos ecosistemas pasan, pero con umbrales distintos — y esa es la conclusión que importa.**

| | Lee la etiqueta cuando… | Origen |
|---|---|---|
| **iPhone** (iOS 26.5.2) | la pantalla está encendida, aunque esté bloqueada | Diseño documentado de Apple: *Background Tag Reading* (Core NFC) exige dispositivo «en uso» |
| **Android** (16, `BP2A.250605.031.A3`) | el móvil está desbloqueado | Comportamiento de SO/fabricante; sin ajuste que lo cambie en este dispositivo |

La restricción encontrada en Android **no es del producto**: es de un ecosistema, y el otro pone el
listón más bajo. Ninguno de los dos es un defecto que arreglar aquí, y los dos cumplen FR-010,
porque en cada plataforma lo exigido es el flujo normal de ese sistema operativo.

Lo que sí cambia es **lo que se le cuenta a un cliente**: en la mesa, un cliente con iPhone
normalmente solo tiene que despertar la pantalla, mientras que uno con Android tiene que
desbloquear. Merece la pena decirlo antes de instalar, no después de la primera queja.

### Cómo repetirla (iPhone, o Android con el ajuste cambiado)

Ahora hay una URL pública real, así que esta comprobación ya no depende de la LAN.

> ⚠ **Usa una etiqueta desechable y márcala para reescribir.** La URL de producción actual está
> atada al nombre del repositorio de GitHub Pages. Todavía **no** es la dirección definitiva, así
> que no grabes etiquetas de ningún local contra ella (`contracts/hub-url.md`).

1. Con la app de grabación, escribe un registro **URL / URI**:
   `https://kokersol.github.io/nfc-hubs/demo/?m=1`
   (sin conexión, la alternativa es `http://<dirección>:8080/demo/?m=1`)
2. **Prueba desbloqueado:** móvil desbloqueado, pantalla encendida, acércalo a la etiqueta
3. **Prueba bloqueado:** bloquea el móvil, pantalla apagada, acércalo a la etiqueta

**PASA**, para cada móvil y cada estado, si:

- el móvil reacciona a la etiqueta en aproximadamente un segundo
- el hub se abre — directamente o con un único toque en la notificación
- no hace falta ningún paso extra más allá del flujo normal del sistema operativo (FR-010)
- la página se ve idéntica a abrirla escribiendo la URL, y el `?m=1` **no aparece por ningún
  lado** (SC-009)
- el hub aparece **con sus estilos**. Sin estilos significaría que la ruta base no coincide con la
  ruta real de despliegue — aunque el paso de verificación del workflow debería haber impedido que
  eso llegue a publicarse

Un móvil que no lee con la pantalla bloqueada es una **restricción de plataforma que hay que
anotar y contarle al cliente**, no un defecto que arreglar en este repositorio. FR-010 exige que el
hub se abra «sin pasos extra más allá del flujo normal del sistema operativo» — y desbloquear el
móvil *es* el flujo normal de ese sistema operativo.

---

## Comprobación 2 — Importación de vCard en Android Chrome ✅ PASA

> **RESULTADO (2026-08-08): PASA.** Android 16, build `BP2A.250605.031.A3`. El fichero se descarga
> y se importa a Contactos con los cuatro valores correctos y la dirección intacta como un solo
> campo, así que el escapado RFC 2426 se sostiene también fuera del test automático.

Prioridad menor que la 1: Android es históricamente el caso fiable, así que esta comprobación
confirma más que descubre. Un fallo aquí sugeriría un bug de generación en `vcard.js` más que una
limitación de plataforma — si iOS también falló, compara los dos síntomas.

1. En el **Android**, abre **Chrome** en `http://<dirección>:8080/demo/`
2. Toca [ES] **«Guardar contacto»**

**PASA:** el fichero se descarga y al abrirlo ofrece importarlo a Contactos, con los cuatro valores
correctos y la dirección intacta como un solo campo.

Anota los mismos detalles que en la comprobación 1, más la **versión de Android**.

**Al terminar, revierte los datos temporales** (ver preparación, paso 2). La comprobación 3 se hace
contra el hub con sus datos reales.

---

## Comprobación 3 — Contraste nocturno en una habitación a oscuras

**Prioridad más baja de las cuatro, y conviene explicar por qué antes de hacerla.**

El tema oscuro de [ES] «Taberna Vela y Sal» es **una instancia de ejemplo** del sistema de temas
del motor, no una decisión de negocio fija. El reparto es explícito en el código:

- `src/_engine/base.css` define estructura, maquetación y el **suelo de accesibilidad** — el
  tamaño mínimo de objetivo de 44 px vive ahí, con la regla de que un tema puede subirlo pero
  nunca bajarlo.
- `src/businesses/<slug>/theme.css` solo rellena color y tipografía, a través de las custom
  properties que declara `base.css`.

Es decir: lo que esta comprobación evalúa son los **valores concretos de un tema de ejemplo**, no
el motor. Un cliente real elegirá casi con seguridad su propia paleta al configurarse, y en ese
momento **esta comprobación merece repetirse contra su tema de verdad** — que es cuando el
resultado importa. Hacerla ahora valida una paleta que probablemente nadie use en producción.

Sigue teniendo valor como comprobación del suelo: si el registro nocturno resulta ilegible incluso
con contrastes declarados de ~15:1, el problema estaría en `base.css` y afectaría a todos los
temas. Por eso no se descarta, solo se pospone.

Dicho eso, las comprobaciones automáticas de contraste evalúan colores *declarados*. No pueden
decirte si el diseño es cómodo para un ojo real, adaptado a la oscuridad, con el brillo bajo
(research.md D8).

1. Asegúrate de haber revertido los datos de prueba, para que el hub muestre su estado real
2. Métete en una habitación de verdad a oscuras. Deja que los ojos se adapten un par de minutos
3. Pon el móvil al brillo que usarías de verdad en la mesa de un bar — **bajo**, no al máximo
   automático
4. Abre <https://kokersol.github.io/nfc-hubs/demo/>

**PASA** si se cumple todo:

- todas las etiquetas de las entradas se leen sin forzar la vista ni subir el brillo
- el distintivo [ES] «Pendiente» se lee, no es solo una mancha
- la pantalla no resulta incómodamente brillante — un diseño nocturno que deslumbra ha fallado
  aunque sus ratios de contraste sean perfectos
- el contorno de foco se ve al tabular (usa un teclado Bluetooth si tienes; si no, sáltalo)

Eso es todo lo que evalúa esta comprobación: legibilidad y comodidad del registro nocturno a
oscuras.

> **Nota sobre SC-005.** Este criterio (que un hub se lea como la página propia de un local y no
> como una plantilla genérica) **ya no se comprueba aquí**. Su mitad comparativa necesitaba dos
> hubs y solo hay una instancia; y juzgar «identidad propia» sobre un tema de ejemplo de un local
> ficticio no dice nada útil sobre el producto. SC-005 queda aplazado hasta que exista el tema de
> un cliente real, momento en el que se evalúa junto a la repetición de esta comprobación.

---

## Resultados

Filas en orden de prioridad, no de número.

| # | Comprobación | Resultado | Dispositivo / SO | Notas |
|---|--------------|-----------|------------------|-------|
| 1 | vCard en iOS Safari | ✅ **PASA** | iPhone — iOS 26.5.2 | Abre el importador de contactos. **Riesgo D5 cerrado; FR-020 se sostiene sin enmienda.** El aviso de HTTP no aplica a un resultado positivo |
| 4a | Tap NFC, desbloqueado | ✅ pasa (Android e iPhone) | Android 16 `BP2A.250605.031.A3` / iPhone iOS 26.5.2 | Abre el hub correctamente. Probado directamente en ambos, no deducido |
| 4b | Tap NFC, bloqueado | ✅ pasa en iPhone con pantalla encendida / ⚠️ restricción de plataforma en Android | iPhone iOS 26.5.2 · Android 16 `BP2A.250605.031.A3` | **iPhone:** lee y abre con la pantalla de bloqueo encendida; con la pantalla apagada no. Es el diseño documentado de Apple — *Background Tag Reading* (Core NFC) exige dispositivo «en uso». **Android:** no pasa nada bloqueado y no existe ajuste que lo active. Distinto umbral por ecosistema; ninguno es defecto de este código y los dos cumplen FR-010 |
| 2 | vCard en Android Chrome | ✅ **PASA** | Android 16, build `BP2A.250605.031.A3` | Importa los cuatro valores; dirección intacta como un solo campo |
| 3 | Nocturno legible a oscuras | ⬜ abierta — prioridad baja | | Aplazada a propósito: evalúa un tema de ejemplo. Repetir con el tema de un cliente real |

**Estado de T039: funcionalmente completo, pendiente solo de una comprobación aplazada a
propósito.**

Las **cuatro** comprobaciones tienen ya resultado anotado. Las tres que podían descubrir un
problema han pasado:

- La 1 cierra el riesgo D5, el único de arquitectura del proyecto, y deja FR-020 en pie sin
  enmienda.
- La 2 confirma el mismo mecanismo en el otro ecosistema.
- La 4 queda cerrada en ambos, con dos umbrales distintos y documentados, ninguno de ellos un
  defecto de este código.

Lo único abierto es la **comprobación 3** (contraste nocturno), y no está abierta por falta de
tiempo: está **aplazada deliberadamente** porque evalúa la paleta de un tema de ejemplo que un
cliente real casi con seguridad sustituirá. Es de prioridad baja por esa razón, no por descuido.

**T039 sigue sin marcar en `tasks.md`**, porque la tarea enumera las cuatro comprobaciones por
nombre y marcarla afirmaría una que no se ha hecho. Se marca cuando se haga la 3 — previsiblemente
contra el tema del primer cliente real, que es cuando su resultado significa algo.

**Antes de terminar, confirma que el repositorio está limpio:**

```bash
npm run audit:placeholders    # tiene que decir 3 valores
git status                    # ningún business.json modificado
npm test                      # 75 pasan, 5 saltadas
```

Ese último comando importa más que antes: la suite es la condición de publicación del workflow de
despliegue, así que un árbol sucio con datos de prueba se publicaría solo en el siguiente push.

Después rellena la tabla y haz commit. T039 se marca en `tasks.md` cuando esté la comprobación 3,
que es la única que queda.
