PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK(rol IN ('user','admin','tecnico')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sesiones (
  token TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cargadores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('rapido','estandar','compatible','lento')),
  estado TEXT NOT NULL CHECK(estado IN ('libre','ocupado','reparacion','reservado')),
  potencia INTEGER NOT NULL,
  nivel_bateria INTEGER NOT NULL DEFAULT 100,
  tiempo_estimado TEXT NOT NULL,
  coste REAL NOT NULL,
  disponible INTEGER NOT NULL DEFAULT 1,
  conectores TEXT NOT NULL DEFAULT 'Tipo 2',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reservas (
  id TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  cargador_id TEXT NOT NULL,
  fecha_inicio TEXT NOT NULL,
  duracion_minutos INTEGER NOT NULL,
  fecha_fin TEXT NOT NULL,
  expires_at TEXT,
  estado TEXT NOT NULL CHECK(estado IN ('activa','cancelada','completada')),
  precio_estimado REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (cargador_id) REFERENCES cargadores(id)
);

CREATE TABLE IF NOT EXISTS incidencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cargador_id TEXT NOT NULL,
  tecnico_id INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  severidad TEXT NOT NULL CHECK(severidad IN ('baja','media','alta','critica')),
  estado TEXT NOT NULL DEFAULT 'abierta' CHECK(estado IN ('abierta','en_proceso','resuelta')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cargador_id) REFERENCES cargadores(id),
  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS logs_auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  detalle TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_cargadores_estado ON cargadores(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reservas_cargador ON reservas(cargador_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_cargador ON incidencias(cargador_id);

