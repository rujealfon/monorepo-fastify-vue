/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Only set when API and web are deployed separately (Option 2).
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
