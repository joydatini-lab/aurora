/**
 * Compte (P1-4, 10-07) — la porte unique d'Auth de l'app :
 * Connexion ET Inscription (reprend la place de l'ancienne « login page »
 * brute — refonte design 10-07 : shadcn Card/Tabs/Label/Input/Button du
 * design system, shell IonHeader/IonContent comme Settings/NotFound ;
 * plus aucun IonButton ni bouton HTML nu — pack 05 §3 / AD-17).
 *
 * Le shell boote SANS session par design (AD-7 local-first, 03 S8.1) :
 * le connector relay dégrade vers le shell local-mirror et ne spame plus
 * (gate boot-data.ts). Sign-in / sign-up → session persistée (client
 * partagé main.tsx) → le sync relay se connecte sous ~5 s.
 *
 * AD-13 : loading (submit) / error (alert role) / empty (OQ-03 env absent)
 * / success (connecté ou inscription confirmée). Tokens only, tap ≥ 44 px.
 *
 * DEV (2026-10-28, revision) : le bloc historique embarquait des emails, des
 * mots de passe ET l'URL de production de `fn-dev-auth` en dur — un bundle est
 * public, donc c'etait une fuite. Il est remplace par un confort equivalent et
 * sans secret :
 *
 *   - ICI, un bouton « Remplir le compte dev » qui lit
 *     `VITE_DEV_LOGIN_EMAIL` / `VITE_DEV_LOGIN_PASSWORD` (fichier `.env.local`,
 *     gitignore). Il ne soumet JAMAIS : le developpeur garde la main, et le
 *     bloc est supprime des builds de production (`import.meta.env.DEV`).
 *   - POUR LE DIAGNOSTIC (lister, remettre un mot de passe, tester une
 *     connexion), `scripts/dev-auth.mjs` : c'est la seule piece qui detient
 *     `x-aurora-internal`, et elle tourne dans un terminal, pas dans le
 *     navigateur. `pnpm dev:auth --help`.
 */
import { IonContent, IonHeader, IonTitle } from '@ionic/react';
import { AURORA_ICONS } from '@aurora/ui';
const KeyRound = AURORA_ICONS.KeyRound;
const Loader2 = AURORA_ICONS.Loader2;
const LogOut = AURORA_ICONS.LogOut;
const MailCheck = AURORA_ICONS.MailCheck;
const UserPlus = AURORA_ICONS.UserPlus;

/**
 * Remplissage du formulaire pour le developpement.
 *
 * `import.meta.env.DEV` vaut `false` dans tout build de production : Vite
 * remplace la valeur puis elimine la branche au tree-shaking. Les identifiants
 * ne sont donc ni dans le bundle de prod, ni dans le depot (`.env.local` est
 * gitignore) — contrairement au bloc historique qui les avait en dur.
 */
const DEV_FILL_EMAIL = import.meta.env.VITE_DEV_LOGIN_EMAIL as string | undefined;
const DEV_FILL_PASSWORD = import.meta.env.VITE_DEV_LOGIN_PASSWORD as string | undefined;
const CAN_DEV_FILL =
  import.meta.env.DEV && Boolean(DEV_FILL_EMAIL) && Boolean(DEV_FILL_PASSWORD);

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@aurora/ui';
import {
  authAvailable,
  currentSession,
  signIn,
  signOut,
  signUp,
} from '../../lib/auth';


