/**
 * Composites — Onboarding + Artifacts stories (cat. 2.19, 2.20).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  OnboardingView,
  type OnboardingViewData,
  ArtifactsView,
  type ArtifactsViewData,
  type ArtifactData,
  type ArtifactType,
} from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/Composites/Onboarding+Artifacts",
  tags: ["autodocs"],
};
export default meta;

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

export const Connexion: Story = {
  render: () => {
    const data: OnboardingViewData = {
      appName: "Aurora",
      steps: [],
      currentStepIndex: 0,
      authError: null,
      verificationPendingEmail: null,
      forgotPasswordTarget: null,
    };
    return (
      <OnboardingView
        data={data}
        onStepChange={() => {}}
        onSignIn={(email, password) => console.log("signin", email, password.length)}
        onSignUp={(email, _password, terms) => console.log("signup", email, terms)}
        onOAuth={(p) => console.log("oauth", p)}
        onForgotPassword={(email) => console.log("forgot", email)}
        onResendVerification={() => console.log("resend")}
        onSkip={() => console.log("skip")}
        onFinish={() => console.log("finish")}
      />
    );
  },
};

export const ConnexionErreur: Story = {
  render: () => {
    const data: OnboardingViewData = {
      appName: "Aurora",
      steps: [],
      currentStepIndex: 0,
      authError: "Identifiants invalides. Vérifiez votre e-mail et mot de passe.",
      verificationPendingEmail: null,
      forgotPasswordTarget: null,
    };
    return (
      <OnboardingView
        data={data}
        onStepChange={() => {}}
        onSignIn={() => {}}
        onSignUp={() => {}}
        onOAuth={() => {}}
        onForgotPassword={() => {}}
        onResendVerification={() => {}}
        onSkip={() => {}}
        onFinish={() => {}}
      />
    );
  },
};

export const VerificationEnAttente: Story = {
  render: () => {
    const data: OnboardingViewData = {
      appName: "Aurora",
      steps: [],
      currentStepIndex: 0,
      authError: null,
      verificationPendingEmail: "joy@aurora.app",
      forgotPasswordTarget: null,
    };
    return (
      <OnboardingView
        data={data}
        onStepChange={() => {}}
        onSignIn={() => {}}
        onSignUp={() => {}}
        onOAuth={() => {}}
        onForgotPassword={() => {}}
        onResendVerification={() => console.log("resend")}
        onSkip={() => {}}
        onFinish={() => {}}
      />
    );
  },
};

export const MotDePasseOublie: Story = {
  render: () => {
    const data: OnboardingViewData = {
      appName: "Aurora",
      steps: [],
      currentStepIndex: 0,
      authError: null,
      verificationPendingEmail: null,
      forgotPasswordTarget: "joy@aurora.app",
    };
    return (
      <OnboardingView
        data={data}
        onStepChange={() => {}}
        onSignIn={() => {}}
        onSignUp={() => {}}
        onOAuth={() => {}}
        onForgotPassword={(email) => console.log("forgot", email)}
        onResendVerification={() => {}}
        onSkip={() => {}}
        onFinish={() => {}}
      />
    );
  },
};

export const Wizard: Story = {
  render: () => {
    const [stepIndex, setStepIndex] = React.useState(0);
    const steps = [
      { id: "w1", label: "Profil", description: "Renseignez vos informations", icon: "success" as const, isCurrent: true, isDone: false },
      { id: "w2", label: "Modules", description: "Choisissez vos modules", icon: "tool" as const, isCurrent: false, isDone: false },
      { id: "w3", label: "Préférences", description: "Personnalisez l'expérience", icon: "chart" as const, isCurrent: false, isDone: false },
      { id: "w4", label: "Récap", description: "Vérifiez et terminez", icon: "summary" as const, isCurrent: false, isDone: false },
    ];

    const data: OnboardingViewData = {
      appName: "Aurora",
      steps: steps.map((s, i) => ({ ...s, isCurrent: i === stepIndex, isDone: i < stepIndex })),
      currentStepIndex: stepIndex,
      successMessage: "Bienvenue dans Aurora !",
      authError: null,
      verificationPendingEmail: null,
      forgotPasswordTarget: null,
    };

    return (
      <OnboardingView
        data={data}
        isWizardMode
        onStepChange={setStepIndex}
        onSignIn={() => {}}
        onSignUp={() => {}}
        onOAuth={() => {}}
        onForgotPassword={() => {}}
        onResendVerification={() => {}}
        onSkip={() => setStepIndex(3)}
        onFinish={() => {}}
        onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
        onContinue={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
        stepContent={(step) => (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Étape : {step.label} — contenu fourni par le conteneur parent.
            </p>
            <input
              type="text"
              placeholder="Saisir…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      />
    );
  },
};

/* ------------------------------------------------------------------ */
/* Artifacts                                                           */
/* ------------------------------------------------------------------ */

