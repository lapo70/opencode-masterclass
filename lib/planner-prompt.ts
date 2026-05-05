import type { ProjectPlan } from "@/lib/planner-schema";

type BuildPlannerPromptInput = {
  idea: string;
  draft?: ProjectPlan;
};

export function buildPlannerPrompt({ idea, draft }: BuildPlannerPromptInput) {
  return `Create a concise, practical project brief for this app idea:

${idea}

Return one complete plan that is useful for a beginner-friendly coding tutorial. Keep scope small: no authentication, no database, no payments unless the idea is impossible without them. Prefer a simple Next.js App Router implementation.

Requirements:
- Use short, specific language.
- Include realistic target users, features, pages/routes, data model entities, relationships, phases, risks, and a final coding-agent starter prompt.
- Entity ids must be stable kebab-case strings, and relationships must reference existing entity ids.
- The starter prompt must summarize the app, stack, pages, data model, and implementation order so a coding agent can start immediately.
${draft ? `\nCurrent editable draft context to improve or preserve where useful:\n${JSON.stringify(draft, null, 2)}` : ""}`;
}
