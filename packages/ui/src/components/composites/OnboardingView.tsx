/**
 * OnboardingView — onboarding / enregistrement (cat. 2.19, 4.19).
 *
 * Étape 2 (muet) : reçoit `OnboardingViewData` + callbacks. Pas de store, pas d'API.
 *
 * Structure (cat. 2.19) :
 * - `AuthShell` (conteneur visuel du flow d'auth)
 * - `AuthCard` (carte de formulaire)
 * - `AuthTabs` (onglets : connexion / inscription)
 * - `EmailField` / `PasswordField` / `OAuthProviderButton`
 * - `ForgotPasswordFlow` (flow mot de passe oublié)
 * - `VerificationNotice` (notification de vérification envoyée)
 * - `AuthErrorBanner` (bandeau d'erreur)
 * - `TermsConsent` (consentement conditions + Cnil / RGPD)
 * - `OnboardingProgress` (barre de progression du wizard)
 * - `WizardStepCard` (étape du wizard)
 * - `SetupSuccessState` (état final "tout est prêt")
 * - `OnboardingSummary` (récapitulatif avant de terminer)
 */
import * as React from "react";
import { cn } from "src/lib/utils";
import { AppIcon, type IconKey } from "src/components/ui/AppIcon";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Progress } from "src/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/components/ui/tabs";
import { Carousel } from "src/components/ui/carousel-base";

/* ------------------------------------------------------------------ */
/* Contrats de données                                                */
/* ------------------------------------------------------------------ */

export type OAuthProvider = "google" | "apple" | "github" | "microsoft";

export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  apple: "Apple",
  github: "GitHub",
  microsoft: "Microsoft",
};

export const OAUTH_PROVIDER_ICONS: Record<OAuthProvider, IconKey> = {
  google: "open",
  apple: "success",
  github: "code",
  microsoft: "tool",
};

export interface OnboardingStep {
  id: string;
  label: string;
  description?: string;
  /** Est l'étape courante. */
  isCurrent?: boolean;
  /** Est terminée. */
  isDone?: boolean;
  /** Icône. */
  icon?: IconKey;
}

export interface OnboardingViewData {
  /** Libellé de l'app. */
  appName: string;
  /** Étapes du wizard. */
  steps: OnboardingStep[];
  /** Index de l'étape courante. */
  currentStepIndex: number;
  /** Message de succès final (si étape terminée). */
  successMessage?: string;
  /** Erreur courante (si auth échouée). */
  authError?: string | null;
  /** Est la vérification de courriel en attente. */
  verificationPendingEmail?: string | null;
  /** Est un compte en mode "réessayer" (forgot password). */
  forgotPasswordTarget?: string | null;
}

export interface OnboardingViewProps {
  data: OnboardingViewData;
  onStepChange: (stepIndex: number) => void;
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string, termsAccepted: boolean) => void;
  onOAuth: (provider: OAuthProvider) => void;
  onForgotPassword: (email: string) => void;
  onResendVerification: () => void;
  onSkip: () => void;
  onFinish: () => void;
  /** Appelé quand on retourne à l'étape précédente. */
  onBack?: () => void;
  /** Appelé quand on avance au pas suivant. */
  onContinue?: () => void;
  /** Contenu d'étape custom (fourni par le parent par stepId). */
  stepContent?: (step: OnboardingStep) => React.ReactNode;
  /** Affiche le wizard (mode onboarding multi-étapes) vs le simple auth. */
  isWizardMode?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* AuthShell                                                          */
/* ------------------------------------------------------------------ */

