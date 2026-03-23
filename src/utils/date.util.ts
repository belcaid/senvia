const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const formatDateTime = (value: string | null | undefined, fallback = 'Inconnue'): string => {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return DATE_TIME_FORMATTER.format(date)
}
