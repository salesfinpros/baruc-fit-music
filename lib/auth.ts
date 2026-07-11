import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE = 'admin_token'
const EXPIRES = '8h'

export async function criarTokenAdmin(academiaSlug: string): Promise<string> {
  return new SignJWT({ academiaSlug, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(EXPIRES)
    .setIssuedAt()
    .sign(await secret())
}

export async function verificarTokenAdmin(
  token: string
): Promise<{ academiaSlug: string } | null> {
  try {
    const { payload } = await jwtVerify(token, await secret())
    return { academiaSlug: payload.academiaSlug as string }
  } catch {
    return null
  }
}

export async function getAdminSession(): Promise<{ academiaSlug: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verificarTokenAdmin(token)
}

export { COOKIE as ADMIN_COOKIE }
