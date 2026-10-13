/**
 * SkillsView — vue de compétences (cat. 2.13, 4.13).
 *
 * Étape 2 (muet) : reçoit `SkillsViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.13) :
 * - `SkillDomainChip` (puce de domaine : Dev, Design, Data, Product, Ops, AI, Soft)
 * - `SkillSearchBar` (recherche)
 * - `SkillCard` (compétence : nom, niveau, preuves, pratique)
 * - `SkillLevelIndicator` (niveau 0-5 + barre)
 * - `SkillEvidenceList` (preuves de maîtrise)
 * - `SkillPracticeAction` (action de pratique associée)
 * - `SkillComparisonPanel` (comparaison de 2 compétences)
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Progress } from "src/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type SkillDomain =
  | "dev"
  | "design"
  | "data"
  | "product"
  | "ops"
  | "ai"
  | "soft";

export const SKILL_DOMAIN_LABELS: Record<SkillDomain, string> = {
  dev: "Dev",
  design: "Design",
  data: "Data",
  product: "Product",
  ops: "Ops",
  ai: "AI",
  soft: "Soft skills",
};

export const SKILL_DOMAIN_ICONS: Record<SkillDomain, IconKey> = {
  dev: "code",
  design: "image",
  data: "chart",
  product: "project",
  ops: "tool",
  ai: "insight",
  soft: "success",
};

export interface SkillEvidence {
  id: string;
  label: string;
  /** Type de preuve : projet, témoignage, certification, pratique. */
  kind: "project" | "testimonial" | "certification" | "practice";
  date?: string;
}

export interface SkillPractice {
  id: string;
  label: string;
  /** Durée estimée (min). */
  durationMin?: number;
  /** Lien vers une tâche. */
  taskRef?: string;
}

export interface SkillData {
  id: string;
  name: string;
  domain: SkillDomain;
  /** Niveau 0-5 (SsOT `skill.level`). */
  level: number;
  /** Description. */
  description?: string;
  /** Preuves de maîtrise. */
  evidence: SkillEvidence[];
  /** Actions de pratique. */
  practices: SkillPractice[];
  /** Icône optionnelle. */
  icon?: IconKey;
  /** Color d'accent. */
  color?: string;
}

export interface SkillsViewData {
  title: string;
  description?: string;
  searchQuery: string;
  /** Domaines filtrés (null = tous). */
  activeDomain: SkillDomain | null;
  skills: SkillData[];
  /** Compétence sélectionnée (inspecteur). */
  selectedSkillId?: string | null;
}

