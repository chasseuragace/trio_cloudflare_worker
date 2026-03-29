import { z } from "zod";

const KAHA_API_BASE = "https://api.kaha.com.np";

// Booking form validation schema
const BookingFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  timestamp: z.string().optional(),
});

type BookingForm = z.infer<typeof BookingFormSchema>;

interface Env {
  // Add your bindings here
  // DB?: D1Database;
  // CACHE?: KVNamespace;
  KAHA_TOKEN: string;
}

// CORS configuration
const ALLOWED_ORIGINS = [
  "https://chasseuragace.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://chasseuragace.github.io",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// CORS headers (fallback)
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://chasseuragace.github.io",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests
function handleOptions(origin: string | null): Response {
  return new Response(null, {
    headers: getCorsHeaders(origin),
  });
}

// Handle booking form submission
async function handleBooking(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = await request.json();

    // Validate the form data
    const validatedData = BookingFormSchema.parse({
      ...body,
      timestamp: new Date().toISOString(),
    });

    // TODO: Store the booking data
    // - Send to email service (e.g., SendGrid, Mailgun)
    // - Store in D1 database
    // - Log to analytics
    // - Send webhook to external service

    console.log("Booking received:", validatedData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Booking received successfully",
        data: {
          id: crypto.randomUUID(),
          ...validatedData,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Validation error",
          errors: error.errors,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }

    console.error("Error processing booking:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
}

// Proxy Kaha API requests
async function proxyKahaAPI(
  request: Request,
  env: Env,
  pathname: string,
  origin: string | null,
): Promise<Response> {
  try {
    // Extract the path after /api/kaha
    const kahaPath = pathname.replace("/api/kaha", "");
    const url = new URL(request.url);
    const queryString = url.search;

    const kahaUrl = `${KAHA_API_BASE}${kahaPath}${queryString}`;

    // Build headers for the upstream request
    const headers = new Headers(request.headers);
    headers.delete("host");

    // Add Kaha API authentication
    if (env.KAHA_TOKEN) {
      headers.set("Authorization", `Bearer ${env.KAHA_TOKEN}`);
    }

    // Forward the request to Kaha API
    const response = await fetch(kahaUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined,
    });

    // Create a new response with CORS headers
    const responseBody = await response.text();
    const responseHeaders = new Headers(response.headers);
    
    // Remove CORS headers from upstream response to avoid duplicates
    responseHeaders.delete("access-control-allow-origin");
    responseHeaders.delete("access-control-allow-methods");
    responseHeaders.delete("access-control-allow-headers");
    
    // Add our CORS headers
    const corsHeaders = getCorsHeaders(origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Proxy request failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      },
    );
  }
}

// Main request handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        },
      );
    }

    // Route: GET /api/config/status - Check if API key is configured
    if (url.pathname === "/api/config/status" && request.method === "GET") {
      const hasToken = !!env.KAHA_TOKEN;
      const tokenPreview = hasToken 
        ? `${env.KAHA_TOKEN.substring(0, 4)}...${env.KAHA_TOKEN.substring(env.KAHA_TOKEN.length - 4)}`
        : "NOT_SET";

      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          config: {
            kahaTokenConfigured: hasToken,
            kahaTokenPreview: tokenPreview,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        },
      );
    }

    // Proxy routes for Kaha API
    // /api/kaha/* -> https://api.kaha.com.np/*
    if (url.pathname.startsWith("/api/kaha/")) {
      return proxyKahaAPI(request, env, url.pathname, origin);
    }

    // 404 Not Found
    return new Response(
      JSON.stringify({
        success: false,
        message: "Not found",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      },
    );
  },
} satisfies ExportedHandler<Env>;
