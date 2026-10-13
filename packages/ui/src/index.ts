/**
 * @aurora/ui — Design System: tokens, shadcn/ui components, AD-10 renderer
 * implementations, themes JSON SSoT (AD-17, G-M5).
 *
 * Consumes @aurora/domain types (AD-15 SSoT); vendors only where AD-1
 * allows (AD-10 engines + UI libraries per docs/ui-libraries.md).
 *
 * shadcn/ui components live in src/components/ui/ (headless Radix +
 * Tailwind, fully skinnable via the Aurora CSS variables —
 * docs/ui-libraries.md §4).
 */

// --- Theme system (AD-17, 05 §5 v2) ---------------------------------------
export * from "./themes/types";
export { THEMES, PRESETS, THEME_CATALOG } from "./themes/index";
export { NEUTRAL_STYLES } from "./themes/neutral";
export {
  IMAGE_THEMES,
  IMAGE_THEME_FILES,
  getImageTheme,
  resolveImageThemeFile,
  type ImageThemeEntry,
  type ImageThemeOrientation,
  type ImageThemeSlug,
} from "./themes/image-themes";
export {
  resolveToken,
  resolveThemeCSSVars,
  toShadcnVars,
  accentInk,
  contrastRatio,
  hexLuminance,
  gradientCSS,
} from "./themes/resolve";
export {
  AuroraThemeProvider,
  useAuroraTheme,
  useReducedMotion,
  type AuroraThemeProviderProps,
  type AuroraThemeContextValue,
} from "./theme/provider";

// --- shadcn/ui components (docs/ui-libraries.md §1/§2) --------------------
export * from "./components/ui/accordion";
export * from "./components/ui/alert";
export * from "./components/ui/alert-dialog";
export * from "./components/ui/avatar";
export * from "./components/ui/badge";
export * from "./components/ui/breadcrumb";
export * from "./components/ui/button";
export * from "./components/ui/card";
export {
  AuroraCard,
  AuroraCardHeader,
  AuroraCardBadge,
  AuroraCardProgress,
  AuroraCardValue,
  AuroraCardActions,
  AuroraCardFooter,
  AuroraCardCover,
  type AuroraCardProps,
  type CardVariant,
  type CardState,
  type CardSize,
} from "./components/ui/aurora-card";
export * from "./components/ui/checkbox";
export * from "./components/ui/command";
export * from "./components/ui/context-menu";
export * from "./components/ui/dialog";
export * from "./components/ui/drawer";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/form";
export * from "./components/ui/hover-card";
export * from "./components/ui/input";
export * from "./components/ui/kbd";
export * from "./components/ui/label";
export * from "./components/ui/menubar";
export * from "./components/ui/pagination";
export * from "./components/ui/popover";
export * from "./components/ui/progress";
export * from "./components/ui/radio-group";
export * from "./components/ui/scroll-area";
export * from "./components/ui/select";
export * from "./components/ui/separator";
export * from "./components/ui/sheet";
export * from "./components/ui/sidebar";
export * from "./components/ui/skeleton";
export * from "./components/ui/slider";
export * from "./components/ui/switch";
export * from "./components/ui/table";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/toast";
export * from "./components/ui/toaster";
export * from "./components/ui/tooltip";

// --- Composants maison — catalogue UI/UX (21 modules)
export { AppIcon, type AppIconProps, type IconKey } from "./components/ui/AppIcon";
export { Message, MessageAttachment, type MessageProps, type MessageVariant } from "./components/ui/Message";
export { AudioPlayer, type AudioPlayerProps } from "./components/ui/AudioPlayer";
export {
  TimerDisplay,
  TimerControls,
  useTimer,
  formatTimerSeconds,
  type TimerDisplayProps,
  type TimerControlsProps,
  type TimerMode,
} from "./components/ui/Timer";
export { FileDropzone, type FileDropzoneProps } from "./components/ui/FileDropzone";
export {
  F2ChartAdapter,
  type F2ChartKind,
  type MetricPoint,
  type F2ChartAdapterProps,
} from "./components/ui/F2ChartAdapter";
export {
  AgentResponseRenderer,
  ResponseSectionHeader,
  SummaryCard,
  MetricGrid,
  ComparisonTable,
  CitationCard,
  ToolStatusCard,
  ApprovalCard,
  CodeArtifactBlock,
  WarningCallout,
  SuggestedActionChips,
  type AgentBlock,
} from "./components/ui/AgentResponseRenderer";
export { useFileUpload, type FileWithPreview, type FileUploadOptions } from "./hooks/use-file-upload";

