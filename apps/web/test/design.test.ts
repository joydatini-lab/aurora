import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectStyleCategory, proposeDirections, slug } from '../src/design/brand.ts';
import { buildPalette, seedHue } from '../src/design/harmony.ts';
import {
  buildPoster,
  estimateAdvance,
  fitText,
  POSTER_FORMATS,
  renderOrder,
  resolvedLines,
  wrapLines,
} from '../src/design/layout.ts';
import { inspectPosterSvg, posterToSvg } from '../src/design/render.ts';
import { validateLayout, detectInstability, resolveBackground } from '../src/design/validate.ts';
import { locksRespected, refine } from '../src/design/pipeline.ts';
import { buildLogo, inspectSvg, toSvg } from '../src/design/logo.ts';
import type { Brief, Layout, Violation } from '../src/design/types.ts';

/**
 * Design Space — tests du noyau déterministe.
 *
 * Le validateur est la pièce qui décide si une création est « vérifiée ».
 * Un validateur qui ne sait pas dire non est pire qu'aucun validateur : il
 * donne une assurance fausse. Chaque règle est donc testée en la VIOLANT.
 */

const BRIEF: Brief = {
  name: 'Maison Kora',
  sector: 'Conseil en transition écologique',
  offer: 'Accompagner les PME vers un modèle bas carbone.',
  audience: 'Dirigeants de PME industrielles',
  tone: ['sobre', 'fiable'],
  constraints: [],
  deliverables: ['charte', 'affiche'],
};

/** Layout valide de référence : celui produit par le générateur. */
function clean(): { layout: Layout; dna: ReturnType<typeof proposeDirections>[number] } {
  const dna = proposeDirections(BRIEF)[0]!;
  return { layout: buildPoster(dna), dna };
}

function codes(layout: Layout, dna: ReturnType<typeof proposeDirections>[number]): string[] {
  return validateLayout(layout, dna).violations.map((v) => v.code);
}

function mutate(layout: Layout, id: string, fn: (layer: Layout['calques'][number]) => void): Layout {
  const copy: Layout = {
    ...layout,
    calques: layout.calques.map((l) => ({
      ...l,
      a_sem: { ...l.a_sem },
      a_geo: { ...l.a_geo },
      a_sty: { ...l.a_sty },
      M: { ...l.M },
    })),
  };
  const layer = copy.calques.find((l) => l.id === id);
  assert.ok(layer, `calque ${id} introuvable`);
  fn(layer);
  return copy;
}

/* -------------------------------------------------------------------------- */
/* Brief et harmonie                                                           */
/* -------------------------------------------------------------------------- */

test('le brief produit trois directions réellement différentes', () => {
  const directions = proposeDirections(BRIEF);
  assert.equal(directions.length, 3);

  const palettes = new Set(directions.map((d) => d.palette.colors.join()));
  assert.equal(palettes.size, 3, 'les trois directions partagent la même palette');

  const templates = new Set(directions.map((d) => d.palette.template));
  assert.equal(templates.size, 3, 'les gabarits d’harmonie doivent différer');
});

test('la même entrée donne exactement la même sortie', () => {
  const a = proposeDirections(BRIEF);
  const b = proposeDirections({ ...BRIEF });
  assert.deepEqual(a.map((d) => d.palette.colors), b.map((d) => d.palette.colors));
  assert.equal(seedHue('maison kora'), seedHue('maison kora'));
});

