// Garage to Gigawatt: component props (documentation only).
import type { ReactNode } from "react";

export interface ButtonProps { variant?: "primary" | "secondary" | "ghost"; size?: "l"; disabledReason?: string; ariaLabel?: string; onClick?: () => void; children: ReactNode; }
export interface SegmentedProps { options: string[]; value: string; onChange?: (option: string) => void; label: string; }
export interface StatProps { label: string; value: ReactNode; delta?: number; strong?: boolean; }
export interface DeltaProps { value: number; kind?: "pct" | "money" | "count"; suffix?: string; invert?: boolean; }
export interface KpiTileProps { label: string; value: ReactNode; sub?: ReactNode; subTone?: "gain" | "loss" | "warn"; }
export interface PipsProps { total?: number; filled?: number; cost?: 1 | 2 | 3; unaffordable?: boolean; }
export interface ActionRowProps { label: string; cost?: 1 | 2 | 3; price?: string; unaffordable?: boolean; disabledReason?: string; }
export interface HeatMeterProps { value: number; hideLabel?: boolean; }
export interface SiteCardProps { name: string; price: string; used: number; capacity: number; heat: number; tag?: string; tagTone?: "tape" | "warn" | "danger"; }
export interface LtvGaugeProps { ltv: number; label?: string; }
export interface LadderStepProps { state: "done" | "available" | "locked"; title: string; detail?: string; note?: string; }
export interface LeagueRow { rank: number; code: string; name: string; hashrate: string; value: string; delta?: number; you?: boolean; }
export interface LeagueTableProps { rows: LeagueRow[]; }
export interface SparklineProps { points: number[]; series?: "btc" | "eth" | "hashprice"; label?: string; width?: number; height?: number; }
export interface WeekTimelineProps { current: number; interrupts?: number[]; }
export interface EventChoice { label: string; effect: string; isDefault?: boolean; }
export interface EventCardProps { eyebrow: string; stamp?: string; illustration?: ReactNode; title: string; body: string; choices: EventChoice[]; source?: string; }
export interface ToastProps { eyebrow: string; title: string; detail?: string; }
export interface NewsTickerProps { text: string; masthead?: string; }
export interface TagProps { tone?: "neutral" | "warn" | "danger" | "tape"; children: ReactNode; }
export interface MergeOptionProps { letter: "A" | "B" | "C" | "D"; title: string; text: string; preview: string; hint?: string; selected?: boolean; }
export type IconName = "cash" | "treasury" | "bandwidth" | "btc" | "eth" | "hashrate" | "power" | "heat" | "site" | "machine" | "loan" | "rival" | "news" | "settings" | "pause" | "speed" | "skip" | "warning" | "dashboard" | "fleet" | "capital" | "people" | "league" | "log" | "gpu-rig" | "asic" | "garage" | "small-unit" | "warehouse" | "own-site" | "texas-site" | "buy" | "sell" | "scout" | "negotiate" | "pitch" | "hire" | "outreach" | "read-market" | "bid" | "price-alert" | "curtail" | "failure" | "complaint" | "margin-call" | "locked" | "in-transit" | "degraded" | "seed" | "ipo" | "cap-table" | "close" | "info" | "check" | "chevron-right" | "save" | "export" | "import" | "sound-on" | "sound-off" | "glossary" | "pc-tower" | "gpu-card" | "fpga-board" | "asic-early" | "solo" | "pool" | "wallet" | "exchange" | "backup" | "lost-key" | "pre-order" | "group-buy" | "move-out" | "conference" | "vanity" | "household" | "auto-play";
export interface IconProps { name: IconName; size?: 16 | 20 | number; label?: string; className?: string; }
export type MachineName = "pc-tower-2009" | "gpu-card-2010" | "fpga-board-2011" | "asic-preorder-2013" | "asic-box-2014" | "asic-box-2016" | "gpu-rig-open-frame" | "asic-box-2020" | "gpu-server-8x" | "gpu-rack-liquid";
export interface MachineCardProps { name: MachineName; caption?: string; era?: string; compact?: boolean; className?: string; }
export interface LogoProps { size?: number; layout?: "stacked" | "horizontal"; tone?: "black" | "reversed" | "mono"; }
export interface MarkProps { size?: number; band?: boolean; label?: string; }

export interface Fmt {
  money(v: number, opts?: { exact?: boolean; dp?: number }): string;
  signed(v: number, opts?: { exact?: boolean; dp?: number }): string;
  crypto(v: number, coin: "BTC" | "ETH"): string;
  hash(v: number, unit: "MH" | "TH"): string;
  power(kw: number): string;
  cents(usdPerKwh: number): string;
  pct(fraction: number, dp?: number): string;
  delta(v: number, kind: "pct" | "money" | "count", opts?: object): string;
  quarter(q: string, week?: number): string;
}

export declare const Button: (p: ButtonProps) => JSX.Element;
export declare const Segmented: (p: SegmentedProps) => JSX.Element;
export declare const Stat: (p: StatProps) => JSX.Element;
export declare const Delta: (p: DeltaProps) => JSX.Element;
export declare const KpiTile: (p: KpiTileProps) => JSX.Element;
export declare const Pips: (p: PipsProps) => JSX.Element;
export declare const ActionRow: (p: ActionRowProps) => JSX.Element;
export declare const HeatMeter: (p: HeatMeterProps) => JSX.Element;
export declare const SiteCard: (p: SiteCardProps) => JSX.Element;
export declare const LtvGauge: (p: LtvGaugeProps) => JSX.Element;
export declare const LadderStep: (p: LadderStepProps) => JSX.Element;
export declare const LeagueTable: (p: LeagueTableProps) => JSX.Element;
export declare const Sparkline: (p: SparklineProps) => JSX.Element;
export declare const WeekTimeline: (p: WeekTimelineProps) => JSX.Element;
export declare const EventCard: (p: EventCardProps) => JSX.Element;
export declare const Toast: (p: ToastProps) => JSX.Element;
export declare const NewsTicker: (p: NewsTickerProps) => JSX.Element;
export declare const Tag: (p: TagProps) => JSX.Element;
export declare const MergeOption: (p: MergeOptionProps) => JSX.Element;
export declare const Icon: (p: IconProps) => JSX.Element;
export declare const iconNames: IconName[];
export declare const MachineCard: (p: MachineCardProps) => JSX.Element;
export declare const machineNames: MachineName[];
export declare const Logo: (p: LogoProps) => JSX.Element;
export declare const Mark: (p: MarkProps) => JSX.Element;
export declare const fmt: Fmt;
export declare function heatStep(value: number): 1 | 2 | 3 | 4 | 5;
