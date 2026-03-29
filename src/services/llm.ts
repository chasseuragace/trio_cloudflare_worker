import { BookingForm } from "../types";

export async function composeNarrative(
  bookingData: BookingForm,
  groqToken: string
): Promise<string | null> {
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
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 200,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Groq API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn("No content in Groq response");
      return null;
    }

    return appendMetadata(content.trim(), bookingData);
  } catch (error) {
    console.error("Error composing narrative with Groq:", error);
    return null;
  }
}

export function composeFallbackNarrative(bookingData: BookingForm): string {
  const org = bookingData.company ? ` at ${bookingData.company}` : "";
  const narrative = `${bookingData.name}${org} is working on: "${bookingData.message}". Context appears sufficient for initial intake. Opportunity to clarify the job-to-be-done and validate the underlying need.`;
  return appendMetadata(narrative, bookingData);
}

function appendMetadata(narrative: string, bookingData: BookingForm): string {
  const metadata = [
    `\n\n---`,
    `Name: ${bookingData.name}`,
    `Email: ${bookingData.email}`,
    bookingData.company ? `Company: ${bookingData.company}` : null,
    `Stage: ${bookingData.company || "Not specified"}`,
  ]
    .filter(Boolean)
    .join("\n");

  return narrative + metadata;
}
