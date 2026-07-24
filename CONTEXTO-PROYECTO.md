# Contexto del proyecto: valorizacion-recylink.html

Este es un archivo HTML standalone (una sola página, sin build) para Recylink, que
permite hacer seguimiento de valorización de residuos y trazabilidad documental para
6 empresas cliente: **Copec**, **Socovesa**, **Abastible**, **Gespania**, **Salfa** y
**Euro**. Sincroniza bidireccionalmente con Google Sheets vía Apps Script.

## Estructura general
- Un solo archivo HTML con `<style>` y `<script>` embebidos (sin frameworks, JS vanilla).
- Selector de empresa arriba (Copec / Socovesa / Abastible / Gespania / Salfa / Euro) que cambia el contexto global.
- 3 pestañas: **Valorización**, **Trazabilidad**, **Objetivos**.
- Cada empresa carga datos desde un Excel de trazabilidad (subido por el usuario) o
  desde el Google Sheet correspondiente (botón "↓ Cargar desde Sheets").
- **IMPORTANTE**: la app NO funciona abierta directamente como `file://` en el navegador
  por restricciones CORS — debe alojarse en un servidor (ej. GitHub Pages) para que el
  fetch a los Apps Script funcione. El usuario aún no la ha subido a GitHub Pages.

## Configuración de empresas (objeto `EMPRESAS` en el JS)

### Copec
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxnmprhhBj6DRKMxze6DU5H8P9CC62MGm0iQgMnzE8f3bA7laxwktefGewQg5lp2o49/exec`
- Sheet ID: `1yHnsIPhYuqvHHyQwyQvRMMOa905qxXvUWfw2p_W8UGo`
- `trazDocsCompletos: ['transp','disp']` — la trazabilidad 100% solo exige transportista + disposición final
- `trazDocsInfo: ['cert','factura','decl']` — documentos informativos que NO afectan el % de trazabilidad, se muestran en fila separada "Documentos adicionales"
- **Excepciones a trazabilidad**: residuos cuyo nombre contiene "orgán"/"organico", y sucursales que empiezan con "CDL", NO se penalizan por falta de transportista/disposición final
- Metas de valorización 2026 por sucursal, editables en la app (botón "✎ Editar metas"), guardadas en `COPEC_METAS_DEFAULT` + localStorage + sync tipo `valorizacion_metas`
- Objetivos: `[{id:'trazabilidad', tipo:'trazabilidad'}]`
- Formato de visualización de Objetivos: tabla con columnas por mes (Ene, Feb...), filas:
  % Valorización real / % Acumulado / Meta 2026 / 100% trazabilidad / Documentos adicionales

### Socovesa
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbx5mKQ873Ob_3Yd4n1kUI5imxEpXO5UzllhMpYGCoIBFHwBKSI9Moct7p9SYuEL9znM/exec`
- Sheet ID: `12CDpG9dNUIKtT5tsKGx8JgekHE0_RyWfEx-pba6zvPM`
- `trazDocsCompletos: ['cert','transp','disp']`
- Sin excepciones especiales de trazabilidad
- 5 objetivos: 100% trazabilidad, Valorizar al menos un residuo (anual), Declarar SINADER,
  Registrar residuos a valorizar (anual), Registrar retiros Respel (anual)
- Sucursal excluida: "Edificio Eliodoro Yañez" (aparece en trazabilidad pero no en valorización/objetivos)
- Formato de visualización: agrupado por sucursal, tabla "Análisis anual" + tabla mensual con
  columnas Objetivo | Mes | Estado | Detalle (función `renderObjetivos` / `makeTableSection`)

