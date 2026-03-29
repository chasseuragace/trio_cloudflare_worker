const ALLOWED_ORIGINS = [
  "https://chasseuragace.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://chasseuragace.github.io",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://chasseuragace.github.io",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
