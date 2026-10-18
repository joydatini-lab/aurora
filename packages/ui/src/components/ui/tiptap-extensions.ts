/**
 * tiptap-extensions.ts — builder d'extensions TipTap pour le canvas agentique
 *
 * `buildCanvasExtensions()` regroupe StarterKit + 14 extensions 2.27.3 pour
 * rendre CanvasView auto-portant (plus d'`editorChildren` injecté par le parent).
 *
 * Le menu slash existant (`SlashCommandMenu` dans `CanvasView.tsx`) est UI-only :
 * il n'existe pas d'extension « slash » officielle dans la ligne 2.x. Le slash
 * s'implémente par l'extension `mention` + un `Suggestion` plugin (à brancher
 * au Task 8 du plan canvas-agentique, quand le kit agent sera dispo).
 *
 * `@tiptap/suggestion` n'existe pas en 2.x (vérifié par grep du lockfile).
 */
import type { EditorOptions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link, { type LinkOptions } from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table, { type TableOptions } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Mention, { type MentionOptions } from "@tiptap/extension-mention";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";

export interface CanvasTiptapOptions {
  /** Permet de configurer `Mention` (suggestions, mentionRenderer) côté parent. */
  mentionOptions?: MentionOptions["suggestion"];
  /** Permet de configurer `Link` (openOnClick, autolink). */
  linkOptions?: Partial<LinkOptions>;
  /** Permet de configurer `Table` (allowHeaderRow, allowColumnResize). */
  tableOptions?: Partial<TableOptions>;
}

export type CanvasExtensions = EditorOptions["extensions"];

export function buildCanvasExtensions(opts: CanvasTiptapOptions = {}): CanvasExtensions {
  return [
    // StarterKit = Document + Paragraph + History + Headings + Bold + Italic +
    // BulletList + OrderedList + Blockquote + Code + CodeBlock + HardBreak +
    // HorizontalRule + Text + TextStyle + DropCursor + GapCursor + …
    StarterKit.configure({
      // Le menu slash existant gère le titre via RichTextToolbar ; on garde
      // les headings de StarterKit actifs pour l'édition native.
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      history: { depth: 100 },
    }),
    Underline,
    Link.configure(opts.linkOptions ? { ...Link.options, ...opts.linkOptions } : {}),
    Image,
    Table.configure(opts.tableOptions ? { ...Table.options, ...opts.tableOptions } : {}),
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem,
    Highlight.configure({ multicolor: false }),
    Mention.configure(
      opts.mentionOptions
        ? { suggestion: opts.mentionOptions }
        : { suggestion: { char: "@" } },
    ),
    Typography,
    CharacterCount,
  ];
}
