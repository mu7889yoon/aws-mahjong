/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TILE_CLASSIFIER_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