export interface SkillsViewProps {
  data: SkillsViewData;
  onSearch: (q: string) => void;
  onDomainChange: (d: SkillDomain | null) => void;
  onSelectSkill: (id: string | null) => void;
  onCreateSkill?: (name: string, domain: SkillDomain) => void;
  onAddPractice?: (skillId: string, practice: SkillPractice) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* SkillDomainChip                                                    */
/* ------------------------------------------------------------------ */

export interface SkillDomainChipProps {
  domain: SkillDomain;
  active?: boolean;
  onClick?: () => void;
  count?: number;
  className?: string;
}

export function SkillDomainChip({
  domain,
  active,
  onClick,
  count,
  className,
}: SkillDomainChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted",
        className
      )}
    >
      <AppIcon name={SKILL_DOMAIN_ICONS[domain]} size="xs" aria-hidden />
      {SKILL_DOMAIN_LABELS[domain]}
      {count !== undefined && (
        <span className="tabular-nums text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* SkillSearchBar                                                     */
/* ------------------------------------------------------------------ */

export interface SkillSearchBarProps {
  value: string;
  onChange: (q: string) => void;
  className?: string;
}

export function SkillSearchBar({
  value,
  onChange,
  className,
}: SkillSearchBarProps) {
  return (
    <div data-slot="skill-search-bar" className={cn("relative", className)}>
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
        placeholder="Rechercher une compétence…"
        className="h-8 pl-7 text-sm"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SkillLevelIndicator                                               */
/* ------------------------------------------------------------------ */

const LEVEL_LABELS = ["Débutant", "Notions", "Intermédiaire", "Avancé", "Expert", "Maîtrise"];

export interface SkillLevelIndicatorProps {
  level: number;
  /** Affiche le libellé. */
  showLabel?: boolean;
  /** Affiche la barre de progression. */
  showBar?: boolean;
  className?: string;
}

export function SkillLevelIndicator({
  level,
  showLabel = true,
  showBar = true,
  className,
}: SkillLevelIndicatorProps) {
  const clamped = Math.max(0, Math.min(5, level));
  return (
    <div
      data-slot="skill-level-indicator"
      data-level={clamped}
      className={cn("flex items-center gap-2", className)}
    >
      {showBar && (
        <Progress value={(clamped / 5) * 100} className="h-1.5 flex-1" />
      )}
      {showLabel && (
        <span className="text-xs font-medium tabular-nums">
          {LEVEL_LABELS[clamped]}
          <span className="ml-1 text-muted-foreground">
            {clamped}/5
          </span>
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SkillEvidenceList                                                 */
/* ------------------------------------------------------------------ */

const EVIDENCE_KIND_LABELS: Record<SkillEvidence["kind"], string> = {
  project: "Projet",
  testimonial: "Témoignage",
  certification: "Certification",
  practice: "Pratique",
};

export interface SkillEvidenceListProps {
  evidence: SkillEvidence[];
  onOpenEvidence?: (evidence: SkillEvidence) => void;
  className?: string;
}

export function SkillEvidenceList({
  evidence,
  onOpenEvidence,
  className,
}: SkillEvidenceListProps) {
  if (evidence.length === 0) return null;
  return (
    <div
      data-slot="skill-evidence-list"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <p className="text-xs font-medium text-muted-foreground">
        Preuves ({evidence.length})
      </p>
      {evidence.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onOpenEvidence?.(e)}
          className={cn(
            "flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-left text-xs transition-colors",
            onOpenEvidence && "hover:bg-muted cursor-pointer"
          )}
        >
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {EVIDENCE_KIND_LABELS[e.kind]}
          </Badge>
          <span className="min-w-0 flex-1 truncate">{e.label}</span>
          {e.date && (
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {new Date(e.date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SkillPracticeAction                                                */
/* ------------------------------------------------------------------ */

export interface SkillPracticeActionProps {
  practice: SkillPractice;
  onOpen?: () => void;
  className?: string;
}

export function SkillPracticeAction({
  practice,
  onOpen,
  className,
}: SkillPracticeActionProps) {
  return (
    <div
      data-slot="skill-practice-action"
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-xs",
        className
      )}
    >
      <AppIcon name="task" size="xs" tone="muted" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{practice.label}</span>
      {practice.durationMin !== undefined && (
        <span className="shrink-0 tabular-nums text-muted-foreground">
          ~{practice.durationMin} min
        </span>
      )}
      {onOpen && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px]"
          onClick={onOpen}
        >
          Pratiquer
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SkillCard                                                          */
/* ------------------------------------------------------------------ */

export interface SkillCardProps {
  skill: SkillData;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showEvidence?: boolean;
  showPractices?: boolean;
  onOpenEvidence?: (evidence: SkillEvidence) => void;
  onOpenPractice?: (practice: SkillPractice) => void;
  className?: string;
}

export function SkillCard({
  skill,
  selected,
  onSelect,
  showEvidence = true,
  showPractices = true,
  onOpenEvidence,
  onOpenPractice,
  className,
}: SkillCardProps) {
  return (
    <Card
      data-slot="skill-card"
      data-skill-id={skill.id}
      data-selected={selected}
      className={cn(
        "gap-0 py-3 transition-colors",
        selected && "border-primary bg-primary/5",
        onSelect && "cursor-pointer hover:border-muted-foreground/40",
        className
      )}
      onClick={() => onSelect?.(skill.id)}
    >
      <CardHeader className="flex flex-col gap-2 space-y-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-md border"
              style={{
                backgroundColor: skill.color ? `${skill.color}15` : undefined,
              }}
            >
              <AppIcon
                name={skill.icon ?? SKILL_DOMAIN_ICONS[skill.domain]}
                size="md"
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{skill.name}</p>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {SKILL_DOMAIN_LABELS[skill.domain]}
                </Badge>
              </div>
              {skill.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {skill.description}
                </p>
              )}
            </div>
          </div>
        </div>
        <SkillLevelIndicator level={skill.level} />
      </CardHeader>

      {(showEvidence || showPractices) && (
        <CardContent className="flex flex-col gap-3 p-4 pt-0">
          {showEvidence && (
            <SkillEvidenceList
              evidence={skill.evidence}
              onOpenEvidence={onOpenEvidence}
            />
          )}
          {showPractices && skill.practices.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Pour progresser
              </p>
              <div className="flex flex-col gap-1">
                {skill.practices.map((p) => (
                  <SkillPracticeAction
                    key={p.id}
                    practice={p}
                    onOpen={() => onOpenPractice?.(p)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* SkillComparisonPanel                                               */
/* ------------------------------------------------------------------ */

export interface SkillComparisonPanelProps {
  skillA: SkillData;
  skillB: SkillData;
  onClose?: () => void;
  className?: string;
}

export function SkillComparisonPanel({
  skillA,
  skillB,
  onClose,
  className,
}: SkillComparisonPanelProps) {
  const rows: { label: string; a: string; b: string; aWins: boolean }[] = [
    {
      label: "Niveau",
      a: `${skillA.level}/5`,
      b: `${skillB.level}/5`,
      aWins: skillA.level > skillB.level,
    },
    {
      label: "Preuves",
      a: `${skillA.evidence.length}`,
      b: `${skillB.evidence.length}`,
      aWins: skillA.evidence.length > skillB.evidence.length,
    },
    {
      label: "Pratiques",
      a: `${skillA.practices.length}`,
      b: `${skillB.practices.length}`,
      aWins: skillA.practices.length > skillB.practices.length,
    },
  ];

  return (
    <Card
      data-slot="skill-comparison-panel"
      className={cn("gap-0 py-3", className)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <CardTitle className="text-sm">Comparaison</CardTitle>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-6"
            onClick={onClose}
            aria-label="Fermer la comparaison"
          >
            <AppIcon name="retry" size="xs" className="rotate-45" aria-hidden />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm">
          <span />
          <span className="text-center font-medium">{skillA.name}</span>
          <span className="text-center font-medium">{skillB.name}</span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border/40">
                <td className="py-2 text-xs text-muted-foreground">
                  {row.label}
                </td>
                <td className="py-2 text-center tabular-nums">
                  {row.aWins ? (
                    <span className="font-medium text-primary">{row.a}</span>
                  ) : (
                    row.a
                  )}
                </td>
                <td className="py-2 text-center tabular-nums">
                  {!row.aWins && row.a !== row.b ? (
                    <span className="font-medium text-primary">{row.b}</span>
                  ) : (
                    row.b
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function SkillsView({
  data,
  onSearch,
  onDomainChange,
  onSelectSkill,
  onCreateSkill,
  onAddPractice,
  className,
}: SkillsViewProps) {
  const domainCounts = React.useMemo(() => {
    const counts: Record<SkillDomain, number> = {
      dev: 0, design: 0, data: 0, product: 0, ops: 0, ai: 0, soft: 0,
    };
    for (const s of data.skills) counts[s.domain] = (counts[s.domain] ?? 0) + 1;
    return counts;
  }, [data.skills]);

  const filteredSkills = data.skills.filter((s) => {
    if (data.activeDomain && s.domain !== data.activeDomain) return false;
    if (data.searchQuery) {
      const q = data.searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        SKILL_DOMAIN_LABELS[s.domain].toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedSkill = data.selectedSkillId
    ? data.skills.find((s) => s.id === data.selectedSkillId) ?? null
    : null;

  return (
    <div
      data-slot="skills-view"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* En-tête */}
      <div className="flex flex-col gap-2.5 border-b pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AppIcon name="tool" size="lg" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {data.title}
              </h1>
              {data.description && (
                <p className="text-sm text-muted-foreground">{data.description}</p>
              )}
            </div>
          </div>
          {onCreateSkill && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={() => onCreateSkill("Nouvelle compétence", "dev")}
            >
              <AppIcon name="task" size="xs" aria-hidden />
              Nouvelle
            </Button>
          )}
        </div>
        <SkillSearchBar value={data.searchQuery} onChange={onSearch} />
      </div>

      {/* Domaines */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onDomainChange(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            data.activeDomain === null
              ? "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Tous ({data.skills.length})
        </button>
        {(Object.keys(SKILL_DOMAIN_LABELS) as SkillDomain[]).map((d) => (
          <SkillDomainChip
            key={d}
            domain={d}
            active={data.activeDomain === d}
            onClick={() => onDomainChange(d)}
            count={domainCounts[d]}
          />
        ))}
      </div>

      {/* Liste ou comparaison */}
      <div className="flex flex-col gap-3">
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <AppIcon name="tool" size="lg" tone="muted" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Aucune compétence ne correspond
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {filteredSkills.map((s) => (
              <SkillCard
                key={s.id}
                skill={s}
                selected={s.id === data.selectedSkillId}
                onSelect={onSelectSkill}
              />
            ))}
          </div>
        )}

        {selectedSkill && (
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">
              Détail — {selectedSkill.name}
            </h3>
            <SkillLevelIndicator level={selectedSkill.level} />
            <div className="flex flex-col gap-2">
              <SkillEvidenceList evidence={selectedSkill.evidence} />
              {selectedSkill.practices.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Pour progresser
                  </p>
                  {selectedSkill.practices.map((p) => (
                    <SkillPracticeAction
                      key={p.id}
                      practice={p}
                      onOpen={() => onAddPractice?.(selectedSkill.id, p)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
