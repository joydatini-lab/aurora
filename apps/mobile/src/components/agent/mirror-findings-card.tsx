/**
 * mirror-findings-card.tsx — le composant React du bloc « Lacunes
 * détectées » du Miroir (S6 M-62, plan v2 Veille + Chat agentique).
 * Vit DANS le chat (/agent), pas une page dédiée (contrat M-61,
 * `docs/adr/mirror-contract.md`).
 *
 * Design SSoT : `stitch_design_system_optimization/agent_mode_miroir_
 * fraunces/code.html` (AuroraEvaluationCard) — les 3 blocs « Ce que
 * j'ai compris » / « Lacunes détectées » / « Question pour vous » +
 * le sujet (Stitch « Sujet : … ») + les 2 actions du maquette
 * (« Planifier un Focus » / « Créer une veille ») + la validation
 * (« Valider » → M-63 : `progress.evidence_create`, confirmation).
 *
 * AD-7 (single-writer) : le composant consomme les pures fonctions du
 * `mirror-findings-card.ts` module (zéro logique dupliquée) ; il
 * émet UNIQUEMENT des `command` typées (thin emitters) via les
 * callbacks `onFocusPlan` / `onCreateVeille` / `onValidateEvidence`
 * (le parent /agent décide comment les appliquer — jamais d'écriture
 * directe ici, F-07 : seul Progress écrit une `ProgressEvidence`).
 *
 * COULEUR DYNAMIQUE (AD-17) : tous les styles sont en `var(--aurora-*)`
 * (le CSS `agent.css`, `.agent-mirror-*`) — zéro hex hardcodé.
 */
import {
  mirrorFindingLabel,
  buildMirrorFindingsCard,
  mirrorCardActions,
  type MirrorCardFinding,
  type MirrorCardAction,
} from './mirror-findings-card.ts';
import '../../styles/agent.css';

export interface MirrorFindingsCardProps {
  /** Le sujet de l'analyse (le dernier cours / la veille du M-62 flow). */
  subjectLabel?: string;
  /** Le contenu des 3 blocs du contrat M-61 (le run du miroir). */
  reformulation: string;
  findings: MirrorCardFinding[];
  question: string;
  /** La confirmation est-elle affichée (M-63 : après un tap « Valider »).
      Le composant rend l'état `data-confirmed="true"` sur le conteneur
      (le parent met à jour ce flag). */
  validated?: boolean;
  /** Appelée quand l'utilisateur tape « Planifier un Focus » (AD-7 :
      le callback émet `focus.plan`, le module cible applique). */
  onFocusPlan?: (subjectId: string) => void;
  /** Appelée quand l'utilisateur tape « Créer une veille » (AD-7 :
      le callback émet `discovery.create`, le module cible applique). */
  onCreateVeille?: (subject: { topic: string; source: string }) => void;
  /** Appelée quand l'utilisateur tape « Valider » (M-63 : le callback
      émet `progress.evidence_create` — confirmation OBLIGATOIRE avant
      application (ADR §5, briefing §12 : la validation d'une preuve
      est une action importante / irréversible à confirmer), puis le
      module Progress qualifie + écrit (F-07). Le composant ne
      décide PAS de l'application : il signale l'intention. */
  onValidateEvidence?: (payload: Record<string, unknown>) => void;
  /** Le sujet id (le skillId du focus / le topic de la veille). */
  subjectId?: string;
}

