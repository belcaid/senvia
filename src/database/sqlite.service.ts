import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
  type capSQLiteValues,
} from '@capacitor-community/sqlite'
import { DATABASE_MIGRATIONS } from '@/database/migrations'
import {
  CREATE_MIGRATIONS_TABLE_SQL,
  DATABASE_ENCRYPTION_MODE,
  DATABASE_NAME,
  DATABASE_VERSION,
  MIGRATIONS_TABLE,
  PRAGMA_FOREIGN_KEYS,
} from '@/database/schema'

let sqliteConnection: SQLiteConnection | null = null
let databaseConnection: SQLiteDBConnection | null = null
let initializationPromise: Promise<void> | null = null
let isWebStoreInitialized = false
let jeepSqliteElementsDefined = false

const getSQLiteConnection = (): SQLiteConnection => {
  if (sqliteConnection === null) {
    sqliteConnection = new SQLiteConnection(CapacitorSQLite)
  }

  return sqliteConnection
}

const defineJeepSqliteCustomElement = async (): Promise<void> => {
  if (Capacitor.getPlatform() !== 'web' || jeepSqliteElementsDefined) {
    return
  }

  if (typeof window === 'undefined' || typeof customElements === 'undefined') {
    return
  }

  if (!customElements.get('jeep-sqlite')) {
    const loader = await import('jeep-sqlite/loader')
    loader.defineCustomElements(window)
  }

  await customElements.whenDefined('jeep-sqlite')
  jeepSqliteElementsDefined = true
}

const ensureWebStore = async (): Promise<void> => {
  if (Capacitor.getPlatform() !== 'web' || isWebStoreInitialized) {
    return
  }

  if (typeof document === 'undefined') {
    return
  }

  await defineJeepSqliteCustomElement()

  if (!document.querySelector('jeep-sqlite')) {
    const jeepSqliteElement = document.createElement('jeep-sqlite')
    document.body.appendChild(jeepSqliteElement)
  }

  if (typeof customElements !== 'undefined') {
    await customElements.whenDefined('jeep-sqlite')
  }

  await getSQLiteConnection().initWebStore()
  isWebStoreInitialized = true
}

const getOrCreateDatabaseConnection = async (): Promise<SQLiteDBConnection> => {
  const sqlite = getSQLiteConnection()
  const consistency = await sqlite.checkConnectionsConsistency()
  const hasConnection = await sqlite.isConnection(DATABASE_NAME, false)

  if (consistency.result && hasConnection.result) {
    return sqlite.retrieveConnection(DATABASE_NAME, false)
  }

  return sqlite.createConnection(DATABASE_NAME, false, DATABASE_ENCRYPTION_MODE, DATABASE_VERSION, false)
}

const getCurrentMigrationVersion = async (db: SQLiteDBConnection): Promise<number> => {
  const result = await db.query(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version DESC LIMIT 1;`)
  const version = result.values?.[0]?.version

  if (typeof version === 'number') {
    return version
  }

  if (typeof version === 'string') {
    return Number(version) || 0
  }

  return 0
}

const applyMigration = async (db: SQLiteDBConnection, version: number, name: string, statements: string[]): Promise<void> => {
  for (const statement of statements) {
    await db.execute(statement, false)
  }

  await db.run(
    `INSERT INTO ${MIGRATIONS_TABLE} (version, name, executed_at) VALUES (?, ?, ?);`,
    [version, name, new Date().toISOString()],
    false,
  )
}

const runMigrations = async (db: SQLiteDBConnection): Promise<void> => {
  await db.execute(CREATE_MIGRATIONS_TABLE_SQL, false)

  let currentVersion = await getCurrentMigrationVersion(db)

  const sortedMigrations = [...DATABASE_MIGRATIONS].sort((a, b) => a.version - b.version)

  for (const migration of sortedMigrations) {
    if (migration.version <= currentVersion) {
      continue
    }

    await db.beginTransaction()

    try {
      await applyMigration(db, migration.version, migration.name, migration.statements)
      await db.commitTransaction()
      currentVersion = migration.version
    } catch (error) {
      await db.rollbackTransaction()
      throw error
    }
  }
}

export const initializeDatabase = async (): Promise<void> => {
  if (initializationPromise !== null) {
    await initializationPromise
    return
  }

  initializationPromise = (async () => {
    await ensureWebStore()

    if (databaseConnection === null) {
      databaseConnection = await getOrCreateDatabaseConnection()
    }

    const isOpen = await databaseConnection.isDBOpen()

    if (!isOpen.result) {
      await databaseConnection.open()
    }

    await databaseConnection.execute(PRAGMA_FOREIGN_KEYS, false)
    await runMigrations(databaseConnection)
  })()

  try {
    await initializationPromise
  } catch (error) {
    initializationPromise = null
    throw error
  }
}

export const getDatabaseConnection = async (): Promise<SQLiteDBConnection> => {
  await initializeDatabase()

  if (databaseConnection === null) {
    throw new Error('Database connection is not available after initialization')
  }

  return databaseConnection
}

export const queryRows = async <TRow>(
  statement: string,
  values: unknown[] = [],
): Promise<TRow[]> => {
  const db = await getDatabaseConnection()
  const result: capSQLiteValues = await db.query(statement, values)

  return (result.values ?? []) as TRow[]
}

export const runStatement = async (statement: string, values: unknown[] = []): Promise<void> => {
  const db = await getDatabaseConnection()
  await db.run(statement, values)
}

export const executeStatements = async (statements: string): Promise<void> => {
  const db = await getDatabaseConnection()
  await db.execute(statements)
}

export const closeDatabase = async (): Promise<void> => {
  if (databaseConnection === null) {
    return
  }

  const isOpen = await databaseConnection.isDBOpen()

  if (isOpen.result) {
    await databaseConnection.close()
  }

  const sqlite = getSQLiteConnection()
  const hasConnection = await sqlite.isConnection(DATABASE_NAME, false)

  if (hasConnection.result) {
    await sqlite.closeConnection(DATABASE_NAME, false)
  }

  databaseConnection = null
  initializationPromise = null
}
