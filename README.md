# CAD Agrícola

ERP de financiamiento a campo para Comercializadora Agrícola Domínguez, C.A.
Sigue el dinero y el cultivo desde que se abre el ciclo hasta que se liquida
la cosecha y se salda la cuenta del productor.

## Cómo se carga la información (flujo del técnico)

```
1. PRODUCTOR      Se crea una vez (nombre, cédula/RIF, zona) + sus fincas.
                  Después solo se selecciona de la lista.
                     POST /api/productores        POST /api/productores/:id/fincas

2. PARCELAS       Se importa el .kml/.kmz de SIMA sobre una finca.
                  El sistema CALCULA el área geodésica de cada polígono —
                  las hectáreas salen del mapeo, no se digitan.
                     POST /api/parcelas/importar-kml/:fincaId

3. CICLO          Se abre la campaña: tipo (Norte-Verano | Invierno), cultivo,
                  fecha de inicio, meta de productores y meta de hectáreas.
                     POST /api/ciclos

4. INSCRIPCIÓN    Se inscribe cada productor en el ciclo con las hectáreas
                  que se compromete a sembrar.
                     POST /api/ciclos/:id/productores

5. LOTES          Se agregan las parcelas que ese productor va a sembrar.
                  El área se toma de la parcela (KML), y se definen los
                  parámetros de siembra: distancia entre surcos y densidad objetivo.
                     POST /api/ciclos/participaciones/:id/lotes

6. FINANCIAMIENTO Expediente de 6 pasos sobre esa participación (ver abajo).
                     POST /api/solicitudes

7. VISITAS        En cada visita el técnico reporta: hectáreas efectivas,
                  plantas por metro lineal, estado fenológico, incidencias
                  (plagas/enfermedades) y rendimiento proyectado.
                     POST /api/campo/participaciones/:id/inspecciones
```

## Expediente de financiamiento — el flujo real de CAD

```
1. Evaluación y caracterización    → SOLICITUD_RECIBIDA
2. Paquete tecnológico + anticipo  → PAQUETE_DEFINIDO
3. Aprobación y contrato           → APROBADA → CONTRATO_FIRMADO
4. Despacho y desembolso           → DESPACHADA
5. Seguimiento técnico             → EN_SEGUIMIENTO
6. Liquidación y recuperación      → LIQUIDADA
```

Fórmula de cobro (la real, no una tasa genérica):

```
Total a cobrar = (Costo Insumos × (1 + margen 30%)) + (Anticipo × (1 + recargo 5%))
Ganancia CAD   = (Costo Insumos × 30%) + (Anticipo × 5%)
```

Cada **despacho** genera automáticamente un cargo en el estado de cuenta del
productor, ya con el margen/recargo aplicado. Cada **liquidación** genera el
abono por la cosecha entregada. La cartera nunca depende de que alguien
recuerde registrar el movimiento aparte.

## Cálculos que hace el sistema

**Área del lote (geodésica, desde el KML)**
Fórmula de exceso esférico sobre el polígono, descontando huecos interiores.
Es la misma que usa turf.js / Google Earth Engine.

**Población de plantas**
```
metros lineales por ha = 10.000 m² ÷ distancia entre surcos (m)
plantas objetivo       = m lineales/ha × densidad objetivo/m × área sembrada
plantas estimadas      = m lineales/ha × conteo real/m      × área efectiva
% logro                = estimadas ÷ objetivo
```
El técnico solo cuenta plantas en un metro lineal; el sistema extrapola.

**Efectivo necesario para la cosecha**
```
por productor:  valor cosecha esperada = producción proyectada (qq) × precio/qq
                neto a pagar           = valor cosecha − deuda actual
efectivo total = suma de los netos positivos
```
La proyección mejora con cada visita, porque el rendimiento sale de la última
inspección. El endpoint devuelve además un índice de `confiabilidad`: si muchos
productores no tienen visita con proyección, la cifra está subestimada y lo advierte.

