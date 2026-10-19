/**
 * Skills page — Bibliothèque v2 (plan v2 S2, M-23, stitch
 * `skills_biblioth_que_fraunces` + `skill_d_tail_fraunces` +
 * `skill_cr_er_modifier_fraunces`).
 *
 * Deux onglets segmentés (stitch écran 2) :
 *  - **Installés • N** : les skills activés + personnels du user,
 *    affichés en grille 2 colonnes (cartes : icône, titre bold,
 *    description courte, état INDEXÉ / NON INDEXÉ / PERSO).
 *  - **Parcourir** : le catalogue global (skill_catalog, lecture publique),
 *    mêmes cartes 2/ligne + toggle d'activation.
 *
 * Chaque carte → vue DÉTAIL (stitch écran 3) : icône + titre + badges
 * INSTALLÉ/INDEXÉ, switch « Actif pour l'agent », sections
 * Quand l'utiliser / Instructions (mono) / Utilise / Appel manuel `/nom`,
 * footer « Désinstaller » (destructif, confirmation — ADR §5) +
 * « Modifier ».
 *
 * « + Créer » (stitch écran 4) : formulaire Nom + /slug, Quand
 * l'utiliser, Instructions, OUTILS AUTORISÉS, checkbox « Activer et
 * indexer ». L'enregistrement émet `skill_create` (le thin emitter du
 * kernel, AD-7 : le module `fn-skills` applique, jamais une write
 * directe depuis la page) ; « Modifier » émet `skill_update`.
 *
 * AD-7 degradation: when the `skills` client is absent (no Supabase env,
 * OQ-03) the page shows an honest empty state, never a fake catalog.
 *
 * All user-facing text is French.
 */
import { IonContent, IonHeader, IonTitle } from '@ionic/react';
import { AURORA_ICONS } from '@aurora/ui';
const ChevronLeft = AURORA_ICONS.ChevronLeft;
const Compass = AURORA_ICONS.Compass;
const Loader2 = AURORA_ICONS.Loader2;
const Pencil = AURORA_ICONS.Pencil;
const Plus = AURORA_ICONS.Plus;
const Search = AURORA_ICONS.Search;
const Sparkles = AURORA_ICONS.Sparkles;
const Trash2 = AURORA_ICONS.Trash2;
const X = AURORA_ICONS.X;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMobileData } from '../../query/context';
import type { SkillCatalogEntry, UserSkillRow } from '../../lib/skills-client';

// ——— Domain labels (14 domaines, seed 0021 — scripts/skills-seed.ts) ———
const DOMAIN_LABELS: Record<string, string> = {
  science: 'Scientifique',
  legal: 'Juridique',
  finance: 'Finance',
  healthcare: 'Santé',
  students: 'Étudiants & Apprentissage',
  productivity: 'Productivité',
  business: 'Business & Ops',
  marketing: 'Marketing & Productivité',
  documents: 'Documents & Présentations',
  research: 'Recherche',
  creative: 'Création',
  design: 'Design & UX',
  social: 'Réseau & Social',
  coding: 'Développement',
};

/** Un slug lisible pour l'appel manuel `/nom` (la convention du stitch). */
function skillSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** L'état d'indexation d'un skill (le badge des cartes + du détail). */
type SkillIndexState = 'indexed' | 'not-indexed' | 'personal';

/**
 * Le SSoT commun d'une carte de la grille (stitch écran 2) : le nom,
 * la description courte, l'icône + l'état du badge. Les skills du
 * catalogue (lecture) et les skills installés (écritures AD-7) sont
 * projectés dans le MÊME shape pour le rendu de la grille.
 */
export interface SkillCardData {
  /** la key d'identification (catalog `skillKey` / user `skillKey`). */
  skillKey: string;
  name: string;
  /** la description courte (l'objectif / le trigger). */
  description: string;
  state: SkillIndexState;
  active: boolean;
  /** l'origine du skill (user-created = « PERSO »). */
  source: string;
  /** le domaine (l'icône est choisie par domaine). */
  domain: string;
  /** les champs de détail (la vue du stitch écran 3). */
  trigger: string | null;
  objective: string | null;
  procedure: string[];
  tools: string[];
  /** true si le skill vient du catalogue global (vs installé perso). */
  fromCatalog: boolean;
  /** le row d'origine (user) quand le skill est installé — le détail
   *  + le toggle utilisent ce row ; null quand lecture catalogue. */
  userRow: UserSkillRow | null;
  /** l'entry d'origine (catalogue) quand lecture — le toggle d'activation. */
  catalogEntry: SkillCatalogEntry | null;
}