const artifacts: ArtifactData[] = [
  {
    id: "a1",
    name: "Rapport_sprint_14.pdf",
    type: "pdf",
    sizeBytes: 2_400_000,
    author: "Maya",
    createdAt: "2026-10-13T09:00:00Z",
    access: "team",
    processingState: "ready",
    previewUrl: "#pdf",
    downloadUrl: "#pdf",
    pageCount: 12,
    meta: { "Sprint": "14", "Équipe": "Aurora" },
    versions: [
      { id: "av2", label: "Relecture board", author: "Lucas", createdAt: "2026-10-13T08:00:00Z", isCurrent: true },
      { id: "av1", label: "V1", author: "Maya", createdAt: "2026-10-12T17:00:00Z" },
    ],
  },
  {
    id: "a2",
    name: "Capture_hero.png",
    type: "image",
    sizeBytes: 850_000,
    author: "Lucas",
    createdAt: "2026-10-12T10:00:00Z",
    access: "public",
    processingState: "ready",
    previewUrl: "https://picsum.photos/seed/aurora/800/400",
  },
  {
    id: "a3",
    name: "Podcast_ep12.mp3",
    type: "audio",
    sizeBytes: 18_000_000,
    author: "Joy",
    createdAt: "2026-10-10T08:00:00Z",
    access: "private",
    processingState: "ready",
  },
  {
    id: "a4",
    name: "Spec_RSC.docx",
    type: "document",
    sizeBytes: 420_000,
    author: "Maya",
    createdAt: "2026-10-08T08:00:00Z",
    access: "team",
    processingState: "processing",
    processingProgress: 45,
  },
  {
    id: "a5",
    name: "Budget_2026.xls",
    type: "spreadsheet",
    sizeBytes: 96_000,
    author: "Joy",
    createdAt: "2026-09-30T08:00:00Z",
    access: "team",
    processingState: "failed",
    processingError: "Le tableur Excel v2 n'est pas supporté",
  },
];

export const VisionneuseVide: Story = {
  render: () => {
    const data: ArtifactsViewData = {
      title: "Artifacts",
      activeArtifact: null,
      artifacts: [],
    };
    return (
      <div className="flex min-h-[320px] flex-col overflow-hidden rounded-xl border bg-background">
        <ArtifactsView data={data} onSelectArtifact={() => {}} />
      </div>
    );
  },
};

export const VisionneuseChargement: Story = {
  render: () => {
    const [activeId, setActiveId] = React.useState<string | null>("a1");
    const list = artifacts.filter((a) => a.processingState === "ready");
    const data: ArtifactsViewData = {
      title: "Artifacts",
      activeArtifact: list.find((a) => a.id === activeId) ?? null,
      artifacts: list,
    };
    return (
      <div className="flex min-h-[480px] flex-col overflow-hidden rounded-xl border bg-background">
        <ArtifactsView
          data={data}
          onSelectArtifact={setActiveId}
          viewerContent={(artifact) =>
            artifact.type === "image" ? null : undefined
          }
        />
      </div>
    );
  },
};

export const VisionneuseErreurTraitement: Story = {
  render: () => {
    const [activeId, setActiveId] = React.useState<string | null>("a5");
    const list = artifacts.filter((a) => a.id === "a5");
    const data: ArtifactsViewData = {
      title: "Artifacts",
      activeArtifact: list.find((a) => a.id === activeId) ?? null,
      artifacts: list,
    };
    return (
      <div className="flex min-h-[480px] flex-col overflow-hidden rounded-xl border bg-background">
        <ArtifactsView data={data} onSelectArtifact={setActiveId} />
      </div>
    );
  },
};

export const Visionneuse: Story = {
  render: () => {
    const [activeId, setActiveId] = React.useState<string | null>("a1");
    const [list, setList] = React.useState(artifacts);
    const data: ArtifactsViewData = {
      title: "Artifacts",
      activeArtifact: list.find((a) => a.id === activeId) ?? null,
      artifacts: list,
    };

    const typeOf = (id: string): ArtifactType =>
      list.find((a) => a.id === id)?.type ?? "unknown";

    return (
      <div className="flex flex-col gap-3">
        {/* Sélecteur d'artefact */}
        <div className="flex flex-wrap items-center gap-1.5">
          {list.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveId(a.id)}
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors " +
                (activeId === a.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              {a.name}
            </button>
          ))}
        </div>

        <div className="flex min-h-[480px] flex-col overflow-hidden rounded-xl border bg-background">
          <ArtifactsView
            data={data}
            onSelectArtifact={setActiveId}
            onDownload={(id) => console.log("download", id, typeOf(id))}
            onRestoreVersion={(id, v) => {
              setList((prev) =>
                prev.map((a) =>
                  a.id === id && a.versions
                    ? {
                        ...a,
                        versions: a.versions.map((v2) => ({ ...v2, isCurrent: v2.id === v })),
                      }
                    : a
                )
              );
              console.log("restore", id, v);
            }}
            onViewerAction={(action) => console.log("viewer-action", action)}
            onAccessChange={(id, access) => {
              setList((prev) =>
                prev.map((a) => (a.id === id ? { ...a, access } : a))
              );
            }}
            viewerContent={(artifact) => {
              switch (artifact.type) {
                case "image":
                  return null; // fallback <img> de ImageArtifactViewer
                case "pdf":
                  return (
                    <div className="flex flex-1 items-center justify-center bg-muted/10 p-4">
                      <div className="flex h-full w-full items-center justify-center rounded-lg border bg-white p-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-sm font-medium">📄</span>
                          <span className="text-xs text-muted-foreground">
                            Aperçu PDF — {artifact.pageCount} pages
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                default:
                  return null;
              }
            }}
          />
        </div>
      </div>
    );
  },
};
