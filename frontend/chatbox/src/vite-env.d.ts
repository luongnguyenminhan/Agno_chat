/// <reference types="vite/client" />

declare const __API_BASE_URL__: string
declare const __BUILD_MODE__: string

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
    readonly VITE_BASE_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