// --- Composites muets (Étape 2) — 21 modules, props in / events out -------
// Pas de store, pas d'API : les conteneurs DDD (Étape 4) alimentent ces
// composants et en captent les événements. Aliases `Composite*` là où le
// nom entre en collision avec un composant ReUI (ex. KanbanColumn).
export { PageHeader, type PageHeaderProps } from "./components/composites/PageHeader";
export {
  PriorityFlag,
  priorityToLevel,
  type PriorityFlagProps,
  type PriorityLevel,
} from "./components/composites/PriorityFlag";
export {
  TaskCard,
  type TaskCardProps,
  type TaskCardData,
} from "./components/composites/TaskCard";
export {
  TaskRow,
  type TaskRowProps,
} from "./components/composites/TaskRow";
export {
  TaskFilterBar,
  type TaskFilterBarProps,
  type TaskFilter,
} from "./components/composites/TaskFilterBar";
export {
  EisenhowerMatrix,
  type EisenhowerMatrixProps,
  type QuadrantId,
} from "./components/composites/EisenhowerMatrix";
export {
  TaskInspector,
  type TaskInspectorProps,
} from "./components/composites/TaskInspector";
export {
  TodayFocusPanel,
  type TodayFocusPanelProps,
} from "./components/composites/TodayFocusPanel";
export {
  KanbanColumn as CompositeKanbanColumn,
  type KanbanColumnProps as CompositeKanbanColumnProps,
  type KanbanColumnData as CompositeKanbanColumnData,
} from "./components/composites/KanbanColumn";
export {
  EventCard,
  type EventCardProps,
  type EventCardData,
} from "./components/composites/EventCard";
export {
  DateNavigator,
  type DateNavigatorProps,
  type DatePeriod,
  PERIOD_LABELS,
} from "./components/composites/DateNavigator";
export {
  FocusWorkspace,
  FocusModeSwitch,
  PomodoroPhaseRail,
  DurationPresetPicker,
  FocusStatsRow,
  type FocusWorkspaceProps,
  type FocusMode,
  type PomodoroPhase,
  type FocusModeSwitchProps,
  type PomodoroPhaseRailProps,
  type DurationPresetPickerProps,
  type FocusStatsRowProps,
} from "./components/composites/FocusWorkspace";
export {
  SoundPickerSheet,
  type SoundPickerSheetProps,
  type SoundItem,
} from "./components/composites/SoundPickerSheet";
export {
  AscentCard,
  type AscentCardProps,
  type AscentCardData,
  type AscentCardType,
  type AscentAction,
  type DepthLevel,
  type SourceType,
} from "./components/composites/AscentCard";
export {
  AscentFeed,
  AscentProgressHeader,
  AscentFilters,
  NextCardPreview,
  SavedItemsList,
  FeedbackControl,
  type AscentFeedProps,
  type AscentFilter,
  type AscentFilterKey,
  type AscentProgressHeaderProps,
  type AscentFiltersProps,
  type NextCardPreviewProps,
  type SavedItemsListProps,
  type FeedbackControlProps,
} from "./components/composites/AscentFeed";
export {
  CountdownCard,
  CountdownStatusBadge,
  CountdownDaysLabel,
  countdownDaysLabel,
  type CountdownCardProps,
  type CountdownData,
  type CountdownStatus,
} from "./components/composites/CountdownCard";
export {
  CountdownPageHeader,
  type CountdownPageHeaderProps,
  type CountdownTab,
  COUNTDOWN_TABS,
} from "./components/composites/CountdownPageHeader";
export {
  HabitsView,
  HabitRow,
  HabitCompletionToggle,
  HabitStreakBadge,
  SevenDayBand,
  type HabitsViewProps,
  type HabitsViewData,
  type HabitItem,
  type HabitDayData,
  type HabitCompletionState,
  type HabitFrequency,
  type HabitRowProps,
  type HabitCompletionToggleProps,
  type SevenDayBandProps,
} from "./components/composites/HabitsView";
export {
  HabitEditorSheet,
  type HabitEditorSheetProps,
  type HabitEditorValues,
} from "./components/composites/HabitEditorSheet";
export {
  ReviewSummaryCards,
  type ReviewSummaryCardsProps,
  type ReviewSummaryData,
} from "./components/composites/ReviewSummaryCards";
export {
  ReviewView,
  CauseChipGroup,
  ReviewBalanceTable,
  ReviewComparisonPanel,
  ActionStepList,
  type ReviewViewProps,
  type ReviewViewData,
  type ReviewPeriod,
  type ReviewRowData,
  type ReviewComparisonData,
  type ReviewCause,
  type ReviewActionStep,
  type CauseChipGroupProps,
  type ReviewBalanceTableProps,
  type ReviewComparisonPanelProps,
  type ActionStepListProps,
} from "./components/composites/ReviewView";
export {
  RetroView,
  RetroHeader,
  MissedMilestoneList,
  BACSummaryRow,
  MiniGanttRow,
  RootCauseEditor,
  RetroActionBoard,
  LessonsLearnedCard,
  type RetroViewProps,
  type RetroViewData,
  type RetroMilestone,
  type RetroMilestoneStatus,
  type BACMetric,
  type RetroRootCause,
  type RetroActionItem,
  type RetroLesson,
  type MissedMilestoneListProps,
  type BACSummaryRowProps,
  type MiniGanttRow as MiniGanttRowData,
  type RootCauseEditorProps,
  type RetroActionBoardProps,
  type LessonsLearnedCardProps,
} from "./components/composites/RetroView";
export {
  LearnView,
  LearnModeCards,
  LearningProgressPanel,
  Flashcard,
  QuizQuestionCard,
  StudySessionControls,
  LEARN_MODES,
  type LearnViewProps,
  type LearnViewData,
  type StudyMode,
  type LearnModeMeta,
  type LearnModeCardsProps,
  type LearningProgressPanelProps,
  type FlashcardData,
  type FlashcardProps,
  type QuizQuestionData,
  type QuizQuestionCardProps,
  type StudySessionControlsProps,
} from "./components/composites/LearnView";
export {
  ProgressView,
  ProgressHeader,
  KPIStatTile,
  MetricSelector,
  ChartFrame,
  ChartDataTable,
  BreakdownTable,
  type ProgressViewProps,
  type ProgressViewData,
  type ProgressPeriod,
  type KPIStat,
  type BreakdownRow,
  type ProgressHeaderProps,
  type MetricSelectorProps,
  type ChartFrameProps,
  type ChartDataTableProps,
  type BreakdownTableProps,
} from "./components/composites/ProgressView";
export {
  KnowledgeView,
  KnowledgeNode,
  KnowledgeEdge,
  NodeCreateMenu,
  NodeInspector,
  KnowledgeSearch,
  GraphLayoutMenu,
  GraphMiniMap,
  GraphInspectorPanel,
  GraphListFallback,
  NODE_TYPE_ICONS,
  NODE_TYPE_LABELS,
  LAYOUT_LABELS,
  type KnowledgeViewProps,
  type KnowledgeViewData,
  type KnowledgeNodeData,
  type KnowledgeNodeProps,
  type KnowledgeEdgeData,
  type KnowledgeEdgeProps,
  type KnowledgeNodeType,
  type GraphLayout,
  type NodeCreateMenuProps,
  type NodeInspectorProps,
  type KnowledgeSearchProps,
  type GraphLayoutMenuProps,
  type GraphMiniMapProps,
  type GraphInspectorPanelProps,
  type GraphListFallbackProps,
} from "./components/composites/KnowledgeView";
export {
  DiscoveryView,
  DiscoveryHeader,
  ProgramCard,
  DiscoveryResultsList,
  SourceReliabilityMeta,
  ReaderLayout,
  ReaderBlock,
  ReaderActionBar,
  SourcePreviewCard,
  SOURCE_KIND_ICONS,
  SOURCE_KIND_LABELS,
  RELIABILITY_LABELS,
  type DiscoveryViewProps,
  type DiscoveryViewData,
  type DiscoveryProgram,
  type DiscoveryResult,
  type SourceReliability,
  type SourceKind,
  type DiscoveryHeaderProps,
  type ProgramCardProps,
  type DiscoveryResultsListProps,
  type SourceReliabilityMetaProps,
  type ReaderLayoutProps,
  type ReaderBlockData,
  type ReaderBlockProps,
  type ReaderActionBarProps,
  type SourcePreviewCardProps,
} from "./components/composites/DiscoveryView";
export {
  SkillsView,
  SkillDomainChip,
  SkillSearchBar,
  SkillCard,
  SkillLevelIndicator,
  SkillEvidenceList,
  SkillPracticeAction,
  SkillComparisonPanel,
  SKILL_DOMAIN_LABELS,
  SKILL_DOMAIN_ICONS,
  type SkillsViewProps,
  type SkillsViewData,
  type SkillDomain,
  type SkillData,
  type SkillEvidence,
  type SkillPractice,
  type SkillDomainChipProps,
  type SkillSearchBarProps,
  type SkillCardProps,
  type SkillLevelIndicatorProps,
  type SkillEvidenceListProps,
  type SkillPracticeActionProps,
  type SkillComparisonPanelProps,
} from "./components/composites/SkillsView";
export {
  AgentView,
  ConversationHeader,
  MessageList,
  UserMessageBubble,
  AssistantMessageBubble,
  StreamingIndicator,
  CitationList,
  ToolRunCard,
  AgentComposer,
  AttachmentTray,
  ModelPickerModal,
  PermissionApprovalDialog,
  type AgentViewProps,
  type AgentViewData,
  type AgentMessage,
  type MessageRole,
  type ToolRunData,
  type ToolRunStatus,
  type MessageCitation,
  type AgentModel,
  type ConversationHeaderProps,
  type MessageListProps,
  type UserMessageBubbleProps,
  type AssistantMessageBubbleProps,
  type StreamingIndicatorProps,
  type CitationListProps,
  type ToolRunCardProps,
  type AgentComposerProps,
  type AttachmentTrayProps,
  type ModelPickerModalProps,
  type PermissionApprovalDialogProps,
} from "./components/composites/AgentView";
export {
  InboxView,
  CaptureComposer,
  CaptureTypeSelector,
  CaptureInboxList,
  CaptureDetailDrawer,
  TriageActionBar,
  BulkTriageToolbar,
  CaptureStatusBadge,
  CAPTURE_TYPE_LABELS,
  CAPTURE_TYPE_ICONS,
  CAPTURE_STATUS_LABELS,
  type InboxViewProps,
  type InboxViewData,
  type CaptureType,
  type CaptureStatus,
  type CaptureData,
  type CaptureComposerProps,
  type CaptureTypeSelectorProps,
  type CaptureInboxListProps,
  type CaptureDetailDrawerProps,
  type TriageActionBarProps,
  type BulkTriageToolbarProps,
} from "./components/composites/InboxView";
export {
  CanvasView,
  CanvasViewSwitch,
  RichTextToolbar,
  SlashCommandMenu,
  TipTapEditorSurface,
  MarkdownSourceEditor,
  HtmlSourceEditor,
  CanvasSyncStatus,
  VersionHistoryPanel,
  CanvasOutline,
  InsertMediaDialog,
  SLASH_COMMANDS,
  SYNC_STATE_LABELS,
  type CanvasViewProps,
  type CanvasViewData,
  type CanvasSyncState,
  type CanvasDocView,
  type CanvasVersion,
  type OutlineItem,
  type CanvasViewSwitchProps,
  type ToolbarAction,
  type RichTextToolbarProps,
  type SlashCommand,
  type SlashCommandMenuProps,
  type TipTapEditorSurfaceProps,
  type SourceEditorProps,
  type VersionHistoryPanelProps,
  type CanvasOutlineProps,
  type InsertMediaDialogProps,
  type MediaKind,
} from "./components/composites/CanvasView";
export {
  IntegrationsView,
  IntegrationDirectory,
  ConnectorRow,
  ConnectorConnectDialog,
  ConnectorSettingsSheet,
  SyncHistoryList,
  DisconnectConfirmationDialog,
  WebhookSecretField,
  AUTH_METHOD_LABELS,
  type IntegrationsViewProps,
  type IntegrationsViewData,
  type ConnectorAuthMethod,
  type ConnectorState,
  type ConnectorData,
  type SyncHistoryItem,
  type IntegrationDirectoryProps,
  type ConnectorRowProps,
  type ConnectorConnectDialogProps,
  type ConnectorSettingsSheetProps,
  type SyncHistoryListProps,
  type DisconnectConfirmationDialogProps,
  type WebhookSecretFieldProps,
} from "./components/composites/IntegrationsView";
export {
  SettingsView,
  ThemeSwatchPicker,
  AppearancePreview,
  ModuleSwitchList,
  SelectControl,
  NotificationPreferences,
  PrivacySettingsPanel,
  KeyboardShortcutsTable,
  AccountSecurityPanel,
  SaveStatus,
  type SettingsViewProps,
  type SettingsViewData,
  type ThemeMode,
  type ThemeSwatch,
  type ModuleToggle,
  type NotificationPref,
  type PrivacySetting,
  type KeyboardShortcut,
  type SessionInfo,
  type AccountSecurityData,
  type ThemeSwatchPickerProps,
  type AppearancePreviewProps,
  type ModuleSwitchListProps,
  type SelectControlProps,
  type NotificationPreferencesProps,
  type PrivacySettingsPanelProps,
  type KeyboardShortcutsTableProps,
  type AccountSecurityPanelProps,
} from "./components/composites/SettingsView";
export {
  OnboardingView,
  AuthShell,
  AuthCard,
  AuthTabs,
  EmailField,
  PasswordField,
  OAuthProviderButton,
  ForgotPasswordFlow,
  VerificationNotice,
  AuthErrorBanner,
  TermsConsent,
  OnboardingProgress,
  WizardStepCard,
  SetupSuccessState,
  OnboardingSummary,
  OAUTH_PROVIDER_LABELS,
  OAUTH_PROVIDER_ICONS,
  type OnboardingViewProps,
  type OnboardingViewData,
  type OnboardingStep,
  type OAuthProvider,
  type AuthShellProps,
  type AuthCardProps,
  type AuthTabsProps,
  type AuthTab,
  type EmailFieldProps,
  type PasswordFieldProps,
  type OAuthProviderButtonProps,
  type ForgotPasswordFlowProps,
  type VerificationNoticeProps,
  type AuthErrorBannerProps,
  type TermsConsentProps,
  type OnboardingProgressProps,
  type WizardStepCardProps,
  type SetupSuccessStateProps,
  type OnboardingSummaryProps,
  type OnboardingSummaryItem,
} from "./components/composites/OnboardingView";
export {
  ArtifactsView,
  ArtifactViewerShell,
  PdfArtifactViewer,
  DocumentArtifactViewer,
  PresentationArtifactViewer,
  SpreadsheetArtifactViewer,
  ImageArtifactViewer,
  AudioArtifactViewer,
  ArtifactMetadataPanel,
  ArtifactProcessingStatus,
  PreviewErrorState,
  UnsupportedPreviewState,
  DownloadButton,
  ArtifactVersionList,
  ArtifactAccessBadge,
  ArtifactTypeIcon,
  FileSizeLabel,
  formatFileSize,
  ARTIFACT_TYPE_ICONS,
  ARTIFACT_TYPE_LABELS,
  PROCESSING_LABELS,
  type ArtifactsViewProps,
  type ArtifactsViewData,
  type ArtifactType,
  type ArtifactAccess,
  type ArtifactProcessingState,
  type ArtifactVersion,
  type ArtifactData,
  type ArtifactViewerShellProps,
  type ArtifactViewerProps,
  type ArtifactMetadataPanelProps,
  type ArtifactProcessingStatusProps,
  type DownloadButtonProps,
  type ArtifactVersionListProps,
} from "./components/composites/ArtifactsView";