test('chaque palette contient 5 couleurs valides et distinctes', () => {
  for (const direction of proposeDirections(BRIEF)) {
    assert.equal(direction.palette.colors.length, 5);
    for (const color of direction.palette.colors) {
      assert.match(color, /^#[0-9A-F]{6}$/);
    }
    assert.equal(new Set(direction.palette.colors).size, 5, 'couleurs dupliquées');
  }
});

test('les gabarits d’harmonie décalent réellement les teintes', () => {
  const mono = buildPalette(200, 'monochrome');
  const comp = buildPalette(200, 'complementaire');
  assert.notEqual(mono.colors[1], comp.colors[1]);
  // La complémentaire doit être approximativement à +180° en teinte.
  assert.equal(buildPalette(200, 'complementaire').colors[1], buildPalette(20, 'monochrome').colors[1]);
});

test('la provenance distingue fourni, proposé et inconnu', () => {
  const [dna] = proposeDirections(BRIEF);
  assert.equal(dna!.strategy.audience.provenance, 'fourni');
  assert.equal(dna!.strategy.styleCategory.provenance, 'propose');
  const source = dna!.strategy.styleCategory.source ?? '';
  assert.ok(source.length > 0, 'une valeur proposée doit citer sa règle de provenance');

  const noAudience = proposeDirections({ ...BRIEF, audience: '' })[0]!;
  assert.equal(noAudience.strategy.audience.provenance, 'inconnu');
  assert.equal(noAudience.strategy.audience.value, null);
});

test('la détection de style ne matche pas à l’intérieur des mots', () => {
  // « transition » contient « ia » : une correspondance en sous-chaîne
  // classerait cette marque en « Tech ».
  assert.equal(detectStyleCategory({ ...BRIEF, sector: 'Transition sociale', offer: '', tone: [] }), 'Minimal');
  assert.equal(detectStyleCategory({ ...BRIEF, sector: 'Logiciel', offer: '', tone: [] }), 'Tech');
});

test('slug produit un identifiant utilisable', () => {
  assert.equal(slug('Maison Kora'), 'maison-kora');
  assert.equal(slug('  Épicerie   Générale !! '), 'epicerie-generale');
  assert.equal(slug('***'), 'marque');
});

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

test('la taille de police est déduite de la boîte ET du contenu', () => {
  const court = fitText({ text: 'A', boxW: 0.8, boxH: 0.2, ratio: 297 / 210 });
  const long = fitText({
    text: 'Un titre beaucoup plus long que le précédent et qui doit tenir',
    boxW: 0.8,
    boxH: 0.2,
    ratio: 297 / 210,
  });
  assert.ok(court.fontSize > long.fontSize, 'un texte long doit réduire le corps');
  assert.ok(court.fontSize <= 0.2 + 1e-9, 'le corps ne dépasse pas la hauteur de la boîte');
});

test('aucune ligne ne déborde de la largeur disponible', () => {
  const text = 'Accompagner les PME vers un modèle bas carbone.';
  const fitted = fitText({ text, boxW: 0.86, boxH: 0.2, ratio: 297 / 210, fontWeight: 600 });
  const advance = estimateAdvance(600);
  for (const line of fitted.lines) {
    const width = line.length * advance * fitted.fontSize * (297 / 210);
    assert.ok(width <= 0.86 + 1e-6, `ligne trop large : « ${line} » (${width.toFixed(3)} > 0,86)`);
  }
});

test('une accroche ne dépasse jamais trois lignes', () => {
  // Une accroche longue se réduit au lieu de remplir la boîte : sinon le titre
  // devient un pavé de cinq lignes qui écrase le reste de la composition.
  const long = 'Accompagner les PME industrielles vers un modèle bas carbone mesurable';
  const fitted = fitText({
    text: long,
    boxW: 0.86,
    boxH: 0.5,
    ratio: 297 / 210,
    fontWeight: 800,
    lineHeight: 1.1,
    maxLines: 3,
  });
  assert.ok(fitted.lines.length <= 3, `titre sur ${fitted.lines.length} lignes`);
});

test('le groupe de texte reste au-dessus du bandeau de pied', () => {
  const { layout } = clean();
  const footer = layout.calques.find((l) => l.id === 'l-pied')!;
  for (const layer of layout.calques.filter((l) => l.a_sem.type === 'text')) {
    if (layer.id === 'l-mention') continue; // posée DANS le bandeau, c'est son rôle
    assert.ok(
      layer.a_geo.y + layer.a_geo.h <= footer.a_geo.y + 1e-9,
      `${layer.id} chevauche le bandeau de pied`,
    );
  }
});

test('le corps suit le sous-titre au lieu de flotter en bas', () => {
  const { layout } = clean();
  const sub = layout.calques.find((l) => l.id === 'l-soustitre')!;
  const body = layout.calques.find((l) => l.id === 'l-corps')!;
  const gap = body.a_geo.y - (sub.a_geo.y + sub.a_geo.h);
  // Un vide de plusieurs dizaines de pour cent donnait une affiche évidée au
  // milieu, sans qu'aucune règle du validateur ne s'en plaigne.
  assert.ok(gap >= 0 && gap < 0.06, `écart sous-titre → corps : ${(gap * 100).toFixed(1)} %`);
});

test('aucun mot n’est coupé par la césure', () => {
  const mot = 'Anticonstitutionnellement';
  const size = 0.08;
  const advance = 0.6;
  // Largeur réelle du mot dans cette unité : 25 × 0,6 × 0,08 = 1,2.
  const largeurMot = mot.length * advance * size;

  const tient = wrapLines(mot, largeurMot * 1.2, size, advance);
  assert.deepEqual(tient, [mot], 'un mot qui tient ne doit jamais être découpé');

  // Plus large que la boîte : découpé, et signalé par le validateur.
  const neTientPas = wrapLines(mot, largeurMot * 0.5, size, advance);
  assert.ok(neTientPas.length > 1);
});

test('le corps est ancré et les blocs ne se chevauchent pas', () => {
  const { layout } = clean();
  const boxes = layout.calques
    .filter((l) => l.a_sem.type === 'text')
    .map((l) => ({ id: l.id, top: l.a_geo.y, bottom: l.a_geo.y + l.a_geo.h }))
    .sort((a, b) => a.top - b.top);

  for (let i = 1; i < boxes.length; i += 1) {
    assert.ok(
      boxes[i]!.top >= boxes[i - 1]!.bottom - 1e-9,
      `${boxes[i]!.id} chevauche ${boxes[i - 1]!.id}`,
    );
  }
});

test('l’ordre de rendu est explicite et unique', () => {
  const { layout } = clean();
  const orders = layout.calques.map((l) => l.o);
  assert.equal(new Set(orders).size, orders.length, 'deux calques partagent le même ordre');
  assert.deepEqual(
    renderOrder(layout).map((l) => l.o),
    [...orders].sort((a, b) => a - b),
  );
});

test('le ratio vit dans le canevas, jamais dans les coordonnées', () => {
  const dna = proposeDirections(BRIEF)[0]!;
  for (const format of POSTER_FORMATS) {
    const layout = buildPoster(dna, format);
    // Toutes les coordonnées restent dans [0,1] : c'est la normalisation
    // promise par le corpus. Le ratio est une propriété du cadre.
    assert.equal(layout.canvas.w, 1);
    assert.equal(layout.canvas.h, 1);
    assert.equal(layout.canvas.ratio, format.ratio);
    for (const layer of layout.calques) {
      for (const key of ['x', 'y', 'w', 'h'] as const) {
        const value = layer.a_geo[key];
        assert.ok(value >= 0 && value <= 1 + 1e-9, `${layer.id}.${key} = ${value} hors de [0,1]`);
      }
    }
  }
});

test('le fond couvre exactement le canevas', () => {
  const { layout } = clean();
  const fond = layout.calques.find((l) => l.id === 'l-fond')!;
  assert.equal(fond.a_geo.w, 1);
  assert.equal(fond.a_geo.h, 1);
});

/* -------------------------------------------------------------------------- */
/* Validateur : chaque règle doit pouvoir dire NON                            */
/* -------------------------------------------------------------------------- */

test('la composition générée passe son propre validateur', () => {
  const { layout, dna } = clean();
  const report = validateLayout(layout, dna);
  assert.deepEqual(report.violations, [], 'le générateur viole ses propres règles');
  assert.ok(report.score > 7, `score inattendu : ${report.score}`);
});

test('BOUNDARY_OVERRUN : un calque qui sort du canevas', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-titre', (l) => {
    l.a_geo.x = 0.95;
  });
  assert.ok(codes(broken, dna).includes('BOUNDARY_OVERRUN'));
});

