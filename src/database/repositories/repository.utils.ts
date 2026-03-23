export const toSqliteBoolean = (value: boolean): number => (value ? 1 : 0)

export const fromSqliteBoolean = (value: unknown): boolean =>
  value === 1 || value === '1' || value === true || value === 'true'

export const nowIso = (): string => new Date().toISOString()

export const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  return value
}

export const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}
