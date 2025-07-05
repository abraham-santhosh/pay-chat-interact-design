interface Env {
  readonly VITE_API_BASE_URL?: string;
}

// Cast to access strongly-typed env
const { VITE_API_BASE_URL } = import.meta.env as unknown as Env;

export const API_BASE_URL = VITE_API_BASE_URL || 'http://localhost:4000';