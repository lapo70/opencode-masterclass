"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useState, useTransition, type ReactNode } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  Clipboard,
  Database,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { plannerDraftSchema, projectPlanSchema, type ProjectPlan } from "@/lib/planner-schema";

const DataModelGraph = dynamic(
  () => import("@/components/planner/data-model-graph").then((module) => module.DataModelGraph),
  {
    ssr: false,
    loading: () => (
      <div className="blueprint-surface flex h-full items-center justify-center rounded-[1.1rem] border text-sm text-muted-foreground">
        Loading graph...
      </div>
    ),
  },
);

const STORAGE_KEY = "ai-project-planner:draft:v1";

const EXAMPLE_IDEAS = [
  "A meal planning app for busy parents that creates weekly grocery lists",
  "A small CRM for freelance designers to track leads and project phases",
  "A habit tracker for remote teams with lightweight accountability rituals",
];

const selectClassName =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-xl border bg-background/45 px-3.5 py-1 text-base shadow-inner shadow-black/5 backdrop-blur outline-none focus-visible:ring-[3px] md:text-sm";

type PlannerStreamEvent =
  | { type: "partial"; value: Partial<ProjectPlan> }
  | { type: "final"; value: ProjectPlan }
  | { type: "error"; error: string };

type ProjectPlannerProps = {
  modelName: string;
};

