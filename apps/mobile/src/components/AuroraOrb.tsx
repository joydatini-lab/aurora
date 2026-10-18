/**
 * AuroraOrb (M-11b, v2 MVP Veille + Chat agentique, S1) — l'avatar de
 * l'agent dans l'état vide du chat (/agent).
 *
 * Design SSoT : `stitch_design_system_optimization/agent_accueil_fraunces/
 * code.html` (l'orbe est positionné AU-DESSUS du titre « Que puis-je
 * faire pour vous ? ») :
 *   - cercle 128 px (w-32 h-32), radial-gradient center 35%/30%
 *   - 2 yeux « pilules » verticales blanches (10×24 px, radius plein,
 *     gap 12 px), centrés dans l'orbe
 *   - halo (shadow-orb-glow) : 2 ombres (projection 45 % + lueur 30 %)
 *
 * COULEUR DYNAMIQUE OBLIGATOIRE (règle d'orbe du plan, AD-17) : l'orbe
 * lit UNIQUEMENT les tokens `--aurora-accent-*` (AD-17, existants
 * dans `styles/tokens.css` — jamais de nouveau token, jamais de hex
 * codé en dur dans ce composant ou son CSS). L'image-theme (05 §5.4)
 * surécrit les variables sur le `<html>` → l'orbe suit la palette de
 * l'app sans autre code.
 */
import '../styles/aurora-orb.css';

export function AuroraOrb({ label = 'Aurora' }: { label?: string }) {
  return (
    <div className="aurora-orb" role="img" aria-label={label}>
      <span className="aurora-orb__eyes" aria-hidden>
        <span className="aurora-orb__eye" />
        <span className="aurora-orb__eye" />
      </span>
    </div>
  );
}
