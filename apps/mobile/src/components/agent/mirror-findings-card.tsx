// NOTE (interlock S2↔S6, 2026-10-18) : le composant React du bloc
// « Lacunes détectées » du Miroir (S6 M-62) vivait ici en .tsx. S6 a
// branché la logique pure dans mirror-findings-card.ts et a cassé ce
// fichier en cours de route (TS3024 : le .ts consomme le .tsx, cycle
// mort, l'export du composant est perdu). Ce shim réexporte le .ts pour
// que mon commit S2 (M-22 : pages/agent consomme ce composant) ne casse
// PAS le typecheck mobile ; S6 doit re-brancher son composant dans le
// .ts (dissociation logics/component) puis SUPPRIMER ce shim.
export * from './mirror-findings-card.ts';