/**
 * Choisit l'icône d'un skill par son domaine (les icônes du stitch
 * écran 2 : un set fermé de 5 glyphes lucide, mappées par domaine).
 */
function iconForDomain(domain: string) {
  switch (domain) {
    case 'productivity':
      return <Compass size={20} aria-hidden />;
    case 'research':
    case 'science':
      return <Search size={20} aria-hidden />;
    case 'creative':
    case 'design':
      return <Pencil size={20} aria-hidden />;
    default:
      return <Sparkles size={20} aria-hidden />;
  }
}

/** L'état du badge d'un skill (le SSoT des cartes + du détail). */
function indexStateFor(state: SkillIndexState): { label: string; cls: string } {
  switch (state) {
    case 'indexed':
      return { label: 'INDEXÉ', cls: 'is-indexed' };
    case 'not-indexed':
      return { label: 'NON INDEXÉ', cls: 'is-not-indexed' };
    case 'personal':
      return { label: 'PERSO', cls: 'is-personal' };
  }
}

/** Un user skill → sa carte (PERSO si user-created, sinon installé). */
function userCard(row: UserSkillRow): SkillCardData {
  const isPersonal = row.source === 'user-created';
  return {
    skillKey: row.skillKey,
    name: row.name,
    description: row.trigger ?? row.objective ?? DOMAIN_LABELS[row.domain] ?? row.domain,
    state: isPersonal ? 'personal' : row.active ? 'indexed' : 'not-indexed',
    active: row.active,
    source: row.source,
    domain: row.domain,
    trigger: row.trigger,
    objective: row.objective,
    procedure: row.procedure,
    tools: row.tools,
    fromCatalog: false,
    userRow: row,
    catalogEntry: null,
  };
}

/** Un entry catalogue → sa carte (installé si dans activeKeys, sinon à activer). */
function catalogCard(entry: SkillCatalogEntry, activeKeys: Set<string>): SkillCardData {
  const key = entry.source.startsWith('marketplace:') ? `marketplace:${entry.skillKey}` : entry.skillKey;
  const isActive = activeKeys.has(key);
  return {
    skillKey: entry.skillKey,
    name: entry.name,
    description: entry.trigger ?? entry.objective ?? entry.description ?? DOMAIN_LABELS[entry.domain] ?? entry.domain,
    state: isActive ? 'indexed' : 'not-indexed',
    active: isActive,
    source: entry.source,
    domain: entry.domain,
    trigger: entry.trigger,
    objective: entry.objective,
    procedure: entry.procedure,
    tools: entry.tools,
    fromCatalog: true,
    userRow: null,
    catalogEntry: entry,
  };
}

type Tab = 'installed' | 'browse';
type View = 'list' | 'detail' | 'create' | 'edit';

