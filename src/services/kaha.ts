import { Asset } from "../types";

const KAHA_API_BASE = "https://api.kaha.com.np";

export async function createAsset(
  asset: Asset,
  kahaToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`${KAHA_API_BASE}/main/api/v3/asset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${kahaToken}`,
      },
      body: JSON.stringify(asset),
    });

    if (!response.ok) {
      console.warn(
        `Failed to create asset in Kaha: ${response.status} ${response.statusText}`
      );
      return false;
    }

    console.log("Asset created successfully in Kaha API");
    return true;
  } catch (error) {
    console.error("Error creating asset in Kaha:", error);
    return false;
  }
}

export async function proxyRequest(
  request: Request,
  pathname: string,
  kahaToken: string
): Promise<Response> {
  try {
    const kahaPath = pathname.replace("/api/kaha", "");
    const url = new URL(request.url);
    const queryString = url.search;

    const kahaUrl = `${KAHA_API_BASE}${kahaPath}${queryString}`;

    const headers = new Headers(request.headers);
    headers.delete("host");

    if (kahaToken) {
      headers.set("Authorization", `Bearer ${kahaToken}`);
    }

    const response = await fetch(kahaUrl, {
      method: request.method,
      headers,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? await request.text()
          : undefined,
    });

    const responseBody = await response.text();
    const responseHeaders = new Headers(response.headers);

    // Remove CORS headers from upstream response to avoid duplicates
    responseHeaders.delete("access-control-allow-origin");
    responseHeaders.delete("access-control-allow-methods");
    responseHeaders.delete("access-control-allow-headers");

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    throw error;
  }
}
