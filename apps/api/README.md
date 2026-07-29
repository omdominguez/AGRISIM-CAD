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
