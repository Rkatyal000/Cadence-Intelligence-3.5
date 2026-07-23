import express from "express";
import path from "path";
import { app } from "./server";

/**
 * Standalone server bootstrap.
 *
 * This file is the ONLY place that imports Vite or calls app.listen(). It is
 * used for local development (`npm run dev`) and self-hosting (`npm start`).
 *
 * It is deliberately NOT imported by api/index.ts (the Vercel serverless
 * function). On Vercel the platform serves the built `dist/` static assets and
 * rewrites `/api/*` to the function, so the function only needs the pure API
 * app exported from server.ts — no Vite, no static serving, no listener.
 */
async function start() {
  if (process.env.NODE_ENV !== "production") {
    // Development: attach the Vite dev server as middleware so the SPA and the
    // API are served from a single origin/port with HMR.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production self-host: serve the pre-built SPA from dist/ with an
    // index.html fallback for client-side routing.
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
