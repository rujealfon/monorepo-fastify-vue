/// <reference types="vite/client" />

type ImportMetaEnv = {
  // Only set when API and web are deployed separately (Option 2).
  readonly VITE_API_BASE_URL?: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};
