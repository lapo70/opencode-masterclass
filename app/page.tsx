import { ProjectPlanner } from "@/components/planner/project-planner";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

export default function Home() {
  const modelName = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  return <ProjectPlanner modelName={modelName} />;
}