### Abastible
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbzGG_DqA-CcJM8VJ6xq4Rai693desNOMAZO-MeYhdkJWFtZwnPnJ4AVV33q56fuyaMX/exec`
- Sheet ID: `1cu3gSJao4wG-UEK5xG6DEWjy8qZF4kEZ8agOQ2Wo3IU`
- `trazDocsCompletos: ['transp','disp']`
- `trazDocsInfo: ['cert','factura','decl']` — se agregó "factura" recientemente
- Sin excepciones especiales de trazabilidad
- Metas de valorización fijas (no editables desde la app): `ABASTIBLE_METAS = {Planta Concón:15, Planta Talca:30, Planta Lenga:30, Planta Osorno:30, Oficina Central:30}`
- 3 objetivos:
  1. `100% trazabilidad` — transportista + disposición final
  2. `Declarar mensualmente en SINADER` — mismo cálculo que Socovesa (excluye donaciones)
  3. `KPI costo e ingreso (ingresos > 0)` — marca OK si algún residuo tiene
     `Total Costo Neto de Transporte > 0` **O** `Precio por Venta de Residuo > 0` (es un OR, no AND)
- Usa el mismo formato de visualización que Copec (tabla por mes), extendido con 2 filas
  adicionales: "Declarar mensualmente en SINADER" y "KPI costo e ingreso"

### Gespania (agregada 2026-07-24)
- Sheet ID: `1628zcLexOnY5sT4S98vOp8vf8fSnc_RdTgBmG6-nLCk`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbwENVSOcXoQalAD2b-INqsFx0hVehfwXwrVqegY_2zj_B7S2t_dFqlo_qH1JeYqr9ER/exec`
  (desplegado 2026-07-24, corriendo `Code-Gespania.gs`)
- Sucursales: "General Jofre Fontana" y "El Rosal lll" (ojo: en la hoja Contactos aparecen
  con variantes de escritura — "Fonatana" en vez de "Fontana" — no se agregó alias porque
  la hoja de Valorización/Objetivos ya usa la forma "Fontana" consistentemente).
  Esta empresa introduce columnas adicionales que las otras 3 no tienen: `Contactos`,
  `Minuta`, `👥 Seguimiento_CSE`, `Pendientes sucursales`, `Config.Flat` — ninguna de esas
  hojas es leída por el visor HTML (`Code-Gespania.gs` solo lee/escribe las 3 hojas
  estándar + Total Residuos + RESPEL, igual que las demás empresas).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (igual
  que Abastible)
- `generaTotalResiduos` incluye a Gespania (`esCopec || esAbastible || esGespania`) porque
  su Sheet ya trae las pestañas `Total Residuos` y `RESPEL` creadas.
- Metas de valorización: **no** son un objeto hardcodeado como Copec/Abastible — se leen
  siempre desde `metasFromSheets` (fila "Meta %" de ♻️ Valorización, 5% fijo todos los
  meses al momento de agregar la empresa). No son editables desde la app.
- 4 objetivos (definidos en la hoja `Objetivos 2026` del Sheet, fila 3, y hardcodeados en
  `EMPRESAS.gespania.objetivos` con el mismo texto exacto para que el matching por nombre
  con la hoja `🎯 Objetivos` funcione):
  1. `100% trazabilidad` — tipo `trazabilidad`, igual cálculo que las demás empresas
  2. `Declarar mensualmente en sinader` — tipo `sinader`, igual cálculo que Abastible/Socovesa
  3. `Lograr un FGR de 0,2 m3/m2` — tipo `manual`: el % de cumplimiento se ingresa a mano
     en la hoja `🎯 Objetivos` del Sheet, la app solo lo muestra (no hay forma de calcular
     FGR — Factor de Generación de Residuos — desde los datos de Trazabilidad_Docs)
  4. `valorizar un 5% de residuos en kg` — tipo `manual` también, por consistencia con FGR
     (es en la práctica equivalente al % Real vs Meta 2026 que ya se muestra en la misma
     tabla, pero se agregó como fila propia porque así está definida en `Objetivos 2026`)
- Se agregó un tipo de objetivo genérico nuevo, `tipo:'manual'`, en `renderCopecObjetivos()`
  (no existía antes) — renderiza una fila por objetivo buscando `objBySucMes` por nombre
  exacto, igual patrón que las filas SINADER/KPI, pero `calcObjetivos()` nunca calcula un
  estado para estos (no hay `else if(obj.tipo==='manual')` en el switch), así que quedan en
  "--" hasta que alguien llene manualmente `% cumplimiento` en la hoja `🎯 Objetivos`.

