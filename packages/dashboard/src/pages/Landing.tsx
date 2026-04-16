import { useState, useEffect } from 'react';
import {
  Check,
  X,
  Github,
  ArrowRight,
  FlaskConical,
  BookOpen,
  Copy,
  Zap,
  Shield,
  Gauge,
  Brain,
  Flag,
  AlertTriangle,
  Terminal,
  Star,
  ExternalLink,
} from 'lucide-react';

/* ───────────────────────── helpers ───────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

/* ────────────────────── comparison table data ───────────────── */

type CellValue = 'yes' | 'no' | 'coming' | 'addon' | 'partial' | 'paid';

interface CompRow {
  feature: string;
  bold?: boolean; // highlight rows where we win
  ab: CellValue;
  vwo: CellValue;
  optimizely: CellValue;
  launchdarkly: CellValue;
  statsig: CellValue;
  growthbook: CellValue;
}

const COMP_ROWS: CompRow[] = [
  { feature: 'A/B Testing',              ab: 'yes',    vwo: 'yes',  optimizely: 'yes',  launchdarkly: 'addon', statsig: 'yes',  growthbook: 'yes' },
  { feature: 'Multi-Variant Testing',    ab: 'yes',    vwo: 'yes',  optimizely: 'yes',  launchdarkly: 'no',    statsig: 'yes',  growthbook: 'yes' },
  { feature: 'Feature Flags',            ab: 'yes',    vwo: 'yes',  optimizely: 'yes',  launchdarkly: 'yes',   statsig: 'yes',  growthbook: 'yes' },
  { feature: 'Bayesian Stats',           ab: 'yes',    vwo: 'yes',  optimizely: 'yes',  launchdarkly: 'no',    statsig: 'yes',  growthbook: 'yes', bold: true },
  { feature: 'Frequentist Stats',        ab: 'yes',    vwo: 'yes',  optimizely: 'yes',  launchdarkly: 'yes',   statsig: 'yes',  growthbook: 'yes', bold: true },
  { feature: 'CUPED Variance Reduction', ab: 'partial', vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'paid', bold: true },
  { feature: 'Sequential Testing',       ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'paid', bold: true },
  { feature: 'SRM Detection',            ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'paid', bold: true },
  { feature: 'Multi-Armed Bandits',      ab: 'partial', vwo: 'no',   optimizely: 'yes',  launchdarkly: 'no',    statsig: 'yes',  growthbook: 'paid', bold: true },
  { feature: 'Contextual Bandits',       ab: 'partial', vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'no', bold: true },
  { feature: 'Visual Editor',            ab: 'coming', vwo: 'yes',  optimizely: 'yes',  launchdarkly: 'no',    statsig: 'no',   growthbook: 'no' },
  { feature: 'Warehouse Native',         ab: 'coming', vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'yes' },
  { feature: 'Privacy-First',            ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'no',   growthbook: 'yes' },
  { feature: 'Self-Hosted',              ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'no',   growthbook: 'yes' },
  { feature: 'Open Source',              ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'no',   growthbook: 'partial' },
];

function CellIcon({ value }: { value: CellValue }) {
  if (value === 'yes')
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400">
        <Check className="w-4 h-4" />
      </span>
    );
  if (value === 'no')
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/15 text-red-400/70">
        <X className="w-4 h-4" />
      </span>
    );
  if (value === 'coming')
    return <span className="text-xs font-medium text-slate-500">Coming Soon</span>;
  if (value === 'addon')
    return <span className="text-xs font-medium text-yellow-500">Add-on</span>;
  if (value === 'partial')
    return <span className="text-xs font-medium text-yellow-500">Partial</span>;
  if (value === 'paid')
    return <span className="text-xs font-medium text-yellow-500">Paid</span>;
  return null;
}

/* ────────────────────── "What You Get" cards ───────────────── */

