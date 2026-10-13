import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Button } from "./button";
import { Input } from "./input";

/**
 * Resolveur zod v4 minimal (le `@hookform/resolvers/zod` v3 ne sait pas
 * lire les schémas v4). Convertit l'objet d'erreurs zod (par message de
 * champ) en le format attendu par react-hook-form.
 */
function zodResolverV4<T extends Record<string, any>>(
  schema: z.ZodType<T>,
): import("react-hook-form").Resolver<T, any, T> {
  const resolver: import("react-hook-form").Resolver<T, any, T> = async (
    values: T,
  ): Promise<import("react-hook-form").ResolverResult<T, T>> => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, import("react-hook-form").FieldError> = {};
    for (const i of result.error.issues) {
      errors[String(i.path[0] ?? "")] = {
        type: "zod",
        message: i.message,
      };
    }
    // `values` est rejeté par RHF quand la validation échoue ; on renvoie
    // un object vide forcé au type T (RHF ne le lit pas dans ce cas).
    return {
      values: ({} as unknown as T),
      errors: errors as import("react-hook-form").FieldErrors<T>,
    } as import("react-hook-form").ResolverResult<T, T>;
  };
  return resolver;
}

/**
 * Meta du composant Form (react-hook-form + zod).
 *
 * Le `Form` est le `FormProvider` de react-hook-form ; les champs sont
 * déclarés via `FormField` (Controller) + `FormItem` (Label +
 * Description + Control + Message). La validation est déléguée à zod
 * (`zodResolver`).
 *
 * La story de référence montre le wiring complet : schema zod → useForm
 * (`resolver`) → `FormField` par champ → soumission.
 */
const meta = {
  title: "Aurora/UI/Form",
  component: Form,
  tags: ["autodocs"],
} satisfies Meta<never>;

export default meta;
type Story = StoryObj<any>;

/**
 * Défaut : un formulaire contrôlé (react-hook-form) validé par zod.
 * Un seul exemple, une seule notion : le wiring complet d'un champ
 * validé.
 *
 * @summary wiring complet d'un formulaire validé
 */
export const Defaut: Story = {
  render: function DefautRender() {
    type Values = { nom: string; email: string };
    const schema = z.object({
      nom: z.string().min(2, "Au moins 2 caractères"),
      email: z.string().email("Adresse invalide"),
    });
    const form = useForm<Values>({
      resolver: zodResolverV4(schema),
      defaultValues: { nom: "", email: "" },
    });

    const [submitState, setSubmitState] = useState<{
      ok: boolean;
      message?: string;
    } | null>(null);

    return (
      <form
        className="w-96 space-y-4"
        onSubmit={form.handleSubmit(async (data) => {
          setSubmitState({ ok: true, message: `Envoyé : ${data.email}` });
        })}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="nom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input placeholder="Votre nom" {...field} />
                </FormControl>
                <FormDescription>
                  Affiché publiquement sur votre profil.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="nom.d@exemple.fr"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Valider
          </Button>
        </Form>
        {submitState?.ok && (
          <p className="text-sm text-success">{submitState.message}</p>
        )}
      </form>
    );
  },
};

/**
 * Test de comportement : la soumission de valeurs valides remplace
 * l'erreur par le message de succès ; les valeurs invalides déclenchent
 * le `FormMessage` zod.
 *
 * Tags `!dev`/`!autodocs` : story test-only, exécutée par le panel
 * Interactions et en CI (addon-vitest).
 */
export const Validation: Story = {
  tags: ["!dev", "!autodocs"],
  name: "soumission invalide → message d'erreur ; soumission valide → message de succès",
  render: function ValidationRender() {
    type Values = { email: string };
    const schema = z.object({
      email: z.string().email("Adresse invalide"),
    });
    const form = useForm<Values>({
      resolver: zodResolverV4(schema),
      defaultValues: { email: "" },
    });
    const [submitState, setSubmitState] = useState<{
      ok: boolean;
      message?: string;
    } | null>(null);
    return (
      <form
        className="w-72 space-y-3"
        onSubmit={form.handleSubmit(async (data) => {
          setSubmitState({ ok: true, message: `Envoyé : ${data.email}` });
        })}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="nom.d@exemple.fr"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Valider
          </Button>
        </Form>
        {submitState?.ok && (
          <p className="text-sm text-success" data-testid="form-success">
            {submitState.message}
          </p>
        )}
      </form>
    );
  },
  play: async ({ canvas, userEvent, step }) => {
    const input = canvas.getByRole("textbox", { name: /email/i });
    const submit = canvas.getByRole("button", { name: /valider/i });

    await step("Soumission vide → erreur zod", async () => {
      await userEvent.click(submit);
      const errMsg = await canvas.findByText(/invalide/i);
      expect(errMsg).toBeInTheDocument();
    });

    await step("Saisie valide → succès", async () => {
      await userEvent.type(input, "nom.d@exemple.fr");
      await userEvent.click(submit);
      const ok = await canvas.findByTestId("form-success");
      expect(ok).toBeInTheDocument();
    });
  },
};
