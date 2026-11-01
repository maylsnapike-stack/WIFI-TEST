/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Ixtiyoriy: o‘z speed-test serveringiz manzili (standart: Cloudflare). */
  readonly VITE_SPEED_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