export function LoginPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);

  // Restaure l'état réel : session persistée (client partagé persistSession).
  useEffect(() => {
    void currentSession().then((s) => setSignedInAs(s?.user?.email ?? null));
  }, []);

  const switchTab = (t: 'signin' | 'signup') => {
    setTab(t);
    setError(null);
    setSuccess(null);
  };

  async function submitSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await signIn(email, password);
      // Boot neuf : le client partagé restaure la session, le relay
      // PowerSync se connecte (03 S8.1).
      window.location.assign('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
      setBusy(false);
    }
  }

  async function submitSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const { needsEmailConfirmation } = await signUp(email, password);
      if (needsEmailConfirmation) {
        // Repli honnête (AD-13) — normalement inactif : le projet est
        // configuré SANS confirmation email (trigger auto_confirm, 10-07).
        setSuccess(
          `Compte créé pour ${email.trim()} — un email de confirmation a été envoyé. Vérifie ta boîte mail, puis reviens te connecter.`,
        );
      } else {
        setSuccess(`Compte créé — tu es connecté en tant que ${email.trim()}. Ouverture de ton onboarding…`);
        // Sign-up → onboarding → app (flux première entrée, 10-07) : le
        // reload restaure la session (client partagé, 03 S8.1) puis le
        // wizard de bienvenue s'affiche une seule fois (ui-state).
        window.setTimeout(() => window.location.assign('/onboarding'), 1500);
      }
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible.');
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await signOut();
    window.location.assign('/');
  }

  return (
    <>
      <IonHeader>
        <IonTitle>Compte</IonTitle>
      </IonHeader>
      <IonContent>
        <div data-auth-page="true" className="auth-page">
          {signedInAs ? (
            <Card data-state="success">
              <CardHeader>
                <CardTitle>Connecté</CardTitle>
                <CardDescription>Session active — sync relay PowerSync opérationnel.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="auth-conn-email" data-conn-email="true">{signedInAs}</p>
                <Button
                  variant="outline"
                  className="auth-full"
                  disabled={busy}
                  onClick={() => void logout()}
                >
                  {busy ? <Loader2 aria-hidden className="is-spinning" /> : <LogOut aria-hidden />}
                  Se déconnecter
                </Button>
              </CardContent>
            </Card>
          ) : authAvailable ? (
            <Card>
              <CardHeader>
                <CardTitle>Compte Aurora</CardTitle>
                <CardDescription>
                  Connexion ou inscription — synchronisation PowerSync + agent (03 S8.1).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={tab} onValueChange={(v) => switchTab(v as typeof tab)}>
                  <TabsList className="auth-tabs-list">
                    <TabsTrigger value="signin">Connexion</TabsTrigger>
                    <TabsTrigger value="signup">Inscription</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={submitSignIn} data-state={busy ? 'loading' : error ? 'error' : 'idle'}>
                      <div className="auth-fields">
                        <div className="auth-field">
                          <Label htmlFor="auth-signin-email">Email</Label>
                          <Input
                            id="auth-signin-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="prenom@domaine.dev"
                            autoComplete="email"
                            required
                          />
                        </div>
                        <div className="auth-field">
                          <Label htmlFor="auth-signin-password">Mot de passe</Label>
                          <Input
                            id="auth-signin-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                          />
                        </div>
                      </div>

                      {error ? (
                        <p className="auth-error" role="alert">{error}</p>
                      ) : null}

                      <Button
                        type="submit"
                        className="auth-full"
                        disabled={busy || email.trim().length === 0 || password.length === 0}
                      >
                        {busy ? <Loader2 aria-hidden className="is-spinning" /> : <KeyRound aria-hidden />}
                        {busy ? 'Connexion…' : 'Se connecter'}
                      </Button>

                      {CAN_DEV_FILL ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="auth-full"
                          onClick={() => {
                            // Remplit, ne soumet pas : on veut voir ce qui part.
                            setEmail(DEV_FILL_EMAIL ?? '');
                            setPassword(DEV_FILL_PASSWORD ?? '');
                          }}
                        >
                          <UserPlus aria-hidden /> Remplir le compte dev
                        </Button>
                      ) : null}

                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    {success ? (
                      <div data-state="success" className="auth-result">
                        <p className="auth-success-note">
                          <MailCheck aria-hidden /> {success}
                        </p>
                        <Button
                          variant="outline"
                          className="auth-full"
                          onClick={() => switchTab('signin')}
                        >
                          Passer à la connexion
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={submitSignUp} data-state={busy ? 'loading' : error ? 'error' : 'idle'}>
                        <div className="auth-fields">
                          <div className="auth-field">
                            <Label htmlFor="auth-signup-email">Email</Label>
                            <Input
                              id="auth-signup-email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="prenom@domaine.dev"
                              autoComplete="email"
                              required
                            />
                          </div>
                          <div className="auth-field">
                            <Label htmlFor="auth-signup-password">Mot de passe</Label>
                            <Input
                              id="auth-signup-password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              autoComplete="new-password"
                              minLength={8}
                              required
                            />
                          </div>
                        </div>

                        {error ? (
                          <p className="auth-error" role="alert">{error}</p>
                        ) : null}

                        <Button
                          type="submit"
                          className="auth-full"
                          disabled={busy || email.trim().length === 0 || password.length < 8}
                        >
                          {busy ? <Loader2 aria-hidden className="is-spinning" /> : <UserPlus aria-hidden />}
                          {busy ? 'Inscription…' : 'Créer mon compte'}
                        </Button>
                        <p className="auth-note">
                          8 caractères minimum. Compte activé immédiatement, sans
                          confirmation par email (usage personnel, 10-07).
                        </p>
                      </form>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card data-state="empty">
              <CardHeader>
                <CardTitle>Compte indisponible</CardTitle>
                <CardDescription>
                  Le service n'est pas configuré pour l'instant — vérifie que l'app est bien branchée.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

        </div>
      </IonContent>
    </>
  );
}
