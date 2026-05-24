export function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let rem = sum % 11
  if (rem < 2 ? parseInt(digits[9]) !== 0 : parseInt(digits[9]) !== 11 - rem) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  rem = sum % 11
  return rem < 2 ? parseInt(digits[10]) === 0 : parseInt(digits[10]) === 11 - rem
}

export function limparCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export function formatarCPF(cpf: string): string {
  const d = limparCPF(cpf).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

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
