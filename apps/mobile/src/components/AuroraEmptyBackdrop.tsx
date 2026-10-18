/**
 * AuroraEmptyBackdrop (M-13, v2 MVP Veille + Chat agentique, S1) — le
 * motif monochrome en ARRIÈRE-PLAN DISCRET des états vides de page.
 *
 * SSoT (plan S1 §M-13 + brand/logo.ts §9) :
 *  - l'image montée est le MOTIF A (`IN_APP_LOGO` =
 *    `assets/aurora_icon_a_integre_dans_l'applciation.png`, le papillon
 *    coloré sans fond du SSoT `brand/logo.ts`) — JAMAIS le logo officiel
 *    complet (`aurora_logo_icon_d'affichage_l'applicaiton.png`, réservé à
 *    l'icône externe de l'app / au store, §9 l.352–353).
 *  - l'opacité est DISCRÈTE : 8–12 % (la borne SSoT du plan — le motif
 *    ne doit JAMAIS concurrencer le contenu premier plan de l'état vide).
 *
 * Le composant est autonome : il se positionne `absolute` (le parent doit
 * être `relative`) et ne porte aucun contenu — il est l'ARrière-PLAN du
 * bloc `.agent-empty` (le chat, M-11b) ou de tout état vide de page
 * (S4–S6 : Discovery / Focus / Intégrations).
 */
import { IN_APP_LOGO, IN_APP_LOGO_ASSET } from '../brand/logo';

export function AuroraEmptyBackdrop() {
  return (
    <img
      src={IN_APP_LOGO}
      alt=""
      data-asset={IN_APP_LOGO_ASSET}
      data-purpose="empty-state-backdrop"
      aria-hidden
      loading="lazy"
      decoding="async"
      className="aurora-empty-backdrop"
      style={{ opacity: 0.1 /* 10 % — borne SSoT du plan M-13 (8–12 %) */ }}
    />
  );
}
