import type { Brief } from '../types.ts';
import { HARMONY_TEMPLATES, STYLE_CATEGORIES } from './contract.ts';

/**
 * Le prompt.
 *
 * Il est construit à partir des mêmes énumérations que le validateur : le
 * modèle ne peut pas recevoir une liste de gabarits et en renvoyer un qui
 * n'existe pas sans que ce fichier et `contract.ts` aient divergé. Une seule
 * source de vérité pour les deux.
 *
 * Le modèle ne produit PAS de calques. Il produit une intention : marque,
 * direction chromatique, catégorie de style, texte. La géométrie, le contraste,
 * la césure et le score sont calculés après, par des moteurs déterministes.
 */

export const SYSTEM_PROMPT = `Tu es directeur artistique dans un studio de design de marque.

Tu réponds UNIQUEMENT par un objet JSON, sans texte avant, sans texte après, sans bloc Markdown.

Schéma exact :
{
  "brand": {
    "name": "nom de la marque (repris du brief, jamais inventé si le brief le donne)",
    "sector": "secteur en quelques mots",
    "promise": "promesse en une phrase courte, lisible sur une affiche",
    "audience": "public visé, en une phrase",
    "personality": ["3 à 5 adjectifs"],
    "vocabulary": ["3 à 6 mots du champ lexical de la marque"]
  },
  "direction": {
    "name": "nom de la direction artistique, 2 à 5 mots",
    "rationale": "2 phrases : ce que cette direction privilégie et ce qu'elle sacrifie",
    "styleCategory": ${STYLE_CATEGORIES.map((s) => `"${s}"`).join(' | ')},
    "harmonyTemplate": ${HARMONY_TEMPLATES.map((t) => `"${t}"`).join(' | ')},
    "baseHue": 0,
    "orientationDeg": 0
  },
  "copy": {
    "headline": "accroche de l'affiche, 2 à 8 mots, maximum 60 caractères",
    "subhead": "une phrase de développement, maximum 140 caractères",
    "body": "une à deux phrases de contexte, maximum 200 caractères",
    "footer": "mention de pied courte : secteur, lieu ou appel à l'action"
  },
  "understanding": "une phrase : ce que tu as compris du brief",
  "unknowns": ["ce que le brief ne dit pas et que tu n'as pas inventé"]
}

Règles absolues :
- "baseHue" est un entier de 0 à 359 : la teinte de départ sur le cercle chromatique.
- "orientationDeg" vaut 0, 15, 30… jusqu'à 345.
- N'invente AUCUN chiffre vérifiable (pourcentage, prix, date, nombre de clients).
- N'affirme aucune promesse mesurable que le brief ne contient pas.
- Écris dans la langue du brief. Si le brief est en français, réponds en français.
- Si une information manque, laisse la chaîne vide et ajoute-la à "unknowns" plutôt que de l'inventer.
- "headline" doit fonctionner seule : c'est le seul texte lu à trois mètres.
- Aucun champ supplémentaire. Aucun commentaire.`;

/**
 * Message utilisateur : le brief structuré + la demande libre.
 *
 * La demande libre passe en DERNIER et clairement séparée : c'est elle qui doit
 * dominer, mais elle ne remplace jamais les contraintes du brief.
 */
export function buildUserMessage(brief: Brief, request?: string): string {
  const lines = [
    'BRIEF (données fournies, à respecter) :',
    `- marque : ${brief.name.trim() || '(non fournie)'}`,
    `- secteur : ${brief.sector.trim() || '(non fourni)'}`,
    `- offre : ${brief.offer.trim() || '(non fournie)'}`,
    `- public : ${brief.audience.trim() || '(non fourni)'}`,
    `- personnalité : ${brief.tone.length > 0 ? brief.tone.join(', ') : '(non fournie)'}`,
  ];

  if (brief.constraints.length > 0) {
    lines.push(`- contraintes impératives : ${brief.constraints.join(' ; ')}`);
  }

  if (request?.trim()) {
    lines.push('', 'DEMANDE :', request.trim());
  } else {
    lines.push('', 'DEMANDE :', 'Compose une affiche pour cette marque à partir des seules données ci-dessus.');
  }

  return lines.join('\n');
}
