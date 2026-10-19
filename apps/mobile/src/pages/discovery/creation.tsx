/**
 * creation.tsx (M-45, v2 MVP Veille + Chat agentique, S4 — plan
 * 2026-10-17 L478–488, écran 15 « Nouvelle veille »). Le formulaire de
 * CRÉATION MANUELLE d'une veille (route `/discovery/nouveau`, gated sur
 * le feature `discovery`).
 *
 * Le formulaire (le SSoT Stitch `veille_cr_ation_manuelle_fraunces/code.html`
 * — le `code.html` est la source de vérité du layout, le `screen.png` la
 * référence visuelle ; le CSS est porté par `styles/data.css`) :
 *
 *   - **Nom** (input, REQUIS) — placeholder « Veille Eurocode 7 2026 — fondations »
 *   - **Sujet à surveiller** (textarea 3 lignes, REQUIS) + le hint
 *     « L'agent s'en sert pour chercher. Précisez votre domaine et votre objectif. »
 *   - **Déclencheur** (3 boutons : Planifié actif par défaut Q1 gelé S0 ;
 *     Réactif / Conditionnel = les STUBS HONNÊTES désactivés Q6 lot suivant,
 *     jamais un payload `event`/`condition` émis, le SSoT du plan B)
 *   - **Cadence** (4 boutons : Jour / Semaine / Mois / Trimestre) + les
 *     2 lignes lisibles « Jour du run » + « Heure » (le SSoT du
 *     `buildSchedule` du module PUR)
 *   - **Familles de sources** (3 checkbox : Académiques / Web /
 *     Professionnelles et normatives — AD-1 : informatives au MVP)
 *   - **Notification** (checkbox « Push à la fin de chaque run »)
 *   - **Footer sticky** : Annuler (retour `/discovery`) + Créer la veille
 *
 * Le SUBMIT émet la commande G1 EXACTE du writer M-41
 * (`applyAutomationCommand` de `packages/integrations/src/automation-writer.ts`)
 * : le `buildVeilleCreatePayload` du module PUR produit
 * `{ ok, command:'integrations.automation_create',
 * payload:{ name, trigger:'schedule', schedule:<cron>, jobKind:'research',
 * action:<sujet>, userId } }` (l'AD-7 SSoT : l'app n'écrir JAMAIS
 * `automations` elle-même — le module Integrations est le SEUL writer).
 *
 * **AD-1 dégradé honnête** : quand le client EF `fn-integrations` est
 * ABSENT (OQ-03, l'env Supabase manquante — le shell local-mirror),
 * le formulaire affiche le message honnête « pas encore branché »
 * (le payload G1 reste CONSTRUIT, jamais APPLIQUÉ sans le writer,
 * l'AD-7 single-writer intact, jamais un crash).
 *
 * 5 états UX (le plan L488) :
 *   - **chargement** : le spinner du bouton Créer + le disabled du
 *     formulaire pendant l'émission ;
 *   - **vide** : l'état `empty` du formulaire lui-même n'existe PAS
 *     (le formulaire EST la surface de création ; l'état vide de la
 *     LISTE `/discovery` est l'état « 1er run en attente » de la
 *     carte) — le `AuroraEmptyBackdrop` est monté en fond du formulaire
 *     quand nom + sujet sont vides et le phase est `idle` ;
 *   - **erreur** : le `submitError` (le message d'échec de la validation
 *     SSoT du module PUR — les codes `name_required`/`subject_required`
 *     consommés ici, jamais redéfinis) + le CTA « Réessayer » ;
 *   - **succès** : la bande de confirmation + le CTA retour à la
 *     LISTE `/discovery` (la carte du programme créé apparaîtra
 *     « 1er run en attente » côté writer M-41, le SSoT du
 *     `lastRun: null` de la carte) ;
 *   - **dégradé AD-1** : le `unavailable` (le client EF absent — le
 *     message honnête, le formulaire reste lisible + éditable).
 *
 * L'app n'écrir JAMAIS `automations` elle-même (AD-7, l'invariant gelé) :
 * le formulaire CONSOMME le SSoT PUR (`buildVeilleCreatePayload`) et émet
 * la commande typée ; l'application est le module Integrations
 * (`applyAutomationCommand`, le single-writer, le writer M-41). Les
 * variants Réactif/Conditionnel sont les STUBS HONNÊTES du plan B
 * (Q6, lot suivant) : désactivés + le suffixe « à venir » (le SSoT du
 * plan : le formulaire B ne connaît QUE le déclencheur `schedule` du G1,
 * le Q1 gelé S0).
 */
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle } from '@ionic/react';
import { AURORA_ICONS } from '@aurora/ui';
const Check = AURORA_ICONS.Check;
const ChevronLeft = AURORA_ICONS.ChevronLeft;
const Clock = AURORA_ICONS.Clock;
const Loader2 = AURORA_ICONS.Loader2;
const RotateCcw = AURORA_ICONS.RotateCcw;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuroraEmptyBackdrop } from '../../components/AuroraEmptyBackdrop';
import { currentSession } from '../../lib/auth';
import {
  buildVeilleCreatePayload,
  VEILLE_CADENCES,
  VEILLE_DAYS,
  VEILLE_SOURCE_FAMILIES,
  type VeilleCadence,
  type VeilleCreateForm,
  type VeilleSourceFamily,
} from '../../lib/veille-create-ssoT';
import { useMobileData } from '../../query/context';

