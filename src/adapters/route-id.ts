/** Precomputed route files are named `<originId>__<destinationId>.json`. */
export function routeIdFor(originId: string, destinationId: string): string {
  return `${originId}__${destinationId}`;
}
