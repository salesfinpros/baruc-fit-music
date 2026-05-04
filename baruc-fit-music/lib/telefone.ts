export function mascaraTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  return valor
}

export function limparTelefone(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function validarTelefone(valor: string): boolean {
  const digits = limparTelefone(valor)
  return digits.length >= 10 && digits.length <= 11
}