**Estado de cuenta**
Libro de movimientos con saldo corrido. Saldo > 0: el productor debe a CAD.
Saldo < 0: CAD le debe al productor.

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL (Supabase), JWT.
- **Frontend**: Next.js (App Router) + Tailwind + react-leaflet.
- **Marca**: paleta y tipografía del Manual de Marca CAD v1.0 (Poppins + Bebas Neue).

## Estructura

```
cad-agricola/
├── apps/
│   ├── api/
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       ├── auth/          Login, JWT
│   │       ├── users/         Usuarios y roles (solo Master Admin)
│   │       ├── producers/     Productores y fincas
│   │       ├── parcels/       Parcelas + importación KML con área geodésica
│   │       ├── cycles/        Ciclo-campaña, participaciones, lotes de siembra
│   │       ├── field/         Inspecciones, población de plantas, fitosanitario
│   │       ├── solicitudes/   Expediente de financiamiento (6 pasos)
│   │       ├── accounts/      Estados de cuenta y proyección de efectivo
│   │       ├── financing-simulations/  Calculadora rápida
│   │       ├── news-feed/     Clima y noticias
│   │       └── common/        Guards de roles, Prisma service
│   └── web/
│       ├── app/login/
│       ├── app/(dashboard)/   ciclos, productores, solicitudes, cartera,
│       │                      simulador, mapa, noticias, admin/usuarios
│       ├── components/brand/  Logo institucional
│       └── lib/
└── docs/
```

## Roles

| Rol | Puede |
|---|---|
| `MASTER_ADMIN` | Todo, incluida la gestión de usuarios |
| `GERENTE` | Aprobar, contratar, liquidar, registrar movimientos de cuenta |
| `TECNICO_CAMPO` | Crear ciclos, inscribir productores, cargar lotes, despachar, inspeccionar |
| `JUNTA_DIRECTIVA` | Solo lectura de todo |

## Arrancar en local

```bash
# Backend
cd apps/api
cp .env.example .env     # completar DATABASE_URL y DIRECT_URL de Supabase
npm install
npm run prisma:migrate
npm run start:dev        # http://localhost:4000/api

# Frontend (otra terminal)
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev              # http://localhost:3000
```

Primer usuario Master Admin: crear el registro en `usuarios` vía Prisma Studio,
generando el hash con:
```bash
node -e "console.log(require('bcryptjs').hashSync('TU-CONTRASEÑA', 10))"
```

## Comparativos y desempeño (para decisiones, no solo registro)

**Comparativo entre ciclos** — `GET /api/ciclos/comparativo?cultivo=...`
Por cada ciclo: hectáreas sembradas, financiado/ha, rendimiento real (o
proyectado si aún no hay liquidaciones), ganancia realizada — y la
**variación % contra el ciclo inmediato anterior del mismo cultivo** (no
contra cualquier ciclo, para no comparar frijol contra maíz). Pantalla:
`/ciclos/comparativo`.

**Desempeño por lote** — `GET /api/productores/:id/desempeno-lotes`
Como `Parcela` persiste entre ciclos y `LoteSiembra` es la instancia por
campaña, se arma el historial de cada lote físico: en qué ciclos se sembró,
qué rendimiento dio cada vez, y **qué paquete de insumos se usó** en ese
ciclo — para ver qué combinación le funcionó mejor a ese lote específico.
Ranking ordenado de mejor a peor rendimiento. Pantalla: `/productores/:id`.

## Pantallas de carga (técnico y gerente)

- `/ciclos/nuevo` — abrir un ciclo-campaña.
- `/ciclos/:id` — inscribir productores y agregar sus lotes (selecciona la
  parcela ya cargada; el área nunca se digita).
- `/productores` y `/productores/:id` — crear productores con estado/municipio
  en cascada, sus fincas, y ver su desempeño histórico y estado de cuenta.
  **Desde la ficha del productor** se agregan los lotes de cada finca de dos
  formas: importando el KML/KMZ de SIMA, o **dibujando el polígono directo en
  el mapa** (click por cada esquina del lote) — ambas calculan la misma
  hectárea geodésica, así que dan resultados consistentes entre sí.
- `/mapa` — vista general de todas las parcelas cargadas.

