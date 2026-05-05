import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Output, streamText } from "ai";

import { buildPlannerPrompt } from "@/lib/planner-prompt";
import { plannerRequestSchema, projectPlanSchema } from "@/lib/planner-schema";

export const runtime = "nodejs";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = plannerRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENROUTER_API_KEY. Add it to your local environment and retry." },
      { status: 500 },
    );
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const openrouter = createOpenRouter({ apiKey });

  try {
    const result = streamText({
      model: openrouter(model),
      output: Output.object({
        schema: projectPlanSchema,
        name: "ProjectPlan",
        description: "A complete editable project brief for a lightweight app idea.",
      }),
      system:
        "You are a senior product-minded software engineer creating small, practical project plans for coding tutorials.",
      prompt: buildPlannerPrompt(parsed.data),
    });

    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const partial of result.partialOutputStream) {
              controller.enqueue(encoder.encode(`${JSON.stringify({ type: "partial", value: partial })}\n`));
            }

            const final = await result.output;
            controller.enqueue(encoder.encode(`${JSON.stringify({ type: "final", value: final })}\n`));
          } catch (error) {
            console.error("Planner generation stream failed", error);
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({
                  type: "error",
                  error: "Planner generation failed. Check your OpenRouter model/API key and try again.",
                })}\n`,
              ),
            );
          } finally {
            controller.close();
          }
        },
      }),
      {
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/x-ndjson; charset=utf-8",
        },
      },
    );
  } catch (error) {
    console.error("Planner generation failed", error);

    return Response.json(
      { error: "Planner generation failed. Check your OpenRouter model/API key and try again." },
      { status: 502 },
    );
  }
}
