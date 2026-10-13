/**
 * Stepper.stories.tsx — Processus @reui pour onboarding / focus / rétrospective.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperPanel,
} from "src/index";
import { Button } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/Stepper (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

export const Onboarding: Story = {
  render: function StepperOnboarding() {
    const [active, setActive] = useState(1);
    const steps = [
      { title: "Bienvenue", description: "Présente ton profil" },
      { title: "Ton style", description: "Choisis un thème" },
      { title: "Premiers pas", description: "Crée ton premier objectif" },
    ];
    return (
      <div className="mx-auto w-full max-w-2xl p-6">
        <Stepper value={active} onValueChange={setActive}>
          <div className="mb-6 flex items-center justify-between">
            {steps.map((s, i) => (
              <StepperItem key={s.title} step={i + 1}>
                <StepperTrigger>
                  <StepperIndicator />
                  <div className="flex flex-col gap-0.5 px-2">
                    <StepperTitle>{s.title}</StepperTitle>
                    <StepperDescription>{s.description}</StepperDescription>
                  </div>
                </StepperTrigger>
                {i < steps.length - 1 && <StepperSeparator />}
              </StepperItem>
            ))}
          </div>

          <StepperPanel>
            <div className="rounded-lg border border-border p-6 text-sm">
              <p className="font-medium">{steps[active - 1]?.title}</p>
              <p className="mt-1 text-muted-foreground">{steps[active - 1]?.description}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              {active > 1 && (
                <Button variant="outline" onClick={() => setActive((a) => a - 1)}>Retour</Button>
              )}
              {active < steps.length ? (
                <Button onClick={() => setActive((a) => a + 1)}>Suivant</Button>
              ) : (
                <Button onClick={() => setActive(1)}>Terminer</Button>
              )}
            </div>
          </StepperPanel>
        </Stepper>
      </div>
    );
  },
};
