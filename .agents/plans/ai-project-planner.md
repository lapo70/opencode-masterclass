# AI Project Planner App Plan

## Goal

Build a lightweight AI Project Planner app for a tutorial. A user enters a rough app idea and receives an editable project brief with:

- App summary
- Target users
- Core features
- Recommended tech stack
- Pages/routes
- Possible data model
- Data model relationship visualization
- Build phases
- Risks and edge cases
- Final copyable starter prompt for a coding agent

Scope stays intentionally small: no auth, no database, no payments.

## Confirmed Decisions

- Framework: Next.js App Router
- Styling: Tailwind CSS v4
- Components: shadcn/ui
- AI: AI SDK with OpenRouter
- Default OpenRouter model: `anthropic/claude-sonnet-4.6`
- Generation mode: full brief generated all at once
- Draft persistence: browser `localStorage`
- Data visualization: read-only React Flow graph derived from the editable data model
- Server persistence: none

## Current Repo Context

- The app is currently a minimal Next.js 16 project.
- `package.json` has Next, React, React DOM, Tailwind, TypeScript, and ESLint only.
- No shadcn/ui setup exists yet.
- No AI SDK, OpenRouter provider, Zod, React Flow, Lucide, or next-themes dependencies exist yet.
- Existing app files are limited to `app/page.tsx`, `app/layout.tsx`, and `app/globals.css`.
- `DESIGN.md` defines the intended design system and should be followed when implementing UI.

## Proposed Architecture

### Routes

- `app/page.tsx`
  - Server Component page shell.
  - Renders the planner workspace.

- `app/api/planner/route.ts`
  - Server-only POST endpoint for AI generation.
  - Reads `OPENROUTER_API_KEY` and optional `OPENROUTER_MODEL`.
  - Uses AI SDK structured output with OpenRouter.
  - Returns validated JSON matching the shared planner schema.

### Core Files

- `components/planner/project-planner.tsx`
  - Main client workspace.
  - Owns editable planner state.
  - Handles idea input, generation, errors, copy actions, section editing, and local draft persistence.

- `components/planner/data-model-graph.tsx`
  - Client-only read-only React Flow visualization.
  - Receives entities and relationships as plain JSON props.
  - Derives graph nodes and edges from planner state.

- `lib/planner-schema.ts`
  - Zod schemas for planner output and local draft validation.
  - Type exports inferred from schemas.

- `lib/planner-prompt.ts`
  - Prompt builder for structured planner generation.
  - Keeps API route focused on request validation and model invocation.

- `lib/utils.ts`
  - shadcn `cn()` helper.

- `components/ui/*`
  - shadcn/ui primitives.

## Dependencies To Add During Implementation

- `ai`
- `@openrouter/ai-sdk-provider`
- `zod`
- `@xyflow/react`
- `lucide-react`
- `next-themes`
- `clsx`
- `tailwind-merge`
- `class-variance-authority`

Likely shadcn/ui components:

- `button`
- `textarea`
- `input`
- `card`
- `tabs`
- `badge`
- `separator`
- `scroll-area`
- `accordion`
- `sonner` or another toast component

## Environment Contract

Create `.env.example` during implementation with:

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-sonnet-4.6
```

Implementation should use:

```ts
const model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.6"
```

Never expose the OpenRouter API key to client components or `NEXT_PUBLIC_*` variables.

## Planner Data Shape

Use one shared structured object for AI output, editable state, and localStorage persistence.

```ts
type ProjectPlan = {
  appName: string
  appSummary: string
  targetUsers: string[]
  coreFeatures: Feature[]
  recommendedTechStack: TechStackItem[]
  pagesRoutes: PageRoute[]
  dataModel: Entity[]
  relationships: Relationship[]
  buildPhases: BuildPhase[]
  risksEdgeCases: Risk[]
  starterPrompt: string
}
```

Suggested supporting types:

```ts
type Feature = {
  name: string
  description: string
  priority: "must-have" | "nice-to-have"
}

type TechStackItem = {
  category: string
  recommendation: string
  reason: string
}

type PageRoute = {
  path: string
  name: string
  purpose: string
}

type Entity = {
  id: string
  name: string
  description: string
  fields: EntityField[]
}

type EntityField = {
  name: string
  type: string
  required: boolean
  notes?: string
}