test('TEXT_OVERLAP : deux textes superposés', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-soustitre', (l) => {
    l.a_geo.y = layout.calques.find((c) => c.id === 'l-titre')!.a_geo.y;
    l.a_geo.x = layout.calques.find((c) => c.id === 'l-titre')!.a_geo.x;
    l.a_geo.w = layout.calques.find((c) => c.id === 'l-titre')!.a_geo.w;
    l.a_geo.h = layout.calques.find((c) => c.id === 'l-titre')!.a_geo.h;
  });
  assert.ok(codes(broken, dna).includes('TEXT_OVERLAP'));
});

test('LABEL_DUP : le même libellé au même endroit', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-corps', (l) => {
    const title = layout.calques.find((c) => c.id === 'l-titre')!;
    l.a_sem.text = title.a_sem.text;
    l.a_geo = { ...title.a_geo };
  });
  assert.ok(codes(broken, dna).includes('LABEL_DUP'));
});

test('WCAG_CONTRAST : un texte de la couleur du fond', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-titre', (l) => {
    l.a_sty.fill = dna.palette.colors[3];
  });
  const report = validateLayout(broken, dna);
  const violation = report.violations.find((v) => v.code === 'WCAG_CONTRAST');
  assert.ok(violation, 'contraste non détecté');
  assert.ok((violation.measured ?? 99) < 4.5);
});

