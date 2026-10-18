/**
 * M-71 — Vault archiver REST (S7 finitions, gel G2 : le vault est
 * ARCHIVÉ, jamais détruit — migration 0026 `discovery_vault.archived`).
 *
 * Le port `VaultArchiver` (automation-writer.ts, SSoT module) est ici
 * implémenté côté serveur (EF : les clés service_role ne vivent que
 * dans l'env, AD-3 ; jamais dans le module statique). Contract :
 *
 *   - `archive(userId, domaine)` → PostgREST PATCH sur
 *     `discovery_vault` by (user_id, domaine) : `archived: true`
 *     (idempotent — re-archiver une row déjà archivée = le même état).
 *   - La row ABSENTE (un programme supprimé sans jamais avoir couru
 *     une veille) → `false` (AD-1 : l'archivage est optionnel, jamais
 *     une panne du delete).
 *   - Un échec réseau / PostgREST (service_role key manquant, 5xx)
 *     → `false` (le delete reste un success : le writer a déjà
 *     supprimé la row `automations`, le vault reste in touché — la
 *     dégradation est loggée, jamais une cassure).
 *
 * AD-7 single-writer : ce module est le SEUL endroit qui écrit
 * `discovery_vault.archived` (le gel G2). Le kernel et l'app n'y
 * touchent pas directement.
 *
 * Consommé par le dispatcher (fn-job-dispatcher, l'handler `agent_run`
 * du module) quand une decision `confirmed` porte la thin command
 * `integrations.automation_delete` : le writer applique le delete, ce
 * module archive le vault — la suture gel G2 du port SSoT.
 */
import type { VaultArchiver } from './automation-writer.ts';

/** Les deps serveur (le service_role key + l'URL de la PostgREST). */
export interface VaultArchiverRestDeps {
  /** the Supabase REST base URL (EF env, le même que le dispatcher) */
  supabaseUrl: string;
  /** the service_role key (AD-3 : EF env, jamais dans le module statique) */
  serviceRoleKey: string;
}

/** Build les headers REST (le même pattern que le dispatcher). */
function restHeaders(key: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!key) return h;
  h.apikey = key;
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

/**
 * `createVaultArchiverRest` — l'implémentation REST du port
 * `VaultArchiver` (gel G2 : archivage, pas destruction).
 *
 * POSTgREST PATCH : la row `discovery_vault` by (user_id, domaine)
 * reçoit `archived: true`. Idempotent (une row déjà archivée
 * reste archivée ; un re-tir sur la même row = le même état).
 * Retour : `true` si une row a été archivée (ou l'était déjà),
 * `false` si la row est absente (le programme n'a jamais couru
 * une veille) ou si le PATCH a échoué (AD-1 : on dégrade, on ne
 * casse jamais le delete en cours).
 */
export function createVaultArchiverRest(deps: VaultArchiverRestDeps): VaultArchiver {
  const { supabaseUrl, serviceRoleKey } = deps;
  const base = `${supabaseUrl}/rest/v1/discovery_vault`;
  const headers = restHeaders(serviceRoleKey);

  return {
    async archive(userId, domaine) {
      const qs = `user_id=eq.${encodeURIComponent(userId)}&domaine=eq.${encodeURIComponent(domaine)}`;
      // Le `Prefer: resolution=merge-duplicates` n'est PAS utile ici
      // (le PATCH n'insère pas ; il ne modifie pas la row non plus si
      // `archived` est déjà `true` — l'idempotence est intrinsèque).
      const res = await fetch(`${base}?${qs}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ archived: true }),
      }).catch(() => null);
      if (!res) {
        // Réseau / offline — AD-1 : on ne casse pas le delete en cours.
        return false;
      }
      // Le 2xx = la row a été archivée (ou l'était déjà).
      // Le 4xx (absent row, le domaine est inconnu pour l'user) =
      // `false` (AD-1 : l'archivage est optionnel, jamais une panne).
      // Le 5xx = `false` (la degradation est loggée, le delete reste
      // un success — le vault, s'il existe, reste in touché).
      if (!res.ok) {
        // On ne lit pas le corps (un log serveur suffit) — le delete
        // n'est PAS bloqué par un échec d'archivage.
        return false;
      }
      return true;
    },
  };
}
