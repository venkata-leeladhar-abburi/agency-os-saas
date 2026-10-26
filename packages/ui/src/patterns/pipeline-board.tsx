'use client';

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, DotsSixVertical, Plus, WarningCircle } from '@phosphor-icons/react';
import { useId, useState, type ReactNode } from 'react';
import { Avatar } from '../components/avatar';
import { Badge } from '../components/badge';
import { cn } from '../lib/cn';

export type LeadCardData = {
  id: string;
  name: string;
  service?: string;
  /** Formatted value: "₹80,000". */
  value?: string;
  source?: string;
  owner?: string;
  /** Next follow-up: "Call today", "Thu, 11:30 am". */
  due?: string;
  overdue?: boolean;
};

export type PipelineColumn = {
  id: string;
  name: string;
  /** Formatted column total: "₹2.95 L". */
  total?: string;
  /** The Won column: marked with the lime highlight. */
  won?: boolean;
  cards: LeadCardData[];
};

export type PipelineLabels = {
  /** Names the scrollable board for screen readers. */
  board?: string;
  addLead?: string;
  move?: (name: string) => string;
  instructions?: string;
  pickedUp?: (name: string, column: string) => string;
  over?: (name: string, column: string) => string;
  moved?: (name: string, column: string) => string;
  cancelled?: (name: string) => string;
  count?: (n: number) => string;
};

export type PipelineBoardProps = {
  columns: PipelineColumn[];
  /** Called when a card lands in a column (also for reordering inside one). */
  onMove?: (cardId: string, toColumnId: string, index: number) => void;
  onOpen?: (cardId: string) => void;
  onAddLead?: (columnId: string) => void;
  size?: 'md' | 'sm';
  labels?: PipelineLabels;
  className?: string;
};

type Board = Record<string, LeadCardData[]>;

function toBoard(columns: PipelineColumn[]): Board {
  return Object.fromEntries(columns.map((c) => [c.id, c.cards]));
}

/** One lead on the board: name, service, value, source, owner and the next follow-up. */
export function LeadCard({
  lead,
  won,
  onOpen,
  dragging,
  handle,
  className,
}: {
  lead: LeadCardData;
  won?: boolean;
  onOpen?: (id: string) => void;
  dragging?: boolean;
  handle?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group/lead grid gap-1.5 rounded-md border border-border bg-card px-3 py-2.5 shadow-xs transition-[box-shadow,border-color,transform] duration-150 hover:-translate-y-px hover:border-border-strong hover:shadow-md',
        won && 'border-lime-500 inset-shadow-[3px_0_0_0_var(--highlight)]',
        dragging && 'rotate-1 shadow-md',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen?.(lead.id)}
          className="min-w-0 cursor-pointer truncate text-left text-body font-semibold hover:underline"
        >
          {lead.name}
        </button>
        <span className="flex shrink-0 items-center gap-1">
          {handle}
          {lead.owner ? <Avatar name={lead.owner} size="sm" /> : null}
        </span>
      </div>
      {lead.service ? (
        <p className="text-caption font-normal text-muted-foreground">{lead.service}</p>
      ) : null}
      {lead.value || lead.source ? (
        <div className="flex items-center justify-between gap-2">
          {lead.value ? (
            <span className="text-body-sm font-semibold tabular-nums">{lead.value}</span>
          ) : (
            <span />
          )}
          {lead.source ? <Badge size="sm">{lead.source}</Badge> : null}
        </div>
      ) : null}
      {lead.due ? (
        <p
          className={cn(
            'flex items-center gap-1 text-caption font-normal text-muted-foreground',
            lead.overdue && 'font-medium text-danger',
          )}
        >
          {lead.overdue ? (
            <WarningCircle size={13} aria-hidden="true" />
          ) : (
            <Clock size={13} aria-hidden="true" />
          )}
          {lead.due}
        </p>
      ) : null}
    </div>
  );
}

function SortableLead({
  lead,
  won,
  onOpen,
  moveLabel,
}: {
  lead: LeadCardData;
  won?: boolean;
  onOpen?: (id: string) => void;
  moveLabel: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('list-none', isDragging && 'opacity-40')}
      {...listeners}
    >
      <LeadCard
        lead={lead}
        won={won}
        onOpen={onOpen}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            aria-label={moveLabel}
            className="grid size-6 cursor-grab place-items-center rounded-xs text-muted-foreground opacity-0 transition-opacity group-hover/lead:opacity-100 hover:bg-accent focus-visible:opacity-100 max-md:opacity-100"
          >
            <DotsSixVertical size={16} aria-hidden="true" />
          </button>
        }
      />
    </li>
  );
}

function Column({
  column,
  cards,
  onOpen,
  onAddLead,
  labels,
}: {
  column: PipelineColumn;
  cards: LeadCardData[];
  onOpen?: (id: string) => void;
  onAddLead?: (columnId: string) => void;
  labels?: PipelineLabels;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const headingId = useId();
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-2 transition-shadow',
        isOver && 'ring-2 ring-ring',
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1.5 pt-1 pb-0.5">
        <h3 id={headingId} className="flex items-center gap-1.5 text-body-sm font-semibold">
          {column.won ? (
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-highlight ring-1 ring-lime-700"
            />
          ) : null}
          {column.name}
          <span className="rounded-full bg-card px-1.5 text-caption leading-4.5 text-muted-foreground tabular-nums">
            <span aria-hidden="true">{cards.length}</span>
            <span className="sr-only">
              {labels?.count?.(cards.length) ?? `${cards.length} leads`}
            </span>
          </span>
        </h3>
        {column.total ? (
          <span className="text-caption text-muted-foreground tabular-nums">{column.total}</span>
        ) : null}
      </header>
      <SortableContext
        id={column.id}
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="grid min-h-4 gap-2 p-0">
          {cards.map((lead) => (
            <SortableLead
              key={lead.id}
              lead={lead}
              won={column.won}
              onOpen={onOpen}
              moveLabel={labels?.move?.(lead.name) ?? `Move ${lead.name}`}
            />
          ))}
        </ul>
      </SortableContext>
      {onAddLead ? (
        <button
          type="button"
          onClick={() => onAddLead(column.id)}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border-strong bg-transparent px-2 text-body-sm text-muted-foreground transition-colors duration-120 hover:bg-card hover:text-foreground"
        >
          <Plus size={14} aria-hidden="true" />
          {labels?.addLead ?? 'Add lead'}
        </button>
      ) : null}
    </section>
  );
}

