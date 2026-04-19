
import { Plane, Palmtree, Car, Home, Laptop, Gift, Heart, Target, Wallet, Umbrella } from 'lucide-react';

export const ICON_MAP: Record<string, any> = {
    'plane': Plane,
    'palmtree': Palmtree,
    'car': Car,
    'home': Home,
    'laptop': Laptop,
    'gift': Gift,
    'heart': Heart,
    'target': Target,
    'wallet': Wallet,
    'umbrella': Umbrella
};

export const COLOR_STYLES = {
    cyan: { bg: 'from-cyan-900/40 to-blue-900/40', border: 'border-cyan-500/30', text: 'text-cyan-400', bar: 'from-cyan-500 to-blue-500', btn: 'bg-cyan-600 hover:bg-cyan-500' },
    purple: { bg: 'from-purple-900/40 to-indigo-900/40', border: 'border-purple-500/30', text: 'text-purple-400', bar: 'from-purple-500 to-indigo-500', btn: 'bg-purple-600 hover:bg-purple-500' },
    emerald: { bg: 'from-emerald-900/40 to-teal-900/40', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'from-emerald-500 to-teal-500', btn: 'bg-emerald-600 hover:bg-emerald-500' },
    orange: { bg: 'from-orange-900/40 to-amber-900/40', border: 'border-orange-500/30', text: 'text-orange-400', bar: 'from-orange-500 to-amber-500', btn: 'bg-orange-600 hover:bg-orange-500' },
    rose: { bg: 'from-rose-900/40 to-pink-900/40', border: 'border-rose-500/30', text: 'text-rose-400', bar: 'from-rose-500 to-pink-500', btn: 'bg-rose-600 hover:bg-rose-500' },
    blue: { bg: 'from-blue-900/40 to-indigo-900/40', border: 'border-blue-500/30', text: 'text-blue-400', bar: 'from-blue-500 to-indigo-500', btn: 'bg-blue-600 hover:bg-blue-500' },
};