type Relationship = {
  fromEntityId: string
  toEntityId: string
  label: string
  cardinality: "one-to-one" | "one-to-many" | "many-to-many"
}

type BuildPhase = {
  name: string
  goal: string
  tasks: string[]
}

type Risk = {
  title: string
  mitigation: string
}
```

Graph state should not be stored separately. React Flow nodes and edges should be derived from `dataModel` and `relationships`.

## AI Data Flow

1. User enters a rough app idea in the client workspace.
2. Client validates that the idea is non-empty.
3. Client sends `POST /api/planner` with the idea and optional current draft context.
4. Route handler validates the request body.
5. Route handler creates an OpenRouter provider with `createOpenRouter`.
6. Route handler calls AI SDK structured generation using the shared Zod schema.
7. Server returns a validated `ProjectPlan` object.
8. Client stores the result in editable local React state.
9. Client persists a versioned draft payload to `localStorage` after mount.
10. Client derives the read-only React Flow graph from `dataModel` and `relationships`.

## UI Structure

### Page Shell

- Header with app name, short product description, and simple status/model badge.
- Main responsive workspace.
- Keep layout usable on desktop and mobile.

### Input Panel

- Large textarea for rough app idea.
- Generate button.
- Example idea chips.
- Reset draft action.
- Loading and error states.

### Editable Brief Workspace

Use shadcn cards, tabs, accordions, or a responsive two-column layout for:

- Summary
- Target users
- Core features
- Tech stack
- Pages/routes
- Data model
- Build phases
- Risks/edge cases
- Starter prompt

Each section should be editable in place or through compact edit controls. Keep implementation minimal for tutorial clarity.

### Data Model Visualization

- Use `@xyflow/react`.
- Dynamically import graph component with SSR disabled if needed.
- Import React Flow CSS in `app/globals.css` after Tailwind CSS.
- Provide a fixed-height parent container for the canvas.
- Use read-only nodes and edges initially.
- Include a text/table representation alongside or below the graph for accessibility and small screens.

### Starter Prompt

- Display final coding-agent prompt in a copyable code-style block.
- Include a copy button.
- Prompt should be regenerated by the AI but editable by the user.

## Error Handling

- Missing `OPENROUTER_API_KEY`: return a clear server error without exposing secrets.
- Invalid request body: return `400` with concise message.
- AI schema failure: return a generic generation failure and log useful server-side details.
- Provider/rate errors: show a retryable client error.
- localStorage parse failure: ignore invalid stored draft and start fresh.
- Graph derivation: ignore dangling relationships or mark them as invalid without crashing.

## Implementation Steps

1. Install dependencies.
2. Initialize shadcn/ui and required components.
3. Update `app/globals.css` to match `DESIGN.md` tokens and include React Flow CSS.
4. Add `lib/utils.ts`.
5. Add `lib/planner-schema.ts`.
6. Add `lib/planner-prompt.ts`.
7. Add `app/api/planner/route.ts` using AI SDK and OpenRouter.
8. Replace starter homepage with planner shell.
9. Build `components/planner/project-planner.tsx`.
10. Add versioned `localStorage` save/restore.
11. Add editable planner sections.
12. Add copy behavior for the starter prompt.
13. Add read-only React Flow data-model visualization.
14. Add `.env.example` with OpenRouter variables.
15. Run `npm run lint`.
16. Run `npm run build`.

## Testing And Verification

Minimum checks after implementation:

- `npm run lint`
- `npm run build`

Recommended manual checks:

- Empty idea validation works.
- Missing API key produces a clear error.
- Successful generation renders all sections.
- User can edit generated sections.
- Draft restores after page refresh.
- Reset draft clears localStorage state.
- Starter prompt copy works.
- Data model graph renders relationships without crashing.
- Mobile layout remains usable.

## Risks And Tradeoffs

- Full-object generation is simpler but gives less progressive feedback than streaming.
- localStorage keeps scope small but is not durable across devices or cleared browser storage.
- OpenRouter model behavior can vary; schema validation is required.
- React Flow adds bundle weight; keep it isolated and lazy-loaded if possible.
- Editable graph is deferred to avoid two-way sync complexity.
- No database means users need to copy/export important plans manually in future iterations.
