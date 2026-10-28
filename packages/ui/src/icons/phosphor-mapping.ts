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
 *
 * POURQUOI LES IMPORTS PAR SOUS-CHEMIN, ET PAS `import * as Phosphor`
 * L'API plate v2 se prêtait à `import * as Phosphor` + `Phosphor[nom]`. Ce
 * namespace rendait le tree-shaking IMPOSSIBLE : Rollup ne peut pas prouver
 * qu'une clé dynamique n'est jamais lue, donc il embarquait les ~1512 icônes
 * (2,7 Mo de `defs`). Mesuré : 4539 des 5733 modules de la sourcemap du bundle
 * d'entrée web-app venaient de `@phosphor-icons/react` — 79 % du bundle.
 *
 * Le paquet expose `./dist/csr/*` (une icône = un module, ~289 o + sa def) et
 * déclare `sideEffects: false`. On importe donc les 165 icônes RÉELLEMENT
 * mappées par leur nom, en statique : Rollup n'embarque que celles-là.
 */

import { AlignLeft } from '@phosphor-icons/react/dist/csr/AlignLeft';
import { AlignTop } from '@phosphor-icons/react/dist/csr/AlignTop';
import { AppleLogo } from '@phosphor-icons/react/dist/csr/AppleLogo';
import { Archive } from '@phosphor-icons/react/dist/csr/Archive';
import { ArrowDown } from '@phosphor-icons/react/dist/csr/ArrowDown';
import { ArrowElbowLeft } from '@phosphor-icons/react/dist/csr/ArrowElbowLeft';
import { ArrowElbowRight } from '@phosphor-icons/react/dist/csr/ArrowElbowRight';
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ArrowUp } from '@phosphor-icons/react/dist/csr/ArrowUp';
import { ArrowUpRight } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { ArrowsClockwise } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { ArrowsCounterClockwise } from '@phosphor-icons/react/dist/csr/ArrowsCounterClockwise';
import { ArrowsVertical } from '@phosphor-icons/react/dist/csr/ArrowsVertical';
import { Barbell } from '@phosphor-icons/react/dist/csr/Barbell';
import { Bed } from '@phosphor-icons/react/dist/csr/Bed';
import { Bicycle } from '@phosphor-icons/react/dist/csr/Bicycle';
import { BookOpen } from '@phosphor-icons/react/dist/csr/BookOpen';
import { BookOpenText } from '@phosphor-icons/react/dist/csr/BookOpenText';
import { Bookmark } from '@phosphor-icons/react/dist/csr/Bookmark';
import { BowlFood } from '@phosphor-icons/react/dist/csr/BowlFood';
import { BracketsCurly } from '@phosphor-icons/react/dist/csr/BracketsCurly';
import { Brain } from '@phosphor-icons/react/dist/csr/Brain';
import { Calendar } from '@phosphor-icons/react/dist/csr/Calendar';
import { CalendarCheck } from '@phosphor-icons/react/dist/csr/CalendarCheck';
import { CalendarDot } from '@phosphor-icons/react/dist/csr/CalendarDot';
import { CaretDown } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretLeft } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRight } from '@phosphor-icons/react/dist/csr/CaretRight';
import { CaretUp } from '@phosphor-icons/react/dist/csr/CaretUp';
import { CellSignalFull } from '@phosphor-icons/react/dist/csr/CellSignalFull';
import { ChartBar } from '@phosphor-icons/react/dist/csr/ChartBar';
import { Chat } from '@phosphor-icons/react/dist/csr/Chat';
import { ChatCircle } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { Chats } from '@phosphor-icons/react/dist/csr/Chats';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { CheckCircle } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CheckSquare } from '@phosphor-icons/react/dist/csr/CheckSquare';
import { Circle } from '@phosphor-icons/react/dist/csr/Circle';
import { CircleDashed } from '@phosphor-icons/react/dist/csr/CircleDashed';
import { Clipboard } from '@phosphor-icons/react/dist/csr/Clipboard';
import { Clock } from '@phosphor-icons/react/dist/csr/Clock';
import { ClockCounterClockwise } from '@phosphor-icons/react/dist/csr/ClockCounterClockwise';
import { CloudArrowUp } from '@phosphor-icons/react/dist/csr/CloudArrowUp';
import { CloudSlash } from '@phosphor-icons/react/dist/csr/CloudSlash';
import { Code } from '@phosphor-icons/react/dist/csr/Code';
import { Coffee } from '@phosphor-icons/react/dist/csr/Coffee';
import { Compass } from '@phosphor-icons/react/dist/csr/Compass';
import { Copy } from '@phosphor-icons/react/dist/csr/Copy';
import { CornersOut } from '@phosphor-icons/react/dist/csr/CornersOut';
import { Cpu } from '@phosphor-icons/react/dist/csr/Cpu';
import { Crosshair } from '@phosphor-icons/react/dist/csr/Crosshair';
import { CursorClick } from '@phosphor-icons/react/dist/csr/CursorClick';
import { Database } from '@phosphor-icons/react/dist/csr/Database';
import { DesktopTower } from '@phosphor-icons/react/dist/csr/DesktopTower';
import { DotsThree } from '@phosphor-icons/react/dist/csr/DotsThree';
import { DotsThreeCircle } from '@phosphor-icons/react/dist/csr/DotsThreeCircle';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { Download } from '@phosphor-icons/react/dist/csr/Download';
import { Drop } from '@phosphor-icons/react/dist/csr/Drop';
import { Envelope } from '@phosphor-icons/react/dist/csr/Envelope';
import { EnvelopeSimple } from '@phosphor-icons/react/dist/csr/EnvelopeSimple';
import { Eye } from '@phosphor-icons/react/dist/csr/Eye';
import { Eyedropper } from '@phosphor-icons/react/dist/csr/Eyedropper';
import { File } from '@phosphor-icons/react/dist/csr/File';
import { FileArchive } from '@phosphor-icons/react/dist/csr/FileArchive';
import { FileImage } from '@phosphor-icons/react/dist/csr/FileImage';
import { FileText } from '@phosphor-icons/react/dist/csr/FileText';
import { FileXls } from '@phosphor-icons/react/dist/csr/FileXls';
import { Files } from '@phosphor-icons/react/dist/csr/Files';
import { Flag } from '@phosphor-icons/react/dist/csr/Flag';
import { Flame } from '@phosphor-icons/react/dist/csr/Flame';
import { FloppyDisk } from '@phosphor-icons/react/dist/csr/FloppyDisk';
import { Folder } from '@phosphor-icons/react/dist/csr/Folder';
import { FolderOpen } from '@phosphor-icons/react/dist/csr/FolderOpen';
import { Footprints } from '@phosphor-icons/react/dist/csr/Footprints';
import { Gear } from '@phosphor-icons/react/dist/csr/Gear';
import { Globe } from '@phosphor-icons/react/dist/csr/Globe';
import { GridFour } from '@phosphor-icons/react/dist/csr/GridFour';
import { HeadCircuit } from '@phosphor-icons/react/dist/csr/HeadCircuit';
import { Headphones } from '@phosphor-icons/react/dist/csr/Headphones';
import { House } from '@phosphor-icons/react/dist/csr/House';
import { Image } from '@phosphor-icons/react/dist/csr/Image';
import { ImageBroken } from '@phosphor-icons/react/dist/csr/ImageBroken';
import { Info } from '@phosphor-icons/react/dist/csr/Info';
import { Key } from '@phosphor-icons/react/dist/csr/Key';
import { Lightning } from '@phosphor-icons/react/dist/csr/Lightning';
import { Link } from '@phosphor-icons/react/dist/csr/Link';
import { LinkSimple } from '@phosphor-icons/react/dist/csr/LinkSimple';
import { List } from '@phosphor-icons/react/dist/csr/List';
import { ListBullets } from '@phosphor-icons/react/dist/csr/ListBullets';
import { ListChecks } from '@phosphor-icons/react/dist/csr/ListChecks';
import { ListDashes } from '@phosphor-icons/react/dist/csr/ListDashes';
import { Lock } from '@phosphor-icons/react/dist/csr/Lock';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { MapPin } from '@phosphor-icons/react/dist/csr/MapPin';
import { Medal } from '@phosphor-icons/react/dist/csr/Medal';
import { Microphone } from '@phosphor-icons/react/dist/csr/Microphone';
import { MicrophoneSlash } from '@phosphor-icons/react/dist/csr/MicrophoneSlash';
import { Minus } from '@phosphor-icons/react/dist/csr/Minus';
import { MinusCircle } from '@phosphor-icons/react/dist/csr/MinusCircle';
import { Moon } from '@phosphor-icons/react/dist/csr/Moon';
import { MusicNotes } from '@phosphor-icons/react/dist/csr/MusicNotes';
import { PaintBrush } from '@phosphor-icons/react/dist/csr/PaintBrush';
import { PaperPlaneTilt } from '@phosphor-icons/react/dist/csr/PaperPlaneTilt';
import { Paperclip } from '@phosphor-icons/react/dist/csr/Paperclip';
import { Pause } from '@phosphor-icons/react/dist/csr/Pause';
import { PenNib } from '@phosphor-icons/react/dist/csr/PenNib';
import { Pencil } from '@phosphor-icons/react/dist/csr/Pencil';
import { PencilLine } from '@phosphor-icons/react/dist/csr/PencilLine';
import { Phone } from '@phosphor-icons/react/dist/csr/Phone';
import { PiggyBank } from '@phosphor-icons/react/dist/csr/PiggyBank';
import { Play } from '@phosphor-icons/react/dist/csr/Play';
import { PlayCircle } from '@phosphor-icons/react/dist/csr/PlayCircle';
import { Plug } from '@phosphor-icons/react/dist/csr/Plug';
import { PlugCharging } from '@phosphor-icons/react/dist/csr/PlugCharging';
import { Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { PlusCircle } from '@phosphor-icons/react/dist/csr/PlusCircle';
import { Prohibit } from '@phosphor-icons/react/dist/csr/Prohibit';
import { PushPin } from '@phosphor-icons/react/dist/csr/PushPin';
import { Quotes } from '@phosphor-icons/react/dist/csr/Quotes';
import { Repeat } from '@phosphor-icons/react/dist/csr/Repeat';
import { Robot } from '@phosphor-icons/react/dist/csr/Robot';
import { SealCheck } from '@phosphor-icons/react/dist/csr/SealCheck';
import { Share } from '@phosphor-icons/react/dist/csr/Share';
import { Shield } from '@phosphor-icons/react/dist/csr/Shield';
import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { ShieldSlash } from '@phosphor-icons/react/dist/csr/ShieldSlash';
import { ShieldWarning } from '@phosphor-icons/react/dist/csr/ShieldWarning';
import { Sidebar } from '@phosphor-icons/react/dist/csr/Sidebar';
import { SidebarSimple } from '@phosphor-icons/react/dist/csr/SidebarSimple';
import { SignIn } from '@phosphor-icons/react/dist/csr/SignIn';
import { SignOut } from '@phosphor-icons/react/dist/csr/SignOut';
import { SlidersHorizontal } from '@phosphor-icons/react/dist/csr/SlidersHorizontal';
import { Smiley } from '@phosphor-icons/react/dist/csr/Smiley';
import { Sparkle } from '@phosphor-icons/react/dist/csr/Sparkle';
import { SpeakerSimpleHigh } from '@phosphor-icons/react/dist/csr/SpeakerSimpleHigh';
import { Spinner } from '@phosphor-icons/react/dist/csr/Spinner';
import { Square } from '@phosphor-icons/react/dist/csr/Square';
import { Stack } from '@phosphor-icons/react/dist/csr/Stack';
import { Star } from '@phosphor-icons/react/dist/csr/Star';
import { Sun } from '@phosphor-icons/react/dist/csr/Sun';
import { Target } from '@phosphor-icons/react/dist/csr/Target';
import { Terminal } from '@phosphor-icons/react/dist/csr/Terminal';
import { TextAlignCenter } from '@phosphor-icons/react/dist/csr/TextAlignCenter';
import { ThumbsDown } from '@phosphor-icons/react/dist/csr/ThumbsDown';
import { ThumbsUp } from '@phosphor-icons/react/dist/csr/ThumbsUp';
import { Timer } from '@phosphor-icons/react/dist/csr/Timer';
import { Trash } from '@phosphor-icons/react/dist/csr/Trash';
import { Tree } from '@phosphor-icons/react/dist/csr/Tree';
import { TrendUp } from '@phosphor-icons/react/dist/csr/TrendUp';
import { Upload } from '@phosphor-icons/react/dist/csr/Upload';
import { User } from '@phosphor-icons/react/dist/csr/User';
import { UserCircle } from '@phosphor-icons/react/dist/csr/UserCircle';
import { UserPlus } from '@phosphor-icons/react/dist/csr/UserPlus';
import { Users } from '@phosphor-icons/react/dist/csr/Users';
import { Video } from '@phosphor-icons/react/dist/csr/Video';
import { WarningCircle } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { WarningDiamond } from '@phosphor-icons/react/dist/csr/WarningDiamond';
import { Waveform } from '@phosphor-icons/react/dist/csr/Waveform';
import { Waves } from '@phosphor-icons/react/dist/csr/Waves';
import { Wind } from '@phosphor-icons/react/dist/csr/Wind';
import { Wrench } from '@phosphor-icons/react/dist/csr/Wrench';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { XCircle } from '@phosphor-icons/react/dist/csr/XCircle';

/**
 * Le registre STATIQUE des 165 icones mappees. Un objet litteral, jamais un
 * namespace : c'est ce qui rend l'arbre secouable. `PHOSPHOR_NAME_MAP` doit
 * rester un sous-ensemble de ces cles (un test le garde).
 */
export const PHOSPHOR_COMPONENTS = {
  AlignLeft,
  AlignTop,
  AppleLogo,
  Archive,
  ArrowDown,
  ArrowElbowLeft,
  ArrowElbowRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ArrowsClockwise,
  ArrowsCounterClockwise,
  ArrowsVertical,
  Barbell,
  Bed,
  Bicycle,
  BookOpen,
  BookOpenText,
  Bookmark,
  BowlFood,
  BracketsCurly,
  Brain,
  Calendar,
  CalendarCheck,
  CalendarDot,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  CellSignalFull,
  ChartBar,
  Chat,
  ChatCircle,
  Chats,
  Check,
  CheckCircle,
  CheckSquare,
  Circle,
  CircleDashed,
  Clipboard,
  Clock,
  ClockCounterClockwise,
  CloudArrowUp,
  CloudSlash,
  Code,
  Coffee,
  Compass,
  Copy,
  CornersOut,
  Cpu,
  Crosshair,
  CursorClick,
  Database,
  DesktopTower,
  DotsThree,
  DotsThreeCircle,
  DotsThreeVertical,
  Download,
  Drop,
  Envelope,
  EnvelopeSimple,
  Eye,
  Eyedropper,
  File,
  FileArchive,
  FileImage,
  FileText,
  FileXls,
  Files,
  Flag,
  Flame,
  FloppyDisk,
  Folder,
  FolderOpen,
  Footprints,
  Gear,
  Globe,
  GridFour,
  HeadCircuit,
  Headphones,
  House,
  Image,
  ImageBroken,
  Info,
  Key,
  Lightning,
  Link,
  LinkSimple,
  List,
  ListBullets,
  ListChecks,
  ListDashes,
  Lock,
  MagnifyingGlass,
  MapPin,
  Medal,
  Microphone,
  MicrophoneSlash,
  Minus,
  MinusCircle,
  Moon,
  MusicNotes,
  PaintBrush,
  PaperPlaneTilt,
  Paperclip,
  Pause,
  PenNib,
  Pencil,
  PencilLine,
  Phone,
  PiggyBank,
  Play,
  PlayCircle,
  Plug,
  PlugCharging,
  Plus,
  PlusCircle,
  Prohibit,
  PushPin,
  Quotes,
  Repeat,
  Robot,
  SealCheck,
  Share,
  Shield,
  ShieldCheck,
  ShieldSlash,
  ShieldWarning,
  Sidebar,
  SidebarSimple,
  SignIn,
  SignOut,
  SlidersHorizontal,
  Smiley,
  Sparkle,
  SpeakerSimpleHigh,
  Spinner,
  Square,
  Stack,
  Star,
  Sun,
  Target,
  Terminal,
  TextAlignCenter,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash,
  Tree,
  TrendUp,
  Upload,
  User,
  UserCircle,
  UserPlus,
  Users,
  Video,
  WarningCircle,
  WarningDiamond,
  Waveform,
  Waves,
  Wind,
  Wrench,
  X,
  XCircle,
} as const;

/** Le type d'un nom Phosphor valide (clé de l'export plate). */
export type PhosphorIconName = keyof typeof PHOSPHOR_COMPONENTS & string;

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
