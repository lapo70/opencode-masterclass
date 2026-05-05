"use client";

import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";

import type { Entity, Relationship } from "@/lib/planner-schema";

type DataModelGraphProps = {
  entities: Entity[];
  relationships: Relationship[];
};

export function DataModelGraph({ entities, relationships }: DataModelGraphProps) {
  const entityIds = new Set(entities.map((entity) => entity.id));
  const nodes: Node[] = entities.map((entity, index) => ({
    id: entity.id,
    position: {
      x: (index % 3) * 300,
      y: Math.floor(index / 3) * 220,
    },
    data: {
      label: (
        <div className="min-w-56 rounded-[1rem] border border-accent/25 bg-card/90 p-3.5 text-left shadow-xl shadow-black/20 backdrop-blur">
          <div className="font-display text-base font-bold leading-none text-card-foreground">{entity.name || entity.id}</div>
          <div className="mt-1 text-xs text-muted-foreground">{entity.description}</div>
          <div className="mt-3 space-y-1 rounded-xl border bg-background/35 p-2 font-mono text-[11px] text-muted-foreground">
            {entity.fields.slice(0, 5).map((field) => (
              <div key={`${entity.id}-${field.name}`}>
                {field.name}: {field.type}{field.required ? " *" : ""}
              </div>
            ))}
            {entity.fields.length > 5 ? <div>+ {entity.fields.length - 5} more fields</div> : null}
          </div>
        </div>
      ),
    },
  }));

  const edges: Edge[] = relationships.flatMap((relationship, index) => {
    if (!entityIds.has(relationship.fromEntityId) || !entityIds.has(relationship.toEntityId)) {
      return [];
    }

    return [
      {
        id: `${relationship.fromEntityId}-${relationship.toEntityId}-${index}`,
        source: relationship.fromEntityId,
        target: relationship.toEntityId,
        label: `${relationship.label} (${relationship.cardinality})`,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: "smoothstep",
      },
    ];
  });

  if (entities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-[1.1rem] border border-dashed bg-background/30 p-6 text-center text-sm text-muted-foreground backdrop-blur">
        Generate or edit a data model to render the relationship graph.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      minZoom={0.4}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ style: { stroke: "var(--accent)", strokeWidth: 2 } }}
    >
      <Background color="var(--accent)" gap={26} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
