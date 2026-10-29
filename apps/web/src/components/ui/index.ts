/**
 * Point d'entrée unique du design system.
 *
 * Les écrans importent `@/components/ui`, jamais un fichier interne : le jour
 * où un composant change de fichier, aucun écran n'a à bouger.
 */
export { Button, buttonVariants, type ButtonProps } from './button';
export { Badge, badgeVariants, type BadgeProps } from './badge';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';
export { Input } from './input';
export { Textarea, Label, Separator } from './form';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Switch, Checkbox } from './toggles';
export {
  Progress,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  Avatar,
  Tooltip,
  TooltipProvider,
} from './feedback';
