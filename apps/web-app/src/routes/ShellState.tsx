/**
 * L3 — l'état HONNÊTE d'une section dont l'écran n'est pas encore livré.
 *
 * POURQUOI CE COMPOSANT EXISTE, ET POURQUOI IL DIT « PAS ENCORE »
 * La référence §4.3 exige qu'« aucune fonction essentielle du périmètre Web ne
 * soit invisible sur des formats d'écran courants sans explication ». Les 9
 * sections doivent donc être VISIBLES dès la coquille. Mais le dépôt a déjà
 * payé le défaut inverse — une page qui rend un état vide fabriqué avec zéro
 * appel de données (« phantom empty-state », corrigé sur `/inbox`, `/learn`,
 * `/progress`, `/habits`, `/routines`). Un écran qui simule des données est
 * pire qu'un écran qui déclare son absence.
 *
 * Donc : la section est atteignable, la coquille est réelle (navigation, mise
 * en page, tokens), et le contenu dit exactement ce qui manque et où il est
 * spécifié. Aucune donnée inventée, aucun compteur factice.
 *
 * Ce composant disparaît section par section au fil de L4+ (`readiness: 'ready'`).
 */
import { AURORA_ICONS } from '@aurora/ui';
import type { NavSection } from '../lib/navigation';

export function ShellState({ section }: { section: NavSection }) {
  return (
    <div
      className="mx-auto flex max-w-reading flex-col items-start gap-3 py-16"
      data-testid={`shell-state-${section.id}`}
    >
      <section.icon size={32} className="text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-semibold tracking-tight">{section.label}</h1>
      <p className="text-sm text-muted-foreground">
        Coquille prête — l'écran de cette section n'est pas encore livré.
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {section.ref && (
          <>
            <dt className="font-medium">Référence</dt>
            <dd>§4.2 section {section.ref}</dd>
          </>
        )}
        <dt className="font-medium">Route</dt>
        <dd>
          <code>{section.path}</code>
        </dd>
        <dt className="font-medium">Statut</dt>
        <dd>Shell — donnée non branchée (aucune donnée simulée)</dd>
      </dl>
      <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <AURORA_ICONS.AlertCircle size={14} aria-hidden="true" />
        Aucune donnée n'est affichée ici : cet écran n'est pas encore branché.
      </p>
    </div>
  );
}
