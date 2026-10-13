/**
 * KnowledgeView — vue de graphe de connaissances (cat. 2.11, 4.11).
 *
 * Étape 2 (muet) : reçoit `KnowledgeViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.11) :
 * - `KnowledgeCanvas` (zone principale : nœuds + arêtes, interaction)
 * - `KnowledgeNode` (nœud individuel, avec badge de type)
 * - `KnowledgeEdge` (arête, avec libellé optionnel)
 * - `NodeCreateMenu` (menu de création de nœud)
 * - `NodeInspector` (panneau latéral : détails du nœud sélectionné)
 * - `KnowledgeSearch` (recherche de nœuds)
 * - `GraphLayoutMenu` (choix de layout : force / tree / circular / grid)
 * - `GraphMiniMap` (miniature du graphe)
 * - `GraphInspectorPanel` (panneau global : stats, filtrage)
 * - `GraphListFallback` (repli liste si le graphe est vide)
 *
 * Le canvas lui-même est fourni par le parent (WebGL / SVG) ; ce composant
 * est le conteneur visuel qui structure l'UI autour.
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type KnowledgeNodeType =
  | "concept"
  | "person"
  | "organisation"
  | "event"
  | "location"
  | "document"
  | "custom";

export const NODE_TYPE_ICONS: Record<KnowledgeNodeType, IconKey> = {
  concept: "insight",
  person: "success",
  organisation: "project",
  event: "calendar",
  location: "chart",
  document: "file",
  custom: "tool",
};

export const NODE_TYPE_LABELS: Record<KnowledgeNodeType, string> = {
  concept: "Concept",
  person: "Personne",
  organisation: "Organisation",
  event: "Événement",
  location: "Lieu",
  document: "Document",
  custom: "Autre",
};

export interface KnowledgeNodeData {
  id: string;
  label: string;
  type: KnowledgeNodeType;
  /** Position (0-1) si layout statique, sinon undefined (auto). */
  x?: number;
  y?: number;
  /** Taille relative (1-3). */
  size?: number;
  /** Couleur d'accent. */
  color?: string;
  /** Description courte. */
  description?: string;
}

export interface KnowledgeEdgeData {
  id: string;
  from: string;
  to: string;
  /** Libellé de la relation. */
  label?: string;
  /** Type de relation (ex. "est parent de", "a contribué à"). */
  relation?: string;
  /** Direction : bidirectionnelle si false. */
  directed?: boolean;
  /** Couleur d'accent. */
  color?: string;
}

export type GraphLayout = "force" | "tree" | "circular" | "grid";

export interface KnowledgeViewData {
  title: string;
  description?: string;
  nodes: KnowledgeNodeData[];
  edges: KnowledgeEdgeData[];
  /** Layout courant. */
  layout: GraphLayout;
  /** Nœud sélectionné (id). */
  selectedNodeId?: string | null;
  /** Recherche courante. */
  searchQuery?: string;
}

