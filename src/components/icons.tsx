import {
  AlertTriangle, BarChart3, Bolt, CalendarDays, Check, ChevronLeft, ChevronRight, Coins, Copy, Delete, Flame, Crown, Gift, Home, KeyRound, Lightbulb, Lock, LogOut, Mail, Minus, NotebookPen, Package, PiggyBank, Plus, Receipt, RefreshCw, Route, Settings, ShieldCheck, ShoppingCart, Sparkles, StickyNote, Store, Trash2, Trophy, Undo2, Users, Wallet, WifiOff, X,
  type LucideIcon,
} from "lucide-react";

export {
  AlertTriangle, BarChart3, Bolt, CalendarDays, Check, ChevronLeft, ChevronRight, Coins, Copy, Delete, Flame, Crown, Gift, Home, KeyRound, Lightbulb, Lock, LogOut, Mail, Minus, NotebookPen, Package, PiggyBank, Plus, Receipt, RefreshCw, Route, Settings, ShieldCheck, ShoppingCart, Sparkles, StickyNote, Store, Trash2, Trophy, Undo2, Users, Wallet, WifiOff, X,
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
