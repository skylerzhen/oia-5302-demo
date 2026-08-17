/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LLM_API_URL?: string
  readonly VITE_API_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
