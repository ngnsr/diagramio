import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {};
type Variables = {};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors());

app.get("/", (c) => {
  return c.text("Hello! This is your Hono backend.");
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// --- API Endpoints will go here ---
// Example: POST /api/generate-diagram
// app.post('/api/generate-diagram', async (c) => { /* ... */ });

export default {
  fetch: app.fetch,
  port: 3000,
};