test('UNDERLAY_MISPLACE : la sous-couche passe au-dessus du texte', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-underlay', (l) => {
    l.o = 99;
  });
  assert.ok(codes(broken, dna).includes('UNDERLAY_MISPLACE'));
});

test('ZORDER_INVERSION : un rôle contredit l’ordre de rendu', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-fond', (l) => {
    l.o = 99; // le fond au-dessus de tout
  });
  const found = codes(broken, dna);
  assert.ok(found.includes('ZORDER_INVERSION') || found.includes('UNDERLAY_MISPLACE'));
});

test('CONSTITUTIONAL_VIOLATION : un élément hors marge', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-corps', (l) => {
    l.a_geo.x = 0.005;
  });
  assert.ok(codes(broken, dna).includes('CONSTITUTIONAL_VIOLATION'));
});

test('STYLE_MISMATCH : une couleur hors palette', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-soustitre', (l) => {
    l.a_sty.fill = '#123456';
  });
  assert.ok(codes(broken, dna).includes('STYLE_MISMATCH'));
});

test('STYLE_MISMATCH ne signale pas le noir et blanc purs', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-soustitre', (l) => {
    l.a_sty.fill = '#FFFFFF';
  });
  assert.ok(!codes(broken, dna).includes('STYLE_MISMATCH'));
});

test('MISSING_REQUIRED : le logo manque', () => {
  const { layout, dna } = clean();
  const broken: Layout = { ...layout, calques: layout.calques.filter((l) => l.id !== 'l-logo') };
  assert.ok(codes(broken, dna).includes('MISSING_REQUIRED'));
});

test('ROUND_INSTABILITY : un attribut non verrouillé qui bouge', () => {
  const { layout } = clean();
  const next = mutate(layout, 'l-titre', (l) => {
    l.a_geo.x += 0.03;
  });
  const violations = detectInstability(layout, next);
  assert.equal(violations.length, 1);
  assert.equal(violations[0]!.code, 'ROUND_INSTABILITY');

  // Verrouillé, il ne doit plus rien signaler.
  const locked = mutate(layout, 'l-titre', (l) => {
    l.M.lock_x = true;
  });
  const moved = mutate(locked, 'l-titre', (l) => {
    l.a_geo.x += 0.03;
  });
  assert.equal(detectInstability(locked, moved).length, 0);
});

test('les indicateurs restent dans [0,1] et le score dans [0,10]', () => {
  const { layout, dna } = clean();
  const report = validateLayout(layout, dna);
  for (const [key, value] of Object.entries(report.indicators)) {
    assert.ok(value >= 0 && value <= 1, `${key} = ${value}`);
  }
  assert.ok(report.score >= 0 && report.score <= 10);
});

