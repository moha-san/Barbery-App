import { createHmac, timingSafeEqual } from 'node:crypto'

// Acceso al panel con una sola contraseña (PANEL_CLAVE). La cookie guarda una firma, no la contraseña.
export const COOKIE = 'panel'

export const firmaPanel = () => {
  const clave = process.env.PANEL_CLAVE
  return clave ? createHmac('sha256', clave).update('panel-dueno').digest('hex') : null
}

export function claveCorrecta(intento: string): boolean {
  const clave = process.env.PANEL_CLAVE
  if (!clave) return false
  const a = Buffer.from(intento)
  const b = Buffer.from(clave)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function cookieValida(valor: string | undefined): boolean {
  const firma = firmaPanel()
  return !!firma && !!valor && valor.length === firma.length && timingSafeEqual(Buffer.from(valor), Buffer.from(firma))
}