Pendiente de UI (el backend ya lo soporta vía API): definir paquete
tecnológico, aprobar/contratar/despachar el expediente, y registrar
inspecciones de campo — son los siguientes formularios a construir.

## Noticias reales por rubro (Google News RSS, sin API key)

`/noticias` ya no depende de carga manual — trae noticias reales vía el RSS
público de Google News (gratuito, sin key), buscando por rubro:

- **Frijol Mung** — mercado internacional (inglés) + Venezuela (español)
- **Caraota Negra** — ídem
- **Maíz** — ídem
- **Mercado General** — leguminosas en general + agricultura Venezuela/llanos

Corre sola al arrancar el backend y cada 6 horas mientras siga corriendo
(`NewsFeedService.onModuleInit`), y también se puede forzar con el botón
"↻ Actualizar noticias" en la UI (`POST /api/noticias/actualizar`). Los
duplicados se evitan por URL (`NoticiaFeed.url` es `@unique`).

Filtro por rubro y por región (Venezuela / Internacional / ambas) en la UI.

**Nota realista**: es un parser simple de RSS por regex, no una librería XML
completa — funciona bien porque el feed de Google News es consistente, pero
si Google cambia el formato del feed en el futuro, este parser es el primer
lugar a revisar (`google-news-rss.util.ts`).

## Ficha del productor: sección de Lotes rediseñada

La ficha de cada productor (`/productores/:id`) ahora tiene una sola sección
de **Lotes** que reemplaza lo que antes eran dos secciones separadas
("Fincas" solo mostraba conteo, "Desempeño por lote" era una lista aparte):

- Cada lote es una tarjeta con una **miniatura del polígono** (SVG generado
  del GeoJSON, sin cargar un mapa completo — `MiniPoligono.tsx`).
- **"Editar polígono"** abre el mismo editor de dibujo (Leaflet.Draw), pero
  precargado con la forma actual — se arrastra el vértice que esté mal y se
  guarda. `PATCH /api/parcelas/:id` recalcula área y centroide igual que al
  crearlo, así que un lote corregido queda tan preciso como uno nuevo.
- Si el lote ya tiene una siembra asociada, la tarjeta se expande para
  mostrar cultivo, ciclo, rendimiento e insumos usados — cruzando la data de
  `desempeno-lotes` por `parcelaId`. Si todavía no se ha sembrado, dice
  "Sin siembra registrada todavía" en vez de forzar un dato que no existe.

## Ficha de participación — donde el técnico registra sus visitas

El backend del seguimiento de campo (inspecciones, incidencias, cálculo de
población de plantas) ya existía, pero no había pantalla para usarlo. Ahora sí:

- **`/ciclos/participaciones/:id`** — la ficha de "este productor, en este
  ciclo": sus lotes, el estado del financiamiento, y el historial completo
  de visitas.
- Se entra haciendo click en el nombre del productor desde la tabla de
  "Productores del ciclo" en el detalle del ciclo (`/ciclos/:id`).
- **"+ Registrar visita"** abre el formulario completo: fecha, lote
  (opcional — puede ser una visita a toda la participación), área efectiva,
  plantas por metro lineal (el sistema calcula el % de logro de población
  solo, usando la densidad objetivo del lote), estado fenológico, uso
  adecuado de insumos, rendimiento proyectado, observaciones, e
  **incidencias** (plagas/enfermedades) como lista dinámica — se agregan y
  quitan filas sin recargar la página.
- El historial de visitas se muestra abajo, con el % de población coloreado
  (rojo si está por debajo del 85% del objetivo) y las incidencias como
  etiquetas, más severas en rojo.

Esta es la pantalla de mayor uso diario para el técnico — con esto, el
seguimiento de campo completo ya tiene interfaz de punta a punta.

## Visitas por tipo — no todas piden lo mismo

El formulario de "Registrar visita" ahora empieza eligiendo el **tipo**, y
solo muestra los campos que tienen sentido para ese tipo:

- **Preparación de tierra** — checklist simple (arado, rastra, nivelación,
  humedad del suelo), sin pedir conteo de plantas que todavía no existen.
