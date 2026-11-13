const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/

export function assertIdent(name: unknown): string {
  if (typeof name !== 'string' || !IDENT.test(name)) throw new Error('Ongeldige naam')
  return name
}

export function assertIdents(names: unknown[]): string[] {
  return names.map(assertIdent)
}