export interface AuthShellProps {
  appName: string;
  /** Logo / icône en bas. */
  footerNote?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthShell({
  appName,
  footerNote,
  children,
  className,
}: AuthShellProps) {
  return (
    <div
      data-slot="auth-shell"
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center gap-6 p-6",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <AppIcon name="insight" size="lg" aria-hidden />
        <h1 className="text-xl font-semibold tracking-tight">{appName}</h1>
      </div>
      {children}
      {footerNote && (
        <p className="text-xs text-muted-foreground">{footerNote}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AuthCard                                                           */
/* ------------------------------------------------------------------ */

export interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Est l'état de chargement (désactive les boutons). */
  isSubmitting?: boolean;
  className?: string;
}

export function AuthCard({
  title,
  description,
  children,
  isSubmitting,
  className,
}: AuthCardProps) {
  return (
    <div
      data-slot="auth-card"
      className={cn(
        "flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-5",
        className
      )}
    >
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <div className="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          En cours…
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AuthTabs                                                           */
/* ------------------------------------------------------------------ */

export type AuthTab = "signin" | "signup";

export interface AuthTabsProps {
  value: AuthTab;
  onChange: (v: AuthTab) => void;
  /** Affiche le bouton "Mot de passe oublié". */
  onForgotPassword?: () => void;
  className?: string;
}

export function AuthTabs({
  value,
  onChange,
  onForgotPassword,
  className,
}: AuthTabsProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Tabs value={value} onValueChange={(v) => onChange(v as AuthTab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Se connecter</TabsTrigger>
          <TabsTrigger value="signup">Créer un compte</TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="mt-3">
          <p className="text-xs text-muted-foreground">
            Accédez à votre espace de travail.
          </p>
        </TabsContent>
        <TabsContent value="signup" className="mt-3">
          <p className="text-xs text-muted-foreground">
            Créez votre compte en 30 secondes.
          </p>
        </TabsContent>
      </Tabs>
      {onForgotPassword && (
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Mot de passe oublié ?
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EmailField / PasswordField                                         */
/* ------------------------------------------------------------------ */

export interface EmailFieldProps {
  value: string;
  onChange: (v: string) => void;
  /** Appelé quand le champ change (validation). */
  isInvalid?: boolean;
  hint?: string;
  className?: string;
}

export function EmailField({
  value,
  onChange,
  isInvalid,
  hint,
  className,
}: EmailFieldProps) {
  return (
    <div data-slot="email-field" className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor="auth-email">Email</Label>
      <Input
        id="auth-email"
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="vous@exemple.fr"
        aria-invalid={isInvalid}
        autoComplete="email"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {isInvalid && (
        <p className="text-xs text-destructive">Adresse email invalide</p>
      )}
    </div>
  );
}

export interface PasswordFieldProps {
  value: string;
  onChange: (v: string) => void;
  isRevealable?: boolean;
  hint?: string;
  label?: string;
  autoComplete?: string;
  className?: string;
}

export function PasswordField({
  value,
  onChange,
  isRevealable = true,
  hint,
  label = "Mot de passe",
  autoComplete = "current-password",
  className,
}: PasswordFieldProps) {
  const [revealed, setRevealed] = React.useState(false);
  const id = React.useId();
  return (
    <div
      data-slot="password-field"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
      </div>
      <div className="relative">
        <Input
          id={id}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pr-9"
        />
        {isRevealable && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Masquer le mot de passe" : "Révéler le mot de passe"}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <AppIcon
              name={revealed ? "success" : "tool"}
              size="xs"
              aria-hidden
            />
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OAuthProviderButton                                                */
/* ------------------------------------------------------------------ */

export interface OAuthProviderButtonProps {
  provider: OAuthProvider;
  onOAuth: (provider: OAuthProvider) => void;
  isDisabled?: boolean;
  className?: string;
}

export function OAuthProviderButton({
  provider,
  onOAuth,
  isDisabled,
  className,
}: OAuthProviderButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("w-full", className)}
      disabled={isDisabled}
      onClick={() => onOAuth(provider)}
    >
      <AppIcon name={OAUTH_PROVIDER_ICONS[provider]} size="sm" aria-hidden />
      Continuer avec {OAUTH_PROVIDER_LABELS[provider]}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* ForgotPasswordFlow                                                 */
/* ------------------------------------------------------------------ */

export interface ForgotPasswordFlowProps {
  email: string;
  onChange: (email: string) => void;
  onSubmit: () => void;
  isSubmitted: boolean;
  isSubmitting?: boolean;
  submittedTo?: string;
  /** Appelé pour revenir à l'auth. */
  onBack?: () => void;
  className?: string;
}

export function ForgotPasswordFlow({
  email,
  onChange,
  onSubmit,
  isSubmitted,
  isSubmitting,
  submittedTo,
  onBack,
  className,
}: ForgotPasswordFlowProps) {
  if (isSubmitted) {
    return (
      <AuthCard
        title="Lien envoyé"
        description={`Un lien de réinitialisation a été envoyé à ${submittedTo ?? email}. Vérifiez votre boîte de réception (et le spam).`}
        className={className}
      >
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            Retour à la connexion
          </Button>
        )}
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Réinitialiser le mot de passe"
      description="Entrez votre email, nous vous enverrons un lien de réinitialisation."
      isSubmitting={isSubmitting}
      className={className}
    >
      <div className="flex flex-col gap-3">
        <EmailField value={email} onChange={onChange} />
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              Retour
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1"
            onClick={onSubmit}
            disabled={!email.includes("@")}
          >
            Envoyer le lien
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}

/* ------------------------------------------------------------------ */
/* VerificationNotice                                                 */
/* ------------------------------------------------------------------ */

export interface VerificationNoticeProps {
  email: string;
  onResend: () => void;
  /** Bouton pour passer (si vérification non bloquante). */
  onSkip?: () => void;
  className?: string;
}

export function VerificationNotice({
  email,
  onResend,
  onSkip,
  className,
}: VerificationNoticeProps) {
  return (
    <div
      data-slot="verification-notice"
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-primary/5 p-4",
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AppIcon name="info" size="md" tone="muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Vérifiez votre adresse email
          </p>
          <p className="text-xs text-muted-foreground">
            Un email de vérification a été envoyé à{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Cliquez sur le lien pour activer votre compte.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onResend}>
          Renvoyer l'email
        </Button>
        {onSkip && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={onSkip}
          >
            Passer pour l'instant
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AuthErrorBanner                                                    */
/* ------------------------------------------------------------------ */

export interface AuthErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  /** Type d'erreur (pour la couleur). */
  type?: "auth" | "network" | "validation";
  className?: string;
}

export function AuthErrorBanner({
  message,
  onDismiss,
  type = "auth",
  className,
}: AuthErrorBannerProps) {
  const icon: IconKey =
    type === "network" ? "error" : type === "validation" ? "warning" : "error";
  return (
    <div
      data-slot="auth-error-banner"
      data-type={type}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm",
        className
      )}
      role="alert"
    >
      <AppIcon name={icon} size="sm" tone="danger" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-destructive">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          className="text-destructive/50 transition-colors hover:text-destructive"
        >
          <AppIcon name="retry" size="xs" className="rotate-45" aria-hidden />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TermsConsent                                                       */
/* ------------------------------------------------------------------ */

export interface TermsConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Libellé de Cnil / conditions. */
  cnilLabel?: string;
  className?: string;
}

export function TermsConsent({
  checked,
  onChange,
  cnilLabel = "conditions d'utilisation et de confidentialité",
  className,
}: TermsConsentProps) {
  return (
    <div
      data-slot="terms-consent"
      className={cn("flex items-start gap-2.5", className)}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border hover:border-primary"
        )}
      >
        {checked && <AppIcon name="success" size="xs" aria-hidden />}
      </button>
      <label className="text-xs text-muted-foreground">
        J'accepte les{" "}
        <a
          href="#"
          className="text-primary underline underline-offset-2 hover:no-underline"
          onClick={(e) => e.preventDefault()}
        >
          {cnilLabel}
        </a>{" "}
        et je consens au traitement de mes données à des fins de service.
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OnboardingProgress                                                 */
/* ------------------------------------------------------------------ */

export interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function OnboardingProgress({
  steps,
  currentIndex,
  onStepClick,
  className,
}: OnboardingProgressProps) {
  const pct = steps.length > 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
  return (
    <div
      data-slot="onboarding-progress"
      className={cn("flex flex-col gap-3", className)}
    >
      {/* Barre de progression */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Étape {currentIndex + 1} / {steps.length}
          </span>
          <span className="tabular-nums">{Math.round(pct)}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      {/* Listes des étapes (cliquables) */}
      <div className="flex flex-col gap-1.5">
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick?.(i)}
            disabled={i > currentIndex && !onStepClick}
            aria-current={i === currentIndex ? "step" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              i === currentIndex
                ? "bg-primary/10 font-medium text-primary"
                : step.isDone
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50",
              onStepClick && "cursor-pointer hover:bg-muted"
            )}
          >
            {step.isDone ? (
              <AppIcon name="success" size="xs" tone="success" aria-hidden />
            ) : i === currentIndex ? (
              <span className="size-2 rounded-full bg-primary" aria-hidden />
            ) : (
              <span className="size-2 rounded-full bg-muted-foreground/30" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate">{step.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WizardStepCard                                                     */
/* ------------------------------------------------------------------ */

export interface WizardStepCardProps {
  step: OnboardingStep;
  /** Contenu de l'étape (fourni par le parent). */
  children?: React.ReactNode;
  onBack?: () => void;
  onContinue: () => void;
  /** Appelé pour passer l'étape (si skippable). */
  onSkip?: () => void;
  isSkippable?: boolean;
  /** Est la dernière étape → le bouton devient "Terminer". */
  isLast?: boolean;
  /** Titre de l'étape. */
  title?: string;
  /** Description de l'étape. */
  description?: string;
  className?: string;
}

export function WizardStepCard({
  step,
  children,
  onBack,
  onContinue,
  onSkip,
  isSkippable,
  isLast,
  title,
  description,
  className,
}: WizardStepCardProps) {
  return (
    <div
      data-slot="wizard-step-card"
      data-step-id={step.id}
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5",
        className
      )}
    >
      {step.icon && (
        <AppIcon name={step.icon} size="lg" aria-hidden />
      )}
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          {title ?? step.label}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {!description && step.description && (
          <p className="text-sm text-muted-foreground">{step.description}</p>
        )}
      </div>

      {children}

      <div className="flex items-center gap-2 border-t pt-4">
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            Retour
          </Button>
        )}
        <div className="flex-1" />
        {isSkippable && onSkip && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            Passer
          </Button>
        )}
        <Button size="sm" onClick={onContinue}>
          {isLast ? "Terminer" : "Continuer"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WizardCarousel (embla carousel des étapes)                          */
/* ------------------------------------------------------------------ */

export interface WizardCarouselProps {
  steps: OnboardingStep[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
  onContinue: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  stepContent?: (step: OnboardingStep) => React.ReactNode;
  className?: string;
}

export function WizardCarousel({
  steps,
  currentIndex,
  onStepClick,
  onContinue,
  onBack,
  onSkip,
  stepContent,
  className,
}: WizardCarouselProps) {
  const isLast = currentIndex === steps.length - 1;
  const currentStep = steps[currentIndex] ?? null;

  if (!currentStep) return null;

  return (
    <div className={cn("flex w-full max-w-sm flex-col gap-4", className)}>
      {/* Indicateurs (cliquables, on ne recule que jusqu'à l'étape faite) */}
      <div className="flex items-center justify-center gap-1.5" aria-label="Progression du wizard">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={s.label}
            aria-current={i === currentIndex}
            disabled={i > currentIndex}
            onClick={() => onStepClick?.(i)}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              i === currentIndex
                ? "bg-primary"
                : s.isDone
                  ? "bg-primary/50"
                  : i < currentIndex
                    ? "bg-primary/30"
                    : "bg-muted-foreground/20 disabled:cursor-not-allowed",
            )}
          />
        ))}
      </div>

      {/* Le carousel lui-même (Embla) — une seule slide à la fois,
          navigation clavier ← → déjà câblée par `carousel-base.tsx`. */}
      <Carousel.Root opts={{ containScroll: "trimSnaps" }}>
        <Carousel.Content>
          {steps.map((s, i) => (
            <Carousel.Item key={s.id}>
              <WizardStepCard
                step={s}
                onBack={i > 0 ? onBack : undefined}
                onContinue={onContinue}
                onSkip={isLast ? onSkip : undefined}
                isSkippable
                isLast={i === steps.length - 1}
              >
                {stepContent ? stepContent(s) : null}
              </WizardStepCard>
            </Carousel.Item>
          ))}
        </Carousel.Content>
      </Carousel.Root>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Étape {currentIndex + 1} / {steps.length}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SetupSuccessState                                                  */
/* ------------------------------------------------------------------ */

export interface SetupSuccessStateProps {
  message?: string;
  onGetStarted: () => void;
  onSkip?: () => void;
  /** Icone du succès. */
  icon?: IconKey;
  className?: string;
}

export function SetupSuccessState({
  message = "Tout est prêt !",
  onGetStarted,
  onSkip,
  icon = "success",
  className,
}: SetupSuccessStateProps) {
  return (
    <div
      data-slot="setup-success-state"
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border bg-card p-6 text-center",
        className
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
        <AppIcon name={icon} size="lg" tone="success" aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-semibold">{message}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre espace de travail est configuré et prêt à l'emploi.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button className="w-full sm:w-auto" onClick={onGetStarted}>
          Commencer
        </Button>
        {onSkip && (
          <Button
            variant="outline"
            className="w-full sm:w-auto text-muted-foreground"
            onClick={onSkip}
          >
            Voir plus tard
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OnboardingSummary                                                  */
/* ------------------------------------------------------------------ */

export interface OnboardingSummaryItem {
  label: string;
  value: string;
  icon?: IconKey;
}

export interface OnboardingSummaryProps {
  items: OnboardingSummaryItem[];
  onEdit?: (label: string) => void;
  onContinue: () => void;
  className?: string;
}

export function OnboardingSummary({
  items,
  onEdit,
  onContinue,
  className,
}: OnboardingSummaryProps) {
  return (
    <div
      data-slot="onboarding-summary"
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5",
        className
      )}
    >
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          Récapitulatif
        </h2>
        <p className="text-sm text-muted-foreground">
          Vérifiez vos paramètres avant de terminer.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2.5 rounded-md border p-3"
          >
            {item.icon && (
              <AppIcon name={item.icon} size="sm" tone="muted" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="truncate text-sm font-medium">{item.value}</p>
            </div>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px]"
                onClick={() => onEdit(item.label)}
              >
                Modifier
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={onContinue}>
        Terminer la configuration
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                */
/* ------------------------------------------------------------------ */

export function OnboardingView({
  data,
  onStepChange,
  onSignIn,
  onSignUp,
  onOAuth,
  onForgotPassword,
  onResendVerification: _onResendVerification,
  onSkip,
  onFinish,
  onBack,
  onContinue,
  stepContent,
  isWizardMode = false,
  className,
}: OnboardingViewProps) {
  const [authTab, setAuthTab] = React.useState<AuthTab>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [forgotSubmitted, setForgotSubmitted] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const currentStep = data.steps[data.currentStepIndex] ?? null;
  const isLastStep = data.currentStepIndex === data.steps.length - 1;
  const allDone = isLastStep && currentStep?.isDone;

  const handleSignIn = () => {
    setIsSubmitting(true);
    onSignIn(email, password);
  };

  const handleSignUp = () => {
    if (!termsAccepted) {
      setAuthError("Veuillez accepter les conditions d'utilisation.");
      return;
    }
    setIsSubmitting(true);
    onSignUp(email, password, termsAccepted);
  };

  const handleForgotSubmit = () => {
    setForgotSubmitted(true);
    onForgotPassword(forgotEmail);
  };

  /* Rendu wizard (étape courante) */

  /* Rendu état succès */
  if (allDone && data.successMessage) {
    return (
      <AuthShell
        appName={data.appName}
        className={className}
      >
        <SetupSuccessState
          message={data.successMessage}
          onGetStarted={onFinish}
        />
      </AuthShell>
    );
  }

  /* Rendu ForgotPasswordFlow */
  if (data.forgotPasswordTarget !== null) {
    return (
      <AuthShell
        appName={data.appName}
        className={className}
      >
        <ForgotPasswordFlow
          email={forgotEmail}
          onChange={setForgotEmail}
          onSubmit={handleForgotSubmit}
          isSubmitted={forgotSubmitted}
          submittedTo={forgotEmail}
          onBack={() => {
            setForgotSubmitted(false);
            setForgotEmail("");
          }}
        />
      </AuthShell>
    );
  }

  /* Rendu wizard (mode onboarding multi-étapes) */
  if (isWizardMode && data.steps.length > 0) {
    return (
      <AuthShell
        appName={data.appName}
        className={cn(
          "gap-4",
          className
        )}
      >
        <WizardCarousel
          steps={data.steps}
          currentIndex={data.currentStepIndex}
          onStepClick={(i) => i <= data.currentStepIndex && onStepChange(i)}
          onContinue={() => {
            if (data.currentStepIndex === data.steps.length - 1) onFinish();
            else onContinue?.();
          }}
          onBack={onBack}
          onSkip={onSkip}
          stepContent={stepContent}
        />
      </AuthShell>
    );
  }

  /* Rendu auth simple (connexion / inscription) */
  return (
    <AuthShell
      appName={data.appName}
      footerNote="© 2026 — Tous droits réservés"
      className={className}
    >
      {authError && (
        <AuthErrorBanner
          message={authError}
          onDismiss={() => setAuthError(null)}
        />
      )}

      <AuthCard
        title={
          authTab === "signin"
            ? "Connexion à votre compte"
            : "Créer votre compte"
        }
        description={
          authTab === "signin"
            ? "Accédez à votre espace de travail."
            : "En quelques secondes, prêtez votre espace de travail."
        }
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-2.5">
          {(authTab === "signup" || authTab === "signin") && (
            <div className="flex flex-col gap-2">
              <OAuthProviderButton
                provider="google"
                onOAuth={(p) => {
                  setAuthError(null);
                  onOAuth(p);
                }}
                isDisabled={isSubmitting}
              />
              <OAuthProviderButton
                provider="github"
                onOAuth={(p) => {
                  setAuthError(null);
                  onOAuth(p);
                }}
                isDisabled={isSubmitting}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              ou par email
            </span>
            <div className="flex-1 border-t" />
          </div>

          <EmailField
            value={email}
            onChange={(v) => {
              setEmail(v);
              setAuthError(null);
            }}
          />
          <PasswordField
            value={password}
            onChange={(v) => {
              setPassword(v);
              setAuthError(null);
            }}
            autoComplete={authTab === "signin" ? "current-password" : "new-password"}
          />

          {authTab === "signup" && (
            <TermsConsent
              checked={termsAccepted}
              onChange={(v) => {
                setTermsAccepted(v);
                if (v) setAuthError(null);
              }}
            />
          )}

          <div className="flex flex-col gap-2">
            {authTab === "signin" ? (
              <>
                <Button
                  className="w-full"
                  onClick={handleSignIn}
                  disabled={!email.includes("@") || !password || isSubmitting}
                >
                  Se connecter
                </Button>
              </>
            ) : (
              <Button
                className="w-full"
                onClick={handleSignUp}
                disabled={!email.includes("@") || !password || !termsAccepted || isSubmitting}
              >
                Créer mon compte
              </Button>
            )}
            <AuthTabs
              value={authTab}
              onChange={(v) => {
                setAuthTab(v);
                setAuthError(null);
              }}
              onForgotPassword={() => setForgotSubmitted(false)}
            />
          </div>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
