import type * as React from 'react';
type Icon = string; // a Phosphor icon name, e.g. 'paper-plane-tilt'
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary'|'secondary'|'soft'|'ghost'|'destructive'|'highlight'|'link'; size?: 'sm'|'md'|'lg'|'xl'; icon?: Icon; iconRight?: Icon; loading?: boolean; block?: boolean; kbd?: string; as?: 'button'|'a'; href?: string }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { icon: Icon; label: string; variant?: 'ghost'|'outline'; size?: 'sm'|'md' }
export declare function IconButton(props: IconButtonProps): React.ReactElement;
export interface IconProps { name: Icon; size?: number; weight?: 'regular'|'fill'|'duotone'; label?: string; className?: string }
export declare function Icon(props: IconProps): React.ReactElement;
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string; optional?: boolean; prefix?: React.ReactNode; suffix?: React.ReactNode; icon?: Icon; size?: 'md'|'xl' }
export declare function Input(props: InputProps): React.ReactElement;
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; hint?: string; error?: string; optional?: boolean }
export declare function Textarea(props: TextareaProps): React.ReactElement;
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; hint?: string; error?: string; options: (string|{value: string; label: string})[] }
export declare function Select(props: SelectProps): React.ReactElement;
export interface CheckboxProps { label?: React.ReactNode; description?: string; checked?: boolean; defaultChecked?: boolean; disabled?: boolean; onChange?: (checked: boolean) => void }
export declare function Checkbox(props: CheckboxProps): React.ReactElement;
export interface SwitchProps extends CheckboxProps {}
export declare function Switch(props: SwitchProps): React.ReactElement;
export interface BadgeProps { tone?: 'neutral'|'brand'|'success'|'warning'|'danger'|'info'|'highlight'|'outline'; dot?: boolean; icon?: Icon; size?: 'sm'|'md'; children?: React.ReactNode }
export declare function Badge(props: BadgeProps): React.ReactElement;
export interface AvatarProps { name: string; src?: string; size?: 'xs'|'sm'|'md'|'lg' }
export declare function Avatar(props: AvatarProps): React.ReactElement;
export declare function AvatarGroup(props: { names: string[]; max?: number; size?: AvatarProps['size'] }): React.ReactElement;
export interface ProgressProps { value: number; label?: string; showValue?: boolean; valueText?: string; tone?: 'success'|'danger'|'highlight' }
export declare function Progress(props: ProgressProps): React.ReactElement;
export interface SkeletonProps { width?: number|string; height?: number|string; circle?: boolean }
export declare function Skeleton(props: SkeletonProps): React.ReactElement;
export interface TabsProps { items: {value: string; label: string; icon?: Icon; count?: number}[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; label?: string }
export declare function Tabs(props: TabsProps): React.ReactElement;
export interface SegmentedProps { items: {value: string; label: string; icon?: Icon}[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; label?: string }
export declare function Segmented(props: SegmentedProps): React.ReactElement;
export interface SidebarProps { workspace: string; plan?: string; active?: string; collapsed?: boolean; user?: {name: string; role: string}; groups: {label?: string; items: {value: string; label: string; icon: Icon; count?: number; alert?: boolean}[]}[] }
export declare function Sidebar(props: SidebarProps): React.ReactElement;
export interface CommandPaletteProps { query?: string; groups: {label: string; items: {icon: Icon; label: string; meta?: string; kbd?: string; active?: boolean}[]}[] }
export declare function CommandPalette(props: CommandPaletteProps): React.ReactElement;
export interface CardProps { title?: string; description?: string; icon?: Icon; actions?: React.ReactNode; flush?: boolean; children?: React.ReactNode }
export declare function Card(props: CardProps): React.ReactElement;
export interface AlertProps { tone?: 'info'|'success'|'warning'|'danger'|'brand'; title?: string; action?: React.ReactNode; onDismiss?: () => void; children?: React.ReactNode }
export declare function Alert(props: AlertProps): React.ReactElement;
export interface ToastProps { tone?: 'success'|'danger'|'info'; title: string; description?: string; action?: string }
export declare function Toast(props: ToastProps): React.ReactElement;
export interface DialogProps { title: string; description?: string; icon?: Icon; tone?: 'brand'|'danger'; footer?: React.ReactNode; children?: React.ReactNode }
export declare function Dialog(props: DialogProps): React.ReactElement;
export interface EmptyStateProps { title: string; icon?: Icon; action?: React.ReactNode; secondary?: React.ReactNode; compact?: boolean; children?: React.ReactNode }
export declare function EmptyState(props: EmptyStateProps): React.ReactElement;
export interface MetricCardProps { label: string; value: React.ReactNode; icon?: Icon; delta?: number; inverse?: boolean; note?: string; spark?: number[]; tone?: 'danger'; href?: string }
export declare function MetricCard(props: MetricCardProps): React.ReactElement;
export interface DataTableColumn<R> { key: string; label: string; align?: 'left'|'right'; mono?: boolean; sortable?: boolean; width?: number|string; render?: (row: R) => React.ReactNode }
export interface DataTableProps<R = any> { columns: DataTableColumn<R>[]; rows: R[]; selectable?: boolean; density?: 'default'|'compact'; footer?: React.ReactNode }
export declare function DataTable(props: DataTableProps): React.ReactElement;
export interface LeadCardProps { name: string; service?: string; value: string; source?: string; owner?: string; due?: string; overdue?: boolean; highlight?: boolean }
export interface PipelineBoardProps { size?: 'md'|'sm'; columns: {name: string; total: string; won?: boolean; cards: LeadCardProps[]}[] }
export declare function PipelineBoard(props: PipelineBoardProps): React.ReactElement;
export interface ActivityFeedProps { items: {icon: Icon; tone?: 'brand'|'success'|'warning'; who: string; text: string; target?: string; when: string}[] }
export declare function ActivityFeed(props: ActivityFeedProps): React.ReactElement;
export interface PhaseStepperProps { current?: number; skipped?: number[]; gates?: number[]; phases?: string[]; compact?: boolean }
export declare function PhaseStepper(props: PhaseStepperProps): React.ReactElement;
export interface GateCardProps { phase: string; title: string; status?: 'draft'|'waiting'|'approved'|'changes'; view?: 'agency'|'client'; description?: string; files?: string[]; approver: string; when?: string }
export declare function GateCard(props: GateCardProps): React.ReactElement;
export interface InvoiceSummaryProps { number: string; type?: string; status?: 'due'|'paid'|'overdue'; due?: string; currency?: string; tax?: 'intra'|'inter'|'lut'|'none'; rate?: string; lut?: string; lines: {item: string; sac?: string; qty: number; rate: number}[] }
export declare function InvoiceSummary(props: InvoiceSummaryProps): React.ReactElement;
export interface ChecklistProps { title: string; items: {label: string; done?: boolean; hint?: string; cta?: string}[] }
export declare function Checklist(props: ChecklistProps): React.ReactElement;
export interface RecordHeaderProps { title: string; avatar?: boolean; status?: string; statusTone?: BadgeProps['tone']; meta?: {icon: Icon; text: string}[]; actions?: React.ReactNode }
export declare function RecordHeader(props: RecordHeaderProps): React.ReactElement;
export declare function Logo(props: { size?: number }): React.ReactElement;
export declare function Mark(props: { size?: number }): React.ReactElement;
/** Money in minor units (paise, cents). INR compact uses L and Cr. */
export declare function formatMoney(minor: number, currency?: string, opts?: { compact?: boolean; locale?: string; decimals?: number }): string;
export declare function rupeesInWords(minor: number): string;
export declare function formatDate(d: Date|string|number, opts?: { locale?: string; year?: boolean }): string;
declare global { interface Window { AgencyOS: typeof import('./index') } }
