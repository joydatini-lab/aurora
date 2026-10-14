"use client";

/**
 * DemoAuiRuntime — runtime assistant-ui statique pour les stories.
 *
 * Le package @aurora/ui n'a aucun backend : ce provider encapsule
 * `useLocalRuntime` + `AssistantRuntimeProvider` avec un
 * `ChatModelAdapter` mock qui répond par du texte, ce qui permet aux
 * stories de `thread` / `composer` de s'autosuffire sans serveur.
 */
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type AssistantRuntime,
  type ChatModelAdapter,
  type ChatModelRunOptions,
  type ChatModelRunResult,
} from "@assistant-ui/react";
import { useMemo, type ReactNode } from "react";

export type DemoThread = {
  /** Messages de départ (pré-remplis) ; `role` user/assistant. */
  initialMessages?: Array<{
    role: "user" | "assistant";
    content: Array<{ type: "text"; text: string }>;
  }>;
};

/** Adapter mock : répond au dernier message utilisateur, mot à mot. */
const mockAdapter = (reply?: string): ChatModelAdapter => ({
  async *run(options: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult, void> {
    const last = options.messages[options.messages.length - 1];
    const question =
      last?.content
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ") ?? "";
    const answer =
      reply ??
      `Réponse de démonstration : « ${question} » — ce runtime mock illustre l'UI sans backend.`;
    let sent = "";
    for (const word of answer.split(" ")) {
      sent = (sent + " " + word).trimStart();
      yield { content: [{ type: "text", text: sent }] };
    }
    yield { content: [{ type: "text", text: answer }], status: { type: "complete", reason: "stop" } };
  },
});

export function useDemoAuiRuntime(reply?: string) {
  const adapter = useMemo(() => mockAdapter(reply), [reply]);
  return useLocalRuntime(adapter);
}

export function DemoAuiProvider({
  children,
  reply,
  runtime,
}: {
  children: ReactNode;
  /** Réponse mock fixée (sinon le dernier message utilisateur est écho). */
  reply?: string;
  /** Runtime fourni de l'extérieur (tests / stories avancées). */
  runtime?: AssistantRuntime;
}) {
  const localRuntime = useDemoAuiRuntime(reply);
  const activeRuntime = runtime ?? localRuntime;
  return (
    <AssistantRuntimeProvider runtime={activeRuntime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
