/**
 * Agent conversation (02 §6.1, F-09: the device sees ONLY AgentRunState).
 *
 * /agent — the conversation surface. The premium chrome: a calm transcript +
 * a pinned composer. Submitting an intention ENQUEUES a kernel run
 * (`fn-agent-run`, AD-12/F-09): the kernel executes server-side and the
 * device follows its `agent_runs` mirror (AD-7 local read, 3 s cadence
 * while running; terminal statuses stop the poll). No provider stream
 * crosses the device (F-09/AD-3).
 *
 * The composer's `+` button opens a bottom sheet with:
 *  - Files (kernel not yet wired — the section ships in a later wave;
 *    there is no fake file picker on the surface)
 *  - Add connect (Composio: Google Workspace by default)
 *  - Skills marketplace (browse ClawHub / create personal skill)
 *  - Research mode (standard / deep)
 *  - Thinking level (low / medium / high / max)
 *
 * Agent modes: chat | agent (autonomous) | mirror (teach the AI).
 *
 * ————————————————————————————————————————————————————————————————
 * Gestures (emotion-design §3, mobile UX pattern: « fluid, never blocking »)
 *  - **Text selection → menu** : long-press / native selection inside the
 *    transcript exposes a floating action bar (Copy / Send-to-chat /
 *    Open page) — the bar appears on `selectionchange` when a selection
 *    is inside the transcript container.
 *  - **Horizontal drag (composer)** : the composer row is a swipe surface:
 *    swipe LEFT → opens the `+` sheet (files/connectors/research/skills);
 *    swipe RIGHT → cycles the agent mode tabs (chat → agent → mirror).
 *    The gesture is damped (not instant) so it never fights the keyboard.
 *  - **Vertical drag → modal (composer)** : swipe the composer row DOWN
 *    (pull-to-open) → opens the model picker modal (the same sheet as the
 *    `Cpu` trigger). Threshold 60 px; springs back below.
 *  - **Drag-to-open page (transcript)** : agent entries that carry a
 *    `route` payload (deep-link, 04 §3.2.5) are horizontally draggable:
 *    drag the bubble LEFT → the page it targets slides in from the right
 *    (navigate + push-state so the back button returns to the chat).
 *    The bubble « peels » (transform follows the finger, clamped).
 */
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle } from '@ionic/react';
import { AgentThinkingLoader } from '@aurora/ui';
import {
  Bot,
  Brain,
  Compass,
  Cpu,
  ChevronLeft,
  FolderOpen,
  Link2,
  Loader2,
  Menu,
  MessageSquare,
  MessageSquarePlus,
  PenLine,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Zap,
  Copy,
  ArrowRight,
  Quote,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { useMobileData } from '../../query/context';
import { useAgentRun } from '../../query/agent-runs';
import { useKilledDetection } from '../../hooks/use-killed';
import type { AgentRunRow } from '../../lib/agent-client';
import type { UserSkillRow } from '../../lib/skills-client';
import { useUiStateStore } from '../../state/ui-state';
import { AuroraOrb } from '../../components/AuroraOrb';
import { parseSkillSlashCall, withForcedSkill, type SkillCandidate } from './skill-slash-parse.ts';
// M-62 (S6) — interlock S2↔S6 : le .tsx canonique du composant est cassé
// (TS3024, S6 en cours de re-branchement). Le shim .tsx réexporte le .ts
// (pures fonctions) — MAIS le composant `MirrorFindingsCard` n'y est pas
// (le composant réside dans le .tsx cassé). Import explicite `.ts` ici :
// le .ts SSoT de S6 exporte le composant + les pures fonctions (le
// .tsx est un shim temporaire, S6 le supprimera + le composant vivra
// dans le .ts final).
import { MirrorFindingsCard } from '../../components/agent/mirror-findings-card.tsx';
import type { MirrorCardFinding } from '../../components/agent/mirror-findings-card';

// ——— Model picker catalog (AD-3: static, public config — no key here). ———
const MODEL_CATALOG: Array<{ provider: string; name: string; models: string[] }> = [
  { provider: 'agnes', name: 'Agnes', models: ['agnes-3.0', 'agnes-2.5-flash'] },
  { provider: 'workers-ai', name: 'Cloudflare Workers AI', models: ['glm-4.7-flash', 'gemma-4-26b', 'nemotron-3-super-120b'] },
  { provider: 'groq', name: 'Groq', models: ['gpt-oss-120b', 'gpt-oss-20b'] },
  { provider: 'openrouter', name: 'OpenRouter', models: ['nemotron-3-ultra', 'gemma-4'] },
];

// ——— Agent modes (kernel §4) ———
// 'ascent' = Slide-Ascent pedagogical mode (docs/ascent/overview S12):
// the agent CONDUCTS the climb (explains / exercises / diagnoses), the
// /ascent page only READS the resulting AscentLearningIR.
type AgentMode = 'chat' | 'agent' | 'mirror' | 'ascent';
const AGENT_MODES: Array<{ id: AgentMode; label: string; icon: React.ReactNode }> = [
  { id: 'chat', label: 'Chat', icon: <Bot size={12} /> },
  { id: 'agent', label: 'Agent', icon: <Zap size={12} /> },
  { id: 'mirror', label: 'Miroir', icon: <Brain size={12} /> },
  { id: 'ascent', label: 'Ascent', icon: <Compass size={12} /> },
];

/** M-12 (v2 MVP S1) — la puce de mode du composer : la maquette Stitch
 *  fixe le segment control à 3 options (Ask / Agent / Miroir). `ascent`
 *  reste un mode du `taskProfile` (S5 le câble) mais n'est PAS une
 *  option de la puce — il s'atteint par le deep-link /ascent (S5, M-51).
 *  Labels SSoT : « Ask » = le mode lecture-seule de Q9 (M-11), « Agent »
 *  = la boucle d'écriture complète, « Miroir » = le mode pédago. */
const MODE_PILLS: Array<{ id: AgentMode; label: string; icon: React.ReactNode }> = [
  { id: 'chat', label: 'Ask', icon: <Bot size={14} /> },
  { id: 'agent', label: 'Agent', icon: <Zap size={14} /> },
  { id: 'mirror', label: 'Miroir', icon: <Brain size={14} /> },
];

// ——— Thinking levels (M-21, stitch écran 4 « Réflexion et modèle ») ———
// Les 3 affichages Rapide / Équilibré / Approfondi ; la valeur `max`
// (héritée du picker v1) reste le palier profond — même choix qu'« Approfondi ».
type ThinkingLevel = 'low' | 'medium' | 'high' | 'max';
const THINKING_LEVELS_BY_GROUP: Array<{ label: string; values: ThinkingLevel[] }> = [
  { label: 'Rapide', values: ['low'] },
  { label: 'Équilibré', values: ['medium'] },
  { label: 'Approfondi', values: ['high', 'max'] },
];

// ——— M-21 (plan v2 S2, ADR §6 / Q12) — typed model tiers (Q12) ———
// Paliers (Léger / Standard / Avancé + Auto) : un PARAMÈTRE TYPÉ du profil
// de tâche (taskProfile.modelTier), soumis à la politique + budget IA —
// JAMAIS un mot-clé du prompt. `auto` = le routeur décide (chaîne S2.6).
type ModelTier = 'auto' | 'light' | 'standard' | 'advanced';
const MODEL_TIER_OPTIONS: Array<{ id: ModelTier; label: string; hint: string }> = [
  { id: 'auto', label: 'Auto', hint: 'Aurora choisit selon la tâche et votre budget' },
  { id: 'light', label: 'Léger', hint: 'Réponses rapides, coût réduit' },
  { id: 'standard', label: 'Standard', hint: 'Bon compromis pour la plupart des demandes' },
  { id: 'advanced', label: 'Avancé', hint: 'Raisonnement poussé, plus lent' },
];

// ——— M-22 (Q13) : le label court d'un skill installé (la sous-écran
//  « Skills installés » de la feuille +) — l'objectif / le trigger,
//  sinon l'origine lisible (jamais de jargon brut AD-7). ———
function sourceSkillLabel(s: UserSkillRow): string {
  if (s.trigger) return s.trigger;
  if (s.objective) return s.objective;
  if (s.source.startsWith('marketplace:')) return 'Catalogue';
  if (s.source === 'user-created') return 'Créé par toi';
  if (s.source === 'builtin') return 'Intégré';
  return s.skillKey;
}

// ——— Research modes ———
type ResearchMode = 'off' | 'standard' | 'deep';
const RESEARCH_MODES: Array<{ id: ResearchMode; label: string }> = [
  { id: 'off', label: 'Aucune recherche' },
  { id: 'standard', label: 'Recherche standard (Exa/Tavily/You.com)' },
  { id: 'deep', label: 'Deep research (multi-round + vérif sources)' },
];

// ——— Composio integration presets (default: Google Workspace) ———
const DEFAULT_CONNECTORS = [
  'Google Docs',
  'Gmail',
  'Google Calendar',
  'Google Drive',
  'Google Sheets',
];

/** One transcript entry (device surface state — AD-7, local only). */
interface Entry {
  id: string;
  role: 'user' | 'agent';
  body: string;
  /** optional action CTA under the body (plain French, plain route). */
  ctaLabel?: string;
  ctaHref?: string;
  /** run id for agent entries (the `agent_runs` row they belong to). */
  runId?: string;
  /**
   * Deep-link target (04 §3.2.5): when present, the bubble is
   * drag-to-open — swipe LEFT peels the bubble and navigates to `route`
   * with replace-state so back returns to the chat.
   */
  route?: string;
  /** Optional short label shown on the peel affordance (chevron line). */
  routeLabel?: string;
  /**
   * S6 M-62 (plan v2) — le payload de la carte Miroir (le retour
   * structuré du run du mode Miroir, le contrat M-61
   * `docs/adr/mirror-contract.md`). Quand il est présent sur une
   * entrée `agent`, le composant `MirrorFindingsCard` est rendu dans
   * la bulle (le bloc « Lacunes détectées » vit DANS le chat,
   * jamais une page dédiée — l'écran Miroir = un écran du chat, pas
   * une route supplémentaire du shell (02 §6.1 S1/S3)). Les champs
   * (reformulation / findings typées SSoT Learning / question) sont
   * fixés par le module pures fonctions
   * `mirror-findings-card.ts` (le composant les consomme, la SSoT
   * est le module — zéro redéclaration). Le `subjectLabel` /
   * `subjectId` sont l'état du Stitch « Sujet : … » (le dernier
   * cours / la veille du flow M-62) ; le `validated` = le flag M-63
   * (la preuve a-t-elle été validée par l'utilisateur, le bouton
   * « Valider » se désactive une fois la commande
   * `progress.evidence_create` appliquée (F-07 : seul Progress
   * écrit la row, le chat n'émet que la commande typée)).
   */
  mirror?: {
    subjectLabel?: string;
    subjectId?: string;
    reformulation: string;
    findings: MirrorCardFinding[];
    question: string;
    validated?: boolean;
  };
}

/** Plain French status lines (roadmap 10-07: zéro jargon utilisateur). */
function statusLine(row: AgentRunRow | null): string {
  if (!row) return 'Lancé côté serveur — en attente de démarrage…';
  switch (row.status) {
    case 'running':
      return row.confirmationMessage
        ? 'Une confirmation est nécessaire : « ' + row.confirmationMessage + ' »'
        : 'En cours…';
    case 'completed':
      return 'C’est fait — tes changements ont été appliqués.';
    case 'failed':
      return 'Un problème est survenu — rien n’a été modifié sans ton accord.';
    case 'cancelled':
      return 'Annulé.';
  }
}

/**
 * Gesture constants (emotional design §3: « calm, never snappy »).
 * Thresholds tuned so the gestures coexist with native text selection:
 * a 10 px dead-zone prevents accidental triggers when tapping the composer.
 */
const GESTURE_DEAD_ZONE = 10; // px before a swipe is "real"
const GESTURE_VELOCITY = 0.35; // px/ms — below = "slow, intentional"
const PULL_OPEN_DISTANCE = 64; // px for composer pull-down → model modal
const PULL_OPEN_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // ease-out « luxe »

export function AgentPage() {
  const navigate = useNavigate();
  // M-22 (plan v2 S2, Q13) : « Skills installés » dans la feuille + du chat
  // (stitch `agent_skills_install_s_fraunces`) + l'appel `/nom` du brouillon.
  // Le client `skills` (AD-3, `fn-skills`) sert la liste ; sans client,
  // l'appel `/nom` est désactivé (AD-7 honnête, pas de skill fantôme).
  const { agent, skills } = useMobileData();
  // Cross-page intent prefill (?intent=): the Slide-Ascent active-reading
  // actions (Expliquer / Note / Flashcard / Visualiser / Je bloque) and the
  // UxStates « Demande à Aurora » CTA route here with a PRE-BOUND intent —
  // the composer opens already typed, the user just sends (same intake
  // pattern as /knowledge?q=).
  const [searchParams] = useSearchParams();
  const [draft, setDraft] = useState(
    () => searchParams.get('intent') ?? '',
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeRun, setActiveRun] = useState<string | undefined>(undefined);
  const [modelChoice, setModelChoice] = useState<{ provider: string; model: string } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showPlusSheet, setShowPlusSheet] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('agent');
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('medium');
  // M-21 (Q12) : le palier de modèle typé (Auto par défaut, stitch écran 4).
  // Paramètre du profil de tâche — jamais de mot-clé dans le prompt (ADR §6).
  const [modelTier, setModelTier] = useState<ModelTier>('auto');
  // PRD-AI-06 (10-08) : la préférence de recherche web est PARTAGÉE entre
  // /agent (chip + feuille « + ») et /agent/capacites (l'onglet Capacités)
  // — persistée (ui-state) et envoyée avec chaque requête (taskProfile).
  const researchMode = useUiStateStore((s) => s.agentResearchMode);
  const setResearchMode = useUiStateStore((s) => s.setAgentResearchMode);
  const [connectors, setConnectors] = useState<string[]>(DEFAULT_CONNECTORS);
  // M-22 (Q13) : les skills installés (la sous-écran du `+` sheet, stitch
  // `agent_skills_install_s_fraunces`).
  const [showSkillsSheet, setShowSkillsSheet] = useState(false);
  const [installedSkills, setInstalledSkills] = useState<UserSkillRow[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  // files: local surface state — kernel not yet wired (wave-N, see docs/kernel §files)
  const transcriptRef = useRef<HTMLDivElement>(null);
  const entrySeq = useRef(0);

  // ——— Text-selection floating menu state ————————————————————————————
  const [selection, setSelection] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // ——— Composer pull-down (→ model modal) ——————————————————————————
  const [pullOffset, setPullOffset] = useState(0);
  const [pullActive, setPullActive] = useState(false);

  // ——— Composer horizontal swipe (left → + sheet, right → cycle mode) —
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeActive, setSwipeActive] = useState(false);
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);

  // ——— Transcript bubble peel (drag-to-open route) ———————————————————
  const [peel, setPeel] = useState<{ entryId: string; dx: number } | null>(null);
  const peelStart = useRef<{ x: number; entryId: string } | null>(null);

  const { data: runRow, isFetching, refetch: refetchRun } = useAgentRun(activeRun);
  const thinking = activeRun !== undefined && !runRow;

  // Killed (G-M2, AD-13): after a foreground gap the in-flight mirror row
  // may be stale — force one re-read, and surface "Reconnexion…" while it
  // settles. The hook clears itself on the first local re-read.
  const killed = useKilledDetection(() => refetchRun());

  // ——— M-22 (Q13) : « Skills installés » (la sous-écran du `+` sheet) ———
  // La liste est servie par le client `fn-skills` (AD-3 : publishable
  // scope only, RLS user-isolated) — jamais de cache local de skills
  // (l'activation se fait EN DIRECT sur le serveur, le refresh suit).
  useEffect(() => {
    if (!showSkillsSheet || !skills) return;
    let live = true;
    setSkillsLoading(true);
    setSkillsError(null);
    skills
      .listUserSkills()
      .then((rows) => {
        if (!live) return;
        // La stitch affiche TOUS les skills installés (catalogue activés +
        // persos), actifs OU non : le toggle ré-active / désactive, le
        // badge INDEXÉ reflète l'état courant (actif = indexé au prompt).
        setInstalledSkills(rows);
      })
      .catch((e: unknown) => {
        if (!live) return;
        setSkillsError(e instanceof Error ? e.message : 'chargement des skills en échec');
      })
      .finally(() => {
        if (live) setSkillsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [showSkillsSheet, skills]);

  /** Toggle un skill installé (le serveur applique, le client refresh). */
  async function toggleInstalledSkill(skillKey: string, currentlyActive: boolean) {
    if (!skills) return;
    // Optimistic flip for snappy UX (the sheet re-reads on next open).
    setInstalledSkills((prev) =>
      prev.map((s) => (s.skillKey === skillKey ? { ...s, active: !currentlyActive } : s)),
    );
    try {
      if (currentlyActive) {
        await skills.deactivateSkill(skillKey);
      } else {
        // Re-activation needs the catalog copy of the fields (the user
        // skill row may have been deactivated without dropping its data).
        const row = installedSkills.find((s) => s.skillKey === skillKey);
        await skills.activateSkill(skillKey, row ? {
          domain: row.domain,
          name: row.name,
          trigger: row.trigger ?? undefined,
          objective: row.objective ?? undefined,
          procedure: row.procedure,
          constraints: row.constraints,
          tools: row.tools,
          source: row.source,
        } : undefined);
      }
    } catch (e) {
      // Roll back the optimistic flip (honest state, AD-13).
      setInstalledSkills((prev) =>
        prev.map((s) => (s.skillKey === skillKey ? { ...s, active: currentlyActive } : s)),
      );
      setSkillsError(e instanceof Error ? e.message : 'l’activation a échoué.');
    }
  }

  /**
   * M-22 (Q13) : l'appel `/nom` dans le brouillon — quand la saisie
   * commence par `/`, le skill exact est résolu (match exact sur le nom /
   * la key des skills installés — le kernel reçoit déjà le skill résolu)
   * et INJECTÉ dans le taskProfile du run. Les skills actifs sont DÉJÀ
   * indexés (layer 1 du prompt, le kernel choisit) ; l'appel `/nom`
   * force l'activation d'UN skill précis pour ce run (le kernel active
   * le skill pour le run si inactif, sans write persistant — AD-7).
   */
  // M-22 (Q13) : l'appel `/nom` dans le brouillon — le parsing est le
  // SSoT pur `skill-slash-parse.ts` (testé par `skills-wiring.test.ts` :
  // match exact sur nom / key des skills installés, jamais flou). Les
  // skills actifs sont DÉJÀ indexés (layer 1 du prompt, le kernel
  // choisit) ; l'appel `/nom` force l'activation d'UN skill précis pour
  // ce run (le kernel active le skill pour le run si inactif, sans
  // write persistante — AD-7).
  const draftSkill = useMemo(
    () => (skills ? parseSkillSlashCall(draft, installedSkills) : null),
    [draft, installedSkills, skills],
  );

  // Reduced-motion guard (emotion-design §3, 05 §2.6 règle 2): smooth scroll
  // → instant scroll when the OS preference is ON.
  const reducedMotion = useReducedMotion();

  function push(e: Omit<Entry, 'id'>) {
    entrySeq.current += 1;
    const id = `e${entrySeq.current}`;
    setEntries((prev) => [...prev, { ...e, id }]);
    requestAnimationFrame(() => {
      transcriptRef.current?.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    });
  }

  useEffect(() => {
    if (!runRow || activeRun !== runRow.id) return;
    const terminal =
      runRow.status === 'completed' || runRow.status === 'failed' || runRow.status === 'cancelled';
    if (!terminal) return;
    const id = `term:${runRow.id}`;
    setEntries((prev) =>
      prev.some((e) => e.id === id)
        ? prev
        : [...prev, { id, role: 'agent', body: statusLine(runRow), runId: runRow.id }],
    );
    setActiveRun(undefined);
  }, [runRow, activeRun]);

  useEffect(() => {
    if (runRow && activeRun && runRow.id === activeRun) {
      requestAnimationFrame(() => {
        transcriptRef.current?.scrollTo({
          top: transcriptRef.current.scrollHeight,
          behavior: reducedMotion ? 'auto' : 'smooth',
        });
      });
    }
  }, [runRow, activeRun, reducedMotion]);

  // ——— Overlay dismissal (Escape) for the model picker + the + sheet
  // + the skills sheet (pattern: src/ux/floating.tsx). ———
  useEffect(() => {
    if (!showPicker && !showPlusSheet && !showMenuSheet && !showSkillsSheet) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowPicker(false);
        setShowPlusSheet(false);
        setShowMenuSheet(false);
        setShowSkillsSheet(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPicker, showPlusSheet, showMenuSheet, showSkillsSheet]);

  // PRD-AI §3 (10-08) : le menu du module Assistant — chaque entrée
  // route vers une surface RÉELLE (jamais de contrôle mort) : les
  // vues du module (conversations / capacités) ou des modules voisins
  // (connecteurs / skills / canvas).
  const MENU_ITEMS: Array<{ label: string; href: string; Icon: ReactNode }> = [
    { label: 'Nouvelle conversation', href: '/agent', Icon: <MessageSquare size={16} /> },
    { label: 'Conversations', href: '/agent/conversations', Icon: <MessageSquarePlus size={16} /> },
    { label: 'Capacités', href: '/agent/capacites', Icon: <SlidersHorizontal size={16} /> },
    { label: 'Bibliothèque', href: '/agent/bibliotheque', Icon: <FolderOpen size={16} /> },
    { label: 'Connecteurs', href: '/integrations', Icon: <Link2 size={16} /> },
    { label: 'Skills', href: '/skills', Icon: <Sparkles size={16} /> },
    { label: 'Canvas', href: '/canvas/new', Icon: <PenLine size={16} /> },
  ];

  async function submit() {
    const intent = draft.trim();
    if (!intent || !agent || thinking) return;
    setDraft('');
    push({ role: 'user', body: intent });
    // M-22 (Q13) : l'appel `/nom` forcé — le skill résolu dans le
    // brouillon est injecté dans le taskProfile du run (`withForcedSkill`,
    // le SSoT pur du parse) ; le kernel l'active pour le run si inactif
    // (AD-7 : le module skills applique, pas de write persistante).
    const baseProfile = {
      preferredProvider: modelChoice?.provider,
      preferredModel: modelChoice?.model,
      thinkingLevel,
      modelTier,
      researchMode,
      agentMode,
    };
    // M-22 (Q13) : le skill forcé (`forceSkillKey`) est accepté par le
    // taskProfile du run — le SSoT pur `skill-slash-parse.ts` porte le
    // champ `forceSkillKey?` optionnel sur le profile.
    const profile = withForcedSkill<Record<string, unknown> & { forceSkillKey?: string }>(
      baseProfile as Record<string, unknown>,
      draftSkill?.skill as SkillCandidate | null,
    );
    try {
      const handle = await agent.start({
        intent,
        taskProfile: profile,
      });
      setActiveRun(handle.traceId);
    } catch (err) {
      // Typed agent errors (roadmap 10-07) → plain French + a CTA that fixes
      // the state (sign in / retry). Never a raw vendor message.
      const kind =
        err && typeof err === 'object' && 'kind' in err
          ? (err as { kind?: string }).kind
          : 'unknown';
      if (kind === 'auth') {
        push({
          role: 'agent',
          body: 'Connecte-toi pour lancer l’agent.',
          ctaLabel: 'Se connecter',
          ctaHref: '/login',
        });
      } else if (kind === 'network') {
        push({
          role: 'agent',
          body: 'Pas de connexion — tes messages partiront dès que tu seras en ligne.',
        });
      } else {
        // service / server / unknown — the service is still warming up.
        push({
          role: 'agent',
          body: 'Le service est en cours de démarrage — réessaie dans un instant.',
        });
      }
    }
  }

  /**
   * Prepend the selected text into the composer draft (the « send-to-chat »
   * action of the selection menu). The selection is cleared AFTER so the
   * user can keep scrolling; focus returns to the composer.
   */
  function selectionToDraft() {
    if (!selection) return;
    const quoted = selection.text;
    setDraft((prev: string) => (prev ? `${prev}\n${quoted}` : quoted));
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    document.getElementById('agent-composer-input')?.focus();
  }

  /** Native copy (clipboard) — the « copy » action of the selection menu. */
  async function selectionCopy() {
    if (!selection) return;
    try {
      await navigator.clipboard.writeText(selection.text);
    } catch {
      /* mobile Safari: clipboard API may be gated; the text is still
         highlighted, the user can use the system share sheet. */
    }
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  // ——— selectionchange watcher (only when a selection is INSIDE the
  // transcript container — the floating menu must not track selections
  // in the composer input, the model picker, or other pages). ———
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!transcriptRef.current?.contains(range.startContainer)) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSelection({
        text: sel.toString(),
        x: Math.max(12, Math.min(window.innerWidth - 180, rect.left + rect.width / 2 - 90)),
        y: Math.max(8, rect.top - 56),
      });
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  // ————————————————————————————————————————————————————————————————
  // Composer gestures (horizontal swipe + vertical pull-down)
  // Both live on the composer row. The handler distinguishes the two
  // by the dominant axis at pointermove (first 15 px past the dead-zone).
  // ————————————————————————————————————————————————————————————————

  function onComposerPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Ignore if the user is interacting with a real control (buttons, input).
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a')) return;
    swipeStart.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    setSwipeActive(true);
  }

  function onComposerPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!swipeStart.current) return;
    const dx = e.clientX - swipeStart.current.x;
    const dy = e.clientY - swipeStart.current.y;

    // Past the dead-zone: decide the axis (|dx| vs |dy| dominates).
    if (!swipeActive) return;
    if (Math.abs(dx) < GESTURE_DEAD_ZONE && Math.abs(dy) < GESTURE_DEAD_ZONE) return;

    if (Math.abs(dx) >= Math.abs(dy)) {
      // Horizontal: LEFT swipe → open the + sheet (files / connectors /
      // research — the sheet is the "right" surface, reaching left for it);
      // RIGHT swipe → cycle the agent-mode tab (chat → agent → mirror).
      const clamped = Math.max(-96, Math.min(96, dx));
      setSwipeOffset(clamped);
    } else if (dy > 0) {
      // Vertical down-pull → model modal (pull-to-open, spring-back below
      // the PULL_OPEN_DISTANCE threshold). 15 % damping keeps it calm.
      setPullOffset(Math.min(120, dy * 0.85));
      setPullActive(true);
    }
  }

  function onComposerPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;

    if (start) {
      const totalDx = e.clientX - start.x;
      const totalDy = e.clientY - start.y;
      const dt = Math.max(1, performance.now() - start.t);
      const velocity = Math.abs(totalDx) / dt;
      if (totalDx < -GESTURE_DEAD_ZONE) {
        // LEFT swipe → open the + sheet (connectors / skills / research).
        if (Math.abs(totalDx) > 64 || velocity > GESTURE_VELOCITY) {
          setShowPicker(false);
          setShowPlusSheet(true);
        }
      } else if (totalDx > GESTURE_DEAD_ZONE) {
        // RIGHT swipe → cycle the agent mode (M-12 v2) : le cycle suit le
        // segment control du composer (MODE_PILLS : Ask → Agent → Miroir),
        // plus le mode complet AGENT_MODES (ascent inclut) : le swipe reste
        // une surface geste « calme » qui n'invente pas de mode hors
        // puce.
        if (Math.abs(totalDx) > 64 || velocity > GESTURE_VELOCITY) {
          setAgentMode((prev) => {
            const idx = Math.max(0, AGENT_MODES.findIndex((m) => m.id === prev));
            return AGENT_MODES[(idx + 1) % AGENT_MODES.length]!.id;
          });
        }
      } else if (totalDy > PULL_OPEN_DISTANCE) {
        // Down-pull past the threshold → open the model picker modal.
        setShowPlusSheet(false);
        setShowPicker(true);
      }
    }

    setSwipeActive(false);
    setPullActive(false);
    setSwipeOffset(0);
    setPullOffset(0);
    swipeStart.current = null;
  }

  // ————————————————————————————————————————————————————————————————
  // Transcript bubble peel (drag-to-open a route entry, 04 §3.2.5)
  // Only entries carrying a `route` are peelable; the chevron affordance
  // is the only visual cue (a static `→` line, no shadow), so the surface
  // stays calm by default.
  // ————————————————————————————————————————————————————————————————

  function onBubblePointerDown(e: ReactPointerEvent<HTMLDivElement>, entryId: string) {
    peelStart.current = { x: e.clientX, entryId };
  }
  function onBubblePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!peelStart.current) return;
    const dx = Math.min(0, e.clientX - peelStart.current.x); // left only
    if (dx > -GESTURE_DEAD_ZONE) return;
    setPeel({ entryId: peelStart.current.entryId, dx: Math.max(-160, dx * 0.7) });
  }
  function onBubblePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!peelStart.current) return;
    const totalDx = e.clientX - peelStart.current.x;
    const entry = entries.find((x) => x.id === peelStart.current?.entryId);
    if (totalDx < -96 && entry?.route) {
      // Confirmed peel: navigate to the target page over the chat (agent-chat
      // §5.1 G4). `state.from = '/agent'` preserves the return context — the
      // native back returns to this conversation (02 §6.3, RET column).
      navigate(entry.route, { state: { from: '/agent' } });
    }
    setPeel(null);
    peelStart.current = null;
  }

  const inFlightRow = activeRun && runRow && runRow.id === activeRun ? runRow : null;

  return (
    <>
      <IonHeader>
        {/* PRD-AI §2/§3 (10-08) : « bouton menu rond en haut à gauche »
            — le menu du module Assistant (pas de barre d'onglets interne :
            navigation par feuille basse), titre centré. */}
        <IonButtons slot="start">
          <IonButton
            fill="clear"
            onClick={() => { setShowPicker(false); setShowPlusSheet(false); setShowMenuSheet(true); }}
            aria-label="Ouvrir le menu de l'assistant"
          >
            <Menu size={20} />
          </IonButton>
        </IonButtons>
        <IonTitle>Aurora</IonTitle>
      </IonHeader>
      <IonContent>
        <div className="agent-chat">
          {/* M-12 (v2 MVP S1) — le sélecteur de mode vit DANS la carte de
              saisie (puce segment 3 options Ask/Agent/Miroir sous l'input,
              maquette Stitch), PLUS en haut de page : l'écran d'accueil =
              orbe + titre (M-11b), le mode actif est rappelé par la puce. */}

          <div
            ref={transcriptRef}
            id="agent-transcript"
            className="agent-transcript"
            role="tabpanel"
            tabIndex={0}
            data-state={
              agent
                ? killed && thinking
                  ? 'killed'
                  : entries.length || inFlightRow
                    ? 'streaming'
                    : thinking
                      ? 'loading'
                      : 'empty'
                : 'offline'
            }
          >
            {!agent && (
              <div className="agent-empty">
                <p>
                  L'agent n'est pas encore disponible.
                </p>
                <a
                  className="aurora-btn aurora-btn--primary aurora-tap"
                  href="/login"
                  data-cta="agent-login"
                >
                  Se connecter
                </a>
              </div>
            )}

            {/* M-11b (v2 MVP S1) — l'orbe Aurora dans l'état vide du chat
                (maquette Stitch `agent_accueil_fraunces`) : l'orbe
                (cercle radial-gradient + 2 yeux, COULEUR DYNAMIQUE
                `--aurora-accent-*`, jamais de hex) AU-DESSUS du titre
                « Que puis-je faire pour vous ? » + sous-titre du mode +
                les quick-actions pills de la maquette (structure exacte,
                non inventée). */}
            {agent && entries.length === 0 && !thinking && !inFlightRow && (
              <div className="agent-empty">
                <div className="agent-empty__orb">
                  <AuroraOrb />
                </div>
                <h2 className="agent-empty__title">Que puis-je faire pour vous ?</h2>
                <p className="agent-empty__subtitle">
                  {agentMode === 'chat'
                    ? 'Mode Ask : je lis et je réponds — je n’écris rien sans que vous passiez en mode Agent.'
                    : agentMode === 'mirror'
                      ? 'Mode Miroir : je vous fais pratiquer et diagnostique vos acquis.'
                      : agentMode === 'ascent'
                        ? 'Mode Ascent : je vous guide montée après montée sur vos objectifs.'
                        : 'Mode Agent : j’agis sur vos veilles, votre agenda et vos sessions Focus.'}
                </p>
                <div className="agent-empty__suggestions">
                  <button
                    type="button"
                    className="agent-empty__suggestion"
                    onClick={() => setDraft(agentMode === 'agent' ? 'Crée une veille sur ' : 'Où j’en suis sur ')}
                  >
                    <Compass size={16} aria-hidden />
                    {agentMode === 'agent' ? 'Créer une veille' : 'Où j’en suis sur…'}
                  </button>
                  <button
                    type="button"
                    className="agent-empty__suggestion"
                    onClick={() => setDraft(agentMode === 'agent' ? 'Planifie un focus sur ' : '')}
                    disabled={agentMode !== 'agent'}
                  >
                    <Timer size={16} aria-hidden />
                    Planifier un Focus
                  </button>
                  <button
                    type="button"
                    className="agent-empty__suggestion"
                    onClick={() => setShowPlusSheet(true)}
                  >
                    Plus
                  </button>
                </div>
              </div>
            )}

            {entries.map((e) => {
              const isPeeling = peel?.entryId === e.id;
              const peeling = isPeeling ? peel!.dx : 0;
              return (
                <div
                  key={e.id}
                  className={`agent-entry agent-entry--${e.role} ${e.route ? 'agent-entry--peelable' : ''}`}
                  style={
                    isPeeling
                      ? { transform: `translateX(${peeling}px)`, transition: 'transform 220ms ' + PULL_OPEN_EASE }
                      : undefined
                  }
                  onPointerDown={(ev) => e.route && onBubblePointerDown(ev, e.id)}
                  onPointerMove={(ev) => e.route && onBubblePointerMove(ev)}
                  onPointerUp={(ev) => e.route && onBubblePointerUp(ev)}
                  onPointerCancel={() => setPeel(null)}
                >
                  <div className="agent-entry-body">{e.body}</div>
                  {e.mirror && e.role === 'agent' && (
                    /* S6 M-62 (plan v2) : le bloc « Lacunes détectées »
                       vit DANS la bulle de l'agent (le contrat M-61,
                       `docs/adr/mirror-contract.md` : l'écran Miroir
                       = un écran du chat, pas une route du shell).
                       Les 3 actions de la carte émettent des
                       commandes typées (AD-7 thin emitters) : le
                       chat ne crée JAMAIS l'event Focus / la veille
                       / la preuve — les modules propriétaires
                       appliquent (le F-07 invariant : seul Progress
                       écrit une `ProgressEvidence`). */
                    <MirrorFindingsCard
                      subjectLabel={e.mirror.subjectLabel}
                      subjectId={e.mirror.subjectId}
                      reformulation={e.mirror.reformulation}
                      findings={e.mirror.findings}
                      question={e.mirror.question}
                      validated={e.mirror.validated}
                      onFocusPlan={(skillId) => {
                        // Le command `focus.plan` (le module Focus
                        // applique — l'app n'écrit rien, AD-7) : le
                        // focus cible le skill / le concept du miroir.
                        // L'intention est poussée dans le draft
                        // (le run du kernel fait le reste, M-62 flow).
                        setDraft(`Planifie un Focus sur ${skillId} (provenance miroir : ${e.mirror!.subjectLabel ?? 'sujet non nommé'})`);
                      }}
                      onCreateVeille={({ topic, source }: { topic: string; source: string }) => {
                        // Le command `discovery.create` (G1 writer
                        // automations, lot B AD-7) : la veille naît
                        // du miroir (l'AD-11 provenance = `source`),
                        // jamais d'un clic du module Discovery.
                        setDraft(`Crée une veille sur ${topic || 'ce sujet'} (provenance ${source})`);
                      }}
                      onValidateEvidence={(payload: Record<string, unknown>) => {
                        // M-63 (ADR mirror-contract.md) : la commande
                        // `progress.evidence_create` (confirmation
                        // OBLIGATOIRE — ADR §5, briefing §12 : la
                        // validation d'une preuve est une action
                        // importante / irréversible). Le flag
                        // `validated` est mis à jour ici (l'UI
                        // signale l'intention confirmée) ; l'écriture
                        // de la row `progress_evidences` est faite par
                        // le module Progress (F-07 : seul producteur,
                        // l'agent propose, Progress commite).
                        setDraft(
                          `Valide la preuve du miroir : ${JSON.stringify(
                            { ...(payload as Record<string, unknown>), _source: 'mirror' },
                          )} (provenance AD-11 : ${e.mirror!.subjectLabel ?? 'sujet non nommé'})`,
                        );
                        setEntries((prev) =>
                          prev.map((x) =>
                            x.id === e.id && x.mirror
                              ? { ...x, mirror: { ...x.mirror, validated: true } }
                              : x,
                          ),
                        );
                      }}
                    />
                  )}
                  {e.ctaLabel && e.ctaHref && (
                    <a
                      className="agent-entry-cta"
                      href={e.ctaHref}
                      data-cta={e.ctaLabel}
                    >
                      {e.ctaLabel}
                    </a>
                  )}
                  {e.route && (
                    /* Peel affordance (agent-chat §5.1 G4): a focusable button
                       in addition to the drag gesture — the keyboard / SR
                       equivalent of the swipe. The chevron is decorative;
                       the button's aria-label carries the meaning. */
                    <button
                      type="button"
                      className="agent-entry-route"
                      onClick={() => navigate(e.route ?? '/', { state: { from: '/agent' } })}
                      aria-label={`Ouvrir ${e.routeLabel ?? 'la page'}`}
                    >
                      <ArrowRight size={12} aria-hidden />
                      <span>{e.routeLabel ?? 'Ouvrir la page'}</span>
                    </button>
                  )}
                </div>
              );
            })}

            {thinking && (
              <AgentThinkingLoader
                status="thinking"
                label={`L'agent réfléchit (${thinkingLevel})…`}
                className="agent-thinking"
              />
            )}

            {/* Killed (G-M2): sub-state of loading — the mirror re-reads on
                foreground return; honest "Reconnexion…" line, no fake state. */}
            {killed && (thinking || inFlightRow) && (
              <div className="agent-entry agent-entry--agent">
                <div className="agent-entry-status" aria-live="polite">
                  Reconnexion…
                </div>
              </div>
            )}

            {inFlightRow && (
              <div className="agent-entry agent-entry--agent">
                <div
                  className={`agent-entry-status ${inFlightRow.confirmationMessage ? 'is-attention' : ''}`}
                  aria-live="polite"
                >
                  {statusLine(inFlightRow)}
                </div>
              </div>
            )}
          </div>

          {/* Floating text-selection action bar (Copy / Send-to-chat / Open
              page) — appears when a selection is inside the transcript. */}
          {selection && (
            <div
              className="agent-selection-menu"
              role="menu"
              aria-label="Actions sur la sélection"
              style={{ left: selection.x, top: selection.y }}
            >
              <button
                type="button"
                onClick={selectionCopy}
                aria-label="Copier la sélection"
              >
                <Copy size={14} />
                <span>Copier</span>
              </button>
              <button
                type="button"
                onClick={selectionToDraft}
                aria-label="Ajouter au chat"
              >
                <Send size={14} />
                <span>Dans le chat</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  // « Open page » = treat the selection as a query and open
                  // the knowledge search (the natural destination for a
                  // quoted snippet). If the selection looks like a route
                  // (a known in-app path), navigate there instead.
                  const text = selection.text.trim();
                  const looksLikeRoute =
                    text.startsWith('/') && !text.includes(' ') && text.length < 64;
                  setSelection(null);
                  window.getSelection()?.removeAllRanges();
                  if (looksLikeRoute) {
                    navigate(text);
                  } else {
                    navigate(`/knowledge?q=${encodeURIComponent(text)}`);
                  }
                }}
                aria-label="Ouvrir dans l'app"
              >
                <Quote size={14} />
                <span>Ouvrir</span>
              </button>
            </div>
          )}

          {/* Active chips: research + connectors */}
          <div className="agent-active-chips">
            <button
              type="button"
              className={`agent-chip ${researchMode !== 'off' ? 'is-on' : ''}`}
              onClick={() => setResearchMode(researchMode === 'off' ? 'standard' : 'off')}
              disabled={!agent || thinking}
              aria-label="Mode recherche"
            >
              <Search size={12} />
              {researchMode === 'off' ? 'Recherche' : researchMode === 'deep' ? 'Deep' : 'Standard'}
            </button>
            <button
              type="button"
              className="agent-chip"
              onClick={() => {
                setShowPicker(false);
                setShowPlusSheet(true);
              }}
              disabled={!agent || thinking}
              aria-label="Plus d'options"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="agent-chip"
              onClick={() => navigate('/canvas/new', { state: { from: '/agent' } })}
              aria-label="Ouvrir un canvas (édition de contenu)"
            >
              <PenLine size={14} />
              <span>Canvas</span>
            </button>
            {connectors.length > 0 && (
              <span className="agent-chip agent-chip--static">
                <Link2 size={12} />
                {connectors.length}
              </span>
            )}
          </div>

          {/* Composer (pinned, swipe surface) */}
          <div
            className="agent-composer-gesture"
            onPointerDown={onComposerPointerDown}
            onPointerMove={onComposerPointerMove}
            onPointerUp={onComposerPointerUp}
            onPointerCancel={onComposerPointerUp}
            style={{
              transform: `translateX(${swipeOffset}px) translateY(${pullOffset}px)`,
              transition:
                swipeActive || pullActive ? 'none' : 'transform 260ms ' + PULL_OPEN_EASE,
              touchAction: 'none',
            }}
          >
            <form
              className="agent-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {/* M-12 (v2 MVP S1) — le sélecteur de mode vit DANS la carte
                  de saisie (segment control 3 options Ask/Agent/Miroir de
                  la maquette Stitch), PLUS en haut de page. L'appui sur la
                  puce de modèle « Auto » ouvre la feuille « Réflexion et
                  modèle » EXISTANTE (`.agent-model-picker-modal`, M-21 la
                  refactorise — on ne la réinvente pas ici). */}
              <div className="agent-composer-top">
                <div className="agent-mode-pill" role="radiogroup" aria-label="Mode de l'agent">
                  {MODE_PILLS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={agentMode === m.id}
                      className={`agent-mode-pill__option ${agentMode === m.id ? 'is-active' : ''}`}
                      onClick={() => setAgentMode(m.id)}
                      disabled={!agent || thinking}
                    >
                      <span className="agent-mode-pill__icon" aria-hidden>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="agent-composer-row">
                <button
                  type="button"
                  className="agent-model-picker-trigger"
                  onClick={() => {
                    setShowPlusSheet(false);
                    setShowPicker(true);
                  }}
                  aria-label="Choisir le modèle et le niveau de réflexion"
                  disabled={!agent || thinking}
                >
                  {modelChoice ? (
                    <span className="agent-model-picker-label">
                      <Cpu size={12} aria-hidden />
                      {modelChoice.model}
                    </span>
                  ) : (
                    <span className="agent-model-picker-label">
                      <Sparkles size={12} aria-hidden />
                      Auto
                    </span>
                  )}
                </button>

                <input
                  id="agent-composer-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Demandez, ou tapez / pour un skill"
                  aria-label="Écrire à l'agent"
                  disabled={!agent || isFetching}
                />
                <button
                  type="submit"
                  className="agent-composer-send"
                  disabled={!agent || draft.trim().length === 0 || thinking}
                  aria-label="Envoyer"
                >
                  <Send size={18} />
                </button>
              </div>

              {/* M-12 — texte d'aide sous la carte : invite à taper « / »
                  pour appeler un skill (M-22 l'indexe côté agent). */}
              <div className="agent-composer-help">
                Tapez <code>/</code> pour appeler un skill, glissez le curseur pour les options.
              </div>
            </form>

            {/* Hint line (only visible while swiping: « glisser → options ») */}
            {(swipeActive || pullActive) && (
              <div className="agent-composer-hint" aria-live="polite">
                {swipeOffset < -16
                  ? 'Relâche pour les options'
                  : swipeOffset > 16
                  ? 'Relâche pour changer de mode'
                  : pullOffset > 16
                  ? 'Relâche pour le choix du modèle'
                  : 'Glisse'}
              </div>
            )}
          </div>

          {/* Model + thinking level picker modal */}
          {showPicker && (
            <div
              className="agent-model-picker-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Choix du modèle"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setShowPicker(false);
              }}
            >
              <div className="agent-model-picker-header">
                <Bot size={16} aria-hidden />
                <h3>Modèle & réflexion</h3>
                <button
                  type="button"
                  className="agent-model-picker-close"
                  onClick={() => setShowPicker(false)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <div className="agent-model-picker-body">
                {/* M-21 (stitch écran 4 « Réflexion et modèle ») : les 3
                    niveaux affichés Rapide / Équilibré / Approfondi — les
                    VALEURS restent low / medium / high|max (max hérité du
                    picker v1 ≠ Approfondi, même choix). */}
                <div className="agent-picker-section">
                  <div className="agent-picker-section-label">Niveau de réflexion</div>
                  <div className="agent-thinking-levels" role="radiogroup" aria-label="Niveau de réflexion">
                    {THINKING_LEVELS_BY_GROUP.map((group) => {
                      const active = group.values.includes(thinkingLevel);
                      const value = active ? thinkingLevel : group.values[0]!;
                      return (
                        <button
                          key={group.label}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          tabIndex={active ? 0 : -1}
                          className={`agent-thinking-level ${active ? 'is-active' : ''}`}
                          onClick={() => setThinkingLevel(value)}
                        >
                          {group.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="agent-thinking-level-help">
                    Plan court et vérification légère. Plus l'agent réfléchit, plus la réponse est
                    fiable, mais plus elle est lente.
                  </p>
                </div>

                {/* M-21 (Q12) : le MODÈLE par palier typé (Auto / Léger /
                    Standard / Avancé) — paramètre du profil de tâche
                    (taskProfile.modelTier), jamais un mot-clé du prompt
                    (ADR §6). Le choix de palier efface le pin d'un modèle
                    précis (le palier résout côté routeur). */}
                <div className="agent-picker-section">
                  <div className="agent-picker-section-label">Modèle</div>
                  <div
                    className="agent-model-tier-list"
                    role="radiogroup"
                    aria-label="Palier de modèle"
                  >
                    {MODEL_TIER_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className={`agent-model-tier ${modelTier === opt.id ? 'is-active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="agent-model-tier"
                          value={opt.id}
                          checked={modelTier === opt.id}
                          onChange={() => {
                            setModelTier(opt.id);
                            if (opt.id !== 'auto') setModelChoice(null);
                          }}
                        />
                        <span className="agent-model-tier-label">
                          <span className="agent-model-tier-title">
                            {opt.label}
                            {opt.id === 'auto' && (
                              <span className="agent-model-tier-badge">Recommandé</span>
                            )}
                          </span>
                          <span className="agent-model-tier-hint">{opt.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Le pin précis d'un modèle (picker v1) reste disponible —
                      il prime sur le palier (applyModelTierToProfile). */}
                  <button
                    type="button"
                    className={`agent-model-picker-option ${modelChoice ? 'is-active' : ''}`}
                    onClick={() => {
                      // « Auto » = le routeur décide : on revient au palier
                      // auto (pas de pin précis).
                      if (!modelChoice) {
                        setModelTier('auto');
                        setShowPicker(false);
                      }
                    }}
                    aria-label="Auto — le router choisit"
                  >
                    <Sparkles size={14} aria-hidden />
                    <span>Auto — le router choisit</span>
                  </button>

                  {MODEL_CATALOG.map((entry) => (
                    <div key={entry.provider} className="agent-model-picker-group">
                      <div className="agent-model-picker-group-label">{entry.name}</div>
                      {entry.models.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`agent-model-picker-option ${
                            modelChoice?.provider === entry.provider && modelChoice.model === m
                              ? 'is-active'
                              : ''
                          }`}
                          onClick={() => {
                            setModelChoice({ provider: entry.provider, model: m });
                            setModelTier('auto');
                            setShowPicker(false);
                          }}
                        >
                          <Cpu size={14} aria-hidden />
                          <span>{m}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* + sheet: connectors / skills / research */}
          {showPlusSheet && (
            <div
              className="agent-plus-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Options du chat"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setShowPlusSheet(false);
              }}
            >
              <div className="agent-plus-header">
                <h3>Options</h3>
                <button
                  type="button"
                  className="agent-plus-close"
                  onClick={() => setShowPlusSheet(false)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>

              <div className="agent-plus-section">
                <div className="agent-plus-label">Recherche</div>
                {RESEARCH_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`agent-plus-option ${researchMode === m.id ? 'is-active' : ''}`}
                    onClick={() => setResearchMode(m.id)}
                  >
                    <Search size={14} aria-hidden />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              <div className="agent-plus-section">
                <div className="agent-plus-label">Connecteurs (Composio)</div>
                {connectors.map((c) => (
                  <label key={c} className="agent-plus-connector">
                    <input
                      type="checkbox"
                      checked={connectors.includes(c)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...connectors, c]
                          : connectors.filter((x) => x !== c);
                        setConnectors(next);
                      }}
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>

              <div className="agent-plus-section">
                <div className="agent-plus-label">Skills</div>
                <button
                  type="button"
                  className="agent-plus-option"
                  onClick={() => {
                    setShowPlusSheet(false);
                    setShowSkillsSheet(true);
                  }}
                >
                  <Sparkles size={14} aria-hidden />
                  <span>
                    Skills installés{' '}
                    {installedSkills.length > 0 ? `(${installedSkills.length})` : ''}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* M-22 (Q13) — feuille basse « Skills installés » (stitch
              `agent_skills_install_s_fraunces`) : le SSoT de la
              sous-écran du `+` sheet. Liste des skills installés
              (catalogue activés + persos), badges INDEXÉ (actif,
              blue) / NON INDEXÉ (inactif, amber), iOS-style toggles,
              sous-titre + les 2 CTA du footer (Gérer = /skills,
              Parcourir = /agent/bibliotheque). */}
          {showSkillsSheet && (
            <div
              className="agent-plus-sheet agent-skills-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Skills installés"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setShowSkillsSheet(false);
              }}
            >
              <div className="agent-skills-header">
                <button
                  type="button"
                  className="agent-skills-back"
                  onClick={() => setShowSkillsSheet(false)}
                  aria-label="Retour"
                >
                  <ChevronLeft size={20} aria-hidden />
                </button>
                <h3>Skills installés</h3>
              </div>
              <p className="agent-skills-subtitle">
                Les skills actifs sont indexés : l'agent choisit le bon
                selon votre demande, ou tapez{' '}
                <span className="agent-skills-slash">/</span> dans la
                saisie pour en appeler un.
              </p>

              {skillsError && (
                <div className="agent-skills-error" role="alert">
                  {skillsError}
                </div>
              )}

              {skillsLoading && installedSkills.length === 0 ? (
                <div className="agent-skills-empty">
                  <Loader2 size={16} className="is-spin" aria-hidden />
                  <span>Chargement des skills…</span>
                </div>
              ) : installedSkills.length === 0 ? (
                <div className="agent-skills-empty">
                  <Sparkles size={16} aria-hidden />
                  <span>Aucun skill installé pour l'instant.</span>
                </div>
              ) : (
                <ul className="agent-skills-list" data-purpose="skills-list">
                  {installedSkills.map((s) => (
                    <li key={s.skillKey} className="agent-skills-item">
                      <div className="agent-skills-item-text">
                        <span className="agent-skills-item-name">{s.name}</span>
                        <span className="agent-skills-item-desc">
                          {s.trigger ?? s.objective ?? sourceSkillLabel(s)}
                        </span>
                      </div>
                      <div className="agent-skills-item-controls">
                        <span
                          className={`agent-skills-badge ${s.active ? 'is-indexed' : 'is-not-indexed'}`}
                        >
                          {s.active ? 'INDEXÉ' : 'NON INDEXÉ'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={s.active}
                          aria-label={s.active ? `Désactiver ${s.name}` : `Activer ${s.name}`}
                          className={`agent-skills-toggle ${s.active ? 'is-on' : ''}`}
                          onClick={() => void toggleInstalledSkill(s.skillKey, s.active)}
                        >
                          <span className="agent-skills-toggle-knob" aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="agent-skills-actions">
                <button
                  type="button"
                  className="agent-skills-btn-outline"
                  onClick={() => {
                    setShowSkillsSheet(false);
                    navigate('/skills');
                  }}
                >
                  Gérer les skills
                </button>
                <button
                  type="button"
                  className="agent-skills-btn-filled"
                  onClick={() => {
                    setShowSkillsSheet(false);
                    navigate('/agent/bibliotheque');
                  }}
                >
                  Parcourir les skills
                </button>
              </div>
            </div>
          )}

          {/* Menu du module Assistant (PRD-AI §2/§3, 10-08) : bouton rond
              en haut à gauche → feuille basse. Chaque entrée route vers
              une surface réelle (jamais de contrôle mort, AD-7). */}
          {showMenuSheet && (
            <div
              className="agent-plus-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Menu de l'assistant"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setShowMenuSheet(false);
              }}
            >
              <div className="agent-plus-header">
                <h3>Assistant</h3>
                <button
                  type="button"
                  className="agent-plus-close"
                  onClick={() => setShowMenuSheet(false)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              {MENU_ITEMS.map(({ label, href, Icon }) => (
                <a
                  key={href}
                  className="agent-plus-option agent-menu-item aurora-tap"
                  href={href}
                  onClick={() => setShowMenuSheet(false)}
                >
                  {Icon}
                  <span>{label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </IonContent>
    </>
  );
}
