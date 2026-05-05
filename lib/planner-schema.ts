import { z } from "zod";

export const featureSchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: z.enum(["must-have", "nice-to-have"]),
});

export const techStackItemSchema = z.object({
  category: z.string(),
  recommendation: z.string(),
  reason: z.string(),
});

export const pageRouteSchema = z.object({
  path: z.string(),
  name: z.string(),
  purpose: z.string(),
});

export const entityFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  notes: z.string().optional(),
});

export const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  fields: z.array(entityFieldSchema),
});

export const relationshipSchema = z.object({
  fromEntityId: z.string(),
  toEntityId: z.string(),
  label: z.string(),
  cardinality: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
});

export const buildPhaseSchema = z.object({
  name: z.string(),
  goal: z.string(),
  tasks: z.array(z.string()),
});

export const riskSchema = z.object({
  title: z.string(),
  mitigation: z.string(),
});

export const projectPlanSchema = z.object({
  appName: z.string(),
  appSummary: z.string(),
  targetUsers: z.array(z.string()),
  coreFeatures: z.array(featureSchema),
  recommendedTechStack: z.array(techStackItemSchema),
  pagesRoutes: z.array(pageRouteSchema),
  dataModel: z.array(entitySchema),
  relationships: z.array(relationshipSchema),
  buildPhases: z.array(buildPhaseSchema),
  risksEdgeCases: z.array(riskSchema),
  starterPrompt: z.string(),
});

export const plannerRequestSchema = z.object({
  idea: z.string().trim().min(1, "Enter an app idea before generating a brief."),
  draft: projectPlanSchema.optional(),
});

export const plannerDraftSchema = z.object({
  version: z.literal(1),
  idea: z.string(),
  plan: projectPlanSchema.nullable(),
  updatedAt: z.string(),
});

export const plannerSectionSchemas = {
  coreFeatures: z.array(featureSchema),
  recommendedTechStack: z.array(techStackItemSchema),
  pagesRoutes: z.array(pageRouteSchema),
  dataModel: z.array(entitySchema),
  relationships: z.array(relationshipSchema),
  buildPhases: z.array(buildPhaseSchema),
  risksEdgeCases: z.array(riskSchema),
} satisfies Record<string, z.ZodType>;

export type ProjectPlan = z.infer<typeof projectPlanSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type PlannerDraft = z.infer<typeof plannerDraftSchema>;
