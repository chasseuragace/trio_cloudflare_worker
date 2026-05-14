import { z } from "zod";
import { BookingFormSchema, Env, ApiResponse } from "../types";
import { composeNarrative, composeFallbackNarrative } from "../services/llm";
import { createAssetInFirebase } from "../services/firebase";
import { getCorsHeaders } from "../utils/cors";

export async function handleBooking(
  request: Request,
  env: Env
): Promise<Response> {
  const origin = request.headers.get("origin");
  try {
    const body = await request.json() as Record<string, unknown>;

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

    if (!description) {
      description = composeFallbackNarrative(validatedData);
    }

    // Create asset in Firebase
    const assetPayload = {
      title: validatedData.name,
      description,
      images: [],
    };

    await createAssetInFirebase(assetPayload);

    const response: ApiResponse = {
      success: true,
      message: "Booking received successfully",
      data: {
        id: crypto.randomUUID(),
        ...validatedData,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(origin),
      },
    });
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
            ...getCorsHeaders(origin),
          },
        }
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
          ...getCorsHeaders(origin),
        },
      }
    );
  }
}