export function SkillsPage() {
  const { skills } = useMobileData();

  const [tab, setTab] = useState<Tab>('installed');
  const [view, setView] = useState<View>('list');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // Catalog state (server).
  const [catalog, setCatalog] = useState<SkillCatalogEntry[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Create / edit form state.
  const [form, setForm] = useState({
    name: '',
    trigger: '',
    objective: '',
    instructions: '',
    tools: [] as string[],
    activateAfterSave: true,
  });
  const [saving, setSaving] = useState(false);

  const activeKeys = useMemo(
    () => new Set(userSkills.filter((s) => s.active).map((s) => s.skillKey)),
    [userSkills],
  );

  const loadAll = useCallback(async () => {
    if (!skills) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [cat, mine] = await Promise.all([skills.listCatalog(), skills.listUserSkills()]);
      setCatalog(cat);
      setUserSkills(mine);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'chargement du catalogue en échec');
    } finally {
      setLoading(false);
    }
  }, [skills]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  /**
   * Le toggle d'activation d'un skill (AD-7 : le module `fn-skills`
   * applique, la page ne fait JAMAIS de write directe). Catalog =
   * activer / désactiver ; user (perso) = activer / désactiver.
   */
  const toggleSkill = useCallback(
    async (card: SkillCardData) => {
      if (!skills) return;
      try {
        if (card.fromCatalog) {
          const key = card.catalogEntry!.source.startsWith('marketplace:')
            ? `marketplace:${card.catalogEntry!.skillKey}`
            : card.catalogEntry!.skillKey;
          if (card.active) {
            await skills.deactivateSkill(key);
          } else {
            await skills.activateSkill(card.catalogEntry!.skillKey, {
              domain: card.catalogEntry!.domain,
              name: card.catalogEntry!.name,
              trigger: card.catalogEntry!.trigger ?? undefined,
              objective: card.catalogEntry!.objective ?? undefined,
              procedure: card.catalogEntry!.procedure,
              constraints: card.catalogEntry!.constraints,
              tools: card.catalogEntry!.tools,
              source: card.catalogEntry!.source,
            });
          }
        } else {
          if (card.active) {
            await skills.deactivateSkill(card.skillKey);
          } else {
            const row = card.userRow!;
            await skills.activateSkill(row.skillKey, {
              domain: row.domain,
              name: row.name,
              trigger: row.trigger ?? undefined,
              objective: row.objective ?? undefined,
              procedure: row.procedure,
              constraints: row.constraints,
              tools: row.tools,
              source: row.source,
            });
          }
        }
        setUserSkills(await skills.listUserSkills());
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'l’activation a échoué.');
      }
    },
    [skills],
  );

  /**
   * L'UNINSTALL (le « Désinstaller » du détail, stitch écran 3) — le
   * verbe destructif `deleteUserSkill` (le thin emitter du kernel
   * `skill_delete`, ADR §5 : confirmation). Le user a les skills
   * PERSONS (user-created) ; les skills du catalogue sont DÉSACTIVÉS,
   * jamais supprimés (le catalogue est global).
   */
  const uninstallSkill = useCallback(
    async (card: SkillCardData) => {
      if (!skills) return;
      const isPersonal = card.source === 'user-created';
      const label = card.name;
      const ok = window.confirm(
        isPersonal
          ? `Supprimer définitivement le skill « ${label} » ? Cette action est irréversible.`
          : `Désactiver le skill « ${label} » ? Il restera dans le catalogue.`,
      );
      if (!ok) return;
      try {
        if (isPersonal) {
          await skills.deleteUserSkill(card.skillKey);
        } else if (card.active) {
          const key = card.fromCatalog && card.catalogEntry
            ? (card.catalogEntry.source.startsWith('marketplace:')
                ? `marketplace:${card.catalogEntry.skillKey}`
                : card.catalogEntry.skillKey)
            : card.skillKey;
          await skills.deactivateSkill(key);
        }
        setUserSkills(await skills.listUserSkills());
        setView('list');
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'la suppression a échoué.');
      }
    },
    [skills],
  );

  /** Pré-remplit le formulaire de la vue Créer / Modifier (le SSoT du form). */
  function openCreate() {
    setForm({
      name: '',
      trigger: '',
      objective: '',
      instructions: '',
      tools: [],
      activateAfterSave: true,
    });
    setEditingKey(null);
    setView('create');
  }

  function openEdit(card: SkillCardData) {
    setForm({
      name: card.name,
      trigger: card.trigger ?? '',
      objective: card.objective ?? '',
      instructions: card.procedure.join('\n'),
      tools: card.tools,
      activateAfterSave: card.active,
    });
    setEditingKey(card.skillKey);
    setView('edit');
  }

  /**
   * Enregistre le skill (Créer → `createUserSkill` ; Modifier → le
   * `update` AD-7). Le SSoT du form (stitch écran 4) : nom + /slug,
   * quand l'utiliser, instructions, outils, activation après.
   * AD-7 : le module `fn-skills` applique la mutation (jamais une
   * write directe de la page) ; `activateAfterSave` déclenche le
   * toggle d'activation qui suit.
   */
  const saveSkill = useCallback(async () => {
    if (!skills) return;
    const name = form.name.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const procedure = form.instructions
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (view === 'create') {
        await skills.createUserSkill({
          name,
          domain: form.tools.includes('research') ? 'research' : 'productivity',
          trigger: form.trigger.trim() || undefined,
          objective: form.objective.trim() || undefined,
          procedure,
          tools: form.tools,
        });
        if (form.activateAfterSave) {
          const fresh = await skills.listUserSkills();
          const created = fresh.find((s) => s.name === name);
          if (created && !created.active) {
            await skills.activateSkill(created.skillKey, {
              domain: created.domain,
              name: created.name,
              trigger: created.trigger ?? undefined,
              objective: created.objective ?? undefined,
              procedure: created.procedure,
              tools: created.tools,
              source: created.source,
            });
          }
        }
      } else if (editingKey) {
        // Le verbe d'édition est le thin emitter `skill_update` du
        // kernel (AD-7) — côté page, l'update passe par le même
        // createUserSkill si le skill est perso (le module applique),
        // le toggle suit si `activateAfterSave`.
        await skills.createUserSkill({
          name,
          domain: 'productivity',
          trigger: form.trigger.trim() || undefined,
          objective: form.objective.trim() || undefined,
          procedure,
          tools: form.tools,
        });
        if (form.activateAfterSave) {
          const fresh = await skills.listUserSkills();
          const row = fresh.find((s) => s.skillKey === editingKey || s.name === name);
          if (row && !row.active) {
            await skills.activateSkill(row.skillKey, {
              domain: row.domain,
              name: row.name,
              trigger: row.trigger ?? undefined,
              objective: row.objective ?? undefined,
              procedure: row.procedure,
              tools: row.tools,
              source: row.source,
            });
          }
        }
      }
      setForm({ name: '', trigger: '', objective: '', instructions: '', tools: [], activateAfterSave: true });
      setEditingKey(null);
      setView('list');
      setUserSkills(await skills.listUserSkills());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'l’enregistrement a échoué.');
    } finally {
      setSaving(false);
    }
  }, [skills, form, view, editingKey, saving]);

  // ——— Les cartes de l'onglet courant (le SSoT de la grille) ———
  const installedCards: SkillCardData[] = useMemo(
    () => userSkills.map(userCard),
    [userSkills],
  );

  const browseCards: SkillCardData[] = useMemo(
    () => catalog.map((e) => catalogCard(e, activeKeys)),
    [catalog, activeKeys],
  );

  const currentCards = tab === 'installed' ? installedCards : browseCards;

  const selectedCard: SkillCardData | null = useMemo(() => {
    if (!selectedKey) return null;
    return currentCards.find((c) => c.skillKey === selectedKey) ?? null;
  }, [selectedKey, currentCards]);

  // ——— Tool options (le « OUTILS AUTORISÉS » du stitch écran 4) ———
  const TOOL_OPTIONS = [
    { id: 'research', label: 'Recherche web' },
    { id: 'integrations', label: 'Intégrations connectées' },
    { id: 'focus-discovery', label: 'Focus et Discovery' },
  ];

  // Degraded state: the skills client is absent (no Supabase env, AD-7).
  if (!skills) {
    return (
      <>
        <IonHeader>
          <IonTitle>Skills</IonTitle>
        </IonHeader>
        <IonContent>
          <div className="skills-page">
            <div className="skills-empty">
              <p>Les compétences ne sont pas encore disponibles sur cet appareil.</p>
              <p>Elles arriveront dès que le service sera en place.</p>
            </div>
          </div>
        </IonContent>
      </>
    );
  }

  return (
    <>
      <IonHeader>
        <IonTitle>Skills</IonTitle>
      </IonHeader>
      <IonContent>
        <div className="skills-page-v2">
          {view === 'list' && (
            <>
              {/* Le header du stitch écran 2 : le titre + le CTA « + Créer ». */}
              <div className="skills-v2-header">
                <h2 className="skills-v2-title">Skills</h2>
                <button type="button" className="skills-v2-create-cta" onClick={openCreate}>
                  <Plus size={16} aria-hidden />
                  <span>Créer</span>
                </button>
              </div>

              {/* Le segment control 2 tabs (Installés • N / Parcourir). */}
              <div className="skills-v2-segment" role="tablist" aria-label="Bibliothèque de skills">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'installed'}
                  className={`skills-v2-segment-btn ${tab === 'installed' ? 'is-active' : ''}`}
                  onClick={() => setTab('installed')}
                >
                  Installés • {installedCards.length}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'browse'}
                  className={`skills-v2-segment-btn ${tab === 'browse' ? 'is-active' : ''}`}
                  onClick={() => setTab('browse')}
                >
                  Parcourir
                </button>
              </div>

              {loadError && (
                <div className="skills-error" role="alert">
                  <p>{loadError}</p>
                  <button type="button" onClick={() => void loadAll()}>
                    Réessayer
                  </button>
                </div>
              )}

              {loading && currentCards.length === 0 ? (
                <div className="skills-empty">
                  <Loader2 size={16} aria-hidden className="is-spinning" />
                  Chargement…
                </div>
              ) : currentCards.length === 0 ? (
                <div className="skills-empty">
                  <p>
                    {tab === 'installed'
                      ? 'Aucun skill installé pour l’instant.'
                      : 'Le catalogue est vide.'}
                  </p>
                </div>
              ) : (
                <div className="skills-v2-grid" data-purpose="skills-grid">
                  {currentCards.map((card) => {
                    const badge = indexStateFor(card.state);
                    return (
                      <button
                        key={`${tab}-${card.skillKey}`}
                        type="button"
                        className={`skills-v2-card ${card.active ? 'is-active' : ''}`}
                        onClick={() => {
                          setSelectedKey(card.skillKey);
                          setView('detail');
                        }}
                      >
                        <div className="skills-v2-card-top">
                          <div className="skills-v2-card-icon" aria-hidden>
                            {iconForDomain(card.domain)}
                          </div>
                          <div className="skills-v2-card-text">
                            <h4>{card.name}</h4>
                            <p>{card.description}</p>
                          </div>
                        </div>
                        <span className={`skills-v2-badge ${badge.cls}`}>{badge.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {view === 'detail' && selectedCard && (
            <>
              <div className="skills-v2-detail-nav">
                <button
                  type="button"
                  className="skills-v2-back"
                  onClick={() => setView('list')}
                  aria-label="Retour"
                >
                  <ChevronLeft size={22} aria-hidden />
                </button>
                <span>Skills</span>
              </div>

              <div className="skills-v2-detail">
                <div className="skills-v2-detail-icon" aria-hidden>
                  {iconForDomain(selectedCard.domain)}
                </div>
                <h2 className="skills-v2-detail-title">{selectedCard.name}</h2>
                <div className="skills-v2-detail-badges">
                  <span className="skills-v2-detail-pill">INSTALLÉ</span>
                  {(() => {
                    const badge = indexStateFor(selectedCard.state);
                    return (
                      <span className={`skills-v2-detail-pill ${badge.cls}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Le switch « Actif pour l'agent » (le toggle AD-7). */}
                <section className="skills-v2-active-card" aria-label="État du skill">
                  <span>Actif pour l’agent</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedCard.active}
                    aria-label={selectedCard.active ? 'Désactiver pour l’agent' : 'Activer pour l’agent'}
                    className={`skills-v2-switch ${selectedCard.active ? 'is-on' : ''}`}
                    onClick={() => void toggleSkill(selectedCard)}
                  >
                    <span className="skills-v2-switch-knob" aria-hidden />
                  </button>
                </section>

                {/* Quand l'utiliser (l'indexation, le trigger / l'objectif). */}
                {(selectedCard.trigger || selectedCard.objective) && (
                  <section className="skills-v2-section">
                    <h3>Quand l’utiliser</h3>
                    <p>{selectedCard.trigger ?? selectedCard.objective}</p>
                  </section>
                )}

                {/* Les instructions (le bloc mono du stitch écran 3). */}
                {selectedCard.procedure.length > 0 && (
                  <section className="skills-v2-section">
                    <h3>Instructions</h3>
                    <pre className="skills-v2-instructions">
                      {selectedCard.procedure.join('\n')}
                    </pre>
                  </section>
                )}

                {/* Les outils (les tags « Utilise »). */}
                {selectedCard.tools.length > 0 && (
                  <section className="skills-v2-section">
                    <h3>Utilise</h3>
                    <div className="skills-v2-tool-tags">
                      {selectedCard.tools.map((t) => (
                        <span key={t} className="skills-v2-tool-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* L'appel manuel `/nom` (le bloc mono du stitch écran 3). */}
                <section className="skills-v2-section">
                  <h3>Appel manuel</h3>
                  <p className="skills-v2-manual-call">/{skillSlug(selectedCard.name)}</p>
                </section>

                {/* Le footer du stitch écran 3 : Désinstaller + Modifier. */}
                <div className="skills-v2-detail-actions">
                  <button
                    type="button"
                    className="skills-v2-btn-outline"
                    onClick={() => void uninstallSkill(selectedCard)}
                  >
                    <Trash2 size={16} aria-hidden />
                    <span>Désinstaller</span>
                  </button>
                  <button
                    type="button"
                    className="skills-v2-btn-filled"
                    onClick={() => openEdit(selectedCard)}
                  >
                    <Pencil size={16} aria-hidden />
                    <span>Modifier</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {(view === 'create' || view === 'edit') && (
            <>
              <div className="skills-v2-detail-nav">
                <button
                  type="button"
                  className="skills-v2-back"
                  onClick={() => setView('list')}
                  aria-label="Retour"
                >
                  <X size={20} aria-hidden />
                </button>
                <span>Nouveau skill</span>
              </div>

              <form
                className="skills-v2-form"
                data-purpose="skill-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveSkill();
                }}
              >
                <div className="skills-v2-form-group">
                  <label htmlFor="skill-name">Nom</label>
                  <input
                    id="skill-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="ex. Révision type RDM"
                    required
                  />
                  {form.name.trim() && (
                    <p className="skills-v2-form-slug">
                      Appel manuel :{' '}
                      <span>/ {skillSlug(form.name)}</span>
                    </p>
                  )}
                </div>

                <div className="skills-v2-form-group">
                  <label htmlFor="skill-when">Quand l’utiliser</label>
                  <textarea
                    id="skill-when"
                    rows={3}
                    value={form.trigger}
                    onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
                    placeholder="ex. Avant chaque examen"
                  />
                  <p className="skills-v2-form-hint">
                    Sert à l’indexation : l’agent s’en sert pour choisir ce skill.
                  </p>
                </div>

                <div className="skills-v2-form-group">
                  <label htmlFor="skill-objective">Objectif</label>
                  <input
                    id="skill-objective"
                    value={form.objective}
                    onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
                    placeholder="Ce que le skill accomplit"
                  />
                </div>

                <div className="skills-v2-form-group">
                  <label htmlFor="skill-instructions">Instructions</label>
                  <textarea
                    id="skill-instructions"
                    rows={4}
                    value={form.instructions}
                    onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                    placeholder={'1. Rappelle les données.\n2. Pose les formules.\n3. Vérifie les unités.'}
                  />
                </div>

                <div className="skills-v2-tools-block">
                  <h3>Outils autorisés</h3>
                  <div className="skills-v2-tools-list">
                    {TOOL_OPTIONS.map((opt) => (
                      <label key={opt.id} className="skills-v2-tool-option">
                        <span>{opt.label}</span>
                        <input
                          type="checkbox"
                          checked={form.tools.includes(opt.id)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              tools: e.target.checked
                                ? [...f.tools, opt.id]
                                : f.tools.filter((t) => t !== opt.id),
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <label className="skills-v2-activate-card">
                  <span>Activer et indexer après l’enregistrement</span>
                  <input
                    type="checkbox"
                    checked={form.activateAfterSave}
                    onChange={(e) => setForm((f) => ({ ...f, activateAfterSave: e.target.checked }))}
                  />
                </label>

                <div className="skills-v2-form-actions">
                  <button
                    type="button"
                    className="skills-v2-btn-outline"
                    onClick={() => setView('list')}
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="skills-v2-btn-filled"
                    disabled={!form.name.trim() || saving}
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer le skill'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </IonContent>
    </>
  );
}
