/**
 * use-veille-synthesis.ts (Discovery L5, lot post-ReUI 2026-10-14).
 *
 * Le hook de la bannière de synthèse des vaults (le L5 feature,
 * figelé le 2026-10-14, commit `c42f3c9`). Ce hook est la
 * READ-side projection de la bannière `/discovery` (AD-7, le seul
 * writer = le run `research` ; la bannière ne fait QUE croiser les
 * 10 vaults en READ-ONLY, jamais un commit).
 *
 * Les 3 invariants SSoT du L5 sont portés par le join pur
 * `veille-synthesis-join.js` (le pattern de `use-veille-programs.ts`
 * + `veille-programs-join.js` : le SSoT vit dans le plain-JS module,
 * le hook est la surface de lecture, les types sont dans le `.d.ts`
 * SIBLING).
 *
 * Bornes (AD-7 état vide honnête, jamais une synthèse factice) :
 *   - le provider n'a pas le mirror (`discoveryVault` absent) →
 *     `synthesis` = le SSoT vide (0 programmes, 0 runs, 0 sources,
 *     `dupRate` = 0, `avgRelevance` = null, `cacheValid` = true,
 *     le SSoT par défaut d'un cache inconnu n'est PAS « valide »
 *     — la bannière affiche son état vide honnête « En attente du
 *     1er run », jamais un verdict factice).
 *   - le run courant a 0 nouveau (le vault est figé, AD-7) →
 *     `dupRate` = 1.0 (le SSoT de la preuve "le cache ne fonctionne
 *     pas" — le run N+1 re-recherche tout, le vault ne s'évolue
 *     plus). La bannière affiche le verdict du cache (le L5) :
 *     `cacheValid = false`, le SSoT du « le delta est trop faible
 *     (le vault est figé) ».
 */
import { useQuery } from '@tanstack/react-query';
import { useMobileData } from '../query/context';
import { qk } from '../query/query-client';
import { buildVeilleSynthesis, type VeilleSynthesis } from './veille-synthesis-join';
import { useVeillePrograms } from './use-veille-programs';

/**
 * `useVeilleSynthesis` — le join SSoT de la bannière de synthèse des
 * 10 vaults (le L5 feature). Deux lectures PowerSync (le miroir
 * `automations` + le miroir `discovery_vault`), aucun réseau sur le
 * chemin de rendu (AD-7). Le résultat est le SSoT de la bannière :
 * les 3 invariants du L5 (le `dupRate`, la `avgRelevance` SSoT, le
 * `cacheValid` SSoT) sont portés par le `VeilleSynthesis` (la surface
 * de lecture de la bannière `/discovery`, le § L5 de la mémoire
 * `discovery-refactor-lots-2-4`).
 */
export function useVeilleSynthesis(): {
  synthesis: VeilleSynthesis;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const data = useMobileData();
  const { programs, isPending, isError, refetch } = useVeillePrograms();

  // Le query du SSoT : la synthèse est le SSoT pur du plain-JS
  //  module (pas de réseau, pas de PowerSync re-lecture, juste le
  //  join des 2 miroirs déjà lus par `useVeillePrograms` — le
  //  SSoT de la bannière est le SSoT de la carte, pas un 3e SSoT).
  const synthesis = useQuery({
    queryKey: qk.discovery.synthesis(),
    queryFn: async (): Promise<VeilleSynthesis> => {
      if (!data.discoveryVault || !data.automations) {
        // État vide honnête AD-7 (le SSoT par défaut, jamais une
        //  synthèse factice) : 0 programmes, 0 runs, 0 sources,
        //  dupRate = 0 (le SSoT d'un cache inconnu n'est PAS «
        //  valide » — la bannière affiche son état vide honnête).
        return buildVeilleSynthesis([]);
      }
      return buildVeilleSynthesis(programs);
    },
    // Le SSoT de la synthèse ne change QUE quand le miroir
    //  `discovery_vault` ou `automations` change (le `onLocalChange`
    //  du `query-client.ts` invalide déjà `qk.discovery.vaults` +
    //  `qk.discovery.programs` — le `synthesis` inherit la même
    //  invalidation via le même `qk.discovery` SSoT).
  });

  // Le `synthesis` du hook est le SSoT du plain-JS module (le
  //  `queryFn` l'exécute) — mais le hook rend le SSoT dès que le
  //  `queryFn` a des inputs (le `programs` du `useVeillePrograms`).
  // Le born du SSoT : si le provider n'a pas le mirror, le
  //  `useVeillePrograms` retourne `[]` (le SSoT vide honnête AD-7)
  //  et le join retourne le SSoT vide (pas une synthèse factice).
  const result = synthesis.data ?? buildVeilleSynthesis(programs);

  return {
    synthesis: result,
    isPending: isPending || synthesis.isPending,
    isError: isError || synthesis.isError,
    refetch,
  };
}