// --- Premium effects (Aceternity + Magic UI, docs/ui-libraries.md §2 s3) ---
export * from "./components/ui/premium";
// --- Motion SSoT (PAGE_TRANSITION/NodePulse/Reveal, 05 §2.6 + emotion §3) ---
export * from "./motion";
// --- Agent thinking state (docs/ui-libraries.md §9.3) --------------------
// Miroir du modèle de thinking assistant-ui (`MessageStatus`) : le composant
// est muet (Étape 2) et piloté par la prop `status` (thinking / streaming /
// requires-action / error / complete). La page (Étape 4) lit le statut de la
// dernière message et le distribue en prop.
export {
  AgentThinkingLoader,
  DEFAULT_THINKING_WORDS,
  type AgentThinkingLoaderProps,
  type AgentThinkingStatus,
} from "./components/ui/AgentThinkingLoader";

// --- AD-10 renderer contracts + 4 DS data components (05 §3.6) -----------
export * from "./renderers";
export type {
  SemanticTreeRendererProps,
  InfographicRendererProps,
  DataVisualizationRendererProps,
  MathRendererProps,
  AnimationController,
  AnimationSlotProps,
  DataTableColumn,
  DataTableProps,
  TimelineEvent,
  TimelineProps,
  GanttRowProps,
  StatTileProps,
  TreeRelation,
  RenderSemanticNode,
  RenderSemanticEdge,
  RenderSemanticBridge,
  InfographicSpec,
  CalendarBlockType,
  RenderCalendarEvent,
  CalendarViewName,
  CalendarViewProps,
  DayCellContentArg,
  AgGridColumnDef,
  AgGridTableProps,
} from "./renderers/contracts";
export type {
  ChartSpec,
  AuroraPreset,
  AuroraTheme,
} from "./themes/types";
export {
  createSemanticTreeRenderer,
  createInfographicRenderer,
  createDataVisualizationRenderer,
  createMathRenderer,
} from "./renderers/contracts";
export { DataTable } from "./components/ui/DataTable";
export { KeyValueList } from "./components/ui/KeyValueList";
export { Timeline } from "./components/ui/Timeline";
export { GanttRow } from "./components/ui/GanttRow";
export { StatTile } from "./components/ui/StatTile";

