import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vitest/config'

// NOX & LUX — CSP (NL-12). Se inyecta SOLO en build de producción: en dev
// rompería el HMR del cliente de Vite. El API se permite como origen de
// `connect-src` (tokens viajan en el cuerpo, defensa en profundidad contra XSS).
const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3000'

function productionCsp(): Plugin {
  return {
    name: 'nox-lux-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        `connect-src 'self' ${API_URL}`,
        "font-src 'self' data: https:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
      ].join('; ')
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), productionCsp()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})