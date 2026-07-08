# Contexto del proyecto: valorizacion-recylink.html

Este es un archivo HTML standalone (una sola página, sin build) para Recylink, que
permite hacer seguimiento de valorización de residuos y trazabilidad documental para
3 empresas cliente: **Copec**, **Socovesa** y **Abastible**. Sincroniza bidireccionalmente
con Google Sheets vía Apps Script.

## Estructura general
- Un solo archivo HTML con `<style>` y `<script>` embebidos (sin frameworks, JS vanilla).
- Selector de empresa arriba (Copec / Socovesa / Abastible) que cambia el contexto global.
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

## Apps Script (estructura común a las 3 empresas)
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

## Pendientes conocidos
- [ ] Subir la app a GitHub Pages (usuario tiene `licarayen-bit.github.io`)
- [ ] Verificar que el Apps Script de Copec y Abastible tengan la misma corrección de
      `writeObjetivos` que Socovesa (borrar por `empresa_id+mes`, no por prefijo completo)
- [ ] Confirmar que el Sheet de Abastible tenga la columna "Factura" en headers de
      `📊 Trazabilidad_Docs` (fila 5), agregada recientemente en el código
- [ ] Validar visualmente el formato unificado de Objetivos en las 3 empresas tras los
      últimos cambios en `renderCopecObjetivos`

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