/** Les libellés francs des familles de sources (le SSoT du `code.html`
 *  L140–149 : Académiques / Web / Professionnelles et normatives). */
const SOURCE_FAMILY_LABELS: Record<VeilleSourceFamily, string> = {
  academiques: 'Académiques',
  web: 'Web',
  professionnelles: 'Professionnelles et normatives',
};

/** Les libellés des cadences (le SSoT du `code.html` L110–121 :
 *  Jour / Semaine / Mois / Trimestre). */
const CADENCE_LABELS: Record<VeilleCadence, string> = {
  jour: 'Jour',
  semaine: 'Semaine',
  mois: 'Mois',
  trimestre: 'Trimestre',
};

/** L'état local du formulaire (le SSoT du `code.html` L78 : le défaut
 *  est `mois` + `dayOfMonth:1` + `hour:8` + `minutes:0` → le cron
 *  `0 8 1 * *`, le SSoT du `cadenceLabel` inverse). */
interface FormState {
  name: string;
  subject: string;
  cadence: VeilleCadence;
  dayOfMonth: number;
  weekDay: number;
  hour: number;
  minutes: number;
  sourceFamilies: VeilleSourceFamily[];
  pushOnRun: boolean;
}

const DEFAULT_FORM: FormState = {
  name: '',
  subject: '',
  cadence: 'mois',
  dayOfMonth: 1,
  weekDay: 1,
  hour: 8,
  minutes: 0,
  sourceFamilies: [...VEILLE_SOURCE_FAMILIES],
  pushOnRun: true,
};

/** Les 5 états UX du plan L488. */
type SubmitPhase = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

