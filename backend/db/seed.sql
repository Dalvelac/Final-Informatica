INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, rol) VALUES
  (1, 'Daniel Garcia', 'user@lline.app', 'demo123', 'user'),
  (2, 'Ana Admin', 'admin@lline.app', 'demo123', 'admin'),
  (3, 'Toni Tecnico', 'tecnico@lline.app', 'demo123', 'tecnico');

INSERT OR IGNORE INTO cargadores (id, nombre, direccion, lat, lng, tipo, estado, potencia, nivel_bateria, tiempo_estimado, coste, disponible, conectores) VALUES
  ('chg-001', 'Parking Norte', 'Av. Europa 18, Murcia', 37.9928, -1.1307, 'rapido', 'libre', 150, 90, '28 min', 0.29, 1, 'CCS, CHAdeMO'),
  ('chg-002', 'Centro Comercial Nova', 'Calle Mayor 44, Murcia', 37.9864, -1.1332, 'estandar', 'ocupado', 22, 40, '2 h 20 min', 0.23, 0, 'Tipo 2'),
  ('chg-003', 'Universidad Campus Sur', 'Paseo de la Ciencia s/n, Murcia', 37.9997, -1.1378, 'rapido', 'reparacion', 50, 0, '45 min', 0.26, 0, 'CCS'),
  ('chg-004', 'Estacion Intermodal', 'Plaza Estacion 2, Murcia', 37.9831, -1.1286, 'rapido', 'reservado', 120, 60, '35 min', 0.31, 0, 'CCS, Tesla'),
  ('chg-005', 'Parking La Flota', 'Av. de la Flota 9, Murcia', 37.9952, -1.1195, 'estandar', 'libre', 11, 85, '3 h', 0.19, 1, 'Tipo 2'),
  ('chg-006', 'Poligono Industrial Oeste', 'Calle Energia 11, Murcia', 37.9724, -1.1430, 'rapido', 'libre', 300, 95, '18 min', 0.34, 1, 'CCS, CHAdeMO, Tesla'),
  ('chg-007', 'Biblioteca Regional', 'Calle del Libro 5, Murcia', 37.9874, -1.1476, 'compatible', 'ocupado', 7, 30, '5 h', 0.15, 0, 'Schuko, Tipo 2'),
  ('chg-008', 'Hospital General', 'Ronda Sur 103, Murcia', 37.9689, -1.1273, 'estandar', 'libre', 43, 70, '1 h 15 min', 0.27, 1, 'CCS, Tipo 2');

INSERT OR IGNORE INTO reservas (id, usuario_id, cargador_id, fecha_inicio, duracion_minutos, fecha_fin, expires_at, estado, precio_estimado) VALUES
  ('res-1001', 1, 'chg-001', '2026-04-03T18:00:00', 60, '2026-04-03T19:00:00', '2026-04-03T18:15:00', 'activa', 9.8),
  ('res-1002', 1, 'chg-005', '2026-03-29T11:30:00', 120, '2026-03-29T13:30:00', '2026-03-29T11:45:00', 'completada', 6.4),
  ('res-1003', 1, 'chg-004', '2026-03-24T08:30:00', 45, '2026-03-24T09:15:00', '2026-03-24T08:45:00', 'cancelada', 0);

INSERT OR IGNORE INTO incidencias (id, cargador_id, tecnico_id, descripcion, severidad, estado) VALUES
  (1, 'chg-003', 3, 'Conector principal fuera de servicio.', 'alta', 'en_proceso'),
  (2, 'chg-002', 3, 'Caida intermitente de comunicacion.', 'media', 'abierta');

INSERT OR IGNORE INTO logs_auditoria (id, usuario_id, accion, entidad, entidad_id, detalle) VALUES
  (1, 2, 'SEED', 'sistema', 'init', 'Datos iniciales cargados para entorno demo.');