/** The leads board: drag cards between stages with a pointer or the keyboard; moves are announced. */
export function PipelineBoard({
  columns,
  onMove,
  onOpen,
  onAddLead,
  size = 'md',
  labels,
  className,
}: PipelineBoardProps) {
  const [board, setBoard] = useState<Board>(() => toBoard(columns));
  const [activeId, setActiveId] = useState<string | null>(null);
  // New columns from the parent replace the local order (React's "adjust state on prop change").
  const [source, setSource] = useState(columns);
  if (source !== columns) {
    setSource(columns);
    setBoard(toBoard(columns));
  }

  const columnOf = (id: string) =>
    id in board ? id : Object.keys(board).find((key) => board[key]?.some((c) => c.id === id));

  // Left and right move to the neighbouring stage, next to the card at the nearest height;
  // up and down reorder within the stage.
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    const step = event.code === 'ArrowRight' ? 1 : event.code === 'ArrowLeft' ? -1 : 0;
    if (!step) return sortableKeyboardCoordinates(event, args);
    event.preventDefault();
    const { active, collisionRect, droppableRects } = args.context;
    if (!active || !collisionRect) return undefined;
    const order = columns.map((c) => c.id);
    const target = order[order.indexOf(columnOf(String(active.id)) ?? '') + step];
    if (!target) return undefined;
    const candidates = (board[target] ?? [])
      .filter((c) => c.id !== active.id)
      .map((c) => droppableRects.get(c.id));
    const nearest = candidates
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .sort((a, b) => Math.abs(a.top - collisionRect.top) - Math.abs(b.top - collisionRect.top))[0];
    const rect = nearest ?? droppableRects.get(target);
    return rect ? { x: rect.left, y: rect.top } : undefined;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );
  const leadName = (id: string) =>
    Object.values(board)
      .flat()
      .find((c) => c.id === id)?.name ?? '';
  const columnName = (id: string | undefined) => columns.find((c) => c.id === id)?.name ?? '';

  // The stage a draggable or droppable belongs to, read from dnd-kit's own data so it is current.
  const stageOf = (item: { id: string | number; data: { current?: Record<string, unknown> } }) => {
    const sortable = item.data.current?.sortable as { containerId?: string } | undefined;
    return columnName(sortable?.containerId ?? String(item.id));
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      labels?.pickedUp?.(leadName(String(active.id)), stageOf(active)) ??
      `Picked up ${leadName(String(active.id))} in ${stageOf(active)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? (labels?.over?.(leadName(String(active.id)), stageOf(over)) ??
          `${leadName(String(active.id))} is over ${stageOf(over)}.`)
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? (labels?.moved?.(leadName(String(active.id)), stageOf(over)) ??
          `${leadName(String(active.id))} moved to ${stageOf(over)}.`)
        : undefined,
    onDragCancel: ({ active }) =>
      labels?.cancelled?.(leadName(String(active.id))) ??
      `Moving ${leadName(String(active.id))} was cancelled.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = columnOf(String(active.id));
    const to = columnOf(String(over.id));
    if (!from || !to || from === to) return;
    setBoard((current) => {
      const source = current[from] ?? [];
      const target = current[to] ?? [];
      const card = source.find((c) => c.id === active.id);
      if (!card) return current;
      const overIndex = target.findIndex((c) => c.id === over.id);
      const index = overIndex >= 0 ? overIndex : target.length;
      return {
        ...current,
        [from]: source.filter((c) => c.id !== active.id),
        [to]: [...target.slice(0, index), card, ...target.slice(index)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const to = columnOf(String(over.id));
    if (!to) return;
    const cards = board[to] ?? [];
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const overIndex = cards.findIndex((c) => c.id === over.id);
    let index = oldIndex;
    if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
      setBoard((current) => ({
        ...current,
        [to]: arrayMove(current[to] ?? [], oldIndex, overIndex),
      }));
      index = overIndex;
    }
    onMove?.(String(active.id), to, Math.max(index, 0));
  };

  const activeLead = activeId
    ? Object.values(board)
        .flat()
        .find((c) => c.id === activeId)
    : undefined;

  // A stable id keeps the server and browser markup the same (dnd-kit counts ids otherwise).
  const dndId = useId();

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setBoard(toBoard(columns));
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            labels?.instructions ??
            'To move a lead, press Space or Enter, use the arrow keys to choose a stage, then press Space or Enter again. Press Escape to cancel.',
        },
      }}
    >
      <div
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard (WCAG 2.1.1)
        tabIndex={0}
        role="region"
        aria-label={labels?.board ?? 'Pipeline'}
        className={cn(
          'grid auto-cols-[minmax(216px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2',
          size === 'sm' && 'auto-cols-[minmax(176px,1fr)]',
          className,
        )}
      >
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            cards={board[column.id] ?? []}
            onOpen={onOpen}
            onAddLead={onAddLead}
            labels={labels}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <LeadCard
            lead={activeLead}
            won={columns.find((c) => c.id === columnOf(activeLead.id))?.won}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
