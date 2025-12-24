// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Add this resolve configuration
  resolve: {
    alias: {
      // Map module paths to their actual locations if needed,
      // but more importantly, ensure Vite knows how to treat these as files.
      // This is often handled automatically, but explicit rules can help.
    },
  },
  // This section is more about how Vite handles asset imports.
  // For CSS, it usually works out of the box if imported correctly.
  // If the above import fix doesn't work, this might point to an issue
  // with how esbuild is configured or how CodeMirror is structured.
});
