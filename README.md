# LLine - Smart EV Parking

Aplicacion web para localizar y reservar plazas de aparcamiento con cargadores para vehiculos electricos.

Este proyecto esta preparado para una practica universitaria completa con:

- Frontend multipagina en `HTML/CSS/JavaScript`.
- Backend `Node.js + Express` modular.
- Persistencia real en `SQLite`.
- API REST con validacion de permisos por rol.
- Actualizacion de estado en tiempo real con `Server-Sent Events (SSE)`.

## Objetivo academico

LLine permite:

- geolocalizar y visualizar cargadores en mapa,
- filtrar por estado/tipo/distancia,
- consultar detalles,
- reservar plazas con persistencia,
- revisar y cancelar historial,
- operar con roles `user`, `admin`, `tecnico`.

## Tecnologias

- Frontend: HTML, CSS, JavaScript (sin framework)
- Mapa: Leaflet + OpenStreetMap
- Backend: Node.js, Express
- BD: SQLite (`sqlite3`)
- Tiempo real: Server-Sent Events

## Estructura del proyecto

```text
informaticaproyecto/
  index.html
  mapa.html
  reservas.html
  historial.html
  perfil.html
  admin.html
  tecnico.html
  server.js
  package.json
  README.md
  css/
	styles.css
	landing.css
	mapa.css
	pages.css
  js/
	app.js
	mapa.js
	reservas.js
	historial.js
	perfil.js
	admin.js
	tecnico.js
	landing.js
	data.js
  backend/
	db/
	  lline.db (se genera en runtime)
	  schema.sql
	  seed.sql
	  init.js
	  database.js
	  reset.js
	controllers/
	routes/
	middlewares/
	services/
	utils/
  scripts/
	check-js.js
	smoke-api.js
```

## Instalacion y ejecucion

```powershell
npm install
npm start
```

Abrir:

- `http://localhost:3000`

## Reiniciar base de datos demo

```powershell
npm run db:reset
npm start
```

## Comprobaciones

Validacion de sintaxis de frontend/backend:

```powershell
npm test
```

Smoke test de API (con servidor arrancado):

```powershell
npm run smoke:api
```

## Usuarios demo (login)

- Usuario: `user@lline.app` / `demo123`
- Admin: `admin@lline.app` / `demo123`
- Tecnico: `tecnico@lline.app` / `demo123`

El frontend incluye un selector de rol (modo demo) que ejecuta login real contra API.

## Datos de flota (modo academico)

Al iniciar el servidor, la base de datos se sincroniza automaticamente con una flota de `2400` cargadores:

- `1847` libres
- `423` ocupados
- `130` en mantenimiento (`reparacion`)

## Endpoints REST principales

### Sesion/usuario

- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

### Cargadores

- `GET /api/cargadores`
- `GET /api/cargadores/:id`
- `POST /api/cargadores` (admin)
- `PUT /api/cargadores/:id` (admin)
- `DELETE /api/cargadores/:id` (admin)
- `PATCH /api/cargadores/:id/estado` (admin, tecnico)

### Reservas

- `GET /api/reservas`
- `GET /api/reservas/:id`
- `POST /api/reservas`
- `PATCH /api/reservas/:id/cancelar`

### Incidencias tecnicas

- `GET /api/incidencias` (admin, tecnico)
- `POST /api/incidencias` (admin, tecnico)

### Administracion

- `GET /api/admin/stats` (admin)
- `GET /api/admin/logs` (admin)

### Salud / tiempo real

- `GET /api/health`
- `GET /api/stream` (SSE, requiere token)

## Modelo de datos (SQLite)

El esquema completo esta en `backend/db/schema.sql`.

Tablas principales:

- `usuarios`
- `sesiones`
- `cargadores`
- `reservas`
- `incidencias`
- `logs_auditoria`

Semillas iniciales en `backend/db/seed.sql`.

## Roles y permisos

- `user`:
  - consulta cargadores
  - crea/cancela sus reservas
  - consulta su historial
- `admin`:
  - CRUD de cargadores
  - stats y logs
  - puede consultar incidencias
- `tecnico`:
  - cambio de estado de cargadores
  - alta y consulta de incidencias

> Importante: los permisos no solo se controlan en UI; tambien se validan en backend con middleware.

## Integracion frontend-backend

La capa `js/app.js` centraliza:

- gestion de sesion/token,
- cliente `fetch` hacia `/api`,
- helper API (`LLineApp.api.*`),
- utilidades de formato y toasts,
- SSE para refresco de estados.

Las paginas (`mapa.js`, `reservas.js`, `historial.js`, `admin.js`, `tecnico.js`) consumen endpoints reales.

## Decisiones tecnicas

- Arquitectura modular para defensa clara en exposicion.
- SQLite para despliegue local simple y reproducible.
- SSE para notificaciones sin complejidad de WebSockets.
- Persistencia principal en BD; `localStorage` solo para estado de UI (p. ej. cargador seleccionado).

## Mejoras futuras

- Hash real de contrasenas y JWT/cookies seguras.
- Paginacion de logs y reservas.
- Tests automatizados de integracion con supertest.
- Motor de expiracion programado para reservas.
- Paneles con graficas historicas.

## Entrega recomendada

- Incluir: codigo fuente, `package.json`, `package-lock.json`, `README.md`.
- Excluir: `node_modules/`, carpetas de IDE, archivos temporales.