// --- Calendar (FullCalendar v6) + data grid (AG Grid Community) -----------
// docs/ui-libraries.md §1: Calendar = FullCalendar (NOT ion-calendar);
// data tables > 100 rows = AG Grid (virtualized, 60fps Pixel 4a).
export { CalendarView } from "./components/ui/CalendarView";
export { AgGridTable } from "./components/ui/AgGridTable";

// --- EventCalendar (@reui, lot 2026-10-12 — moteur riche de vues calendrier)
// Moteur complet (mois / semaine / N jours / jour / agenda / time-grid
// ressources) — le composant de base, ses vues, sa barre de navigation et
// ses types sont exposés ; le style rétro-adapté (mobile) se construit par
//-dessus via `classNames` / `renderEvent`, jamais en forçant l'API.
export {
  EventCalendar,
  useEventCalendar,
  useEventCalendarNavigation,
  useEventCalendarOccurrences,
  useEventCalendarView,
  useEventCalendarSettings,
} from "./components/reui/event-calendar/event-calendar";
export type {
  EventCalendarApi,
  EventCalendarProps,
  EventCalendarRenderEventProps,
} from "./components/reui/event-calendar/event-calendar";
export {
  EventCalendarContent,
  DEFAULT_VIEW_COMPONENTS,
} from "./components/reui/event-calendar/event-calendar-content";
export {
  EventCalendarNav,
  EventCalendarToolbar,
  EventCalendarViewSwitcher,
  EventCalendarNavToday,
} from "./components/reui/event-calendar/event-calendar-nav";
export type {
  CalendarEvent,
  EventCalendarResource,
  EventCalendarViewSettings,
  EventCalendarInteractions,
  EventCalendarOccurrence,
  EventCalendarSegment,
} from "./components/reui/event-calendar/event-calendar-types";
export {
  DEFAULT_EVENT_CALENDAR_I18N,
  mergeEventCalendarI18n,
} from "./components/reui/event-calendar/event-calendar-i18n";
export type {
  EventCalendarI18nConfig,
  EventCalendarI18nOverrides,
} from "./components/reui/event-calendar/event-calendar-i18n";
export {
  EVENT_CALENDAR_MOBILE_STYLE,
  MOBILE_EVENT_CALENDAR_DAY_COUNT_PRESETS,
} from "./components/reui/event-calendar/event-calendar-mobile";
export type {
  EventCalendarMobileStyle,
} from "./components/reui/event-calendar/event-calendar-mobile";
// --- EventCalendar preset DESKTOP (Phase 2, 05 §4.5.2 Notes responsive) ---
// Miroir du preset mobile : la time-grid 64px/h (vs 48px mobile), le
// "gutter" 4rem (vs 3rem), le "Semaine" 7 jours en vue par défaut
// (le "3/5 jours" du mobile disparaît), le scroll = le ScrollArea reui
// (pas le scroll natif mobile). Le contenu (la i18n FROZEN française)
// est partagé avec le mobile — jamais un libellé anglais par défaut.
export {
  EVENT_CALENDAR_DESKTOP_STYLE,
  DESKTOP_EVENT_CALENDAR_DAY_COUNT_PRESETS,
} from "./components/reui/event-calendar/event-calendar-desktop";
export type {
  EventCalendarDesktopStyle,
} from "./components/reui/event-calendar/event-calendar-desktop";