### Salfa (agregada 2026-07-24)
- Sheet ID: `1LtRSJ-ZYPYoFmGHUik03OAVYxzg9REPn5NTIGhostGI`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbyp5gnnZjhOIpAdTSGn8Nhs0umE_VXbUVTTQLLpjUVRSn2hKy7wFShNUfx_Q8HSI85O/exec`
  (Code-Salfa.gs, mismo patrón que Code-Gespania.gs)
- Sucursales: "Novatec Pucará" e "Inoval Brisas de san pedro" — OJO: son nombres de los
  **contratistas** que operan cada obra (no "Salfa X"), confirmados por el usuario como
  los mismos que trae el Excel a subir, texto exacto.
- **Bug de onboarding encontrado**: en `♻️ Valorización` las 6 filas de datos precargadas
  a mano tenían la columna `empresa_id` (col. A) completamente vacía, y el `readSheet()`
  del Apps Script filtra `r[0] !== ''`, así que `doGet` devolvía `valorizacion: []` pese a
  que el Sheet se veía con datos. Se le pidió al usuario llenar A6:A11 con cualquier texto
  no vacío (ej. "Salfa") como fix inmediato. Al subir el Excel real, la app va a crear filas
  con `empresa_id` propio por sucursal (vía `sucId()`) y las genéricas quedarán huérfanas
  — mismo patrón de limpieza manual que se hizo con Gespania (ver más abajo).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']`
- `generaTotalResiduos` incluye a Salfa (ya trae las pestañas `Total Residuos` y `RESPEL`
  creadas en el Sheet).
- Metas: igual que Gespania, se leen de `metasFromSheets` (no hay objeto hardcodeado ni
  edición desde la app). Al momento de agregar la empresa estaban en 0% para ambas
  sucursales (sin definir aún).
- 4 objetivos (definidos en la hoja `Objetivos 2026` del Sheet, texto exacto):
  1. `100% trazabilidad` — tipo `trazabilidad`, cálculo estándar
  2. `cumplir declaración SINADER` — tipo `sinader`, mismo cálculo que Abastible/Socovesa/Gespania
  3. `KPI Costo ingreso` — tipo `kpi_costo`, mismo cálculo que Abastible (OK si `Total Costo
     Neto de Transporte > 0` O `Precio por Venta de Residuo > 0`)
  4. `Asegurar una correcta segregación de residuos` — **tipo nuevo `segregacion`**, calculado
     (no manual): OK si en ese mes/sucursal aparece algún residuo que **no** sea
     Escombro/Excavación/Domiciliario (comparación normalizada sin tildes vía `normResiduo()`);
     si todos los residuos del mes son de esas 3 categorías genéricas, da "No" (no se está
     segregando). Detalle lista los residuos "extra" encontrados. Implementado en
     `calcObjetivos()` (rama `obj.tipo==='segregacion'`) y renderizado en
     `renderCopecObjetivos()` igual que la fila SINADER/KPI.