const BENEFITS: { icon: React.ReactNode; headline: string; plain: string; tag: string }[] = [
  {
    icon: <Brain className="w-6 h-6 text-indigo-400" />,
    headline: 'Know who\'s winning -- before wasting time',
    plain: 'Our stats engine tells you the probability each option wins. Not just "significant" or "not significant."',
    tag: 'Statistical Analysis',
  },
  {
    icon: <Zap className="w-6 h-6 text-amber-400" />,
    headline: 'Stop tests early when you have a clear winner',
    plain: 'No more waiting 2 weeks "just to be safe." If B is crushing it after 3 days, you\'ll know.',
    tag: 'Sequential Testing',
  },
  {
    icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
    headline: 'Catch data bugs before they ruin your experiment',
    plain: 'If your traffic split is 50/50 but results look 60/40, something is broken. We catch that automatically.',
    tag: 'SRM Detection',
  },
  {
    icon: <Gauge className="w-6 h-6 text-cyan-400" />,
    headline: 'Run experiments 40% faster',
    plain: 'Uses your historical data to reduce noise. Same answer, way fewer visitors needed.',
    tag: 'CUPED Variance Reduction',
  },
  {
    icon: <Shield className="w-6 h-6 text-violet-400" />,
    headline: 'Let AI pick the best option automatically',
    plain: 'Instead of waiting for a winner, gradually send more traffic to whatever is performing best.',
    tag: 'Multi-Armed Bandits',
  },
  {
    icon: <Flag className="w-6 h-6 text-emerald-400" />,
    headline: 'Ship features safely with gradual rollouts',
    plain: 'Release to 5% of users, then 20%, then everyone. Roll back instantly if something breaks.',
    tag: 'Feature Flags',
  },
];