// --- DateSelector & TimePicker (@reui, pickers pour formulaires)
export {
  DateSelector,
  useDateSelector,
  useDateSelectorContext,
  formatDateValue,
  DEFAULT_DATE_SELECTOR_I18N,
} from "./components/reui/date-selector";
export type {
  DateSelectorI18nConfig,
  DateSelectorPeriodType,
  DateSelectorFilterType,
  DateSelectorValue,
  DateSelectorProps,
} from "./components/reui/date-selector";

export {
  TimePicker,
  TimePickerTrigger,
  TimePickerContent,
  TimePickerColumns,
  TimePickerPanel,
  TimePickerInput,
  TimePickerValue,
  TimePickerNow,
  TimePickerClear,
  TimePickerConfirm,
  useTimePicker,
  parseTimeInput,
  DEFAULT_TIME_PICKER_I18N,
} from "./components/reui/time-picker";
export type {
  TimePickerTime,
  TimePickerGranularity,
  TimePickerHourCycle,
  TimePickerPeriod,
  TimePickerLabels,
  TimePickerProps,
} from "./components/reui/time-picker";

// --- Autocomplete, Rating, Stepper, Timeline, Tree, Kanban, Sortable
export {
  Autocomplete,
  AutocompleteValue,
  AutocompleteTrigger,
  AutocompleteInput,
  AutocompleteStatus,
  AutocompletePortal,
  AutocompleteContent,
  AutocompleteList,
  AutocompleteItem,
} from "./components/reui/autocomplete";