### Euro (agregada 2026-07-24)
- Sheet ID: `1au2aa9n0Sh6kYS5TEq28g1nmS_4O9tZFDNaf3j7CQoY`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxfxqFZkptLnyUL0Q-P6GFid_z7KVMNAByM0SxQ5pVjg2DP-t-sW9k87KtWGV1AvbMO/exec`
  (desplegado 2026-07-24, corriendo `Code-Euro.gs`, público desde el primer intento)
- Sucursales (10, de la hoja `Contactos` — no hardcodeadas en el JS, se derivan del
  Excel/Sheet como en las demás empresas): Oficina Central, Proyecto Departamental, Proyecto
  Amengual, Proyecto Santa Elena, Proyecto Entre Vicuñas, Proyecto Mirador Irarrázaval,
  Proyecto Don Pepe II, Proyecto San Pablo Trotter, Proyecto Alto Irarrázaval, Proyecto
  Zañartu (la hoja Contactos trae 4 filas con "Zañartu" a secas y 1 con "Proyecto Zañartu";
  el usuario confirmó que el nombre correcto es **"Proyecto Zañartu"**, así que las filas sin
  el prefijo en Contactos están mal escritas — no se tocó esa hoja, no la usa el visor).
- **Excepción única: % de valorización por VOLUMEN (m3), no por peso (kg)**. Se agregó
  `esEuro` en `processData()` y una variable `metricaVal = esEuro ? m3 : kg` que reemplaza
  `kg` en la acumulación de `valMatrix[suc][mes].total/val` — todas las demás empresas
  siguen usando kg sin cambios. `Total Residuos` sigue trackeando ambos (kg y m3) como
  siempre, no se tocó.
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']`
- `generaTotalResiduos` incluye a Euro (Sheet ya trae `Total Residuos` y `RESPEL`).
- Metas: igual que Gespania/Salfa, vía `metasFromSheets` (Sheet no traía filas de Meta%
  precargadas al momento de agregar la empresa — `♻️ Valorización` estaba completamente vacía).
- 7 objetivos definidos en la hoja `Objetivos 2026` (8 líneas en el Sheet, pero "5% de
  valorización en volumen" NO se agregó como fila de objetivo propia — ya queda cubierto por
  las filas genéricas % Real/Meta 2026/% Acumulado, ahora en base m3 para esta empresa):
  1. `100% trazabilidad` — tipo `trazabilidad`, estándar
  2. `Valorizar fierro, madera, cartón` — **tipo nuevo `valorizar_especificos`** (anual):
     progreso acumulado = (N° de esos 3 residuos valorizados al menos una vez en el año) / 3.
     Ej. si solo se valorizó Cartón → 33%; si además Madera → 66%; los 3 → 100%. Config del
     objetivo incluye `residuos:['Fierro','Madera','Cartón']` (comparación normalizada sin
     tildes vía `normResiduo()`). Implementado en `calcObjetivos()` dentro del bloque de
     objetivos anuales (agregado a `OBJ_ANUALES`), se renderiza solo porque la tabla "Análisis
     anual" de `renderCopecObjetivos()` ya es genérica para cualquier tipo en `OBJ_ANUALES`.
  3. `FGR igual o menor a 0,2` — tipo `manual`
  4. `Ton CO2 evitadas/M2` — tipo `manual`
  5. `Contactar Nuevos proveedores` — tipo `manual`
  6. `Acompañamiento en terreno, mediante charlas y una auditoría` — tipo `manual`
  7. `Costo/Presupuesto` — tipo `manual`
- Las hojas `Seguimiento_CSE` y `Config.Flat` de este Sheet traen datos de OTRAS empresas
  (ANDO, Copec, Daikin, etc.) — el Sheet se clonó de una plantilla compartida y no se limpió.
  No afecta al visor (no lee esas hojas), es solo cosmético; queda a criterio del usuario
  limpiarlo.

## Apps Script (estructura común a las 3 empresas originales; Gespania, Salfa y Euro siguen el mismo esquema)
Cada empresa tiene su propio Google Sheet con 3 hojas, headers en fila 5, datos desde fila 6:
- `♻️ Valorización` — columnas: `empresa_id | Sucursal | Tipo | Enero...Diciembre` (Tipo = "% Real" o "Meta %")
- `📊 Trazabilidad_Docs` — columnas: `empresa_id | Sucursal | Mes | Residuo | Transportista(nombre) | Código LER | Importaciones | Cert. tratamiento | Factura | Cert. declaración | Transportista | Disposición final`
- `🎯 Objetivos` — columnas: `empresa_id | Sucursal | Mes | Objetivo | % cumplimiento | Detalle`

Funciones del Apps Script (`doPost`, `doGet`):
- `writeValorizacion` — borra filas por `empresa_id` coincidente, inserta nuevas
- `writeMetas` — actualiza SOLO las filas "Meta %" in situ (no toca "% Real"), para que
  editar metas desde la app no borre los datos reales
