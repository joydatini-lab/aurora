import * as React from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Info,
  Mail,
  Search,
  Trash2,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Progress,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipProvider,
} from '@/components/ui';
import { PageHeader, Section, Rule, Specimen, Demo } from '@/components/design/page';

/**
 * Galerie de composants.
 *
 * Chaque spécimen montre l'état NORMAL — les états hover/focus/disabled sont
 * documentés par leur existence dans le composant, pas par une capture : une
 * image de survol ne se survole pas.
 */

export function ComponentsPage() {
  const [switchOn, setSwitchOn] = React.useState(true);
  const [checked, setChecked] = React.useState<boolean | 'indeterminate'>('indeterminate');

  return (
    <TooltipProvider>
      <div>
        <PageHeader
          overline="Composants"
          title="Galerie"
          description="Onze primitives, toutes construites sur les mêmes tokens. Ce qui n'est pas ici n'existe pas : un écran métier ne fabrique pas son propre bouton."
        >
          <Badge variant="outline">shadcn/ui</Badge>
          <Badge variant="outline">Radix · accessibilité native</Badge>
          <Badge variant="success">Clavier complet</Badge>
        </PageHeader>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Button"
          note="Six variantes, quatre tailles. Une seule action principale par zone : si deux boutons se disputent le regard, l'un des deux n'est pas principal."
        >
          <div className="space-y-3">
            <Specimen title="Variantes" code="variant">
              <Button>Enregistrer</Button>
              <Button variant="secondary">Secondaire</Button>
              <Button variant="outline">Contour</Button>
              <Button variant="ghost">Fantôme</Button>
              <Button variant="destructive">
                <Trash2 /> Supprimer
              </Button>
              <Button variant="link">Lien d'action</Button>
            </Specimen>

            <Specimen title="Tailles" code="size">
              <Button size="sm">Petit</Button>
              <Button>Défaut</Button>
              <Button size="lg">Grand</Button>
              <Button size="icon" aria-label="Rechercher">
                <Search />
              </Button>
            </Specimen>

            <Specimen title="États" code="disabled · with icon">
              <Button disabled>Désactivé</Button>
              <Button variant="outline" disabled>
                Contour désactivé
              </Button>
              <Button>
                <Download /> Télécharger
              </Button>
              <Button variant="outline">
                Suivant <ArrowRight />
              </Button>
            </Specimen>
          </div>

          <div className="mt-3">
            <Rule>
              <strong>Un bouton désactivé ne dit pas pourquoi.</strong> Quand l'action est
              bloquée par une condition, préférez un bouton actif qui explique ce qui manque — ou
              un <code className="font-mono text-xs">title</code> explicite.
            </Rule>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Badge"
          note="Une étiquette informative, jamais cliquable. Les quatre variantes sémantiques recouvrent exactement les quatre statuts du système."
        >
          <Demo>
            <Badge>Défaut</Badge>
            <Badge variant="secondary">Secondaire</Badge>
            <Badge variant="outline">Contour</Badge>
            <Badge variant="success">
              <Check /> Synchronisé
            </Badge>
            <Badge variant="warning">Action requise</Badge>
            <Badge variant="info">
              <Info /> Nouveau
            </Badge>
            <Badge variant="destructive">Échec</Badge>
          </Demo>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Card"
          note="Un conteneur, une élévation. La carte n'est pas un bouton : si toute la surface est cliquable, elle doit le signaler (hover, curseur, focus) et rester atteignable au clavier."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Recherche sémantique</CardTitle>
                  <CardDescription className="mt-1">
                    Trois fournisseurs interrogés en parallèle.
                  </CardDescription>
                </div>
                <Badge variant="success">Actif</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  La carte porte le titre, la description et l'action. Aucune ombre
                  supplémentaire, aucune bordure colorée : la hiérarchie vient du texte.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm">Configurer</Button>
                <Button size="sm" variant="ghost">
                  Journal
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle>Carte discrète</CardTitle>
                <Badge variant="outline">Brouillon</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Le fond <code className="font-mono text-xs">bg-muted/30</code> suffit à
                  distinguer un bloc secondaire. Pas besoin d'une bordure de plus.
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Formulaires"
          note="Label toujours visible, jamais un placeholder en guise d'étiquette : dès la première frappe, l'étiquette disparaît et l'utilisateur ne sait plus ce qu'il remplit."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    Adresse e-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input id="email" type="email" placeholder="vous@exemple.com" autoComplete="email" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email-err">Adresse invalide</Label>
                  <Input
                    id="email-err"
                    type="email"
                    defaultValue="pas-un-email"
                    aria-invalid
                    aria-describedby="email-err-msg"
                  />
                  <p id="email-err-msg" className="text-xs text-destructive">
                    Le format attendu est nom@domaine.tld.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="note">Note interne</Label>
                  <Textarea id="note" placeholder="Contexte, décisions, points ouverts…" />
                  <p className="text-xs text-muted-foreground">Visible uniquement par vous.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="disabled">Champ verrouillé</Label>
                  <Input id="disabled" defaultValue="Valeur héritée" disabled />
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <Rule>
                <strong>Le placeholder n'est pas une étiquette.</strong> Il indique un
                <em> exemple</em> de format, rien de plus.
              </Rule>
              <Rule>
                <strong>L'erreur est reliée au champ</strong> par{' '}
                <code className="font-mono text-xs">aria-describedby</code> et{' '}
                <code className="font-mono text-xs">aria-invalid</code>. Une bordure rouge seule
                n'est pas accessible.
              </Rule>
              <Rule>
                <strong>Un champ obligatoire est marqué visuellement ET sémantiquement</strong> —
                l'astérisque seul n'est pas lu par tous les lecteurs d'écran.
              </Rule>
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Contrôles"
          note="Switch = un état qui s'applique immédiatement. Checkbox = un choix qu'on valide. La distinction n'est pas cosmétique."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="sw-sync" className="text-sm">
                      Synchronisation automatique
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Récupère les changements toutes les 30 secondes.
                    </p>
                  </div>
                  <Switch
                    id="sw-sync"
                    checked={switchOn}
                    onCheckedChange={setSwitchOn}
                    aria-label="Synchronisation automatique"
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Checkbox id="cb-1" defaultChecked aria-label="Inclure les archives" />
                    <Label htmlFor="cb-1" className="font-normal">
                      Inclure les archives
                    </Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Checkbox id="cb-2" aria-label="Inclure les brouillons" />
                    <Label htmlFor="cb-2" className="font-normal">
                      Inclure les brouillons
                    </Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Checkbox id="cb-3" checked={checked} onCheckedChange={setChecked} aria-label="Sélection partielle" />
                    <Label htmlFor="cb-3" className="font-normal">
                      Sélection partielle (indeterminate)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Checkbox id="cb-4" disabled aria-label="Option indisponible" />
                    <Label htmlFor="cb-4" className="font-normal text-muted-foreground">
                      Option verrouillée
                    </Label>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <Card className="p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Progress
                </p>
                <div className="space-y-3">
                  {[12, 48, 100].map((v) => (
                    <div key={v}>
                      <Progress value={v} aria-label={`Progression ${v} %`} />
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                        {v} %
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Skeleton · aria-busy
                </p>
                <div className="space-y-2" aria-busy="true">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </Card>
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section
          title="Tabs"
          note="Radix fournit la sémantique et la navigation aux flèches ; nous ne fournissons que l'apparence. Le comportement clavier ne s'improvise pas."
        >
          <Card className="p-5">
            <Tabs defaultValue="resume">
              <TabsList>
                <TabsTrigger value="resume">Résumé</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
                <TabsTrigger value="journal">Journal</TabsTrigger>
              </TabsList>
              <TabsContent value="resume">
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  Le panneau résumé. Notez que les onglets inactifs ne sont pas dans l'ordre de
                  tabulation : on y entre avec les flèches, comme le prévoit le motif ARIA.
                </p>
              </TabsContent>
              <TabsContent value="sources">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-success" aria-hidden /> 12 sources
                    rattachées
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-warning" aria-hidden /> 2 sources en
                    attente
                  </li>
                </ul>
              </TabsContent>
              <TabsContent value="journal">
                <p className="font-mono text-xs text-muted-foreground">
                  09:12 · synchronisation terminée · 1 019 unités
                </p>
              </TabsContent>
            </Tabs>
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section title="Retours d'état" note="Quatre statuts, quatre variantes. L'alerte destructive est la seule à déclencher une annonce immédiate.">
          <div className="grid gap-3 lg:grid-cols-2">
            <Alert>
              <Info data-slot="alert-icon" className="mt-0.5 size-4 shrink-0" />
              <div>
                <AlertTitle>Information neutre</AlertTitle>
                <AlertDescription>Un contexte, sans conséquence.</AlertDescription>
              </div>
            </Alert>

            <Alert variant="success">
              <Check data-slot="alert-icon" className="mt-0.5 size-4 shrink-0" />
              <div>
                <AlertTitle>Synchronisation terminée</AlertTitle>
                <AlertDescription>1 019 unités rattachées en 2,4 s.</AlertDescription>
              </div>
            </Alert>

            <Alert variant="warning">
              <TriangleAlert data-slot="alert-icon" className="mt-0.5 size-4 shrink-0" />
              <div>
                <AlertTitle>Jeton proche de l'expiration</AlertTitle>
                <AlertDescription>Renouvelez avant le 3 novembre.</AlertDescription>
              </div>
            </Alert>

            <Alert variant="destructive">
              <Zap data-slot="alert-icon" className="mt-0.5 size-4 shrink-0" />
              <div>
                <AlertTitle>Connexion perdue</AlertTitle>
                <AlertDescription>
                  Les modifications restent locales jusqu'au rétablissement.
                </AlertDescription>
              </div>
            </Alert>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section title="Avatar & tooltip" note="Le tooltip complète, il ne remplace pas : une information essentielle ne peut pas vivre dans un survol.">
          <Demo className="justify-between">
            <div className="flex items-center gap-3">
              <Avatar>AD</Avatar>
              <Avatar className="bg-primary/12 text-primary">MK</Avatar>
              <Avatar className="size-11 bg-accent text-accent-foreground">LB</Avatar>
              <div>
                <p className="text-sm font-medium">Ada Diop</p>
                <p className="text-xs text-muted-foreground">Rôle administrateur</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip content="Copier le lien">
                <Button variant="outline" size="icon" aria-label="Copier le lien">
                  <Copy />
                </Button>
              </Tooltip>
              <Tooltip content="Partager par e-mail" side="bottom">
                <Button variant="outline" size="icon" aria-label="Partager par e-mail">
                  <Mail />
                </Button>
              </Tooltip>
            </div>
          </Demo>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section title="Ce que la galerie n'inclut pas" note="Une liste aussi importante que la précédente.">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Dialog / modale', 'Revient avec le premier flux qui en a besoin — pas avant.'],
              ['Table de données', 'Les colonnes dépendent du domaine, pas du design system.'],
              ['Toast', 'Deux systèmes de notification (alerte + toast) se contredisent vite.'],
              ['Date picker', 'Un vrai sujet à lui seul ; il méritera son écran de doc.'],
            ].map(([title, why]) => (
              <div key={title} className="rounded-lg border border-dashed border-border p-4">
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{why}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Rule>
              Un composant n'entre dans le système que lorsqu'un écran réel en a besoin. Anticiper
              produit des abstractions que personne n'utilise et qu'il faut maintenir quand même.
            </Rule>
          </div>
        </Section>
      </div>
    </TooltipProvider>
  );
}