test('une erreur plafonne le score', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-titre', (l) => {
    l.a_geo.x = 0.99;
  });
  const report = validateLayout(broken, dna);
  assert.ok(report.violations.some((v) => v.severity === 'error'));
  assert.ok(report.score <= 6, `score ${report.score} malgré une erreur bloquante`);
});

test('le fond résolu tient compte de l’opacité du voile', () => {
  const { layout } = clean();
  const title = layout.calques.find((l) => l.id === 'l-titre')!;
  const resolved = resolveBackground(layout, title);
  // Le voile à 55 % doit nuancer le fond profond, pas le remplacer.
  assert.ok(resolved.r >= 0 && resolved.r <= 1);
  assert.notDeepEqual(resolved, { r: 0, g: 0, b: 0 });
});

test('TEXT_OVERFLOW : un texte trop long pour sa boîte', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-titre', (l) => {
    l.a_sem.text = l.a_sem.text + ' et associés réunis pour l’occasion';
  });
  assert.ok(codes(broken, dna).includes('TEXT_OVERFLOW'));
});

test('Undl ne compte que les textes qui ont BESOIN d’une sous-couche', () => {
  const { layout, dna } = clean();
  const report = validateLayout(layout, dna);

  // Sur un fond profond, un titre blanc n'a pas besoin de voile : l'indicateur
  // ne doit donc pas être pénalisé par les autres textes, qui n'en ont pas.
  const sansSousCouche: Layout = {
    ...layout,
    calques: layout.calques.filter((l) => l.a_sem.type !== 'underlay'),
  };
  const sans = validateLayout(sansSousCouche, dna);
  assert.equal(sans.violations.filter((v) => v.code === 'WCAG_CONTRAST').length, 0);
  assert.equal(sans.indicators.undl, 1);
  assert.equal(report.indicators.undl, 1);
});

/* -------------------------------------------------------------------------- */
/* Export SVG                                                                  */
/* -------------------------------------------------------------------------- */

test('l’export SVG est un document équilibré et sans attribut cassé', () => {
  const { layout, dna } = clean();
  const svg = posterToSvg(layout, dna, { width: 620 });

  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.trimEnd().endsWith('</svg>'));
  assert.deepEqual(inspectPosterSvg(svg), []);
});

test('l’export SVG coupe les lignes comme le modèle', () => {
  const { layout, dna } = clean();
  const svg = posterToSvg(layout, dna);

  for (const layer of layout.calques.filter((l) => l.a_sem.type === 'text')) {
    const lines = resolvedLines(layer, layout.canvas.ratio);
    for (const line of lines) {
      assert.ok(svg.includes(`>${line}</tspan>`), `ligne absente du SVG : « ${line} »`);
    }
  }
});

test('l’export SVG échappe le contenu utilisateur', () => {
  const dna = proposeDirections({ ...BRIEF, name: 'A<b>&"x"' })[0]!;
  const svg = posterToSvg(buildPoster(dna), dna);
  assert.ok(!svg.includes('<b>'));
  assert.ok(svg.includes('&lt;b&gt;'));
  assert.deepEqual(inspectPosterSvg(svg), []);
});

test('l’export SVG respecte l’ordre de rendu', () => {
  const { layout, dna } = clean();
  const svg = posterToSvg(layout, dna);
  const fond = svg.indexOf('id="l-fond"');
  const logo = svg.indexOf('id="l-logo"');
  assert.ok(fond > 0 && logo > 0);
  assert.ok(fond < logo, 'le fond doit être rendu avant le logo');
});

test('les polices contenant des guillemets n’émettent pas de SVG invalide', () => {
  const { layout, dna } = clean();
  const svg = posterToSvg(layout, dna);
  // La pile de polices du système contient « Segoe UI » : si elle était écrite
  // brute, l'attribut se fermerait au milieu et aucun parseur XML n'accepterait
  // le document.
  assert.ok(svg.includes('&quot;Segoe UI&quot;'));
  assert.deepEqual(inspectPosterSvg(svg), []);
});

/* -------------------------------------------------------------------------- */
/* Boucle de raffinement                                                       */
/* -------------------------------------------------------------------------- */

