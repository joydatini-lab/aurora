/**
 * @aurora/ui — AD-10 renderer contracts (DEF) + 4 DS data components.
 * Apps import from `@aurora/ui`, never the engines (AD-1 boundary, CI).
 */

export type {
  TreeRelation,
  RenderSemanticNode,
  RenderSemanticEdge,
  RenderSemanticBridge,
  SemanticTreeRendererProps,
  InfographicSpec,
  InfographicRendererProps,
  DataVisualizationRendererProps,
  MathRendererProps,
  MathRenderError,
  AnimationController,
  RevealKey,
  AnimationSlotProps,
  DataTableColumn,
  DataTableProps,
  TimelineEvent,
  TimelineProps,
  GanttRowProps,
  StatTileProps,
  CalendarBlockType,
  RenderCalendarEvent,
  CalendarViewName,
  CalendarViewProps,
  DayCellContentArg,
  AgGridColumnDef,
  AgGridTableProps,
  NodeState,
  SourceRef,
} from "./contracts";
export type { ChartSpec } from "src/themes/types";
export {
  createSemanticTreeRenderer,
  createInfographicRenderer,
  createDataVisualizationRenderer,
  createMathRenderer,
} from "./contracts";

// Engine implementations (React components — the AD-10 DEF side).
export { SemanticTreeRenderer } from "./SemanticTreeRenderer";
export { InfographicRenderer } from "./InfographicRenderer";
export {
  DataVisualizationRenderer,
  type DataVisualizationRendererProps as DataVizProps,
} from "./DataVisualizationRenderer";
export { MathRenderer } from "./MathRenderer";
export {
  AnimationSlot,
  createAnimationController,
} from "./AnimationController";

// 4 DS data components (05 S3.6 DEF selection).
// NOTE: relative specifiers, like the CalendarView/AgGridTable exports below.
// The `src/*` alias lives in packages/ui/tsconfig.paths.json, which only applies
// to a typecheck run FROM packages/ui — any consumer that pulls this file into
// its own program (apps/mobile, apps/server) failed with TS2307 on these five.
export { DataTable } from "../components/ui/DataTable";
export { KeyValueList } from "../components/ui/KeyValueList";
export { Timeline } from "../components/ui/Timeline";
export { GanttRow } from "../components/ui/GanttRow";
export { StatTile } from "../components/ui/StatTile";

// Calendar (FullCalendar) + data grid (AG Grid) — docs/ui-libraries.md §1.
export { CalendarView } from "../components/ui/CalendarView";
export { AgGridTable } from "../components/ui/AgGridTable";