export function ProjectPlanner({ modelName }: ProjectPlannerProps) {
  const [idea, setIdea] = useState("");
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const deferredPlan = useDeferredValue(plan);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isBusy = isGenerating || isPending;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHasMounted(true);

      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        if (!stored) {
          return;
        }

        const parsed = plannerDraftSchema.safeParse(JSON.parse(stored));

        if (!parsed.success) {
          window.localStorage.removeItem(STORAGE_KEY);
          return;
        }

        setIdea(parsed.data.idea);
        setPlanDraft(parsed.data.plan);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }

    if (!idea.trim() && !plan) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        idea,
        plan,
        updatedAt: new Date().toISOString(),
      }),
    );
  }, [hasMounted, idea, plan]);

  function setPlanDraft(nextPlan: ProjectPlan | null) {
    setPlan(nextPlan);
  }

  function updatePlanField<Key extends keyof ProjectPlan>(key: Key, value: ProjectPlan[Key]) {
    setPlan((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleGenerate() {
    const trimmedIdea = idea.trim();

    if (!trimmedIdea) {
      setError("Enter an app idea before generating a brief.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    startTransition(() => setPlanDraft(createEmptyPlan()));

    try {
      const validDraft = projectPlanSchema.safeParse(plan);
      const response = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: trimmedIdea, draft: validDraft.success ? validDraft.data : undefined }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const message = typeof data === "object" && data && "error" in data ? String(data.error) : "Planner generation failed.";
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("Planner generation did not return a stream.");
      }

      await readPlannerStream(response.body);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Planner generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function readPlannerStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        handleStreamLine(line);
      }
    }

    if (buffer.trim()) {
      handleStreamLine(buffer);
    }
  }

  function handleStreamLine(line: string) {
    if (!line.trim()) {
      return;
    }

    const event = JSON.parse(line) as PlannerStreamEvent;

    if (event.type === "error") {
      throw new Error(event.error);
    }

    if (event.type === "partial") {
      startTransition(() => {
        setPlan((current) => normalizeProjectPlan({ ...(current ?? createEmptyPlan()), ...event.value }));
      });
      return;
    }

    const parsed = projectPlanSchema.safeParse(event.value);

    if (!parsed.success) {
      throw new Error("The AI returned an unexpected plan shape. Try again.");
    }

    startTransition(() => setPlanDraft(parsed.data));
  }

  function handleReset() {
    window.localStorage.removeItem(STORAGE_KEY);
    setIdea("");
    setPlanDraft(null);
    setError(null);
    setCopied(false);
  }

  async function handleCopyPrompt() {
    if (!plan?.starterPrompt) {
      return;
    }

    const prompt = plan.starterPrompt;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);

    try {
      await Promise.race([
        navigator.clipboard.writeText(prompt),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("Clipboard timed out")), 500)),
      ]);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  return (
    <main className="planner-bg min-h-screen flex-1 overflow-hidden">
      <div className="pointer-events-none fixed -left-32 top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none fixed -right-28 top-10 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="container mx-auto max-w-[1500px] px-4 py-8 lg:py-12">
        <header className="glass-panel relative mb-8 overflow-hidden rounded-[2rem] p-5 sm:p-8 lg:p-10">
          <div className="command-strip absolute inset-x-0 top-0 h-1.5" />
          <div className="grid gap-8 lg:grid-cols-[1fr_21rem] lg:items-end">
            <div className="max-w-4xl animate-fade-up space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary shadow-inner shadow-white/10">
                  <Bot className="h-8 w-8" />
                </div>
                <Badge variant="secondary" className="gap-1 border-accent/30 bg-accent/15 text-accent">
                  <Sparkles className="h-3 w-3" /> Structured streaming
                </Badge>
                <span className="micro-label">Editable blueprint generator</span>
              </div>
              <div className="space-y-4">
                <h1 className="font-display max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.055em] text-foreground sm:text-7xl lg:text-8xl">
                  Draft the build before the build drafts you.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-xl sm:leading-8">
                  A live AI planning desk that turns a raw app idea into editable strategy cards, route maps, data models, build phases, and a copy-ready agent prompt.
                </p>
              </div>
            </div>
            <div className="rounded-[1.5rem] border bg-background/35 p-5 text-sm shadow-inner shadow-black/10 backdrop-blur">
              <div className="micro-label">Default model</div>
              <div className="mt-3 break-all font-mono text-xs leading-5 text-foreground">{modelName}</div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Metric label="Stream" value="NDJSON" />
                <Metric label="Draft" value="Local" />
                <Metric label="Graph" value="Live" />
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] lg:items-start">
          <section className="space-y-6 lg:sticky lg:top-6">
            <Card className="animate-scale-in overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="size-5 text-primary" /> App Idea
                </CardTitle>
                <CardDescription>Describe the app in plain language. Existing valid drafts are sent as optional context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  placeholder="Example: A lightweight project planner for solo founders who need a scoped MVP plan before coding."
                  className="min-h-44 resize-y"
                />
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_IDEAS.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setIdea(example)}
                      className="rounded-full border border-border/60 bg-background/35 px-3 py-1.5 text-left text-xs text-muted-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:border-accent/70 hover:bg-accent/15 hover:text-accent-foreground"
                    >
                      {example}
                    </button>
                  ))}
                </div>
                {error ? (
                  <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={handleGenerate} disabled={isBusy} className="sm:flex-1">
                    {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {isBusy ? "Streaming Brief" : plan ? "Regenerate Brief" : "Generate Brief"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleReset} disabled={isBusy}>
                    <RefreshCw className="size-4" /> Reset
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Drafts save locally in this browser only. The API key stays server-side.
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="size-5 text-primary" /> Data Model Graph
                </CardTitle>
                <CardDescription>Read-only visualization derived from the editable data model and relationships.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="blueprint-surface h-[360px] overflow-hidden rounded-[1.1rem] border">
                  <DataModelGraph entities={deferredPlan?.dataModel ?? []} relationships={deferredPlan?.relationships ?? []} />
                </div>
                {deferredPlan?.relationships?.length ? (
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">Relationship list</div>
                    <div className="space-y-2">
                      {deferredPlan.relationships.map((relationship, index) => (
                        <div
                          key={`${relationship.fromEntityId}-${relationship.toEntityId}-${index}`}
                          className="rounded-xl border bg-background/35 p-2.5 font-mono text-xs text-muted-foreground backdrop-blur"
                        >
                          {relationship.fromEntityId} -&gt; {relationship.toEntityId}: {relationship.label} ({relationship.cardinality})
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            {plan ? (
              <>
                <Card className="animate-fade-in overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="size-5 text-primary" /> Editable Brief
                    </CardTitle>
                    <CardDescription>
                      {isGenerating ? "Streaming structured sections into editable cards." : "Every section below is part of the saved local draft."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-[0.7fr_1.3fr]">
                      <Field label="App Name">
                        <Input value={plan.appName} onChange={(event) => updatePlanField("appName", event.target.value)} />
                      </Field>
                      <Field label="App Summary">
                        <Textarea value={plan.appSummary} onChange={(event) => updatePlanField("appSummary", event.target.value)} className="min-h-24" />
                      </Field>
                    </div>
                  </CardContent>
                </Card>

                <TargetUsersSection users={plan.targetUsers} onChange={(targetUsers) => updatePlanField("targetUsers", targetUsers)} />
                <FeaturesSection features={plan.coreFeatures} onChange={(coreFeatures) => updatePlanField("coreFeatures", coreFeatures)} />
                <TechStackSection items={plan.recommendedTechStack} onChange={(recommendedTechStack) => updatePlanField("recommendedTechStack", recommendedTechStack)} />
                <RoutesSection routes={plan.pagesRoutes} onChange={(pagesRoutes) => updatePlanField("pagesRoutes", pagesRoutes)} />
                <DataModelSection entities={plan.dataModel} onChange={(dataModel) => updatePlanField("dataModel", dataModel)} />
                <RelationshipsSection
                  relationships={plan.relationships}
                  entities={plan.dataModel}
                  onChange={(relationships) => updatePlanField("relationships", relationships)}
                />
                <BuildPhasesSection phases={plan.buildPhases} onChange={(buildPhases) => updatePlanField("buildPhases", buildPhases)} />
                <RisksSection risks={plan.risksEdgeCases} onChange={(risksEdgeCases) => updatePlanField("risksEdgeCases", risksEdgeCases)} />

                <Card>
                  <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div className="space-y-1.5">
                      <CardTitle>Starter Prompt</CardTitle>
                      <CardDescription>Copy this into a coding agent, then refine after any edits.</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleCopyPrompt}>
                      {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={plan.starterPrompt}
                      onChange={(event) => updatePlanField("starterPrompt", event.target.value)}
                      className="min-h-72 font-mono text-xs leading-5"
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="blueprint-surface flex min-h-[520px] items-center justify-center border-dashed text-center">
                <CardContent className="max-w-md space-y-3 py-12">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary shadow-inner shadow-white/10">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h2 className="font-display text-3xl font-bold tracking-tight">Your brief will stream in here.</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Enter an idea and generate a full editable plan. Sections appear as cards as soon as structured data arrives.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card/45 p-3">
      <div className="font-display text-lg font-bold leading-none">{value}</div>
      <div className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}

function TargetUsersSection({ users, onChange }: { users: string[]; onChange: (users: string[]) => void }) {
  return (
    <SectionCard title="Target Users" description="Add one audience segment per card." onAdd={() => onChange([...users, ""])}>
      {users.map((user, index) => (
        <ItemCard key={`${user}-${index}`} onRemove={() => onChange(removeAt(users, index))}>
          <Field label={`User Segment ${index + 1}`}>
            <Input value={user} onChange={(event) => onChange(replaceAt(users, index, event.target.value))} />
          </Field>
        </ItemCard>
      ))}
    </SectionCard>
  );
}

function FeaturesSection({
  features,
  onChange,
}: {
  features: ProjectPlan["coreFeatures"];
  onChange: (features: ProjectPlan["coreFeatures"]) => void;
}) {
  return (
    <SectionCard title="Core Features" description="Prioritize the smallest useful feature set." onAdd={() => onChange([...features, emptyFeature()])}>
      {features.map((feature, index) => (
        <ItemCard key={`${feature.name}-${index}`} onRemove={() => onChange(removeAt(features, index))}>
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <Field label="Name">
              <Input value={feature.name} onChange={(event) => onChange(replaceAt(features, index, { ...feature, name: event.target.value }))} />
            </Field>
            <Field label="Priority">
              <select
                value={feature.priority}
                onChange={(event) => onChange(replaceAt(features, index, { ...feature, priority: event.target.value as ProjectPlan["coreFeatures"][number]["priority"] }))}
                className={selectClassName}
              >
                <option value="must-have">Must-have</option>
                <option value="nice-to-have">Nice-to-have</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={feature.description} onChange={(event) => onChange(replaceAt(features, index, { ...feature, description: event.target.value }))} />
          </Field>
        </ItemCard>
      ))}
    </SectionCard>
  );
}

function TechStackSection({
  items,
  onChange,
}: {
  items: ProjectPlan["recommendedTechStack"];
  onChange: (items: ProjectPlan["recommendedTechStack"]) => void;
}) {
  return (
    <SectionCard title="Recommended Tech Stack" description="Explain each recommendation in practical terms." onAdd={() => onChange([...items, emptyTechStackItem()])}>
      {items.map((item, index) => (
        <ItemCard key={`${item.category}-${index}`} onRemove={() => onChange(removeAt(items, index))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Input value={item.category} onChange={(event) => onChange(replaceAt(items, index, { ...item, category: event.target.value }))} />
            </Field>
            <Field label="Recommendation">
              <Input value={item.recommendation} onChange={(event) => onChange(replaceAt(items, index, { ...item, recommendation: event.target.value }))} />
            </Field>
          </div>
          <Field label="Reason">
            <Textarea value={item.reason} onChange={(event) => onChange(replaceAt(items, index, { ...item, reason: event.target.value }))} />
          </Field>
        </ItemCard>
      ))}
    </SectionCard>
  );
}

function RoutesSection({
  routes,
  onChange,
}: {
  routes: ProjectPlan["pagesRoutes"];
  onChange: (routes: ProjectPlan["pagesRoutes"]) => void;
}) {
  return (
    <SectionCard title="Pages And Routes" description="Map the screens before implementation starts." onAdd={() => onChange([...routes, emptyRoute()])}>
      {routes.map((route, index) => (
        <ItemCard key={`${route.path}-${index}`} onRemove={() => onChange(removeAt(routes, index))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Path">
              <Input value={route.path} onChange={(event) => onChange(replaceAt(routes, index, { ...route, path: event.target.value }))} />
            </Field>
            <Field label="Name">
              <Input value={route.name} onChange={(event) => onChange(replaceAt(routes, index, { ...route, name: event.target.value }))} />
            </Field>
          </div>
          <Field label="Purpose">
            <Textarea value={route.purpose} onChange={(event) => onChange(replaceAt(routes, index, { ...route, purpose: event.target.value }))} />
          </Field>
        </ItemCard>
      ))}
    </SectionCard>
  );
}

function DataModelSection({
  entities,
  onChange,
}: {
  entities: ProjectPlan["dataModel"];
  onChange: (entities: ProjectPlan["dataModel"]) => void;
}) {
  function updateEntity(index: number, entity: ProjectPlan["dataModel"][number]) {
    onChange(replaceAt(entities, index, entity));
  }

  return (
    <SectionCard title="Data Model" description="Entity ids are used by relationships and the graph." onAdd={() => onChange([...entities, emptyEntity()])}>
      {entities.map((entity, entityIndex) => (
        <ItemCard key={`${entity.id}-${entityIndex}`} onRemove={() => onChange(removeAt(entities, entityIndex))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entity ID">
              <Input value={entity.id} onChange={(event) => updateEntity(entityIndex, { ...entity, id: event.target.value })} />
            </Field>
            <Field label="Name">
              <Input value={entity.name} onChange={(event) => updateEntity(entityIndex, { ...entity, name: event.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={entity.description} onChange={(event) => updateEntity(entityIndex, { ...entity, description: event.target.value })} />
          </Field>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Fields</div>
              <Button type="button" variant="outline" size="sm" onClick={() => updateEntity(entityIndex, { ...entity, fields: [...entity.fields, emptyEntityField()] })}>
                <Plus className="size-4" /> Add Field
              </Button>
            </div>
            {entity.fields.map((field, fieldIndex) => (
              <div key={`${field.name}-${fieldIndex}`} className="space-y-3 rounded-md border bg-background p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                  <Field label="Name">
                    <Input
                      value={field.name}
                      onChange={(event) =>
                        updateEntity(entityIndex, { ...entity, fields: replaceAt(entity.fields, fieldIndex, { ...field, name: event.target.value }) })
                      }
                    />
                  </Field>
                  <Field label="Type">
                    <Input
                      value={field.type}
                      onChange={(event) =>
                        updateEntity(entityIndex, { ...entity, fields: replaceAt(entity.fields, fieldIndex, { ...field, type: event.target.value }) })
                      }
                    />
                  </Field>
                  <label className="flex h-9 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) =>
                        updateEntity(entityIndex, { ...entity, fields: replaceAt(entity.fields, fieldIndex, { ...field, required: event.target.checked }) })
                      }
                      className="size-4 rounded border-input accent-primary"
                    />
                    Required
                  </label>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => updateEntity(entityIndex, { ...entity, fields: removeAt(entity.fields, fieldIndex) })}>
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove field</span>
                  </Button>
                </div>
                <Field label="Notes">
                  <Input
                    value={field.notes ?? ""}
                    onChange={(event) =>
                      updateEntity(entityIndex, { ...entity, fields: replaceAt(entity.fields, fieldIndex, { ...field, notes: event.target.value }) })
                    }
                  />
                </Field>
              </div>
            ))}
          </div>
        </ItemCard>
      ))}
    </SectionCard>
  );
}

function RelationshipsSection({
  relationships,
  entities,
  onChange,
}: {
  relationships: ProjectPlan["relationships"];
  entities: ProjectPlan["dataModel"];
  onChange: (relationships: ProjectPlan["relationships"]) => void;
}) {
  return (
    <SectionCard title="Relationships" description="Connect entities for the graph visualization." onAdd={() => onChange([...relationships, emptyRelationship(entities)])}>
      {relationships.map((relationship, index) => (
        <ItemCard key={`${relationship.fromEntityId}-${relationship.toEntityId}-${index}`} onRemove={() => onChange(removeAt(relationships, index))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From Entity">
              <EntitySelect value={relationship.fromEntityId} entities={entities} onChange={(fromEntityId) => onChange(replaceAt(relationships, index, { ...relationship, fromEntityId }))} />
            </Field>
            <Field label="To Entity">
              <EntitySelect value={relationship.toEntityId} entities={entities} onChange={(toEntityId) => onChange(replaceAt(relationships, index, { ...relationship, toEntityId }))} />
            </Field>
            <Field label="Label">
              <Input value={relationship.label} onChange={(event) => onChange(replaceAt(relationships, index, { ...relationship, label: event.target.value }))} />
            </Field>
            <Field label="Cardinality">
              <select
                value={relationship.cardinality}
                onChange={(event) => onChange(replaceAt(relationships, index, { ...relationship, cardinality: event.target.value as ProjectPlan["relationships"][number]["cardinality"] }))}
                className={selectClassName}
              >
                <option value="one-to-one">One-to-one</option>
                <option value="one-to-many">One-to-many</option>
                <option value="many-to-many">Many-to-many</option>
              </select>
            </Field>
          </div>
        </ItemCard>
      ))}
    </SectionCard>
  );
}

function BuildPhasesSection({
  phases,
  onChange,
}: {
  phases: ProjectPlan["buildPhases"];
  onChange: (phases: ProjectPlan["buildPhases"]) => void;
}) {
  return (
    <SectionCard title="Build Phases" description="Break the work into practical milestones." onAdd={() => onChange([...phases, emptyBuildPhase()])}>
      {phases.map((phase, phaseIndex) => (
        <ItemCard key={`${phase.name}-${phaseIndex}`} onRemove={() => onChange(removeAt(phases, phaseIndex))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={phase.name} onChange={(event) => onChange(replaceAt(phases, phaseIndex, { ...phase, name: event.target.value }))} />
            </Field>
            <Field label="Goal">
              <Input value={phase.goal} onChange={(event) => onChange(replaceAt(phases, phaseIndex, { ...phase, goal: event.target.value }))} />
            </Field>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Tasks</div>
              <Button type="button" variant="outline" size="sm" onClick={() => onChange(replaceAt(phases, phaseIndex, { ...phase, tasks: [...phase.tasks, ""] }))}>
                <Plus className="size-4" /> Add Task
              </Button>
            </div>
            {phase.tasks.map((task, taskIndex) => (
              <div key={`${task}-${taskIndex}`} className="flex gap-2">
                <Input value={task} onChange={(event) => onChange(replaceAt(phases, phaseIndex, { ...phase, tasks: replaceAt(phase.tasks, taskIndex, event.target.value) }))} />
                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onChange(replaceAt(phases, phaseIndex, { ...phase, tasks: removeAt(phase.tasks, taskIndex) }))}>
                  <Trash2 className="size-4" />
                  <span className="sr-only">Remove task</span>
                </Button>
              </div>
            ))}
          </div>
        </ItemCard>
      ))}
    </SectionCard>
  );
}

function RisksSection({
  risks,
  onChange,
}: {
  risks: ProjectPlan["risksEdgeCases"];
  onChange: (risks: ProjectPlan["risksEdgeCases"]) => void;
}) {
  return (
    <SectionCard title="Risks And Edge Cases" description="Track likely pitfalls before implementation." onAdd={() => onChange([...risks, emptyRisk()])}>
      {risks.map((risk, index) => (
        <ItemCard key={`${risk.title}-${index}`} onRemove={() => onChange(removeAt(risks, index))}>
          <Field label="Title">
            <Input value={risk.title} onChange={(event) => onChange(replaceAt(risks, index, { ...risk, title: event.target.value }))} />
          </Field>
          <Field label="Mitigation">
            <Textarea value={risk.mitigation} onChange={(event) => onChange(replaceAt(risks, index, { ...risk, mitigation: event.target.value }))} />
          </Field>
        </ItemCard>
      ))}
    </SectionCard>
  );
}

function EntitySelect({
  value,
  entities,
  onChange,
}: {
  value: string;
  entities: ProjectPlan["dataModel"];
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClassName}>
      <option value="">Select entity</option>
      {entities.map((entity) => (
        <option key={entity.id || entity.name} value={entity.id}>
          {entity.name || entity.id || "Untitled entity"}
        </option>
      ))}
    </select>
  );
}

function SectionCard({
  title,
  description,
  onAdd,
  children,
}: {
  title: string;
  description: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="space-y-1.5">
          <div className="micro-label">Plan section</div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {children || <div className="blueprint-surface rounded-[1.1rem] border border-dashed p-4 text-sm text-muted-foreground">No cards yet. Add one or generate this section.</div>}
      </CardContent>
    </Card>
  );
}

function ItemCard({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <div className="space-y-4 rounded-[1.1rem] border bg-background/30 p-4 shadow-inner shadow-black/5 backdrop-blur">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="size-4" /> Remove
        </Button>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("space-y-2", className)}>
      <span className="block text-sm font-medium">{label}</span>
      {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
      {children}
    </label>
  );
}

function createEmptyPlan(): ProjectPlan {
  return {
    appName: "",
    appSummary: "",
    targetUsers: [],
    coreFeatures: [],
    recommendedTechStack: [],
    pagesRoutes: [],
    dataModel: [],
    relationships: [],
    buildPhases: [],
    risksEdgeCases: [],
    starterPrompt: "",
  };
}

function normalizeProjectPlan(value: Partial<ProjectPlan>): ProjectPlan {
  return {
    appName: asString(value.appName),
    appSummary: asString(value.appSummary),
    targetUsers: asStringArray(value.targetUsers),
    coreFeatures: Array.isArray(value.coreFeatures)
      ? value.coreFeatures.map((feature) => ({
          name: asString(feature?.name),
          description: asString(feature?.description),
          priority: feature?.priority === "nice-to-have" ? "nice-to-have" : "must-have",
        }))
      : [],
    recommendedTechStack: Array.isArray(value.recommendedTechStack)
      ? value.recommendedTechStack.map((item) => ({
          category: asString(item?.category),
          recommendation: asString(item?.recommendation),
          reason: asString(item?.reason),
        }))
      : [],
    pagesRoutes: Array.isArray(value.pagesRoutes)
      ? value.pagesRoutes.map((route) => ({
          path: asString(route?.path),
          name: asString(route?.name),
          purpose: asString(route?.purpose),
        }))
      : [],
    dataModel: Array.isArray(value.dataModel)
      ? value.dataModel.map((entity) => ({
          id: asString(entity?.id),
          name: asString(entity?.name),
          description: asString(entity?.description),
          fields: Array.isArray(entity?.fields)
            ? entity.fields.map((field) => ({
                name: asString(field?.name),
                type: asString(field?.type),
                required: Boolean(field?.required),
                notes: typeof field?.notes === "string" ? field.notes : "",
              }))
            : [],
        }))
      : [],
    relationships: Array.isArray(value.relationships)
      ? value.relationships.map((relationship) => ({
          fromEntityId: asString(relationship?.fromEntityId),
          toEntityId: asString(relationship?.toEntityId),
          label: asString(relationship?.label),
          cardinality:
            relationship?.cardinality === "one-to-one" || relationship?.cardinality === "many-to-many"
              ? relationship.cardinality
              : "one-to-many",
        }))
      : [],
    buildPhases: Array.isArray(value.buildPhases)
      ? value.buildPhases.map((phase) => ({
          name: asString(phase?.name),
          goal: asString(phase?.goal),
          tasks: asStringArray(phase?.tasks),
        }))
      : [],
    risksEdgeCases: Array.isArray(value.risksEdgeCases)
      ? value.risksEdgeCases.map((risk) => ({
          title: asString(risk?.title),
          mitigation: asString(risk?.mitigation),
        }))
      : [],
    starterPrompt: asString(value.starterPrompt),
  };
}

function emptyFeature(): ProjectPlan["coreFeatures"][number] {
  return { name: "", description: "", priority: "must-have" };
}

function emptyTechStackItem(): ProjectPlan["recommendedTechStack"][number] {
  return { category: "", recommendation: "", reason: "" };
}

function emptyRoute(): ProjectPlan["pagesRoutes"][number] {
  return { path: "/", name: "", purpose: "" };
}

function emptyEntity(): ProjectPlan["dataModel"][number] {
  return { id: `entity-${Date.now().toString(36)}`, name: "", description: "", fields: [] };
}

function emptyEntityField(): ProjectPlan["dataModel"][number]["fields"][number] {
  return { name: "", type: "string", required: false, notes: "" };
}

function emptyRelationship(entities: ProjectPlan["dataModel"]): ProjectPlan["relationships"][number] {
  return {
    fromEntityId: entities[0]?.id ?? "",
    toEntityId: entities[1]?.id ?? entities[0]?.id ?? "",
    label: "",
    cardinality: "one-to-many",
  };
}

function emptyBuildPhase(): ProjectPlan["buildPhases"][number] {
  return { name: "", goal: "", tasks: [] };
}

function emptyRisk(): ProjectPlan["risksEdgeCases"][number] {
  return { title: "", mitigation: "" };
}

function replaceAt<Item>(items: Item[], index: number, item: Item) {
  return items.map((current, currentIndex) => (currentIndex === index ? item : current));
}

function removeAt<Item>(items: Item[], index: number) {
  return items.filter((_, currentIndex) => currentIndex !== index);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(asString) : [];
}
