import { Env, ApiResponse } from "./types";
import { handleBooking } from "./handlers/booking";
import { handleHealth, handleConfigStatus, handleOptions } from "./handlers/health";
import { handleKahaProxy } from "./handlers/proxy";
import { getCorsHeaders } from "./utils/cors";

export async function router(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return handleOptions(origin);
  }

  // Route: POST /api/bookings
  if (url.pathname === "/api/bookings" && request.method === "POST") {
    return handleBooking(request, env);
  }

  // Route: GET /api/health
  if (url.pathname === "/api/health" && request.method === "GET") {
    return handleHealth(origin);
  }

  // Route: GET /api/config/status
  if (url.pathname === "/api/config/status" && request.method === "GET") {
    return handleConfigStatus(env, origin);
  }

  // Proxy routes for Kaha API
  if (url.pathname.startsWith("/api/kaha/")) {
    return handleKahaProxy(request, env, url.pathname, origin);
  }

  // 404 Not Found
  const notFoundResponse: ApiResponse = {
    success: false,
    message: "Not found",
  };

  return new Response(JSON.stringify(notFoundResponse), {
    status: 404,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(origin),
    },
  });
}