/* ═══════════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-indigo-500/20 overflow-x-hidden">
      {/* inline keyframes */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes progress-b {
          from { width: 0; }
          to   { width: 72%; }
        }
        @keyframes progress-a {
          from { width: 0; }
          to   { width: 48%; }
        }
        @keyframes confidence-count {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fade-in-up { animation: fade-in-up .6s ease-out both; }
        .anim-delay-100 { animation-delay: .1s; }
        .anim-delay-200 { animation-delay: .2s; }
        .anim-delay-300 { animation-delay: .3s; }
        .anim-delay-500 { animation-delay: .5s; }
        .anim-delay-700 { animation-delay: .7s; }
        .animate-progress-b { animation: progress-b 2s ease-out 1s both; }
        .animate-progress-a { animation: progress-a 2s ease-out 1s both; }
        .animate-confidence { animation: confidence-count .4s ease-out 2.5s both; }
      `}</style>

      {/* ─────────────────────────── NAV ─────────────────────────── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrollY > 40
            ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
            : 'bg-slate-950'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2 group">
            <FlaskConical className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition" />
            <span className="font-bold text-lg tracking-tight text-white">
              Agdam Bagdam
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#comparison" className="hover:text-white transition">Compare</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#get-started" className="hover:text-white transition">Get Started</a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/balabommablock-cpu/agdambagdam"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="/docs"
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition shadow-lg shadow-indigo-600/20"
            >
              Start Free
            </a>
          </div>
        </div>
      </nav>

      {/* ══════════════════════ HERO (dark bg) ══════════════════════ */}
      <section className="relative bg-slate-950 pt-32 pb-24 md:pt-44 md:pb-32 overflow-hidden">
        {/* bg decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] bg-indigo-600/10 rounded-full blur-[128px]" />
          <div className="absolute -bottom-[30%] -right-[15%] w-[50%] h-[50%] bg-emerald-600/8 rounded-full blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* headline */}
          <h1 className="animate-fade-in-up text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-[0.95] text-white">
            Test Everything.
            <br />
            Pay Nothing.
          </h1>

          {/* subline */}
          <p className="animate-fade-in-up anim-delay-100 mt-6 text-lg sm:text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Agdam Bagdam is the free, open-source A/B testing platform with better
            statistics than tools charging{' '}
            <span className="text-red-400 font-semibold">$500K/year</span>.
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-in-up anim-delay-200 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/docs"
              className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition shadow-xl shadow-indigo-600/25"
            >
              Start Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://github.com/balabommablock-cpu/agdambagdam"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-8 py-3.5 rounded-xl text-base transition"
            >
              <Github className="w-5 h-5" />
              GitHub
            </a>
          </div>

          {/* ── Animated A/B Test Visual ── */}
          <div className="animate-fade-in-up anim-delay-500 mt-16 max-w-lg mx-auto">
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/80 backdrop-blur p-6 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Example Experiment
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium"
                  title="Illustrative example of a running A/B test"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Illustrative
                </span>
              </div>

              {/* Variant A */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-sm font-bold text-slate-300">A</span>
                    <span className="text-sm text-slate-400">Blue Button</span>
                  </div>
                  <span className="text-sm font-mono text-slate-500">3.2%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-slate-600 animate-progress-a" />
                </div>
              </div>

              {/* Variant B */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm font-bold text-emerald-400">B</span>
                    <span className="text-sm text-slate-300 font-medium">Green Button</span>
                  </div>
                  <span className="text-sm font-mono text-emerald-400 font-semibold">4.1%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 animate-progress-b" />
                </div>
              </div>

              {/* Confidence */}
              <div className="animate-confidence flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <span className="text-xs text-slate-500">Confidence</span>
                <span className="text-sm font-bold text-emerald-400">94.2% -- B is winning</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section id="how-it-works" className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-indigo-600 mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900">
              Three steps. Five minutes.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1: Add One Line */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-900">Add One Line</h3>
              <div className="relative bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                <CopyButton text='<script src="/path/to/abacus.js"></script>' />
                <code>
                  <span className="text-emerald-400">&lt;script</span>{' '}
                  <span className="text-indigo-300">src</span>=
                  <span className="text-amber-300">"/path/to/abacus.js"</span>
                  <span className="text-emerald-400">&gt;&lt;/script&gt;</span>
                </code>
              </div>
              <p className="text-sm text-slate-500 mt-3">Paste into your HTML. That's it.</p>
            </div>

            {/* Step 2: Pick a Winner */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-900">Pick a Winner</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-slate-100 rounded-lg px-4 py-3 border border-slate-200">
                  <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white text-xs font-bold">A</span>
                  <span className="text-sm text-slate-600">Buy Now</span>
                </div>
                <div className="flex items-center gap-3 bg-emerald-50 rounded-lg px-4 py-3 border-2 border-emerald-500 ring-2 ring-emerald-500/20">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">B</span>
                  <span className="text-sm text-slate-900 font-medium">Get Started Free</span>
                  <Check className="w-4 h-4 text-emerald-500 ml-auto" />
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-3">Create variants in the dashboard.</p>
            </div>

            {/* Step 3: See Results */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-900">See Results</h3>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-800">Button B wins!</span>
                </div>
                <p className="text-sm text-emerald-700 font-medium">+23% clicks</p>
                <p className="text-xs text-emerald-600 mt-1">96% confident this is real, not luck.</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">Results you can actually trust.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ WHY SWITCH — Price Comparison ══════════════════ */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-indigo-400 mb-3">Why Switch?</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Stop paying for math that should be free
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 max-w-4xl mx-auto">
            {/* Agdam Bagdam */}
            <div className="text-center">
              <div className="text-8xl sm:text-9xl font-extrabold text-emerald-400 leading-none">$0</div>
              <p className="text-lg font-semibold text-emerald-300 mt-2">Agdam Bagdam</p>
              <p className="text-sm text-slate-500">Forever. MIT License.</p>
            </div>

            <div className="text-4xl text-slate-600 font-light hidden md:block">vs</div>
            <div className="text-2xl text-slate-600 font-light md:hidden">vs</div>

            {/* Competitors */}
            <div className="space-y-4">
              {[
                { name: 'VWO', price: '$30K/yr' },
                { name: 'LaunchDarkly', price: '$150K/yr' },
                { name: 'Optimizely', price: '$500K/yr' },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-4">
                  <span className="text-3xl sm:text-4xl font-bold text-red-400 line-through decoration-2">{c.price}</span>
                  <span className="text-sm text-slate-500">{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center mt-12 text-lg text-slate-400 max-w-xl mx-auto">
            Same features. Same statistics. Zero cost. Forever.
          </p>
        </div>
      </section>

      {/* ═══════════════════ FEATURE COMPARISON TABLE ═══════════════════ */}
      <section id="comparison" className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-indigo-600 mb-3">Feature Comparison</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900">
              We checked the receipts
            </h2>
            <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
              Side-by-side against every major player. Our column is suspiciously green.
            </p>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Feature</th>
                  <th className="py-3 px-3 text-center">
                    <span className="font-bold text-indigo-600">Agdam Bagdam</span>
                    <br />
                    <span className="text-[10px] text-emerald-600 font-bold">FREE</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-500">
                    VWO
                    <br />
                    <span className="text-[10px] text-red-400">$2-30K/yr</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-500">
                    Optimizely
                    <br />
                    <span className="text-[10px] text-red-400">$100-500K/yr</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-500">
                    LaunchDarkly
                    <br />
                    <span className="text-[10px] text-red-400">$15-150K/yr</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-500">
                    Statsig
                    <br />
                    <span className="text-[10px] text-slate-400">Free-Custom</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-500">
                    GrowthBook
                    <br />
                    <span className="text-[10px] text-slate-400">OSS</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMP_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-slate-100 ${
                      i % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'
                    } hover:bg-indigo-50/30 transition-colors`}
                  >
                    <td className={`py-3 px-3 ${row.bold ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
                      {row.feature}
                    </td>
                    <td className="py-3 px-3 text-center bg-indigo-50/40">
                      <CellIcon value={row.ab} />
                    </td>
                    <td className="py-3 px-3 text-center"><CellIcon value={row.vwo} /></td>
                    <td className="py-3 px-3 text-center"><CellIcon value={row.optimizely} /></td>
                    <td className="py-3 px-3 text-center"><CellIcon value={row.launchdarkly} /></td>
                    <td className="py-3 px-3 text-center"><CellIcon value={row.statsig} /></td>
                    <td className="py-3 px-3 text-center"><CellIcon value={row.growthbook} /></td>
                  </tr>
                ))}
                {/* price row */}
                <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                  <td className="py-4 px-3 text-slate-900 font-bold text-base">Price</td>
                  <td className="py-4 px-3 text-center">
                    <span className="text-2xl font-extrabold text-emerald-600">FREE</span>
                  </td>
                  <td className="py-4 px-3 text-center text-red-500 font-semibold text-xs">$2-30K/yr</td>
                  <td className="py-4 px-3 text-center text-red-500 font-semibold text-xs">$100-500K/yr</td>
                  <td className="py-4 px-3 text-center text-red-500 font-semibold text-xs">$15-150K/yr</td>
                  <td className="py-4 px-3 text-center text-slate-500 font-semibold text-xs">Free-Custom</td>
                  <td className="py-4 px-3 text-center text-slate-500 font-semibold text-xs">Free-$$</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════ WHAT YOU GET (plain English) ══════════════════ */}
      <section id="features" className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-indigo-600 mb-3">What You Get</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900">
              Powerful features, explained simply
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {BENEFITS.map((b) => (
              <div
                key={b.tag}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="mb-3">{b.icon}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{b.headline}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-3">{b.plain}</p>
                <span className="inline-block text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {b.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ SOCIAL PROOF / TRUST ══════════════════ */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto text-center">
            <div className="p-6">
              <Shield className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900">100+ Automated Tests</p>
              <p className="text-xs text-slate-500 mt-1">Every statistical function validated against reference values.</p>
            </div>
            <div className="p-6">
              <BookOpen className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900">MIT Licensed</p>
              <p className="text-xs text-slate-500 mt-1">Read every line of code on GitHub. No vendor lock-in.</p>
            </div>
            <div className="p-6">
              <Flag className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900">Built in India</p>
              <p className="text-xs text-slate-500 mt-1">Used in production on boredfolio.com.</p>
            </div>
            <div className="p-6">
              <a
                href="https://github.com/balabommablock-cpu/agdambagdam"
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <Star className="w-8 h-8 text-indigo-600 mx-auto mb-3 group-hover:text-amber-500 transition" />
                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition">Star on GitHub</p>
                <p className="text-xs text-slate-500 mt-1">Help us grow. Every star counts.</p>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ GET STARTED IN 5 MINUTES ══════════════════ */}
      <section id="get-started" className="bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="text-sm font-bold tracking-[0.2em] uppercase text-indigo-400 mb-3">Get Started</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Up and running in 5 minutes
            </h2>
          </div>

          <div className="space-y-6">
            {/* Step 1: Clone */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-bold">
                1
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-300 mb-2">Clone the repo</p>
                <div className="relative bg-slate-900 border border-white/[0.08] rounded-lg p-4 font-mono text-sm text-slate-300 overflow-x-auto">
                  <CopyButton text="git clone https://github.com/balabommablock-cpu/agdambagdam.git" />
                  <code>
                    <span className="text-slate-500">$</span> git clone https://github.com/balabommablock-cpu/agdambagdam.git
                  </code>
                </div>
              </div>
            </div>

            {/* Step 2: Start */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-bold">
                2
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-300 mb-2">Start everything with Docker</p>
                <div className="relative bg-slate-900 border border-white/[0.08] rounded-lg p-4 font-mono text-sm text-slate-300 overflow-x-auto">
                  <CopyButton text="cd abacus && docker-compose up" />
                  <code>
                    <span className="text-slate-500">$</span> cd abacus && docker-compose up
                  </code>
                </div>
              </div>
            </div>

            {/* Step 3: Create test */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-bold">
                3
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-300 mb-2">Create your first experiment</p>
                <div className="bg-slate-900 border border-white/[0.08] rounded-lg p-4">
                  <p className="text-sm text-slate-400">
                    Open{' '}
                    <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-xs">http://localhost:3457</code>
                    {' '}and click <span className="text-white font-medium">"New Experiment"</span>.
                    Name it, add variants, pick your metrics. Takes 30 seconds.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4: Add to site */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-bold">
                4
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-300 mb-2">Add to your site</p>
                <div className="relative bg-slate-900 border border-white/[0.08] rounded-lg p-4 font-mono text-xs sm:text-sm text-slate-300 overflow-x-auto">
                  <CopyButton text={`<script src="/path/to/abacus.js"></script>\n<script>\n  const variant = await new Abacus({apiKey: 'your-key'}).getVariant('checkout-btn');\n  button.onclick = () => ab.track('purchase');\n</script>`} />
                  <code>
                    <div><span className="text-emerald-400">&lt;script</span> <span className="text-indigo-300">src</span>=<span className="text-amber-300">"/path/to/abacus.js"</span><span className="text-emerald-400">&gt;&lt;/script&gt;</span></div>
                    <div><span className="text-emerald-400">&lt;script&gt;</span></div>
                    <div>{'  '}<span className="text-indigo-300">const</span> variant = <span className="text-indigo-300">await new</span> <span className="text-emerald-400">Abacus</span>({'{'}<span className="text-slate-400">apiKey</span>: <span className="text-amber-300">'your-key'</span>{'}'}).<span className="text-emerald-400">getVariant</span>(<span className="text-amber-300">'checkout-btn'</span>);</div>
                    <div>{'  '}button.onclick = () =&gt; ab.<span className="text-emerald-400">track</span>(<span className="text-amber-300">'purchase'</span>);</div>
                    <div><span className="text-emerald-400">&lt;/script&gt;</span></div>
                  </code>
                </div>
              </div>
            </div>

            {/* Step 5: Watch */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm font-bold">
                5
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-300 mb-2">Watch results come in</p>
                <div className="bg-slate-900 border border-white/[0.08] rounded-lg p-4 font-mono text-xs sm:text-sm">
                  <div className="text-slate-500 mb-1"># Results update in real-time:</div>
                  <div className="text-emerald-400">Variant B: +18.3% conversion rate</div>
                  <div className="text-emerald-400">Confidence: 94.7% (Bayesian)</div>
                  <div className="text-slate-400">Recommendation: Keep running (target: 95%)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ FINAL CTA ══════════════════ */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 max-w-2xl mx-auto leading-tight">
            Stop overpaying for A/B testing.
          </h2>
          <p className="mt-6 text-lg text-slate-500 max-w-md mx-auto">
            Deploy in 5 minutes. Run your first experiment in 10. Pay nothing. Ever.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/docs"
              className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition shadow-xl shadow-indigo-600/25"
            >
              Start Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://github.com/balabommablock-cpu/agdambagdam"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium text-lg transition"
            >
              <Github className="w-5 h-5" />
              Star on GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-slate-900">Agdam Bagdam</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a
                href="https://github.com/balabommablock-cpu/agdambagdam"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-900 transition flex items-center gap-1"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a href="/docs" className="hover:text-slate-900 transition flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                Docs
              </a>
              <a href="/docs/api" className="hover:text-slate-900 transition flex items-center gap-1">
                <Terminal className="w-4 h-4" />
                API Reference
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
            Made in India{' '}
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 600'%3E%3Crect width='900' height='200' fill='%23FF9933'/%3E%3Crect y='200' width='900' height='200' fill='white'/%3E%3Crect y='400' width='900' height='200' fill='%23138808'/%3E%3Ccircle cx='450' cy='300' r='60' fill='%23000080'/%3E%3Ccircle cx='450' cy='300' r='52' fill='white'/%3E%3Ccircle cx='450' cy='300' r='16' fill='%23000080'/%3E%3C/svg%3E"
              alt="India flag"
              className="inline w-4 h-3 ml-1 align-baseline"
            />
            {' '}&bull; MIT License &bull; Open source, always.
          </div>
        </div>
      </footer>
    </div>
  );
}
