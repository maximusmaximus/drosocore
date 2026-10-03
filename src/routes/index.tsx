import { createFileRoute } from "@tanstack/react-router";
import { ReactorSim } from "@/components/ReactorSim";

export const Route = createFileRoute("/")({ component: ReactorSim });
