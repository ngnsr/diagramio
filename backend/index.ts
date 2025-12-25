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
You are an expert in generating Mermaid diagrams.
Your task is to convert a user's description into a Mermaid diagram.

Follow these strict formatting rules:
1.  **Infer Diagram Type:** Determine the most appropriate Mermaid diagram type (e.g., flowchart, sequenceDiagram, classDiagram) based on the user's description. Default to \`flowchart TD\` if the description is ambiguous or suggests a process flow.
2.  **Output ONLY Mermaid Syntax:** Do NOT wrap the output in markdown code blocks (like \`\`\`mermaid...\`\`\`). Do NOT add any introductory sentences, explanations, or concluding remarks. The output should be *only* the Mermaid code.
3.  **Correct Syntax:** Use the correct Mermaid syntax for the chosen diagram type.
    *   **For Flowcharts (if type is flowchart TD):**
        *   Use node definitions first, followed by links.
        *   Use comments \`%% Define Nodes\` and \`%% Define Links with Labels\`.
        *   All links must use the pipe syntax for labels: \`NodeA -->|Label Text| NodeB\`.
        *   Labels should be concise. Colons within labels are acceptable if natural (e.g., "publish: UserRegistered").
        *   Use rectangular boxes \`[Node]\`, rounded circles \`(Node)\`, and diamond shapes \`{Node}\` as appropriate for the description.
    *   **For other diagram types:** Apply standard Mermaid syntax rules for those types. (e.g., for sequence diagrams, use \`participant\`, \`actor\`, \`->\`, \`->>\`, \`alt\`, \`loop\`).

**Example of desired flowchart output structure:**
\`\`\`mermaid
flowchart TD
  %% Define Nodes
  A[Node A]
  B(Node B)

  %% Define Links with Labels
  A -->|link to B| B
  B -->|another link| A
\`\`\`
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
    console.log("Generated Mermaid syntax:", mermaidSyntax);

    if (
      !mermaidSyntax.startsWith("graph") &&
      !mermaidSyntax.startsWith("sequenceDiagram") &&
      !mermaidSyntax.startsWith("erDiagram") &&
      !mermaidSyntax.startsWith("classDiagram") &&
      !mermaidSyntax.startsWith("stateDiagram") &&
      !mermaidSyntax.startsWith("flowchart")
    ) {
      throw new HTTPException(500, {
        message: "Model returned invalid Mermaid syntax",
      });
    }

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
