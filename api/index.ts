import type { IncomingMessage, ServerResponse } from "http";

// Lazily import the Express app inside the handler so that any error thrown
// while evaluating server.ts (missing dep, bad env, bundling issue) is caught
// and returned as JSON instead of surfacing as an opaque
// FUNCTION_INVOCATION_FAILED with no detail in the Vercel logs.
let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    // Explicit .js extension is required: the project is ESM, and on Vercel
    // server.ts is compiled to /var/task/server.js. Node's ESM resolver does
    // not add extensions, so "../server" fails with ERR_MODULE_NOT_FOUND.
    appPromise = import("../server.js").then((m) => m.app);
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    // Reset so a transient failure can retry on the next request.
    appPromise = null;
    const message = err?.stack || err?.message || String(err);
    console.error("Serverless init/handler failure:", message);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Serverless function failed to initialize.", detail: message }));
  }
}