export interface KnowledgeViewProps {
  data: KnowledgeViewData;
  onSelectNode: (nodeId: string | null) => void;
  onLayoutChange: (layout: GraphLayout) => void;
  onSearch: (query: string) => void;
  onCreateNode?: (type: KnowledgeNodeType) => void;
  onEditNode?: (node: KnowledgeNodeData) => void;
  onCreateEdge?: (from: string, to: string, relation: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  /** Conteneur du canvas (fourni par le parent). */
  canvasChildren?: React.ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* KnowledgeNode                                                       */
/* ------------------------------------------------------------------ */

export interface KnowledgeNodeProps {
  node: KnowledgeNodeData;
  selected?: boolean;
  onSelect?: (id: string) => void;
  /** Rendu custom (le canvas fourni par le parent gère la position). */
  children?: React.ReactNode;
  className?: string;
}

export function KnowledgeNode({
  node,
  selected,
  onSelect,
  children,
  className,
}: KnowledgeNodeProps) {
  const icon = NODE_TYPE_ICONS[node.type];
  const sizeClass =
    node.size === 3 ? "size-12" : node.size === 2 ? "size-10" : "size-8";
  return (
    <button
      type="button"
      data-slot="knowledge-node"
      data-node-id={node.id}
      data-type={node.type}
      data-selected={selected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(node.id);
      }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-2 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "hover:border-muted-foreground/40",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          sizeClass
        )}
        style={{
          backgroundColor: node.color ? `${node.color}20` : undefined,
          borderColor: node.color,
        }}
      >
        <AppIcon
          name={icon}
          size={node.size === 3 ? "md" : "sm"}
          tone="muted"
          aria-hidden
        />
      </div>
      {children ?? (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{node.label}</p>
          <p className="text-[10px] text-muted-foreground">
            {NODE_TYPE_LABELS[node.type]}
          </p>
        </div>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* KnowledgeEdge                                                       */
/* ------------------------------------------------------------------ */

export interface KnowledgeEdgeProps {
  edge: KnowledgeEdgeData;
  fromNode?: KnowledgeNodeData;
  toNode?: KnowledgeNodeData;
  className?: string;
}

export function KnowledgeEdge({
  edge,
  fromNode,
  toNode,
  className,
}: KnowledgeEdgeProps) {
  if (!fromNode || !toNode) return null;
  return (
    <div
      data-slot="knowledge-edge"
      data-edge-id={edge.id}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-1.5 text-xs",
        className
      )}
      style={{ borderColor: edge.color ? `${edge.color}40` : undefined }}
    >
      <span className="truncate font-medium">{fromNode.label}</span>
      <span
        className="shrink-0 text-muted-foreground"
        aria-hidden
      >
        {edge.directed === false ? "↔" : "→"}
      </span>
      {edge.label && (
        <span className="shrink-0 text-muted-foreground italic">
          {edge.label}
        </span>
      )}
      <span className="truncate font-medium">{toNode.label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NodeCreateMenu                                                      */
/* ------------------------------------------------------------------ */

export interface NodeCreateMenuProps {
  onCreate: (type: KnowledgeNodeType) => void;
  className?: string;
}

export function NodeCreateMenu({
  onCreate,
  className,
}: NodeCreateMenuProps) {
  const [open, setOpen] = React.useState(false);
  const types = Object.keys(NODE_TYPE_LABELS) as KnowledgeNodeType[];
  return (
    <div
      data-slot="node-create-menu"
      className={cn("relative", className)}
    >
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setOpen((o) => !o)}
      >
        <AppIcon name="task" size="xs" aria-hidden />
        Nouveau nœud
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 flex w-40 flex-col gap-0.5 rounded-md border bg-card p-1 shadow-lg">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onCreate(t);
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
            >
              <AppIcon name={NODE_TYPE_ICONS[t]} size="xs" aria-hidden />
              {NODE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NodeInspector                                                       */
/* ------------------------------------------------------------------ */

export interface NodeInspectorProps {
  node: KnowledgeNodeData | null;
  /** Arêtes connectées à ce nœud. */
  connectedEdges: KnowledgeEdgeData[];
  allNodes: KnowledgeNodeData[];
  onEdit?: (node: KnowledgeNodeData) => void;
  onRemove?: (nodeId: string) => void;
  onClose?: () => void;
  className?: string;
}

export function NodeInspector({
  node,
  connectedEdges,
  allNodes,
  onEdit,
  onRemove,
  onClose,
  className,
}: NodeInspectorProps) {
  if (!node) return null;

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  return (
    <Card
      data-slot="node-inspector"
      className={cn("flex flex-col gap-3", className)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <AppIcon
            name={NODE_TYPE_ICONS[node.type]}
            size="md"
            tone="muted"
            aria-hidden
          />
          <div>
            <CardTitle className="text-sm">{node.label}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {NODE_TYPE_LABELS[node.type]}
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-6"
            onClick={onClose}
            aria-label="Fermer"
          >
            <AppIcon name="retry" size="xs" className="rotate-45" aria-hidden />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {node.description && (
          <p className="text-sm text-muted-foreground">{node.description}</p>
        )}
        {connectedEdges.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Relations ({connectedEdges.length})
            </p>
            {connectedEdges.map((edge) => {
              const otherId = edge.from === node.id ? edge.to : edge.from;
              const other = nodeMap.get(otherId);
              if (!other) return null;
              return (
                <div
                  key={edge.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="shrink-0 text-muted-foreground">
                    {edge.directed === false ? "↔" : "→"}
                  </span>
                  {edge.label && (
                    <span className="text-muted-foreground italic">
                      {edge.label}
                    </span>
                  )}
                  <span className="truncate font-medium">
                    {other.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2 border-t pt-3">
          {onEdit && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEdit(node)}>
              Modifier
            </Button>
          )}
          {onRemove && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onRemove(node.id)}
            >
              Supprimer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* KnowledgeSearch                                                     */
/* ------------------------------------------------------------------ */

export interface KnowledgeSearchProps {
  value: string;
  onChange: (query: string) => void;
  /** Résultats de recherche (ids des nœuds). */
  results?: string[];
  className?: string;
}

export function KnowledgeSearch({
  value,
  onChange,
  results,
  className,
}: KnowledgeSearchProps) {
  return (
    <div
      data-slot="knowledge-search"
      className={cn("relative", className)}
    >
      <AppIcon
        name="open"
        size="xs"
        tone="muted"
        className="absolute left-2.5 top-1/2 -translate-y-1/2"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher un nœud…"
        className="h-8 pl-7 text-sm"
      />
      {results && results.length > 0 && (
        <Badge variant="outline" className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">
          {results.length} résultat{results.length > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GraphLayoutMenu                                                     */
/* ------------------------------------------------------------------ */

export const LAYOUT_LABELS: Record<GraphLayout, string> = {
  force: "Force",
  tree: "Arbre",
  circular: "Circulaire",
  grid: "Grille",
};

export interface GraphLayoutMenuProps {
  value: GraphLayout;
  onChange: (l: GraphLayout) => void;
  className?: string;
}

export function GraphLayoutMenu({
  value,
  onChange,
  className,
}: GraphLayoutMenuProps) {
  const layouts: GraphLayout[] = ["force", "tree", "circular", "grid"];
  return (
    <div
      data-slot="graph-layout-menu"
      className={cn("flex items-center gap-1 rounded-md border p-0.5", className)}
      role="radiogroup"
      aria-label="Layout du graphe"
    >
      {layouts.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={value === l}
          onClick={() => onChange(l)}
          className={cn(
            "rounded px-2 py-0.5 text-xs transition-colors",
            value === l
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {LAYOUT_LABELS[l]}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GraphMiniMap                                                        */
/* ------------------------------------------------------------------ */

export interface GraphMiniMapProps {
  nodes: KnowledgeNodeData[];
  /** Position du viewport dans le graphe (0-1, 4 valeurs). */
  viewport?: { x: number; y: number; w: number; h: number };
  onSelectNode?: (id: string) => void;
  className?: string;
}

export function GraphMiniMap({
  nodes,
  viewport,
  onSelectNode,
  className,
}: GraphMiniMapProps) {
  return (
    <div
      data-slot="graph-minimap"
      className={cn(
        "relative size-32 overflow-hidden rounded-md border bg-muted/30",
        className
      )}
      role="img"
      aria-label="Minicarte du graphe"
    >
      {nodes.map((n) => {
        const left = (n.x ?? 0.5) * 100;
        const top = (n.y ?? 0.5) * 100;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelectNode?.(n.id)}
            className="absolute size-1.5 rounded-full transition-transform hover:scale-150"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: n.color ?? "hsl(var(--primary))",
            }}
            aria-label={n.label}
          />
        );
      })}
      {viewport && (
        <div
          className="absolute border-2 border-primary/60 bg-primary/10"
          style={{
            left: `${viewport.x * 100}%`,
            top: `${viewport.y * 100}%`,
            width: `${viewport.w * 100}%`,
            height: `${viewport.h * 100}%`,
          }}
          aria-hidden
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GraphInspectorPanel                                                 */
/* ------------------------------------------------------------------ */

export interface GraphInspectorPanelProps {
  nodeCount: number;
  edgeCount: number;
  /** Types présents. */
  typeCounts: Record<KnowledgeNodeType, number>;
  onFilterType?: (type: KnowledgeNodeType | null) => void;
  activeFilter?: KnowledgeNodeType | null;
  className?: string;
}

export function GraphInspectorPanel({
  nodeCount,
  edgeCount,
  typeCounts,
  onFilterType,
  activeFilter,
  className,
}: GraphInspectorPanelProps) {
  const types = Object.keys(typeCounts) as KnowledgeNodeType[];
  return (
    <Card data-slot="graph-inspector-panel" className={cn("gap-2.5", className)}>
      <CardHeader className="space-y-0">
        <CardTitle className="text-sm">Graphe</CardTitle>
        <p className="text-xs text-muted-foreground">
          {nodeCount} nœuds · {edgeCount} relations
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {onFilterType && (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onFilterType(null)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                activeFilter === null
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground"
              )}
            >
              Tous
            </button>
            {types.map((t) =>
              typeCounts[t] > 0 ? (
                <button
                  key={t}
                  type="button"
                  onClick={() => onFilterType(t)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                    activeFilter === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {NODE_TYPE_LABELS[t]} ({typeCounts[t]})
                </button>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* GraphListFallback                                                   */
/* ------------------------------------------------------------------ */

export interface GraphListFallbackProps {
  nodes: KnowledgeNodeData[];
  onSelectNode?: (id: string) => void;
  className?: string;
}

export function GraphListFallback({
  nodes,
  onSelectNode,
  className,
}: GraphListFallbackProps) {
  return (
    <div
      data-slot="graph-list-fallback"
      className={cn("flex flex-col gap-1.5", className)}
    >
      {nodes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
          <AppIcon name="insight" size="lg" tone="muted" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Aucun nœud dans ce graphe
          </p>
        </div>
      ) : (
        nodes.map((n) => (
          <KnowledgeNode key={n.id} node={n} onSelect={onSelectNode} />
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function KnowledgeView({
  data,
  onSelectNode,
  onLayoutChange,
  onSearch,
  onCreateNode,
  onEditNode,
  /* onCreateEdge, */
  onRemoveNode,
  canvasChildren,
  className,
}: KnowledgeViewProps) {
  const selectedNode = data.selectedNodeId
    ? data.nodes.find((n) => n.id === data.selectedNodeId) ?? null
    : null;

  const connectedEdges = selectedNode
    ? data.edges.filter(
        (e) => e.from === selectedNode.id || e.to === selectedNode.id
      )
    : [];

  const typeCounts = React.useMemo(() => {
    const counts = {} as Record<KnowledgeNodeType, number>;
    for (const t of Object.keys(NODE_TYPE_LABELS) as KnowledgeNodeType[]) {
      counts[t] = 0;
    }
    for (const n of data.nodes) {
      counts[n.type] = (counts[n.type] ?? 0) + 1;
    }
    return counts;
  }, [data.nodes]);

  return (
    <div
      data-slot="knowledge-view"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-2">
        <KnowledgeSearch
          value={data.searchQuery ?? ""}
          onChange={onSearch}
          className="flex-1 min-w-40"
        />
        <GraphLayoutMenu value={data.layout} onChange={onLayoutChange} />
        {onCreateNode && (
          <NodeCreateMenu onCreate={onCreateNode} />
        )}
      </div>

      {/* Zone principale : canvas + panneaux */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Canvas */}
        <div
          data-slot="knowledge-canvas"
          className="relative flex min-h-64 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/20"
        >
          {canvasChildren ?? (
            <div className="flex flex-col items-center gap-2 text-center">
              <AppIcon name="insight" size="lg" tone="muted" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {data.nodes.length === 0
                  ? "Aucun nœud — utilisez le menu pour créer le premier"
                  : `Graphe de ${data.nodes.length} nœuds`}
              </p>
              {data.nodes.length > 0 && (
                <GraphListFallback
                  nodes={data.nodes.slice(0, 20)}
                  onSelectNode={onSelectNode}
                />
              )}
            </div>
          )}

          {/* Minicarte */}
          {data.nodes.length > 0 && (
            <div className="absolute bottom-3 right-3">
              <GraphMiniMap
                nodes={data.nodes}
                onSelectNode={onSelectNode}
              />
            </div>
          )}
        </div>

        {/* Panneaux latéraux */}
        <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
          <GraphInspectorPanel
            nodeCount={data.nodes.length}
            edgeCount={data.edges.length}
            typeCounts={typeCounts}
          />
          {selectedNode && (
            <NodeInspector
              node={selectedNode}
              connectedEdges={connectedEdges}
              allNodes={data.nodes}
              onEdit={onEditNode}
              onRemove={onRemoveNode}
              onClose={() => onSelectNode(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
