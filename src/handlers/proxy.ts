import { Env, ApiResponse } from "../types";
import { proxyRequest } from "../services/kaha";
import { getCorsHeaders } from "../utils/cors";

export async function handleKahaProxy(
  request: Request,
  env: Env,
  pathname: string,
  origin: string | null
): Promise<Response> {
  try {
    const response = await proxyRequest(request, pathname, env.KAHA_TOKEN);

    const responseHeaders = new Headers(response.headers);
    const corsHeaders = getCorsHeaders(origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);

    const errorResponse: ApiResponse = {
      success: false,
      message: "Proxy request failed",
      data: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(origin),
      },
    });
  }
}
