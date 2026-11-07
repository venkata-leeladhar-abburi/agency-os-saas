import {
  Copy,
  Cube,
  FlowArrow,
  Globe,
  Kanban,
  Lightbulb,
  ListChecks,
  Sparkle,
  Wrench,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import type { KnowledgeKind } from '@/lib/data/knowledge-types';

export const KIND_ICONS: Record<KnowledgeKind, Icon> = {
  process: FlowArrow,
  prompt: Sparkle,
  tool: Wrench,
  website: Globe,
  component: Cube,
  template: Copy,
  checklist: ListChecks,
  board: Kanban,
  learning: Lightbulb,
};

/** The kind's icon in a soft tile, beside an item's name. */
export function KindTile({ kind, size = 'md' }: { kind: KnowledgeKind; size?: 'md' | 'lg' }) {
  const Icon = KIND_ICONS[kind];
  return (
    <span
      className={
        size === 'lg'
          ? 'grid size-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground'
          : 'grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground'
      }
    >
      <Icon size={size === 'lg' ? 22 : 16} aria-hidden="true" />
    </span>
  );
}