- **Siembra** — método (mecanizada/manual) y profundidad.
- **Seguimiento del cultivo** — los campos completos de antes: población de
  plantas, estado del cultivo, incidencias, rendimiento proyectado.
- **Cosecha** — cierre del ciclo en campo.

**Estado del cultivo ampliado**: además de las etapas genéricas de antes,
ahora incluye `PREPARACION_TIERRA`, `SIEMBRA`, y las etapas vegetativas
`V1` a `V6_O_MAS` — la forma en que un técnico agrónomo real describe el
avance por número de hojas, no una categoría vaga de "desarrollo vegetativo".

**Se ve reflejado en el ciclo**: la tabla "Productores del ciclo" en
`/ciclos/:id` ahora tiene una columna **Estado** — el estado fenológico de
la última visita si existe, o el tipo de última visita (ej. "Prep. de
tierra") si todavía no se ha registrado un estado específico. Así el
gerente ve de un vistazo en qué etapa está cada productor sin tener que
entrar a cada ficha.

## Manejo de errores más claro + borrar lotes

Dos mejoras que salieron de un error real en campo: al agregar un lote con
una densidad de plantas fuera de rango, la base de datos lo rechazaba y el
usuario solo veía "Internal server error" sin poder saber por qué.

- **Validación con mensaje claro**: `AgregarLoteDto` ahora valida rangos
  agronómicos razonables (distancia entre surcos hasta 5 m, densidad hasta
  200 plantas/m) y explica el problema en español si el número no cuadra.
- **Filtro global de errores de Prisma** (`PrismaExceptionFilter`): cualquier
  error de base de datos que antes llegaba como un 500 opaco — un valor
  fuera de rango, un duplicado, un registro que todavía está en uso —
  ahora responde con un mensaje entendible, sin tener que adivinar la causa
  revisando logs.
- **Borrar un lote** — `DELETE /api/parcelas/:id`, con botón "Borrar" en
  cada tarjeta de la sección Lotes. Si el lote ya está usado en un ciclo
  de siembra, se bloquea con un mensaje explicando por qué, en vez de un
  error de llave foránea sin explicación.

## Alertas de lluvia por parcela (mm reales)

La capa de radar del mapa (RainViewer) es solo visual — para milímetros
numéricos se usa Open-Meteo (misma API gratuita del clima), consultada por
las coordenadas exactas de cada parcela:

- `GET /api/parcelas/alertas-lluvia` — en vivo, para el widget del Dashboard
  y de Mapa de Parcelas. Solo muestra parcelas con lluvia hoy (no una caja
  vacía si no ha llovido).
- **Se guarda solo, todos los días**: `ParcelsService.onModuleInit` corre
  una ingesta automática al arrancar y cada 3 horas, que persiste el
  acumulado del día por parcela en `RegistroLluvia` — así queda un
  histórico real con el que más adelante se puede cruzar lluvia vs.
  rendimiento por lote.
- **El técnico puede corregir el dato**: si tiene pluviómetro real en el
  lote, `POST /api/parcelas/:id/lluvia` guarda `mmMedido`, que manda sobre
  el `mmEstimado` automático para ese día.
- `GET /api/parcelas/:id/historial-lluvia` — la serie completa de un lote.

## Commodities agrícolas en el Dashboard

`/dashboard` muestra precio internacional de referencia (futuros CME/CBOT,
vía Yahoo Finance — gratis, sin API key) de Maíz, Arroz, Azúcar, Soya y
Trigo, con variación % del día. `GET /api/noticias/commodities`, cacheado
15 minutos igual que el clima.

**Importante**: es el precio internacional de referencia (el mismo que se
usa como base en noticias y contratos de commodities), no el precio local
al que CAD compra a sus productores — son cosas distintas y no hay que
confundirlas en el reporte a Junta Directiva.

## Ticker de clima y noticias

Barra que se desplaza horizontalmente arriba de **todas** las pantallas del
dashboard (no solo en `/noticias`), con:

- **Clima en vivo** de 6 zonas llaneras de interés agrícola (Barinas,
  Guanare, San Fernando de Apure, San Carlos, Calabozo, Acarigua) — vía
  Open-Meteo, gratuito y sin API key. `GET /api/noticias/clima`, cacheado
  15 minutos en el backend para no golpear la API externa en cada carga.
- **Noticias cacheadas** del módulo `/noticias` (precios de mercado,
  política agrícola) — las que ya existían, sin duplicar el clima.

El módulo `/noticias` sigue siendo independiente y completo; el ticker es
un resumen de acceso rápido, con un botón "Ver todas →" que lleva ahí. Si
no hay ningún dato disponible (ej. sin conexión a Open-Meteo), el ticker
simplemente no se muestra — no se inventa contenido de relleno.

**Pendiente real**: las noticias de cultivos en Venezuela (no el clima)
siguen sin una fuente automática — eso sigue requiriendo NewsAPI.org u
otra API con key, como ya estaba anotado en la Fase 4 del roadmap. Lo que
se agregó aquí es solo el clima en vivo; las noticias siguen siendo carga
manual hasta que se conecte esa fuente.

## Mapa con semáforo (estilo SIMA)

`/mapa` ahora muestra cada lote coloreado por un semáforo propio — verde,
amarillo, rojo, o gris si no tiene ciclo activo — calculado con datos que el
sistema ya tiene (área efectiva vs. sembrada, incidencias reportadas, y qué
tan reciente fue la última visita del técnico). El popup de cada lote
muestra productor, predio, cultivo, ciclo y días desde la siembra, en el
mismo espíritu que el dashboard de SIMA.

**Lo que SIMA sí tiene y nosotros no (todavía)**: imágenes satelitales con
índice NDVI (verdor real de la vegetación, vía un proveedor como Planet).
Eso requiere contratar un servicio externo de terceros — no es algo que se
resuelva con los datos que ya cargamos, es una fuente de datos nueva. Si se
decide integrar, el punto de entrada sería agregar un `NoticiaFeed`-style
job que consulte la API del proveedor por las coordenadas de cada parcela y
guarde el resultado, similar al job de clima ya planeado en la Fase 4.

## IA (planeado, no implementado todavía)

Idea para una siguiente fase: usar un modelo de lenguaje para ayudar a
completar datos — por ejemplo, sugerir el paquete tecnológico a partir del
cultivo y la zona, o resumir el estado fitosanitario de un ciclo en lenguaje
natural para el reporte a Junta Directiva. No hay nada construido de esto
todavía; cuando se aborde, conviene definir primero en qué punto exacto del
flujo entra (¿sugiere y el técnico aprueba? ¿solo resume lo ya cargado?)
antes de tocar código, para no automatizar una decisión que debería quedar
en manos de la persona.

## Roadmap

**Siguiente (formularios en interfaz)**
- [ ] Formulario de paquete tecnológico con cálculo en vivo
- [ ] Formulario de aprobación / contrato / despacho del expediente
- [ ] Formulario de inspección de campo (el de mayor uso diario del técnico)

**Después**
- [ ] `middleware.ts` para proteger rutas del dashboard
- [ ] `prisma/seed.ts` para el primer Master Admin
- [ ] Modo offline para técnicos en campo (IndexedDB + cola de sincronización)
- [ ] Supabase Storage para contratos firmados y KML originales
- [ ] Cron de clima/noticias por región
- [ ] Mapa coloreado por estado del ciclo y por severidad fitosanitaria

## Notas de diseño

- **El área nunca se digita.** Sale de `Parcela.areaCalculadaHa`, calculada del
  polígono KML. Esto elimina la discrepancia clásica entre lo declarado y lo real.
- **El ciclo es una campaña, no un productor.** `Ciclo` → `CicloProductor` →
  `LoteSiembra`. El financiamiento y el estado de cuenta cuelgan de la
  participación, no del ciclo entero.
- **Los movimientos de cuenta se generan solos** desde despachos y liquidaciones.
  Los manuales (entregas parciales, pagos en efectivo) se registran aparte.
- **El monto de un movimiento siempre es positivo**; el tipo define el signo.
  Así el libro es auditable y no depende de negativos sueltos.
