/**
 * SSoT — Mapping des icônes Lucide → Phosphor
 *
 * L'API `@phosphor-icons/react@^2` est **plate** (pas de familles
 * namespacées `Duotone`/`Fill`/`Bold` comme en v1) : chaque icône est un
 * composant forwardRef qui reçoit `weight` en prop. Le SSoT de ce module porte :
 *
 * 1. `PHOSPHOR_NAME_MAP` — le mapping explicite nom Lucide → nom Phosphor.
 *    Le 1:1 n'existe pas (ex : `Settings` → `Gear`, `Search` → `MagnifyingGlass`).
 *
 * 2. `PHOSPHOR_WEIGHT` — le weight par icône Lucide. Défaut = `'duotone'`.
 *    Accents (CTA, pastilles, badges) = `'fill'`. Titres / boutons = `'bold'`.
 *
 * 3. `LucideName` — l'union exhaustive des 226 noms Lucide consommés par l'app.
 */

import * as Phosphor from '@phosphor-icons/react';

/** Le type d'un nom Phosphor valide (clé de l'export plate). */
export type PhosphorIconName = keyof typeof Phosphor & string;

/** Le SSoT — les noms Lucide consommés par l'app (SSoT de l'inventaire, 226 noms). */
export type LucideName =
  | 'AlarmClock' | 'AlignCenter' | 'AlignLeft' | 'AlignStartVertical' | 'Apple'
  | 'Archive' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowUpRight'
  | 'AudioLines' | 'Award' | 'Ban' | 'BarChart' | 'BedDouble' | 'Bike'
  | 'BookOpen' | 'BookOpenText' | 'Bookmark' | 'Bot' | 'Braces'
  | 'Brain' | 'BrainCircuit' | 'Brush' | 'Calendar' | 'CalendarCheck'
  | 'CalendarClock' | 'CalendarDays' | 'CalendarRange' | 'Check' | 'CheckSquare'
  | 'ChevronDown' | 'ChevronLeft' | 'ChevronRight' | 'ChevronUp'
  | 'Circle' | 'CircleAlert' | 'CircleCheck' | 'CircleDot' | 'CircleMinus'
  | 'CircleOff' | 'CirclePlay' | 'CirclePlus' | 'CircleSlash' | 'CircleUserRound'
  | 'ClipboardList' | 'Clock' | 'CloudOff' | 'CloudUpload' | 'Code' | 'Coffee'
  | 'Compass' | 'Copy' | 'CornerUpLeft' | 'CornerUpRight' | 'Cpu' | 'Database'
  | 'Download' | 'Droplets' | 'Dumbbell' | 'Ellipsis' | 'ExternalLink' | 'Eye'
  | 'FileArchive' | 'FileImage' | 'FileQuestion' | 'FileSpreadsheet' | 'FileText'
  | 'Files' | 'Flag' | 'Flame' | 'Focus' | 'Folder' | 'FolderOpen' | 'Footprints'
  | 'Globe' | 'GripVertical' | 'Headphones' | 'History' | 'Home' | 'House'
  | 'Image' | 'ImageOff' | 'Inbox' | 'Info' | 'KeyRound' | 'Layers'
  | 'LayoutGrid' | 'Link2' | 'Link' | 'List' | 'ListChecks' | 'ListTree' | 'ListX'
  | 'Loader' | 'Loader2' | 'LoaderCircle' | 'Lock' | 'LogIn' | 'LogOut'
  | 'Mail' | 'MailCheck' | 'MapPin' | 'Maximize2' | 'Maximize' | 'Menu'
  | 'MessageCircle' | 'MessageSquare' | 'MessageSquarePlus' | 'MessagesSquare'
  | 'Mic' | 'MicOff' | 'Minus' | 'Moon' | 'MoreHorizontal' | 'MoreVertical'
  | 'MousePointer2' | 'Music' | 'PanelLeft' | 'PanelLeftClose' | 'PanelLeftOpen'
  | 'Paperclip' | 'Pause' | 'PenLine' | 'PenTool' | 'Pencil' | 'Phone'
  | 'PiggyBank' | 'Pin' | 'Pipette' | 'Play' | 'Plug' | 'PlugZap' | 'Plus'
  | 'Quote' | 'Redo2' | 'RefreshCw' | 'Repeat' | 'RotateCcw' | 'RotateCw'
  | 'Salad' | 'Save' | 'Search' | 'SearchCheck' | 'Send' | 'Server' | 'Settings'
  | 'Share2' | 'ShieldAlert' | 'ShieldCheck' | 'Shield' | 'ShieldX' | 'Signal'
  | 'SlidersHorizontal' | 'Smile' | 'Sparkles' | 'Square' | 'Star' | 'Sun'
  | 'Target' | 'Terminal' | 'ThumbsDown' | 'ThumbsUp' | 'Timer' | 'Trash'
  | 'Trash2' | 'TrendingUp' | 'Undo2' | 'Upload' | 'User' | 'UserPlus' | 'Users' | 'Video'
  | 'Volume2' | 'Waves' | 'Wind' | 'Wrench' | 'X' | 'XCircle' | 'Zap'
  | 'AlertCircle' | 'AlertTriangle';