- `writeTrazabilidad` — dedup por `empresa_id + Residuo` (columna índice 2)
- `writeObjetivos` — **IMPORTANTE**: para Socovesa se corrigió para borrar solo por
  `empresa_id + mes` (no por prefijo completo), para no perder histórico al cargar Excel
  de meses distintos. Verificar que Copec/Abastible también tengan esta lógica correcta.
- `doGet` — devuelve `{valorizacion, trazabilidad, objetivos}` como arrays de objetos,
  usando los headers de fila 5 como claves.

## Lógica clave del JS (funciones principales)

- `isValorizado(trat)` — determina si un tipo de tratamiento cuenta como valorización.
  Normaliza Unicode (NFD, quita tildes) antes de comparar contra `VALORIZADOS_LIST`.
- `processData()` (regla agregada 2026-07-24, aplica a las 5 empresas): una operación del
  Excel con `Control de Peso (Kg) === 0` NO se considera para efectos de trazabilidad — no
  incrementa `Importaciones` ni los conteos de documentos, así que no entra en el cálculo de
  `100% trazabilidad` ni en "Documentos adicionales" (y de rebote tampoco en KPI costo/ingreso,
  que se calcula desde el mismo grupo). SÍ sigue sumando a `valMatrix` (% valorización) y a
  `Total Residuos`, porque el pedido fue específicamente "para efectos de trazabilidad".
- `calcObjetivos()` — función central que calcula TODOS los objetivos (trazabilidad,
  sinader, kpi_costo, anuales) para todas las sucursales/meses desde `rawRows` (datos del Excel).
  Devuelve array de `{suc, mes, mesKey, obj, estado, detalle, anual, infoOnly}`.
- `estadoCell(estado, detalle)` — helper que renderiza una celda de estado con color
  (verde/amarillo/rojo según objColor) + mini barra de progreso + detalle HTML debajo.
- `objColor(estado)` — verde ≥100%, amarillo ≥60%, rojo <60%; "OK" verde, "No" rojo.
- `getPct(suc, mes)` / `getAcum(suc, mes)` — calculan % de valorización mensual/acumulado
  desde `valMatrix`. Manejan el caso `fromSheets:true` donde el valor ya viene como %
  directo (no como kg/total).
- `renderCopecObjetivos()` — renderiza la tabla de objetivos en formato "columnas por mes"
  (usado por Copec y Abastible). Lee de `calcObjetivos()` si hay Excel cargado, o de
  `sheetsObjetivosData` si los datos vienen del Sheet.
- `renderObjetivos()` / `makeTableSection()` — renderiza formato "filas por objetivo+mes"
  (usado por Socovesa).
- `loadSheetsData(data)` — procesa la respuesta del `doGet` y puebla `valMatrix`, `trazRows`,
  `sucursales`, `mesesDisp`. Tiene protecciones null (`if (!row) return`) porque el Sheet
  puede traer filas vacías o con formato inconsistente.
- `resetData()` — limpia todo el estado visual e interno al cambiar de empresa.

## Bugs resueltos importantes (para no repetirlos)
1. Template literals anidados rompían el parser → todo el JS usa concatenación de strings, no ES6 template literals con backticks anidados.
2. El operador `||` trata `0` como falso — esto causó bugs donde `estado = 0` (0%) se leía
   como string vacío. Se corrigió comparando explícitamente contra `undefined`/`null`/`''`.
3. Porcentajes del Sheet vienen en 3 formatos posibles: decimal 0-1 (`0.05` = 5%), string
   con % (`"5.2%"`), o coma decimal (`"0,00%"`). Hay que detectar el formato antes de convertir.
4. `Object.keys(valMatrix[suc])` fallaba cuando una sucursal solo existía en trazabilidad
   pero no en valorización (ej. Edificio Eliodoro Yañez en Socovesa) → siempre verificar
   `if (!valMatrix[suc]) return` antes de iterar.