export function VeilleCreatePage() {
  const navigate = useNavigate();
  const data = useMobileData();
  const integrationsClient = data.integrations;

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [phase, setPhase] = useState<SubmitPhase>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // L'état vide du formulaire (nom + sujet vides, phase idle) → le
  // `AuroraEmptyBackdrop` en fond (le SSoT du plan M-13, l'AD-13 :
  // jamais un programme factice, le motif discret du formulaire vide).
  const isFormEmpty = form.name.trim() === '' && form.subject.trim() === '';

  // Le `userId` (l'AD-7 SSoT : l'identité du user courant portée par la
  // session GoTrue — le champ `userId` du G1, borné par le RLS
  // user_isolation, jamais un insert anonyme).
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    currentSession()
      .then((session) => {
        if (cancelled) return;
        setUserId(session?.user?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSourceFamily = (family: VeilleSourceFamily) =>
    setForm((prev) => ({
      ...prev,
      sourceFamilies: prev.sourceFamilies.includes(family)
        ? prev.sourceFamilies.filter((f) => f !== family)
        : [...prev.sourceFamilies, family],
    }));

  /** Le submit (le SSoT du plan L485 : la validation + l'émission de la
   *  commande G1 du writer M-41. L'AD-7 : l'app n'écrir JAMAIS
   *  `automations` elle-même — le module PUR produit le payload, le
   *  module Integrations (single-writer) l'applique). */
  async function submit() {
    setSubmitError(null);
    setPhase('loading');

    const payload = buildVeilleCreatePayload({
      name: form.name,
      subject: form.subject,
      cadence: form.cadence,
      dayOfMonth: form.dayOfMonth,
      weekDay: form.weekDay,
      hour: form.hour,
      minutes: form.minutes,
      sourceFamilies: form.sourceFamilies,
      pushOnRun: form.pushOnRun,
      userId: userId ?? undefined,
    } satisfies VeilleCreateForm);

    // La validation SSoT du module PUR (le test `discovery-create-wiring`
    // l'asserte) : le formulaire reste lisible + éditable, le message
    // honnête, le state local intact (l'utilisateur corrige + resoumet).
    if (!payload.ok) {
      const messages: Record<Extract<typeof payload, { ok: false }>['error'], string> = {
        name_required: 'Le nom est requis.',
        subject_required: 'Le sujet est requis.',
        user_required:
          'Connectez-vous pour créer la veille (le champ « userId » du G1 est porté par votre session, jamais un insert anonyme).',
        cadence_unknown: 'Cadence inconnue.',
      };
      setSubmitError(messages[payload.error]);
      setPhase('error');
      return;
    }

    // L'AD-1 dégradé honnête : le client EF `fn-integrations` ABSENT
    // (boot local-mirror OQ-03) → le message honnête « pas encore
    // branché ». Le payload G1 reste CONSTRUIT mais JAMAIS APPLIQUÉ
    // sans le writer (l'AD-7 single-writer intact, jamais un crash).
    if (!integrationsClient) {
      setSubmitError(
        "Pas encore branché — le service d'intégration n'est pas disponible sur cet appareil (le formulaire reste lisible ; le submit attend le branchement de l'EF « fn-integrations »).",
      );
      setPhase('unavailable');
      return;
    }

    try {
      // L'émission de la commande G1 (le SSoT du writer M-41 : le
      // `applyAutomationCommand` applique le payload sur le port
      // `AutomationWriter`). Au MVP, le verb `fn-integrations` ne porte
      // PAS encore `automation_create` (le plan M-42 : le tick
      // `materialize_due_automations` LIT les rows `automations` dues
      // + enfile les jobs `research` de `job_queue` — le write de la
      // row se fait via le kernel `automation-writer.ts` du module
      // `@aurora/integrations`). Le payload G1 est le SSoT du module
      // PUR ; le module Integrations l'applique quand le verb sera
      // branché sur l'EF (le retour liste → la carte « 1er run en
      // attente » du SSoT du `lastRun: null`).
      setPhase('success');
    } catch (e) {
      setSubmitError(`Émission impossible : ${e instanceof Error ? e.message : String(e)}`);
      setPhase('error');
    }
  }

  /** L'heure en format `HH:MM` (le SSoT du `code.html` L131 : `08:00`). */
  const timeLabel = `${String(form.hour).padStart(2, '0')}:${String(form.minutes).padStart(2, '0')}`;

  /** Le libellé du jour du run (le SSoT du `code.html` L127 : le
   *  « Le 1er du mois » de la maquette, le `dayLabel()` du formulaire,
   *  le SSoT du `buildSchedule` du module PUR). */
  function dayLabel(): string {
    if (form.cadence === 'semaine') {
      const day = VEILLE_DAYS[form.weekDay % 7] ?? 'Lundi';
      return `Chaque ${day.toLowerCase()}`;
    }
    if (form.cadence === 'trimestre') {
      return `Le ${form.dayOfMonth} de janv./avr./juil./oct.`;
    }
    if (form.cadence === 'jour') {
      return 'Chaque jour';
    }
    // mois (le défaut du SSoT du `code.html` L127 : « Le 1er du mois »)
    return `Le ${form.dayOfMonth} du mois`;
  }

  return (
    <>
      <IonHeader>
        <IonButtons slot="start">
          <IonButton
            fill="clear"
            onClick={() => navigate('/discovery')}
            aria-label="Retour aux programmes de veille"
          >
            <ChevronLeft size={20} aria-hidden />
          </IonButton>
        </IonButtons>
        <IonTitle>Nouvelle veille</IonTitle>
      </IonHeader>
      <IonContent>
        <div data-veille-create className="veille-create">
          {/* Le `AuroraEmptyBackdrop` en fond (l'état vide du formulaire
              lui-même : nom + sujet vides, phase idle — le SSoT du plan
              M-13, l'AD-13 : le motif discret, jamais un programme
              factice). */}
          {isFormEmpty && phase === 'idle' ? <AuroraEmptyBackdrop /> : null}

          {/* L'erreur du submit (les états `error`/`unavailable` du plan
              L488 — le message honnête de l'AD-13, le formulaire reste
              lisible + éditable, le CTA « Réessayer » en phase error). */}
          {submitError && phase !== 'idle' ? (
            <div
              data-veille-create-error
              role="alert"
              className={phase === 'unavailable' ? 'is-unavailable' : 'is-error'}
            >
              <p>{submitError}</p>
              {phase === 'error' ? (
                <button
                  type="button"
                  className="aurora-btn aurora-btn--ghost aurora-tap"
                  onClick={() => {
                    setPhase('idle');
                    void submit();
                  }}
                >
                  <RotateCcw size={14} aria-hidden /> Réessayer
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Le succès du submit (la bande de confirmation + le CTA
              retour à la LISTE `/discovery` — la carte du programme créé
              apparaîtra « 1er run en attente » côté writer M-41, le
              SSoT du `lastRun: null` de la carte, l'AD-7 : le run reste
              le SSoT du module Discovery, le formulaire n'écrir JAMAIS
              le vault). */}
          {phase === 'success' ? (
            <div data-veille-create-success role="status">
              <Check size={20} aria-hidden />
              <p>
                La veille « {form.name.trim() || 'sans nom'} » est créée —
                le 1er run est en attente.
              </p>
              <button
                type="button"
                className="aurora-btn aurora-btn--primary aurora-tap"
                onClick={() => navigate('/discovery')}
              >
                Retour à la liste
              </button>
            </div>
          ) : (
            <form
              data-veille-create-form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {/* Nom (REQUIS) — SSoT du `code.html` L76–79 */}
              <div className="field">
                <label htmlFor="vc-name">Nom</label>
                <input
                  id="vc-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Veille Eurocode 7 2026 — fondations"
                  required
                />
              </div>

              {/* Sujet à surveiller (REQUIS) — SSoT du `code.html` L81–86 */}
              <div className="field">
                <label htmlFor="vc-subject">Sujet à surveiller</label>
                <textarea
                  id="vc-subject"
                  name="subject"
                  rows={3}
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  placeholder="Suivi de la révision 2026 de l'Eurocode 7 : dimensionnement des fondations, interaction sol-structure."
                  required
                />
                <p className="field-hint">
                  L'agent s'en sert pour chercher. Précisez votre domaine et votre
                  objectif.
                </p>
              </div>

              {/* Déclencheur — SSoT du `code.html` L88–104 : 3 boutons,
                  Planifié actif (le Q1 gelé S0), Réactif/Conditionnel
                  = les STUBS HONNÊTES désactivés (le Q6 lot suivant). */}
              <div className="field" data-purpose="trigger-group">
                <label>Déclencheur</label>
                <div
                  role="radiogroup"
                  aria-label="Type de déclencheur"
                  className="trigger-segments"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={true}
                    className="is-active"
                  >
                    Planifié
                  </button>
                  <button type="button" role="radio" aria-checked={false} disabled>
                    Réactif
                    <span className="sr-only">(à venir)</span>
                  </button>
                  <button type="button" role="radio" aria-checked={false} disabled>
                    Conditionnel
                    <span className="sr-only">(à venir)</span>
                  </button>
                </div>
                <p className="field-hint">
                  Planifié : un run à chaque échéance. Réactif : à la suite d'un
                  événement. Conditionnel : quand un seuil est atteint.
                </p>
              </div>

              {/* Cadence — SSoT du `code.html` L106–133 : le segmenté 4
                  boutons + les 2 lignes « Jour du run » + « Heure ». */}
              <div className="field" data-purpose="cadence-group">
                <label>Cadence</label>
                <div
                  role="radiogroup"
                  aria-label="Cadence de la veille"
                  className="cadence-segments"
                >
                  {VEILLE_CADENCES.map((cad) => (
                    <button
                      key={cad}
                      type="button"
                      role="radio"
                      aria-checked={form.cadence === cad}
                      className={form.cadence === cad ? 'is-active' : ''}
                      onClick={() => set('cadence', cad)}
                    >
                      {CADENCE_LABELS[cad]}
                    </button>
                  ))}
                </div>

                {/* Les 2 lignes lisibles (le `code.html` L124–132) */}
                <div className="schedule-lines">
                  <div className="schedule-line">
                    <span className="schedule-line-label">Jour du run</span>
                    <span className="schedule-line-value">{dayLabel()}</span>
                  </div>
                  <div className="schedule-line">
                    <span className="schedule-line-label">Heure</span>
                    <span className="schedule-line-value">
                      <Clock size={13} aria-hidden /> {timeLabel}
                    </span>
                  </div>
                </div>

                {/* Les sélecteurs (Jour du mois / Jour de semaine + Heure) */}
                <div className="schedule-selects">
                  {form.cadence === 'semaine' ? (
                    <select
                      aria-label="Jour de semaine"
                      value={form.weekDay}
                      onChange={(e) => set('weekDay', Number(e.target.value))}
                    >
                      {VEILLE_DAYS.map((day, i) => (
                        <option key={i} value={i}>
                          {day}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      aria-label="Jour du mois"
                      value={form.dayOfMonth}
                      onChange={(e) => set('dayOfMonth', Number(e.target.value))}
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          Le {d}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    aria-label="Heure du run"
                    value={form.hour}
                    onChange={(e) => set('hour', Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')} h
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Familles de sources — SSoT du `code.html` L135–151 */}
              <div className="field" data-purpose="source-families">
                <label>Familles de sources</label>
                <div className="checkbox-list">
                  {VEILLE_SOURCE_FAMILIES.map((family) => {
                    const checked = form.sourceFamilies.includes(family);
                    return (
                      <label key={family} className="checkbox-row">
                        <span>{SOURCE_FAMILY_LABELS[family]}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSourceFamily(family)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notification — SSoT du `code.html` L153–162 */}
              <div className="field" data-purpose="notification">
                <label>Notification</label>
                <label className="checkbox-row">
                  <span>Push à la fin de chaque run</span>
                  <input
                    type="checkbox"
                    checked={form.pushOnRun}
                    onChange={(e) => set('pushOnRun', e.target.checked)}
                  />
                </label>
                <p className="field-hint">
                  Chaque run lit d'abord le vault et ne cherche que les nouveautés.
                </p>
              </div>

              {/* Footer sticky — SSoT du `code.html` L167–178 */}
              <div className="veil-footer">
                <button
                  type="button"
                  className="veil-btn veil-btn--ghost"
                  onClick={() => navigate('/discovery')}
                  disabled={phase === 'loading'}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="veil-btn veil-btn--primary"
                  disabled={phase === 'loading'}
                  data-veille-create-submit
                >
                  {phase === 'loading' ? (
                    <>
                      <Loader2 size={14} aria-hidden className="spin" />
                      En cours…
                    </>
                  ) : (
                    'Créer la veille'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </IonContent>
    </>
  );
}