export function MirrorFindingsCard({
  subjectLabel,
  reformulation,
  findings,
  question,
  validated = false,
  onFocusPlan,
  onCreateVeille,
  onValidateEvidence,
  subjectId,
}: MirrorFindingsCardProps) {
  const model = buildMirrorFindingsCard({
    subjectLabel,
    reformulation,
    findings,
    question,
  });
  // La liste d'actions (M-62) : « Planifier un Focus » + « Créer une
  // veille » sont TOUJOURS rendues ; « Valider » n'apparaît QUE si le
  // bloc findings est non vide (zéro finding = zéro preuve à valider,
  // AD-13 état vide — le composant ne propose jamais une action
  // sans objet (l'invariant F-07 : une preuve naît d'une détection
  // validée, pas d'un bouton flottant)).
  const actions = mirrorCardActions({ subjectId, subjectLabel });
  const focusAction: MirrorCardAction | undefined = actions.find((a) => a.id === 'focus.plan');
  const veilleAction: MirrorCardAction | undefined = actions.find((a) => a.id === 'discovery.create');
  const validateAction: MirrorCardAction | undefined = actions.find((a) => a.id === 'progress.evidence_validate');
  const showValidate = findings.length > 0 && validateAction !== undefined;

  function handleFocusPlan() {
    if (!focusAction) return;
    onFocusPlan?.(String(focusAction.payload.skillId ?? ''));
  }
  function handleCreateVeille() {
    if (!veilleAction) return;
    onCreateVeille?.({
      topic: String(veilleAction.payload.topic ?? ''),
      source: String(veilleAction.payload.source ?? ''),
    });
  }
  function handleValidate() {
    if (!validateAction || !onValidateEvidence) return;
    // M-63 : la commande `progress.evidence_create` (confirmation
    // OBLIGATOIRE) — le callback parent applique la mutation via le
    // module Progress (F-07 : seul Progress écrit la row).
    onValidateEvidence(validateAction.payload);
  }

  return (
    <div
      className="agent-mirror-card"
      data-mirror-card
      data-confirmed={validated ? 'true' : 'false'}
    >
      {/* Le sujet (Stitch « Sujet : … ») — la SSoT est le payload du
          run ; `undefined` = l'état vide du sujet (pas rendu). */}
      {subjectLabel && (
        <div className="agent-mirror-card__subject" data-mirror-subject>
          <span className="agent-mirror-card__subject-label">Sujet</span>
          <span className="agent-mirror-card__subject-value">{subjectLabel}</span>
        </div>
      )}

      {/* Les 3 blocs du contrat M-61 (ordre Stitch : reformulation →
          findings typées → question ciblée). L'ordre de rendu est
          fixé par `model.blocks` (le module pures fonctions, zéro
          logique dupliquée). */}
      {model.blocks.map((block) => {
        if (block.kind === 'findings') {
          const list = block.findings ?? [];
          return (
            <section key="findings" className="agent-mirror-card__block" data-block="findings">
              <h3 className="agent-mirror-card__title">Lacunes détectées</h3>
              {list.length === 0 ? (
                <p className="agent-mirror-card__finding-empty">
                  Aucune lacune détectée.
                </p>
              ) : (
                <ul className="agent-mirror-card__findings">
                  {list.map((f, i) => (
                    <li key={`${f.kind}-${i}`} className="agent-mirror-card__finding">
                      <span
                        className="agent-mirror-card__finding-tag"
                        data-kind={f.kind}
                      >
                        {mirrorFindingLabel(f.kind)}
                      </span>
                      <span className="agent-mirror-card__finding-text">
                        {f.resolution}
                      </span>
                      {f.nodeId && (
                        <span className="agent-mirror-card__finding-node">{f.nodeId}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        }
        // Les blocs texte (reformulation + question) — un seul rendu.
        const title = block.kind === 'reformulation' ? "Ce que j'ai compris" : 'Question pour vous';
        return (
          <section key={block.kind} className="agent-mirror-card__block" data-block={block.kind}>
            <h3 className="agent-mirror-card__title">{title}</h3>
            <p className="agent-mirror-card__text">{block.text}</p>
          </section>
        );
      })}

      {/* Les actions (M-62) : les 2 boutons du maquette + la
          validation (M-63, le cas findings non vide). AD-7 : les
          callbacks émettent des commandes typées — zéro écriture
          directe ici (le module propriétaire applique). */}
      <div className="agent-mirror-card__actions">
        {focusAction && (
          <button
            type="button"
            className="agent-mirror-card__action agent-mirror-card__action--primary"
            onClick={handleFocusPlan}
            data-action="focus.plan"
          >
            {focusAction.label}
          </button>
        )}
        {veilleAction && (
          <button
            type="button"
            className="agent-mirror-card__action agent-mirror-card__action--secondary"
            onClick={handleCreateVeille}
            data-action="discovery.create"
          >
            {veilleAction.label}
          </button>
        )}
        {showValidate && (
          <button
            type="button"
            className="agent-mirror-card__action agent-mirror-card__action--validate"
            onClick={handleValidate}
            data-action="progress.evidence_validate"
            disabled={validated}
          >
            {validateAction!.label}
          </button>
        )}
      </div>
    </div>
  );
}
