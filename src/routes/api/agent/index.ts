import { createFileRoute } from "@tanstack/react-router";
import { agentIndex, json, optionsOk } from "@/lib/agent.server";

export const Route = createFileRoute("/api/agent/")({
  server: {
    handlers: {
      OPTIONS: async () => optionsOk(),
      GET: async () => json(agentIndex()),
    },
  },
});
