import { createFileRoute } from "@tanstack/react-router";
import { optionsOk } from "@/lib/agent.server";
import { handleMcp } from "@/lib/mcp-handler.server";

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async ({ request }) => handleMcp(request),
      POST: async ({ request }) => handleMcp(request),
    },
  },
});
