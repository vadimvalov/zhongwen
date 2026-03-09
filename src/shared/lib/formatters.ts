export function formatDictName(idOrFilename: string): string {
  const id = idOrFilename.replace(/\.json$/i, '')
  return id
    .split('_')
    .map((part) => part.toUpperCase())
    .join(' ')
}