5. Sucursales duplicadas en el Sheet por cambios de nombre entre cargas (ej. "Olimpia III"
   → "Parque Olimpia III - Socovesa sur") requieren limpieza manual del Sheet + alias en `SUC_ALIAS`.
6. La app solo funciona sirviéndose por HTTP (no `file://`) por CORS — pendiente subir a GitHub Pages.

## Total Residuos + RESPEL (Copec y Abastible desde 2026-07-24)
El Sheet de Copec tiene 2 hojas adicionales a las 3 comunes, exclusivas de Copec:
- `Total Residuos` — headers: `Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3`.
  Una fila por combinación única Sucursal+Mes+Residuo+Valorizado/No Valorizado+Respel/No Respel
  (un mismo residuo puede generar 2 filas en un mes si tuvo operaciones valorizadas y no valorizadas).
  Se llena automáticamente desde el Excel de trazabilidad (`processData()` en el JS), igual que
  ♻️ Valorización y 📊 Trazabilidad_Docs — no se llena a mano.
- `RESPEL` — headers: `Residuo | RESPEL` (TRUE/FALSE), ~55 residuos mapeados. Fuente de verdad para
  clasificar qué residuos son Respel. Se lee vía `doGet` y se cachea en `respelSet` (JS). Si `respelSet`
  está vacío (Sheet aún no cargado), `isRespel()` cae a un fallback por nombre (substring "respel").

**Abastible también genera "Total Residuos"** (agregado 2026-07-24): el JS usa la variable
`generaTotalResiduos = esCopec || esAbastible` para decidir si arma `totalResiduosRows` y sincroniza
la hoja `Total Residuos`. Abastible NO tiene hoja `RESPEL` propia — `isRespel()` usa el fallback por
nombre (substring "respel"), que ya clasifica correctamente porque Abastible tiene un residuo llamado
literalmente "RESPEL" en sus datos. El Sheet de Abastible necesita la pestaña `Total Residuos` creada
manualmente (mismos headers que Copec) y su Apps Script necesita el parche en
`Code-Abastible-patch.gs` (raíz del repo) para soportar `tipo:'totalResiduos'` en `doPost`.

**Cálculo de %Real/%Acumulado**: para Copec excluye SIEMPRE los residuos Respel (decisión tomada
2026-07-22): `processData()` construye `valMatrix` sumando kg solo de filas no-Respel (variable
`excluirDeVal = esCopec && respel`), así que `getPct`/`getAcum` ya excluyen Respel sin cambios propios.
**Para Abastible NO se excluye Respel del %** (decisión tomada 2026-07-24 al extender "Total Residuos"
a Abastible) — el % sigue incluyendo todos los residuos, solo cambia que ahora también se puebla la
hoja "Total Residuos" con la clasificación Valorizado/Respel por fila.
`autoSync()` también escribe una fila `% Acumulado` en ♻️ Valorización (antes solo se escribía `% Real`
y `Meta %`; la fila `% Acumulado` ya existía vacía en el Sheet pero nada la llenaba).

**Excavación excluida del % de valorización en TODAS las empresas** (decisión tomada 2026-07-24):
en `processData()`, `excluirDeVal` ahora también es `true` cuando `normResiduo(residuo) === 'excavacion'`
(comparación normalizada, sin tildes), sin importar la empresa — a diferencia de la exclusión de Respel
que es solo para Copec. Las operaciones de Excavación no suman ni al total ni al valorizado de
`valMatrix`, así que no afectan `% Real`/`% Acumulado` de ninguna sucursal. Sigue sumando normalmente
a `Total Residuos` (no se tocó esa parte).

**Apps Script pendiente de agregar manualmente** (no hay acceso de edición directa al proyecto
de Apps Script desde aquí — vive en Google, no en este repo). El Code.gs real de Copec tiene
DOS doGet fusionados: `doGetClasico_` (el que consume `valorizacion-recylink.html`, sin query
params) y `doGetVisor_` (otro desarrollo distinto, activado por `?callback=`/`?visor=1` — no tocar).
Falta agregar en `doGetClasico_`/`doPost`:
1. `doGetClasico_` debe agregar `respel: readRespelSheet_()` al objeto `result` que devuelve
   (hoy solo devuelve `{valorizacion, trazabilidad, objetivos}`).
