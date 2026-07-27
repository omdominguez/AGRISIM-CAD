# AgriSim CAD

Sistema de simulación de financiamiento agrícola y gestión de campo para
Comercializadora Agrícola Domínguez (CAD).

## Qué resuelve

- **Simulador de financiamiento**: dado un ciclo de siembra (área, cultivo,
  rendimiento esperado, precio de venta, costos por hectárea, tasa y % financiado),
  calcula: monto total a financiar, efectivo real que debes desembolsar a los
  productores, y la ganancia esperada de CAD por el financiamiento.
- **Histórico de financiamientos**: registro real de desembolsos y liquidaciones,
  para comparar simulado vs. real a lo largo de los ciclos.
- **Mapa de parcelas**: importación de coordenadas de fincas/lotes desde SIMA
  en formato KML/KMZ (estilo Google Earth), visualización en mapa web.
- **Clima y noticias**: feed cacheado de clima y noticias relevantes para la
  siembra (fuente externa a integrar — ver Fase 4 abajo).
- **Roles**: Master Admin (control total y gestión de usuarios), Gerente de
  Departamento, Técnico de Campo, Junta Directiva (solo lectura).

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL (Supabase), JWT auth.
- **Frontend**: Next.js (App Router) + Tailwind + react-leaflet.
- Mismo patrón de stack que ERP-CAD, para que en el futuro se puedan compartir
  autenticación/infraestructura si decides fusionarlos.

## Estructura del proyecto

```
agrisim-cad/
├── apps/
│   ├── api/                       # Backend NestJS
│   │   ├── prisma/schema.prisma   # Modelo de datos completo
│   │   └── src/
│   │       ├── auth/              # Login, JWT
│   │       ├── users/             # CRUD de usuarios (solo Master Admin)
│   │       ├── producers/         # Productores y fincas
│   │       ├── parcels/           # Parcelas + importación KML/KMZ
│   │       ├── cycles/            # Ciclos de siembra
│   │       ├── financing-simulations/  # Motor de cálculo del simulador
│   │       ├── financing-historial/    # Histórico real de financiamiento
│   │       ├── news-feed/         # Clima y noticias (cacheado)
│   │       └── common/            # Guards de roles, Prisma service
│   └── web/                       # Frontend Next.js
│       ├── app/login/
│       ├── app/(dashboard)/       # simulador, mapa, ciclos, productores,
│       │                          # historial, noticias, admin/usuarios
│       ├── components/
│       └── lib/                   # api.ts, auth.ts
└── docs/
```

## Cómo arrancar en local

### 1. Backend

```bash
cd apps/api
cp .env.example .env        # completar DATABASE_URL (Supabase) y JWT_SECRET
npm install
npm run prisma:migrate      # crea las tablas en Supabase
npm run start:dev           # http://localhost:4000/api
```

### 2. Crear el primer usuario Master Admin

Como el registro de usuarios está restringido a Master Admin, el primer
usuario se crea directo en Prisma Studio o con un script seed:

```bash
npm run prisma:studio
# Crear un registro en `usuarios` con rol MASTER_ADMIN.
# El passwordHash debe generarse con bcrypt (ver auth.service.ts -> hashPassword).
```
(En Fase 1 se recomienda agregar un `prisma/seed.ts` que automatice esto.)

### 3. Frontend

```bash
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

## Roadmap sugerido (de aquí hacia adelante)

**Fase 1 — Cerrar el esqueleto (base sólida antes de sumar features)**
- [ ] `middleware.ts` en Next.js: proteger rutas de `(dashboard)` según cookie de sesión.
- [ ] `prisma/seed.ts`: crear el primer usuario Master Admin automáticamente.
- [ ] Formularios reales para crear Ciclo, Productor y Finca (hoy son solo lectura/JSON crudo).
- [ ] Selector de finca en el flujo de importación KML (hoy requiere pasar `fincaId` manual).
- [ ] Conectar Supabase Storage para guardar el .kml/.kmz original (trazabilidad).

**Fase 2 — Simulador avanzado**
- [ ] Comparar 3 escenarios lado a lado (BASE / OPTIMISTA / PESIMISTA) en una sola vista.
- [ ] Gráfico de cashflow del ciclo (desembolso → cosecha → liquidación) con recharts.
- [ ] Validar y ajustar las fórmulas del motor de cálculo junto con finanzas de CAD
      (especialmente diferencial cambiario e IDP, como en tus reportes reales de Norte Verano).

**Fase 3 — Histórico y dashboards**
- [ ] Dashboard ejecutivo para Junta Directiva: KPIs agregados, simulado vs. real,
      cartera por estado de cobranza.
- [ ] Alertas de mora/cobranza sobre `HistorialFinanciamiento`.

**Fase 4 — Clima y noticias**
- [ ] Job programado (cron) que consulte OpenWeatherMap/WeatherAPI por región
      (Barinas, Portuguesa, etc.) y NewsAPI filtrado por palabras clave, y
      escriba en `NoticiaFeed`. No integrar la llamada externa directo en el
      request del usuario.
- [ ] Widget de clima en el dashboard principal, por región de las fincas activas.

**Fase 5 — Mapa avanzado**
- [ ] Capa por cultivo/estado del ciclo (colorear polígonos según `EstadoCiclo`).
- [ ] Click en parcela → ver ciclo activo y simulación asociada.

## Notas de diseño

- El **motor de cálculo del simulador** vive únicamente en
  `financing-simulations.service.ts`, con los supuestos documentados en el
  propio archivo. Todo lo demás del sistema consume los resultados ya
  calculados — así que ajustar la lógica financiera es un cambio en un solo lugar.
- El **modelo de roles** usa un guard (`RolesGuard`) + decorator (`@Roles(...)`)
  por endpoint, así que agregar un rol nuevo o cambiar permisos es declarativo,
  no requiere tocar lógica de negocio.
- El **import KML/KMZ** parsea con `@tmcw/togeojson` y guarda el resultado como
  GeoJSON nativo en Postgres (`Parcela.geoJson`), listo para render directo en
  Leaflet sin reprocesar en cada carga.