export { Rating } from "./components/reui/rating";
export {
  useStepper,
  useStepItem,
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperPanel,
  StepperContent,
  StepperNav,
} from "./components/reui/stepper";
export {
  Timeline as ReuiTimeline,
  TimelineContent as ReuiTimelineContent,
  TimelineDate as ReuiTimelineDate,
  TimelineHeader as ReuiTimelineHeader,
  TimelineIndicator as ReuiTimelineIndicator,
  TimelineItem as ReuiTimelineItem,
  TimelineSeparator as ReuiTimelineSeparator,
  TimelineTitle as ReuiTimelineTitle,
} from "./components/reui/timeline";
export {
  Tree,
  TreeItem,
  TreeItemLabel,
  TreeDragLine,
} from "./components/reui/tree";
export {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanColumnContent,
  KanbanOverlay,
} from "./components/reui/kanban";
export {
  Sortable,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "./components/reui/sortable";

// --- Icons, file-type, number-field, scrollspy
export { IconStack, type IconStackProps } from "./components/reui/icon-stack";
export {
  IconTile,
  iconTileVariants,
  type IconTileProps,
} from "./components/reui/icon-tile";
export {
  FileType,
  getFileType,
  getFileTypeCategory,
  FILE_TYPE_CATEGORIES,
  FILE_TYPE_EXTENSION_NAMES,
  fileTypeVariants,
  type FileTypeCategory,
  type FileTypeName,
  type FileTypeProps,
  type FileTypeVariant,
} from "./components/reui/file-type";
export {
  NumberField,
  NumberFieldScrubArea,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldGroup,
  NumberFieldInput,
} from "./components/reui/number-field";
export { Scrollspy } from "./components/reui/scrollspy";

// --- Desktop shell (@21st wensity Sidebar, ré-adapté Radix — Phase 2)
// Le SHELL desktop de la nav principale (05 §4.5.2 Notes responsive :
// le BottomNav mobile devient ce Sidebar ; le drawer de nav mobile =
// l'anti-pattern interdit, 05 §3.5 l.823-828). Le composant 21st
// d'origine passe par `@base-ui/react/use-render` : ici c'est le Radix
// `Slot` de la stack DS (la rétro-adaptation ReUI du lot 2026-10-12,
// même règle). Les `--primitive-*` → les tokens Aurora (AD-17) ; le
// mouvement framer-motion est gated par `useReducedMotion` (05 §2.6).
export {
  Sidebar as DesktopSidebar,
  SidebarHeader as DesktopSidebarHeader,
  SidebarNav as DesktopSidebarNav,
  SidebarSection as DesktopSidebarSection,
  SidebarItem as DesktopSidebarItem,
  SidebarNested as DesktopSidebarNested,
  SidebarFooter as DesktopSidebarFooter,
  SidebarToggle as DesktopSidebarToggle,
  useSidebar as useDesktopSidebar,
  type SidebarVariant as DesktopSidebarVariant,
  type SidebarProps as DesktopSidebarProps,
  type SidebarItemProps as DesktopSidebarItemProps,
  type SidebarSectionProps as DesktopSidebarSectionProps,
  type SidebarNestedProps as DesktopSidebarNestedProps,
  type SidebarToggleProps as DesktopSidebarToggleProps,
} from "./components/ui/desktop-sidebar";

// --- Desktop shell (suite) : le command palette ⌘K (@21st uvain,
// ré-adapté cmdk + Radix Dialog) — la recherche globale de la Phase 2
// (05 §4.5.2 : le desktop a la TopBar, le command palette vit dedans).
export {
  CommandMenu,
  Command as DesktopCommand,
  CommandInput as DesktopCommandInput,
  CommandList as DesktopCommandList,
  CommandEmpty as DesktopCommandEmpty,
  CommandGroup as DesktopCommandGroup,
  CommandSeparator as DesktopCommandSeparator,
  CommandItem as DesktopCommandItem,
  useCommandShortcut,
  type CommandMenuProps,
  type CommandItemProps as DesktopCommandItemProps,
} from "./components/ui/desktop-command-menu";

// --- Alert (reui — variante enrichie du Alert shadcn)
export {
  Alert as ReuiAlert,
  AlertTitle as ReuiAlertTitle,
  AlertDescription as ReuiAlertDescription,
  AlertAction as ReuiAlertAction,
} from "./components/reui/alert";

// --- Cascader
export {
  Cascader,
  CascaderTrigger,
  CascaderChip,
  CascaderChips,
  CascaderContent,
  CascaderPanel,
  CascaderList,
  CascaderEmpty,
  CascaderStatus,
  useCascader,
  useCascaderSelection,
  useCascaderActions,
  useCascaderState,
  useCascaderHighlight,
} from "./components/reui/cascader/cascader";
export {
  useCascaderLoader,
} from "./components/reui/cascader/cascader-async";
export type {
  CascaderProps,
  CascaderSingleProps,
  CascaderMultipleProps,
} from "./components/reui/cascader/cascader";

// --- Badge (reui — variante enrichie du Badge shadcn)
export {
  Badge as ReuiBadge,
  badgeVariants as reuiBadgeVariants,
  type BadgeProps as ReuiBadgeProps,
} from "./components/reui/badge";

// --- Gantt (@reui — moteur de frise de projet : arbres WBS + barres + baseline)
export {
  Gantt,
  GanttContext,
  GanttViewConfigContext,
  DEFAULT_ROW_ALIGN,
  DEFAULT_SCHEDULE_MODE,
  DEFAULT_VIEW_CONFIG,
  resolveScheduleMode,
  resolveTimelineLines,
  useGantt,
  useGanttInteractions,
  useGanttNavigation,
  useGanttNodeSchedules,
  useGanttOccurrences,
  useGanttScale,
  useGanttSelection,
  useGanttSelector,
  useGanttSettings,
  useGanttSettingsVersion,
  useGanttState,
  useGanttViewConfig,
} from "./components/reui/gantt/gantt";
export type {
  GanttActivationConfig,
  GanttApi,
  GanttBaselineProps,
  GanttCallbacks,
  GanttClassNames,
  GanttColumn,
  GanttColumnContext,
  GanttDragIndicatorProps,
  GanttGridLine,
  GanttInstance,
  GanttInternals,
  GanttMetrics,
  GanttNodeSchedules,
  GanttProps,
  GanttRenderEventProps,
  GanttResolvedLines,
  GanttRowBaselineProps,
  GanttScheduleHintProps,
  GanttSettings,
} from "./components/reui/gantt/gantt";

// --- TanStack Table v9 (features du data-grid ReUI)
// v9 = no `createReactTable`/`getCoreRowModel`/`createRowSelection` : on
// consomme `useTable` (features déclarées up-front) + les row-models `create*`
// importés par le bundle `dataGridFeatures`.
export {
  useTable,
  createCoreRowModel,
  createSortedRowModel,
  createColumnHelper,
} from "@tanstack/react-table";
export type {
  ColumnDef,
  ReactTable,
} from "@tanstack/react-table";

// --- Data Grid (@reui — TanStack Table v9 : tri, filtrage, pagination, selection)
export {
  DataGrid,
  DataGridContainer,
  useDataGrid,
  dataGridFeatures,
  type DataGridFeatures,
  type DataGridTableInstance,
  getColumnHeaderLabel,
  getDataGridHeaderSpans,
  getDataGridCellSelectionCellAttrs,
  dataGridCellSelectionCellClasses,
  toDataGridDomId,
} from "./components/reui/data-grid/data-grid";
export type { DataGridColumnCellEdit, DataGridColumnMeta } from "./components/reui/data-grid/data-grid";
export {
  DataGridTable,
  DataGridTableAddRow,
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableRenderedRow,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableFillBodyCell,
  DataGridTableFillHeadCell,
  DataGridTableFoot,
  DataGridTableFootRow,
  DataGridTableFootRowCell,
  DataGridTableHeader,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableLoader,
  DataGridTableRowExpand,
  DataGridTableRowPin,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  DataGridTableRowSpacer,
  DataGridTableViewport,
  getDataGridHeadCellResizeHeader,
  getDataGridHeadCellSizeVar,
  getDataGridScrollAreaViewport,
  getDataGridTableMergedHeaderGroups,
  renderDataGridTableHeadCellContent,
  getPinningStyles,
  getDataGridTableResolvedRows,
  getDataGridTableRowSections,
  getDataGridTreeIndentStyle,
  hasDataGridTableRightPinnedColumns,
  type DataGridTablePinnedBoundary,
} from "./components/reui/data-grid/data-grid-table";
export {
  DataGridPagination,
  type DataGridPaginationProps,
} from "./components/reui/data-grid/data-grid-pagination";
export {
  DataGridScrollArea,
  type DataGridScrollAreaOrientation,
  type DataGridScrollAreaProps,
} from "./components/reui/data-grid/data-grid-scroll-area";
export {
  DataGridColumnHeader,
  type DataGridColumnHeaderProps,
} from "./components/reui/data-grid/data-grid-column-header";

// --- Filters (@reui — arbre de requête de filtres imbriquées)
export {
  Filters,
  FiltersRow,
  FiltersBuilder,
  FiltersAdvanced,
  FiltersAdvancedPanel,
  FilterFieldPicker,
  FilterValuePopover,
  FilterOperatorPopover,
  FilterRuleMenuItems,
  FilterChip,
  useFilterRuleDisplay,
  useFilterOptions,
  createFilterQuery,
  createFilterRule,
  createFilterGroup,
  flattenFilterRules,
  flattenFilterConditions,
  countFilterRules,
  isFilterQueryEmpty,
  isFilterRuleComplete,
  DEFAULT_FILTER_LABELS,
} from "./components/reui/filters/filters";
export type {
  FiltersProps,
  FiltersRowProps,
  FilterQuery,
  FilterRule,
  FilterField,
} from "./components/reui/filters/filters";

// --- Emoji Picker (@reui — grille d'emojis + recherche + skin tones)
export {
  EmojiPicker,
  useEmojiPicker,
  EmojiPickerValue,
  EmojiPickerTrigger,
  EmojiPickerContent,
  EmojiPickerPanel,
  EmojiPickerHeader,
  EmojiPickerSearch,
  EmojiPickerCategories,
  EmojiPickerList,
  EmojiPickerFooter,
  EmojiPickerPreview,
  useEmojiPickerData,
  loadEmojiPickerData,
  searchEmojis,
  getEmojiValue,
  isEmojiValue,
  findEmoji,
  normalizeEmojibaseData,
  EMOJI_PICKER_DATA_URL,
  EMOJI_PICKER_CATEGORIES,
  DEFAULT_EMOJI_PICKER_I18N,
  mergeEmojiPickerI18n,
  type EmojiPickerProps,
  type EmojiPickerApi,
  type EmojiPickerSelection,
  type EmojiPickerEmoji,
  type EmojiPickerCustomEmoji,
  type EmojiPickerCustomCategory,
  type EmojiPickerData,
  type EmojiPickerRecentEntry,
  type EmojiPickerCategory,
  type EmojiPickerShortcodePreset,
  type EmojiPickerSize,
  type EmojiPickerI18nConfig,
  type EmojiPickerI18nOverrides,
} from "./components/reui/emoji-picker";

// --- Color Picker (@reui — area + slider + wheel + champs hex/rgb/hsl/oklch)
export {
  ColorPicker,
  useColorPicker,
  ColorPickerSwatch,
  ColorPickerValue,
  ColorPickerTrigger,
  ColorPickerInput,
  ColorPickerContent,
  ColorPickerPanel,
  ColorPickerArea,
  ColorPickerSlider,
  ColorPickerWheel,
  ColorPickerEyeDropper,
  parseColor,
  formatColor,
  isColorInSrgb,
  getContrastRatio,
  getForegroundColor,
  COLOR_PICKER_FORMATS,
  DEFAULT_COLOR_PICKER_I18N,
  mergeColorPickerI18n,
  type ColorPickerProps,
  type ColorPickerApi,
  type ColorPickerFormat,
  type ColorPickerColorSpace,
  type ColorPickerChannel,
  type ColorPickerColor,
  type ColorPickerLabels,
  type ColorPickerFunctions,
  type ColorPickerI18nConfig,
  type ColorPickerI18nOverrides,
} from "./components/reui/color-picker";

// --- Frame (@reui — coquille de panel « tool-like »)
export {
  Frame,
  FramePanel,
  FrameHeader,
  FrameTitle,
  FrameDescription,
  FrameFooter,
  frameVariants,
} from "./components/reui/frame";

// --- Code Block (@reui — Shiki : highlight, streaming, diff, folding)
export {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockDownloadButton,
  CodeBlockExpandButton,
  CodeBlockHeader,
  CodeBlockLanguage,
  CodeBlockLineActions,
  CodeBlockTitle,
  CodeBlockContent,
  CodeBlockWrapToggle,
  useCodeBlockConfig,
  useCodeBlockFolding,
  useCodeBlockSelection,
  markdownCodeProps,
  markdownFences,
  ansiToLines,
  parseUnifiedDiff,
  type CodeBlockProps,
  type CodeBlockCopyButtonProps,
  type CodeBlockDownloadButtonProps,
  type CodeBlockLineActionsProps,
  type CodeBlockLineActionsSide,
  type CodeBlockFoldRegion,
  type CodeBlockDiffSpec,
  type CodeBlockHighlightOptions,
  type CodeBlockLevelSpec,
  type CodeBlockLine,
  type CodeBlockLineActionsRender,
  type CodeBlockLineSpec,
  type CodeBlockLineState,
  type CodeBlockPatchFile,
  type CodeBlockThemes,
  type CodeBlockToken,
  type CodeBlockTransformer,
  type CodeBlockWordSpec,
} from "./components/reui/code-block/code-block";

// --- Signature Pad (@reui — encrage pression/vitesse, undo/redo, export)
export {
  SignaturePad,
  SignaturePadArea,
  SignaturePadGuide,
  SignaturePadPlaceholder,
  SignaturePadControls,
  SignaturePadClear,
  SignaturePadUndo,
  SignaturePadRedo,
  SignaturePadSave,
  SignaturePadPreview,
  useSignaturePad,
  getSignaturePadStrokePath,
  type SignaturePadPoint,
  type SignaturePadStroke,
  type SignaturePadPointerType,
  type SignaturePadSizing,
  type SignaturePadFormat,
  type SignaturePadExportOptions,
  type SignaturePadApi,
  type SignaturePadProps,
  type SignaturePadAreaProps,
} from "./components/reui/signature-pad";

// --- Phone Input (@reui — sélecteur de pays + validation)
export { PhoneInput } from "./components/reui/phone-input";

// --- Utils & hooks ----------------------------------------------------------
export { cn } from "./lib/utils";
export { markdownToHtml, commentAnchors } from "./lib/canvas-utils";
export { useToast } from "./hooks/use-toast";
export { useIsMobile } from "./hooks/use-mobile";

export {};