/**
 * Le SSoT — mapping nom Lucide → nom Phosphor.
 * Vérifié contre `Object.keys(@phosphor-icons/react@2.1.10)` (l'API plate).
 */
export const PHOSPHOR_NAME_MAP: Record<LucideName, PhosphorIconName> = {
  // A
  AlarmClock: 'Clock',
  AlertCircle: 'WarningCircle',
  AlertTriangle: 'WarningDiamond',
  AlignCenter: 'TextAlignCenter',
  AlignLeft: 'AlignLeft',
  AlignStartVertical: 'AlignTop',
  Apple: 'AppleLogo',
  Archive: 'Archive',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  ArrowUpRight: 'ArrowUpRight',
  AudioLines: 'Waveform',
  Award: 'Medal',
  Ban: 'Prohibit',
  BarChart: 'ChartBar',
  BedDouble: 'Bed',
  Bike: 'Bicycle',
  BookOpen: 'BookOpen',
  BookOpenText: 'BookOpenText',
  Bookmark: 'Bookmark',
  Bot: 'Robot',
  Braces: 'BracketsCurly',
  Brain: 'Brain',
  BrainCircuit: 'HeadCircuit',
  Brush: 'PaintBrush',
  // C
  Calendar: 'Calendar',
  CalendarCheck: 'CalendarCheck',
  CalendarClock: 'CalendarDot',
  CalendarDays: 'Calendar',
  CalendarRange: 'Calendar',
  Check: 'Check',
  CheckSquare: 'CheckSquare',
  ChevronDown: 'CaretDown',
  ChevronLeft: 'CaretLeft',
  ChevronRight: 'CaretRight',
  ChevronUp: 'CaretUp',
  Circle: 'Circle',
  CircleAlert: 'WarningCircle',
  CircleCheck: 'CheckCircle',
  CircleDot: 'DotsThreeCircle',
  CircleMinus: 'MinusCircle',
  CircleOff: 'CircleDashed',
  CirclePlay: 'PlayCircle',
  CirclePlus: 'PlusCircle',
  CircleSlash: 'CircleDashed',
  CircleUserRound: 'UserCircle',
  ClipboardList: 'Clipboard',
  Clock: 'Clock',
  CloudOff: 'CloudSlash',
  CloudUpload: 'CloudArrowUp',
  Code: 'Code',
  Coffee: 'Coffee',
  Compass: 'Compass',
  Copy: 'Copy',
  CornerUpLeft: 'ArrowElbowLeft',
  CornerUpRight: 'ArrowElbowRight',
  Cpu: 'Cpu',
  Database: 'Database',
  Download: 'Download',
  Droplets: 'Drop',
  Dumbbell: 'Barbell',
  Ellipsis: 'DotsThree',
  ExternalLink: 'LinkSimple',
  Eye: 'Eye',
  // F
  FileArchive: 'FileArchive',
  FileImage: 'FileImage',
  FileQuestion: 'File',
  FileSpreadsheet: 'FileXls',
  FileText: 'FileText',
  Files: 'Files',
  Flag: 'Flag',
  Flame: 'Flame',
  Focus: 'Crosshair',
  Folder: 'Folder',
  FolderOpen: 'FolderOpen',
  Footprints: 'Footprints',
  // G
  Globe: 'Globe',
  GripVertical: 'ArrowsVertical',
  // H
  Headphones: 'Headphones',
  History: 'ClockCounterClockwise',
  Home: 'House',
  House: 'House',
  // I
  Image: 'Image',
  ImageOff: 'ImageBroken',
  Inbox: 'Archive',
  Info: 'Info',
  // K
  KeyRound: 'Key',
  // L
  Layers: 'Stack',
  LayoutGrid: 'GridFour',
  Link2: 'LinkSimple',
  Link: 'Link',
  List: 'List',
  ListChecks: 'ListChecks',
  ListTree: 'Tree',
  ListX: 'ListDashes',
  Loader: 'Spinner',
  Loader2: 'Spinner',
  LoaderCircle: 'Spinner',
  Lock: 'Lock',
  LogIn: 'SignIn',
  LogOut: 'SignOut',
  // M
  Mail: 'Envelope',
  MailCheck: 'EnvelopeSimple',
  MapPin: 'MapPin',
  Maximize2: 'CornersOut',
  Maximize: 'CornersOut',
  Menu: 'ListBullets',
  MessageCircle: 'ChatCircle',
  MessageSquare: 'Chat',
  MessageSquarePlus: 'Chats',
  MessagesSquare: 'Chats',
  Mic: 'Microphone',
  MicOff: 'MicrophoneSlash',
  Minus: 'Minus',
  Moon: 'Moon',
  MoreHorizontal: 'DotsThree',
  MoreVertical: 'DotsThreeVertical',
  MousePointer2: 'CursorClick',
  Music: 'MusicNotes',
  // P
  PanelLeft: 'Sidebar',
  PanelLeftClose: 'Sidebar',
  PanelLeftOpen: 'SidebarSimple',
  Paperclip: 'Paperclip',
  Pause: 'Pause',
  PenLine: 'PencilLine',
  PenTool: 'PenNib',
  Pencil: 'Pencil',
  Phone: 'Phone',
  PiggyBank: 'PiggyBank',
  Pin: 'PushPin',
  Pipette: 'Eyedropper',
  Play: 'Play',
  Plug: 'Plug',
  PlugZap: 'PlugCharging',
  Plus: 'Plus',
  // Q
  Quote: 'Quotes',
  // R
  Redo2: 'ArrowsClockwise',
  RefreshCw: 'ArrowsClockwise',
  Repeat: 'Repeat',
  RotateCcw: 'ArrowsCounterClockwise',
  RotateCw: 'ArrowsClockwise',
  // S
  Salad: 'BowlFood',
  Save: 'FloppyDisk',
  Search: 'MagnifyingGlass',
  SearchCheck: 'SealCheck',
  Send: 'PaperPlaneTilt',
  Server: 'DesktopTower',
  Settings: 'Gear',
  Share2: 'Share',
  ShieldAlert: 'ShieldWarning',
  ShieldCheck: 'ShieldCheck',
  Shield: 'Shield',
  ShieldX: 'ShieldSlash',
  Signal: 'CellSignalFull',
  SlidersHorizontal: 'SlidersHorizontal',
  Smile: 'Smiley',
  Sparkles: 'Sparkle',
  Square: 'Square',
  Star: 'Star',
  Sun: 'Sun',
  // T
  Target: 'Target',
  Terminal: 'Terminal',
  ThumbsDown: 'ThumbsDown',
  ThumbsUp: 'ThumbsUp',
  Timer: 'Timer',
  Trash: 'Trash',
  Trash2: 'Trash',
  TrendingUp: 'TrendUp',
  Undo2: 'ArrowsCounterClockwise',
  Upload: 'Upload',
  // U
  User: 'User',
  UserPlus: 'UserPlus',
  Users: 'Users',
  Video: 'Video',
  Volume2: 'SpeakerSimpleHigh',
  // W
  Waves: 'Waves',
  Wind: 'Wind',
  Wrench: 'Wrench',
  // X
  X: 'X',
  XCircle: 'XCircle',
  Zap: 'Lightning',
};

/** Le SSoT — le type du weight Phosphor. */
export type PhosphorWeight = 'duotone' | 'fill' | 'bold';

/**
 * Le SSoT — weight par icône Lucide. Défaut = `'duotone'` (non listé ici).
 * `fill` : accents (CTA, pastilles, badges).
 * `bold` : titres, boutons principaux.
 */
export const PHOSPHOR_WEIGHT: Partial<Record<LucideName, PhosphorWeight>> = {
  // Accents — fill
  Check: 'fill',
  Zap: 'fill',
  Sparkles: 'fill',
  ShieldCheck: 'fill',
  Play: 'fill',
  Star: 'fill',
  Flag: 'fill',
  Flame: 'fill',
  // Titres / boutons principaux — bold
  Bot: 'bold',
  Plus: 'bold',
  Send: 'bold',
  Compass: 'bold',
  Settings: 'bold',
  X: 'bold',
};
