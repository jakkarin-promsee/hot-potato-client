/// <reference types="vite/client" />

import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // add more VITE_ vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
