import {
  Archive, BadgeCheck, CalendarClock, Car, Clock, Gauge, History, Hourglass, LayoutGrid, ListChecks, Pencil, Settings2, Wrench, AlertTriangle, BarChart3, Bolt, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Coins, Copy, Delete, Flame, Crown, Gift, Home, KeyRound, Lightbulb, Lock, LogOut, Mail, Minus, NotebookPen, Package, PiggyBank, Plus, Receipt, RefreshCw, Route, Settings, ShieldCheck, ShoppingCart, Sparkles, StickyNote, Store, Trash2, Trophy, Undo2, Users, Wallet, WifiOff, X, Zap,
  type LucideIcon,
} from "lucide-react";

export {
  Archive, BadgeCheck, CalendarClock, Car, Clock, Gauge, History, Hourglass, LayoutGrid, ListChecks, Pencil, Settings2, Wrench, AlertTriangle, BarChart3, Bolt, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Coins, Copy, Delete, Flame, Crown, Gift, Home, KeyRound, Lightbulb, Lock, LogOut, Mail, Minus, NotebookPen, Package, PiggyBank, Plus, Receipt, RefreshCw, Route, Settings, ShieldCheck, ShoppingCart, Sparkles, StickyNote, Store, Trash2, Trophy, Undo2, Users, Wallet, WifiOff, X, Zap,
};

// Ikon badge & quest dipetakan dari kunci di lib/gamification (lib tetap bebas dari UI).
const BY_KEY: Record<string, LucideIcon> = {
  cart: ShoppingCart,
  shield: ShieldCheck,
  bolt: Bolt,
  notebook: NotebookPen,
  users: Users,
  package: Package,
};

export function KeyIcon({ name, className }: { name: string; className?: string }) {
  const Icon = BY_KEY[name] ?? Sparkles;
  return <Icon className={className} aria-hidden strokeWidth={2} />;
}
