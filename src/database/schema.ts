export const DATABASE_NAME = 'senvia'
export const DATABASE_ENCRYPTION_MODE = 'no-encryption'
export const DATABASE_VERSION = 3
export const MIGRATIONS_TABLE = 'schema_migrations'

export const PRAGMA_FOREIGN_KEYS = 'PRAGMA foreign_keys = ON;'

export const CREATE_MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
  version INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  executed_at TEXT NOT NULL
);
`

export const CREATE_THRESHOLD_PROFILES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS threshold_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  temp_min REAL NOT NULL,
  temp_max REAL NOT NULL,
  moisture_min REAL NOT NULL,
  moisture_max REAL NOT NULL,
  light_min REAL NOT NULL,
  light_max REAL NOT NULL,
  conductivity_min REAL NOT NULL,
  conductivity_max REAL NOT NULL,
  weights_json TEXT
);
`

export const CREATE_PLANTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS plants (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
  sensor_id TEXT,
  threshold_profile_id TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (threshold_profile_id) REFERENCES threshold_profiles(id) ON DELETE SET NULL
);
`

export const CREATE_SENSOR_DEVICES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sensor_devices (
  id TEXT PRIMARY KEY NOT NULL,
  plant_id TEXT UNIQUE,
  device_identifier TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  model TEXT NOT NULL,
  firmware_version TEXT,
  battery_level REAL,
  last_battery_read_at TEXT,
  paired_at TEXT NOT NULL,
  last_seen_at TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE SET NULL
);
`

export const CREATE_MEASUREMENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY NOT NULL,
  plant_id TEXT NOT NULL,
  sensor_id TEXT NOT NULL,
  measured_at TEXT NOT NULL,
  temperature REAL NOT NULL,
  moisture REAL NOT NULL,
  light REAL NOT NULL,
  conductivity REAL NOT NULL,
  battery_level REAL,
  source TEXT NOT NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);
`

export const CREATE_ALERTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY NOT NULL,
  plant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL,
  measurement_id TEXT,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE,
  FOREIGN KEY (measurement_id) REFERENCES measurements(id) ON DELETE SET NULL
);
`

export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_plants_category ON plants(category);
CREATE INDEX IF NOT EXISTS idx_plants_is_favorite ON plants(is_favorite);
CREATE INDEX IF NOT EXISTS idx_sensor_devices_plant_id ON sensor_devices(plant_id);
CREATE INDEX IF NOT EXISTS idx_measurements_plant_id_measured_at ON measurements(plant_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_plant_id_created_at ON alerts(plant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
`

export const CREATE_SENSOR_RELATION_TRIGGERS_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_sensor_relation_after_insert
AFTER INSERT ON sensor_devices
WHEN NEW.plant_id IS NOT NULL
BEGIN
  UPDATE plants SET sensor_id = NEW.id WHERE id = NEW.plant_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sensor_relation_after_update
AFTER UPDATE OF plant_id ON sensor_devices
BEGIN
  UPDATE plants SET sensor_id = NULL WHERE sensor_id = NEW.id AND id IS NOT NEW.plant_id;
  UPDATE plants SET sensor_id = NEW.id WHERE id = NEW.plant_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sensor_relation_after_delete
AFTER DELETE ON sensor_devices
BEGIN
  UPDATE plants SET sensor_id = NULL WHERE sensor_id = OLD.id;
END;
`
