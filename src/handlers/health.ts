import { Env, ApiResponse } from "../types";
import { corsHeaders, getCorsHeaders } from "../utils/cors";

export function handleHealth(origin: string | null): Response {
  const response: ApiResponse = {
    success: true,
    message: "OK",
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(origin),
    },
  });
}

export function handleConfigStatus(env: Env, origin: string | null): Response {
  const hasKahaToken = !!env.KAHA_TOKEN;
  const hasGroqToken = !!env.GROQ_TOKEN;

  const kahaTokenPreview = hasKahaToken
    ? `${env.KAHA_TOKEN.substring(0, 4)}...${env.KAHA_TOKEN.substring(env.KAHA_TOKEN.length - 4)}`
    : "NOT_SET";

  const groqTokenPreview = hasGroqToken
    ? `${env.GROQ_TOKEN.substring(0, 4)}...${env.GROQ_TOKEN.substring(env.GROQ_TOKEN.length - 4)}`
    : "NOT_SET";

  const response: ApiResponse = {
    success: true,
    message: "OK",
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      config: {
        kahaTokenConfigured: hasKahaToken,
        kahaTokenPreview,
        groqTokenConfigured: hasGroqToken,
        groqTokenPreview,
      },
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(origin),
    },
  });
}

export function handleOptions(origin: string | null): Response {
  return new Response(null, {
    headers: getCorsHeaders(origin),
  });
}