2. `doPost` debe agregar el caso `tipo === 'totalResiduos'` → `writeTotalResiduos(ss, data)`.
3. Ni "Total Residuos" ni "RESPEL" tienen las filas decorativas de título que sí tienen las 3
   hojas principales (headers en fila 5) — el header está en una fila distinta, por eso las
   funciones nuevas ubican el header buscando "Sucursal"/"Residuo" en columna A en vez de asumir
   fila fija.
- Código completo y listo para copiar/pegar (Code.gs fusionado con estos 3 cambios ya
  integrados) en `Code.gs` en la raíz del repo.

## Pendientes conocidos
- [ ] Agregar al Apps Script de Copec el soporte para `tipo:'totalResiduos'` en `doPost` y el
      campo `respel` en `doGet` (ver sección "Total Residuos + RESPEL" arriba) — sin esto, el
      JS ya calcula todo pero la sincronización a esas 2 hojas fallará silenciosamente (`no-cors`
      no reporta error de HTTP).
- [ ] Abastible: crear la pestaña `Total Residuos` en su Google Sheet (headers:
      `Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3`)
      y pegar `Code-Abastible.gs` (raíz del repo) completo en su Apps Script real, reemplazando
      el Code.gs actual — agrega soporte para `tipo:'totalResiduos'` y de paso corrige
      `writeObjetivos` (borraba por prefijo de empresa completo en vez de por sucursal+mes,
      con riesgo de perder histórico de objetivos al sincronizar).
- [ ] Subir la app a GitHub Pages (usuario tiene `licarayen-bit.github.io`)
- [ ] Verificar que el Apps Script de Copec tenga la misma corrección de `writeObjetivos`
      que Socovesa (borrar por `empresa_id+mes`, no por prefijo completo) — Abastible ya
      queda corregido en `Code-Abastible.gs` (ver punto arriba)
- [ ] Confirmar que el Sheet de Abastible tenga la columna "Factura" en headers de
      `📊 Trazabilidad_Docs` (fila 5), agregada recientemente en el código
- [ ] Validar visualmente el formato unificado de Objetivos en las 3 empresas tras los
      últimos cambios en `renderCopecObjetivos`
- [ ] Gespania: verificar que las pestañas `Total Residuos` (headers: `Sucursal | Mes | Residuo
      | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3`) y `RESPEL` (headers:
      `Residuo | RESPEL`) del Sheet ya tengan esos headers exactos — no se pudieron inspeccionar
      visualmente por una falla intermitente de la extensión de navegador durante el análisis
- [ ] Gespania: probar "Cargar desde Sheets" end-to-end una vez desplegado el Apps Script, y
      confirmar que el objetivo `Lograr un FGR de 0,2 m3/m2` (tipo manual) se pueda editar
      directamente en la hoja `🎯 Objetivos` del Sheet (columna `% cumplimiento`, fila con
      Objetivo = ese texto exacto)
- [ ] Euro: probar "Cargar desde Sheets"/carga de Excel end-to-end una vez desplegado, y
      confirmar que el % de valorización por volumen (m3) se vea razonable — es la primera
      empresa con esa base de cálculo, vale la pena una revisión visual extra
- [ ] Euro: si el usuario quiere, limpiar las hojas `Seguimiento_CSE` y `Config.Flat` del
      Sheet, que traen datos de otras empresas (ANDO, Copec, Daikin) por venir de una
      plantilla clonada — no bloquea nada, el visor no las usa

## Cómo verificar sintaxis JS del archivo
El HTML es un solo archivo con `<script>...</script>` embebido. Para validar sintaxis:
```bash
python3 -c "
import re
content = open('valorizacion-recylink.html').read()
scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
open('/tmp/s.js','w').write(scripts[0])
"
node --check /tmp/s.js
```
(o usar `acorn` si `node --check` no está disponible en tu entorno)