test('le raffinement corrige un contraste cassé', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-titre', (l) => {
    l.a_sty.fill = dna.palette.colors[3];
  });
  const outcome = refine(broken, dna);
  assert.equal(
    outcome.report.violations.filter((v) => v.code === 'WCAG_CONTRAST').length,
    0,
    'le contraste n’a pas été réparé',
  );
  assert.ok(['clean', 'plateau', 'max-rounds'].includes(outcome.stoppedBy));
});

test('le raffinement ne touche jamais un attribut verrouillé', () => {
  const { layout, dna } = clean();
  const locked = mutate(layout, 'l-titre', (l) => {
    l.a_sty.fill = dna.palette.colors[3];
    l.M.lock_cat = true; // la couleur est verrouillée
  });
  const outcome = refine(locked, dna);
  const after = outcome.layout.calques.find((l) => l.id === 'l-titre')!;

  assert.equal(after.a_sty.fill, dna.palette.colors[3], 'couleur verrouillée modifiée');
  assert.ok(locksRespected(locked, outcome.layout));
  // Le défaut reste : c'est le prix du verrou, et le rapport doit le dire.
  assert.ok(outcome.report.violations.some((v) => v.code === 'WCAG_CONTRAST'));
});

test('le raffinement s’arrête avant le plafond quand il n’y a rien à faire', () => {
  const { layout, dna } = clean();
  const outcome = refine(layout, dna);
  assert.equal(outcome.rounds, 0);
  assert.equal(outcome.stoppedBy, 'clean');
});

test('le plafond de rondes est respecté', () => {
  const { layout, dna } = clean();
  const broken = mutate(layout, 'l-titre', (l) => {
    l.a_geo.x = 0.99;
    l.a_sty.fill = dna.palette.colors[3];
  });
  const outcome = refine(broken, dna, { maxRounds: 2 });
  assert.ok(outcome.rounds <= 2);
  assert.ok(outcome.history.length <= 3);
});

/* -------------------------------------------------------------------------- */
/* Logo                                                                        */
/* -------------------------------------------------------------------------- */

test('le logo expose des calques identifiables et ordonnés', () => {
  const dna = proposeDirections(BRIEF)[0]!;
  const logo = buildLogo(dna);

  assert.deepEqual(inspectSvg(logo), []);
  assert.deepEqual(logo.layers.map((l) => l.o), [1, 2, 3]);
  assert.ok(logo.layers.every((l) => l.description.length > 5));
  assert.match(toSvg(logo), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});

test('la variante complète ajoute le wordmark sans perdre le monogramme', () => {
  const dna = proposeDirections(BRIEF)[0]!;
  const mono = buildLogo(dna, 'monogramme');
  const full = buildLogo(dna, 'complet');
  assert.equal(full.layers.length, mono.layers.length + 1);
  assert.ok(full.layers.some((l) => l.id === 'logo-wordmark'));
  assert.notEqual(full.viewBox, mono.viewBox);
});

test('le SVG échappe le contenu utilisateur', () => {
  const dna = proposeDirections({ ...BRIEF, name: 'A<b>&"x"' })[0]!;
  const svg = toSvg(buildLogo(dna, 'complet'));
  assert.ok(!svg.includes('<b>'));
  assert.ok(svg.includes('&lt;b&gt;'));
});

test('inspectSvg détecte un calque vide et un identifiant dupliqué', () => {
  const dna = proposeDirections(BRIEF)[0]!;
  const logo = buildLogo(dna);
  const broken = {
    ...logo,
    layers: [logo.layers[0]!, { ...logo.layers[0]! }, { ...logo.layers[2]!, markup: '' }],
  };
  const issues = inspectSvg(broken);
  assert.ok(issues.some((i) => i.message.includes('dupliqué')));
  assert.ok(issues.some((i) => i.message.includes('vide')));
});

test('un rapport de validation est sérialisable en JSON', () => {
  const { layout, dna } = clean();
  const report = validateLayout(layout, dna);
  const roundTrip = JSON.parse(JSON.stringify(report)) as { violations: Violation[] };
  assert.deepEqual(roundTrip.violations, report.violations);
});
