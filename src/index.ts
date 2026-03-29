import { z } from "zod";

const KAHA_API_BASE = "https://api.kaha.com.np";

// Compose narrative using Groq LLM
async function composeNarrative(
  bookingData: z.infer<typeof BookingFormSchema>,
  groqToken: string
): Promise<string> {
  try {
    const prompt = `You are reporting to the Trio team about a new client inquiry. The Trio operates on these principles:
- Clients know their domain, not the solution
- The stated requirement is a hypothesis, not the answer
- Your job: extract the real need beneath what's stated

Client Context:
Name: ${bookingData.name}
${bookingData.company ? `Organization: ${bookingData.company}` : ""}
What they said: "${bookingData.message}"

Write 2-3 sentences that:
1. Identify the job-to-be-done (not just what they asked for)
2. Note if context is sufficient or if clarification is needed
3. Frame the opportunity for the Trio

Think like the Lead during knowledge crunching. Be direct. No fluff.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqToken}`,
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.warn(`Groq API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("Error composing narrative with Groq:", error);
    return null;
  }
}

// Fallback narrative composition
function composeFallbackNarrative(
  bookingData: z.infer<typeof BookingFormSchema>
): string {
  const org = bookingData.company ? ` at ${bookingData.company}` : "";
  return `${bookingData.name}${org} is working on: "${bookingData.message}". Context appears sufficient for initial intake. Opportunity to clarify the job-to-be-done and validate the underlying need.`;
}

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
  GROQ_TOKEN: string;
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

    console.log("Booking received:", validatedData);

    // Compose narrative using Groq or fallback
    let description = null;
    if (env.GROQ_TOKEN) {
      description = await composeNarrative(validatedData, env.GROQ_TOKEN);
    }

    // Fallback to simple narrative if Groq fails or token not available
    if (!description) {
      description = composeFallbackNarrative(validatedData);
    }

    // Create asset in Kaha API
    const assetPayload = {
      title: validatedData.name,
      description,
      images: [],
    };

    try {
      const kahaResponse = await fetch(
        `${KAHA_API_BASE}/main/api/v3/asset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.KAHA_TOKEN}`,
          },
          body: JSON.stringify(assetPayload),
        }
      );

      if (!kahaResponse.ok) {
        console.warn(
          `Failed to create asset in Kaha: ${kahaResponse.status} ${kahaResponse.statusText}`
        );
      } else {
        console.log("Asset created successfully in Kaha API");
      }
    } catch (kahaError) {
      console.error("Error creating asset in Kaha:", kahaError);
      // Don't fail the booking if asset creation fails
    }

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
