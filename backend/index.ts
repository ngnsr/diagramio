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

    console.log("Received description for generation:", userDescription);

    const completion = await openai.chat.completions.create({
      model: "default", // LLM7 default model
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an expert in generating Mermaid diagrams from a textual description.
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

app.post("/api/improve-diagram", async (c) => {
  try {
    const body = await c.req.json<{ currentDiagram: string; prompt: string }>();
    const { currentDiagram, prompt } = body;

    if (!currentDiagram || !prompt) {
      throw new HTTPException(400, {
        message: 'Missing "currentDiagram" or "prompt" in request body',
      });
    }

    console.log("Received prompt for improvement:", prompt);
    console.log("Current diagram:\n", currentDiagram);

    const completion = await openai.chat.completions.create({
      model: "default", // LLM7 default model
      temperature: 0.4, // Slightly higher temperature for more creative edits
      messages: [
        {
          role: "system",
          content: `
You are an expert in modifying and improving existing Mermaid diagrams based on user feedback.
Your task is to take an existing Mermaid diagram and a user's prompt, and return the updated Mermaid syntax.

Follow these strict formatting rules:
1.  **Analyze and Modify:** Carefully analyze the provided \`currentDiagram\` and the \`prompt\`. Apply the changes requested in the prompt to the existing diagram.
2.  **Output ONLY Mermaid Syntax:** Do NOT wrap the output in markdown code blocks. Do NOT add any introductory sentences, explanations, or concluding remarks. The output should be *only* the Mermaid code. **Ensure the output starts directly with the diagram type keyword (e.g., "sequenceDiagram", "flowchart TD", "classDiagram") and does NOT include any preceding text like "mermaid" or descriptive phrases.**
3.  **Maintain Diagram Type:** If possible, preserve the original diagram type unless the prompt explicitly requests a change.
4.  **Correct Syntax:** Ensure the output is valid Mermaid syntax.
5.  **Handle Incomplete/Ambiguous Diagrams:** If the \`currentDiagram\` is malformed or incomplete, attempt to fix it or regenerate a plausible diagram based on the prompt. If the prompt is too vague to make meaningful changes, regenerate a diagram that best fits the prompt.

**Example Interaction:**
User provides:
\`currentDiagram\`:
\`\`\`mermaid
flowchart TD
  A[Start] --> B(Process)
\`\`\`
\`prompt\`: "Add a decision point after the process, leading to two outcomes: Success and Failure."

Your expected output:
\`\`\`mermaid
flowchart TD
  A[Start] --> B(Process)
  B -->|Success| C{Decision}
  B -->|Failure| D{Decision}
\`\`\`
        `.trim(),
        },
        {
          role: "user",
          content: `Current Diagram:\n\`\`\`mermaid\n${currentDiagram}\n\`\`\`\n\nInstructions: ${prompt}`,
        },
      ],
    });

    const mermaidSyntax = completion.choices[0]?.message?.content?.trim();

    if (!mermaidSyntax) {
      throw new Error("Empty Mermaid response from LLM7 for improvement");
    }
    console.log("Improved Mermaid syntax:", mermaidSyntax);

    // Simplified validation: check if it starts with a known Mermaid diagram type
    const validMermaidStarts = [
      "graph",
      "sequenceDiagram",
      "erDiagram",
      "classDiagram",
      "stateDiagram",
      "flowchart",
      "timeline",
    ];

    const startsWithValidType = validMermaidStarts.some((prefix) =>
      mermaidSyntax.startsWith(prefix)
    );

    if (!startsWithValidType) {
      throw new HTTPException(500, {
        message:
          "Model returned invalid Mermaid syntax. It did not start with a recognized diagram type.",
      });
    }

    return c.json({ mermaidSyntax });
  } catch (error) {
    console.error("Error in /api/improve-diagram:", error);

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
