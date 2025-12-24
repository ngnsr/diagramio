import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import OpenAI from "openai";

type Bindings = {};
type Variables = {};

if (!process.env.LLM7_API_KEY) {
  throw new Error("LLM7_API_KEY is not set");
}

// Use LLM7 as the API endpoint
const openai = new OpenAI({
  apiKey: process.env.LLM7_API_KEY,
  baseURL: "https://api.llm7.io/v1",
});

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors());

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/api/generate-diagram", async (c) => {
  try {
    const body = await c.req.json<{ text: string }>();
    const userDescription = body.text;

    if (!userDescription) {
      throw new HTTPException(400, {
        message: 'Missing "text" in request body',
      });
    }

    console.log("Received description:", userDescription);

    const completion = await openai.chat.completions.create({
      model: "default", // LLM7 default model
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You generate Mermaid diagrams.

Rules:
- Output ONLY valid Mermaid syntax
- Do NOT wrap in markdown
- Do NOT add explanations
- Do NOT use \`\`\`
- Be concise but correct
        `.trim(),
        },
        {
          role: "user",
          content: userDescription,
        },
      ],
    });

    const mermaidSyntax = completion.choices[0]?.message?.content?.trim();

    if (!mermaidSyntax) {
      throw new Error("Empty Mermaid response from LLM7");
    }

    if (
      !mermaidSyntax.startsWith("graph") &&
      !mermaidSyntax.startsWith("sequenceDiagram") &&
      !mermaidSyntax.startsWith("erDiagram") &&
      !mermaidSyntax.startsWith("classDiagram") &&
      !mermaidSyntax.startsWith("stateDiagram")
    ) {
      throw new HTTPException(500, {
        message: "Model returned invalid Mermaid syntax",
      });
    }

    console.log("Generated Mermaid syntax:", mermaidSyntax);

    return c.json({ mermaidSyntax });
  } catch (error) {
    console.error("Error in /api/generate-diagram:", error);

    if (error instanceof HTTPException) {
      return c.json({ error: error.message }, error.status);
    }

    return c.json({ error: "An unexpected error occurred" }, 500);
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export default {
  fetch: app.fetch,
  port: port,
};
