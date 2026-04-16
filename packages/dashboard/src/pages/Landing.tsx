import { useState, useEffect } from 'react';
import {
  BarChart3,
  Zap,
  Check,
  X,
  Github,
  Code2,
  Cpu,
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Lock,
  ArrowRight,
  Sparkles,
  FlaskConical,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

/* ───────────────────────── tiny helpers ───────────────────────── */

const SECTION_CLS =
  'scroll-mt-16 px-4 sm:px-6 lg:px-8 py-20 md:py-28 max-w-7xl mx-auto';

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-bold tracking-[0.25em] uppercase text-indigo-400 mb-4">
      {children}
    </span>
  );
}

/* ────────────────────── feature-comparison data ───────────────── */

type CellValue = 'yes' | 'no' | 'coming' | 'addon' | 'partial' | 'paid' | string;

interface CompRow {
  feature: string;
  ab: CellValue;
  vwo: CellValue;
  optimizely: CellValue;
  launchdarkly: CellValue;
  statsig: CellValue;
  growthbook: CellValue;
}

const COMP_ROWS: CompRow[] = [
  { feature: 'A/B Testing',                  ab: 'yes',    vwo: 'yes',  optimizely: 'yes',  launchdarkly: 'addon', statsig: 'yes',  growthbook: 'yes' },
  { feature: 'Multivariate Testing',         ab: 'yes',    vwo: 'yes',  optimizely: 'yes',  launchdarkly: 'no',    statsig: 'yes',  growthbook: 'yes' },
  { feature: 'Feature Flags',                ab: 'yes',    vwo: 'no',   optimizely: 'yes',  launchdarkly: 'yes',   statsig: 'yes',  growthbook: 'yes' },
  { feature: 'Bayesian Stats',               ab: 'yes',    vwo: 'yes',  optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'no' },
  { feature: 'Frequentist Stats',            ab: 'yes',    vwo: 'no',   optimizely: 'yes',  launchdarkly: 'yes',   statsig: 'yes',  growthbook: 'yes' },
  { feature: 'CUPED Variance Reduction',     ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'paid' },
  { feature: 'Sequential Testing',           ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'paid' },
  { feature: 'SRM Detection',                ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'paid' },
  { feature: 'Multi-Armed Bandits',          ab: 'yes',    vwo: 'no',   optimizely: 'yes',  launchdarkly: 'no',    statsig: 'yes',  growthbook: 'paid' },
  { feature: 'Contextual Bandits (LinUCB)',   ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'no' },
  { feature: 'Visual Editor',                ab: 'coming', vwo: 'yes',  optimizely: 'yes',  launchdarkly: 'no',    statsig: 'no',   growthbook: 'no' },
  { feature: 'Warehouse Native',             ab: 'coming', vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'yes',  growthbook: 'yes' },
  { feature: 'Privacy First (GDPR/CCPA)',    ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'no',   growthbook: 'yes' },
  { feature: 'Self-Hosted',                  ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'no',   growthbook: 'yes' },
  { feature: 'Open Source',                  ab: 'yes',    vwo: 'no',   optimizely: 'no',   launchdarkly: 'no',    statsig: 'no',   growthbook: 'partial' },
];

// @ts-ignore used in render
const _PRICE_ROW = {
  feature: 'Price',
  ab: 'FREE',
  vwo: '$2-30K/yr',
  optimizely: '$100-500K/yr',
  launchdarkly: '$15-150K/yr',
  statsig: 'Free-Custom',
  growthbook: 'Free-$$',
};

function CellBadge({ value }: { value: CellValue }) {
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
    return <span className="text-xs font-medium text-amber-400">Soon</span>;
  if (value === 'addon')
    return <span className="text-xs font-medium text-yellow-500">Add-on</span>;
  if (value === 'partial')
    return <span className="text-xs font-medium text-yellow-500">Partial</span>;
  if (value === 'paid')
    return <span className="text-xs font-medium text-yellow-500">Paid</span>;
  return <span className="text-xs text-slate-400">{value}</span>;
}

/* ────────────────────── stats-engine cards ─────────────────────── */

const STAT_CARDS: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: <Brain className="w-7 h-7 text-indigo-400" />,
    title: 'Bayesian Analysis',
    desc: 'Posterior probabilities that actually make sense. Know the probability your variant wins, not just a p-value.',
  },
  {
    icon: <BarChart3 className="w-7 h-7 text-emerald-400" />,
    title: 'Frequentist Testing',
    desc: 'Classical hypothesis testing with proper power analysis and confidence intervals. The gold standard, done right.',
  },
  {
    icon: <TrendingUp className="w-7 h-7 text-cyan-400" />,
    title: 'CUPED',
    desc: '20-50% faster experiments by reducing variance with pre-experiment data. Same results, half the time.',
  },
  {
    icon: <Zap className="w-7 h-7 text-amber-400" />,
    title: 'Sequential Testing',
    desc: 'Stop early when you have a winner. Alpha spending functions keep your false-positive rate honest.',
  },
  {
    icon: <AlertTriangle className="w-7 h-7 text-red-400" />,
    title: 'SRM Detection',
    desc: 'Catch sample ratio mismatches before they silently wreck your results. Most platforms just... don\'t.',
  },
  {
    icon: <Target className="w-7 h-7 text-violet-400" />,
    title: 'Contextual Bandits',
    desc: 'LinUCB-powered optimization that learns which variant works best for each user segment. AI, but actually useful.',
  },
];

/* ──────────────────── tech logos (CSS-only) ────────────────────── */

const TECH_STACK = [
  'React', 'Next.js', 'Vue', 'Angular', 'Node.js',
  'Python', 'Go', 'Ruby', 'iOS', 'Android',
];

/* ──────────────────── pricing competitors ─────────────────────── */

const COMPETITOR_PRICES = [
  { name: 'VWO',          price: '$30K/yr',  color: 'text-red-400' },
  { name: 'Optimizely',   price: '$500K/yr', color: 'text-red-400' },
  { name: 'LaunchDarkly', price: '$150K/yr', color: 'text-red-400' },
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
    <div className="min-h-screen bg-slate-950 text-white antialiased selection:bg-indigo-500/30 overflow-x-hidden">
      {/* ──────────────── inline keyframes ──────────────── */}
      <style>{`
        @keyframes gradient-x {
          0%,100% { background-position: 0% 50%; }
          50%     { background-position: 100% 50%; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-12px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,.5); }
          70%  { box-shadow: 0 0 0 14px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes count-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 4s ease infinite;
        }
        .animate-float  { animation: float 6s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up .7s ease-out both; }
        .animate-pulse-ring { animation: pulse-ring 2s infinite; }
        .anim-delay-100 { animation-delay: .1s; }
        .anim-delay-200 { animation-delay: .2s; }
        .anim-delay-300 { animation-delay: .3s; }
        .anim-delay-500 { animation-delay: .5s; }
        .shimmer-bg {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.04) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>

      {/* ─────────────────────────── NAV ─────────────────────────── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrollY > 40
            ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2 group">
            <FlaskConical className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition" />
            <span className="font-bold text-lg tracking-tight">
              Agdam Bagdam
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#comparison" className="hover:text-white transition">Compare</a>
            <a href="#stats-engine" className="hover:text-white transition">Stats Engine</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/agdambagdam/abacus"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="/login"
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition shadow-lg shadow-indigo-600/20"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        {/* bg decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] bg-indigo-600/10 rounded-full blur-[128px]" />
          <div className="absolute -bottom-[30%] -right-[15%] w-[50%] h-[50%] bg-emerald-600/8 rounded-full blur-[100px]" />
          {/* grid lines */}
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
          {/* pill badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase px-4 py-1.5 rounded-full mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            MIT Licensed &mdash; Free Forever
          </div>

          {/* headline */}
          <h1 className="animate-fade-in-up anim-delay-100 text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-[0.95]">
            <span className="bg-gradient-to-r from-white via-indigo-200 to-white bg-clip-text text-transparent animate-gradient-x">
              Agdam Bagdam
            </span>
          </h1>

          {/* sub-headline */}
          <p className="animate-fade-in-up anim-delay-200 mt-6 text-lg sm:text-2xl md:text-3xl font-medium text-slate-300 max-w-3xl mx-auto leading-snug">
            The A/B testing platform that makes{' '}
            <span className="text-white font-semibold">$500K/year tools</span> look silly.
          </p>

          <p className="animate-fade-in-up anim-delay-300 mt-4 text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
            Free. Open source. More features than Optimizely.
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-in-up anim-delay-500 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/login"
              className="group relative inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition shadow-xl shadow-indigo-600/25 animate-pulse-ring"
            >
              Get Started (it's free)
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://github.com/agdambagdam/abacus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-8 py-3.5 rounded-xl text-base transition"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          </div>

          {/* code snippet */}
          <div className="animate-fade-in-up anim-delay-500 mt-16 max-w-2xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-slate-900/70 backdrop-blur shadow-2xl shadow-black/40">
              {/* title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-slate-900/50">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-xs text-slate-500 font-mono">index.html</span>
              </div>
              <pre className="p-5 text-[13px] sm:text-sm leading-relaxed text-left overflow-x-auto">
                <code className="text-slate-300">
{`<`}<span className="text-emerald-400">script</span>{` `}<span className="text-indigo-300">src</span>{`=`}<span className="text-amber-300">"https://cdn.agdambagdam.com/sdk.js"</span>{`></`}<span className="text-emerald-400">script</span>{`>
<`}<span className="text-emerald-400">script</span>{`>
  `}<span className="text-indigo-300">const</span>{` ab = `}<span className="text-indigo-300">new</span>{` `}<span className="text-emerald-400">Abacus</span>{`({
    `}<span className="text-slate-400">apiKey</span>{`: `}<span className="text-amber-300">'your-key'</span>{`,
    `}<span className="text-slate-400">baseUrl</span>{`: `}<span className="text-amber-300">'https://your-server.com'</span>{`
  });

  `}<span className="text-indigo-300">const</span>{` variant = `}<span className="text-indigo-300">await</span>{` ab.`}<span className="text-emerald-400">getVariant</span>{`(`}<span className="text-amber-300">'checkout-button'</span>{`);
  `}<span className="text-indigo-300">if</span>{` (variant === `}<span className="text-amber-300">'green'</span>{`) {
    button.style.backgroundColor = `}<span className="text-amber-300">'green'</span>{`;
  }

  button.onclick = () => ab.`}<span className="text-emerald-400">track</span>{`(`}<span className="text-amber-300">'purchase'</span>{`);
</`}<span className="text-emerald-400">script</span>{`>`}
                </code>
              </pre>
            </div>
          </div>

          {/* stat pills below hero */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              ['9,740', 'Lines of Code'],
              ['14.7KB', 'Browser SDK'],
              ['<10ms', 'Variant Assignment'],
              ['$0', 'Forever'],
            ].map(([val, label]) => (
              <div
                key={label}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
              >
                <div className="text-xl sm:text-2xl font-bold text-white">{val}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ WHY WE EXIST ═══════════════════ */}
      <section className="relative bg-slate-900/50 border-y border-white/[0.04]">
        <div className={SECTION_CLS}>
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <SectionTag>Why We Exist</SectionTag>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              Companies charge{' '}
              <span className="text-red-400">$100K&ndash;$500K/year</span> for A/B testing.
              <br className="hidden sm:block" />
              That&rsquo;s not a tool&nbsp;&mdash; that&rsquo;s a{' '}
              <span className="underline decoration-red-400/60 decoration-wavy underline-offset-4">
                hostage situation
              </span>.
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              We built Agdam Bagdam so any company &mdash; from a bootstrapped startup in
              Bangalore to a Fortune 500 &mdash; can run world-class experiments without
              selling a kidney.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Lock className="w-4 h-4" />
              MIT Licensed. Self-host on your infra. Your data never leaves your servers.
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURE COMPARISON ═══════════════════ */}
      <section id="comparison" className="relative">
        <div className={SECTION_CLS}>
          <div className="text-center mb-14">
            <SectionTag>Feature Comparison</SectionTag>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              We checked the receipts
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
              Side-by-side against every major player. Green means yes, red means no, and our
              column is suspiciously green.
            </p>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Feature</th>
                  <th className="py-3 px-3 text-center">
                    <span className="font-bold text-indigo-400">Agdam Bagdam</span>
                    <br />
                    <span className="text-[10px] text-emerald-400 font-semibold">FREE</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-400">
                    VWO
                    <br />
                    <span className="text-[10px] text-red-400/70">$198-475/mo</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-400">
                    Optimizely
                    <br />
                    <span className="text-[10px] text-red-400/70">$100-500K/yr</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-400">
                    LaunchDarkly
                    <br />
                    <span className="text-[10px] text-red-400/70">$15-150K/yr</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-400">
                    Statsig
                    <br />
                    <span className="text-[10px] text-slate-500">Free-Custom</span>
                  </th>
                  <th className="py-3 px-3 text-center text-slate-400">
                    GrowthBook
                    <br />
                    <span className="text-[10px] text-slate-500">OSS</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMP_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-white/[0.04] ${
                      i % 2 === 0 ? 'bg-white/[0.01]' : ''
                    } hover:bg-white/[0.03] transition-colors`}
                  >
                    <td className="py-3 px-3 text-slate-300 font-medium">{row.feature}</td>
                    <td className="py-3 px-3 text-center bg-indigo-500/[0.04]">
                      <CellBadge value={row.ab} />
                    </td>
                    <td className="py-3 px-3 text-center"><CellBadge value={row.vwo} /></td>
                    <td className="py-3 px-3 text-center"><CellBadge value={row.optimizely} /></td>
                    <td className="py-3 px-3 text-center"><CellBadge value={row.launchdarkly} /></td>
                    <td className="py-3 px-3 text-center"><CellBadge value={row.statsig} /></td>
                    <td className="py-3 px-3 text-center"><CellBadge value={row.growthbook} /></td>
                  </tr>
                ))}
                {/* price row */}
                <tr className="border-t-2 border-indigo-500/30 bg-indigo-500/[0.06]">
                  <td className="py-4 px-3 text-white font-bold text-base">Price</td>
                  <td className="py-4 px-3 text-center">
                    <span className="text-2xl font-extrabold text-emerald-400">FREE</span>
                  </td>
                  <td className="py-4 px-3 text-center text-red-400 font-semibold text-xs">
                    $2-30K/yr
                  </td>
                  <td className="py-4 px-3 text-center text-red-400 font-semibold text-xs">
                    $100-500K/yr
                  </td>
                  <td className="py-4 px-3 text-center text-red-400 font-semibold text-xs">
                    $15-150K/yr
                  </td>
                  <td className="py-4 px-3 text-center text-slate-400 font-semibold text-xs">
                    Free-Custom
                  </td>
                  <td className="py-4 px-3 text-center text-slate-400 font-semibold text-xs">
                    Free-$$
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════ 5th GRADER SIMPLE ══════════════════ */}
      <section id="features" className="relative bg-slate-900/50 border-y border-white/[0.04]">
        <div className={SECTION_CLS}>
          <div className="text-center mb-16">
            <SectionTag>Integration</SectionTag>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              5th-grader simple
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Your intern can set this up during lunch break.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* step 1 */}
            <div className="relative group">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-slate-900 border border-white/[0.06] rounded-2xl p-6 h-full">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2">Add one script tag</h3>
                <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-400">
                  <span className="text-emerald-400">&lt;script</span>{' '}
                  <span className="text-indigo-300">src</span>=
                  <span className="text-amber-300">"...sdk.js"</span>
                  <span className="text-emerald-400">&gt;&lt;/script&gt;</span>
                </div>
                <p className="text-sm text-slate-500 mt-3">2 lines. Copy, paste, done.</p>
              </div>
            </div>

            {/* step 2 */}
            <div className="relative group">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-slate-900 border border-white/[0.06] rounded-2xl p-6 h-full">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2">Get your variant</h3>
                <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-400">
                  <span className="text-indigo-300">const</span> variant ={' '}
                  <span className="text-indigo-300">await</span>{' '}
                  ab.<span className="text-emerald-400">getVariant</span>(
                  <span className="text-amber-300">'cta'</span>);
                </div>
                <p className="text-sm text-slate-500 mt-3">1 line. Deterministic. Sub-10ms.</p>
              </div>
            </div>

            {/* step 3 */}
            <div className="relative group">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-slate-900 border border-white/[0.06] rounded-2xl p-6 h-full">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2">Track conversions</h3>
                <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-400">
                  ab.<span className="text-emerald-400">track</span>(
                  <span className="text-amber-300">'purchase'</span>);
                </div>
                <p className="text-sm text-slate-500 mt-3">1 line. Batched. Privacy-first.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ STATS ENGINE ══════════════════ */}
      <section id="stats-engine" className="relative">
        <div className={SECTION_CLS}>
          <div className="text-center mb-16">
            <SectionTag>Stats Engine</SectionTag>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              The math that makes VWO engineers nervous
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
              Zero external dependencies. 9,740 lines of pure statistical firepower. Built from
              scratch so we own every decimal point.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STAT_CARDS.map((card) => (
              <div
                key={card.title}
                className="group relative bg-slate-900/60 border border-white/[0.06] rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="shimmer-bg absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="mb-4">{card.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* bottom highlight */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-6 py-3">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <span className="text-sm text-slate-300">
                Bayesian + Frequentist + CUPED + Sequential + SRM + Bandits &mdash; all in one
                engine
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ PRICING ══════════════════ */}
      <section
        id="pricing"
        className="relative bg-slate-900/50 border-y border-white/[0.04]"
      >
        <div className={SECTION_CLS}>
          <div className="text-center mb-16">
            <SectionTag>Pricing</SectionTag>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              <span className="text-emerald-400">$0</span>/month.{' '}
              <span className="text-emerald-400">$0</span>/year.{' '}
              <span className="text-emerald-400">$0</span>/forever.
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-lg mx-auto">
              No credit card. No sales call. No "contact us for pricing" BS.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {/* Agdam Bagdam card */}
            <div className="relative rounded-2xl bg-gradient-to-b from-indigo-600/20 to-indigo-600/5 border-2 border-indigo-500/40 p-6 flex flex-col items-center text-center">
              <div className="absolute -top-3 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                You are here
              </div>
              <FlaskConical className="w-8 h-8 text-indigo-400 mb-3" />
              <h3 className="font-bold text-lg">Agdam Bagdam</h3>
              <div className="mt-3 text-5xl font-extrabold text-emerald-400">$0</div>
              <p className="text-xs text-slate-400 mt-1">MIT License &mdash; forever free</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-300 text-left w-full">
                {[
                  'Unlimited experiments',
                  'Unlimited users',
                  'All stats engines',
                  'Feature flags',
                  'Contextual bandits',
                  'Self-hosted',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/login"
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg text-sm transition text-center"
              >
                Get Started Free
              </a>
            </div>

            {/* competitor cards */}
            {COMPETITOR_PRICES.map((c) => (
              <div
                key={c.name}
                className="rounded-2xl bg-slate-900/60 border border-white/[0.06] p-6 flex flex-col items-center text-center opacity-60"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mb-3">
                  <X className="w-5 h-5 text-red-400/50" />
                </div>
                <h3 className="font-bold text-lg text-slate-400">{c.name}</h3>
                <div className="mt-3 text-3xl font-extrabold text-red-400 line-through decoration-2">
                  {c.price}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {c.name === 'Optimizely'
                    ? '"Contact sales" energy'
                    : c.name === 'VWO'
                    ? 'Per-visitor pricing adds up'
                    : 'Feature flags sold separately'}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-500 text-left w-full">
                  {[
                    'Visitor limits',
                    'Vendor lock-in',
                    'Data leaves your servers',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400/40 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ WORKS EVERYWHERE ══════════════════ */}
      <section className="relative">
        <div className={SECTION_CLS}>
          <div className="text-center mb-14">
            <SectionTag>Integrations</SectionTag>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Works everywhere
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              One SDK. Every platform. 5 minutes to integrate.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
            {TECH_STACK.map((tech) => (
              <div
                key={tech}
                className="group flex items-center gap-2.5 bg-slate-900/60 border border-white/[0.06] hover:border-indigo-500/30 rounded-xl px-5 py-3 transition-all duration-200 hover:-translate-y-0.5"
              >
                <Code2 className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition" />
                <span className="text-sm font-medium text-slate-300">{tech}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500">
              JavaScript &bull; TypeScript &bull; React &bull; Node.js &bull; Python &bull; Go
              &bull; Any HTTP client
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════ FINAL CTA ══════════════════ */}
      <section className="relative border-t border-white/[0.04]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-indigo-600/8 rounded-full blur-[120px]" />
        </div>

        <div className={`${SECTION_CLS} relative text-center`}>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold max-w-3xl mx-auto leading-tight">
            Stop overpaying for
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              experimentation
            </span>
          </h2>
          <p className="mt-6 text-lg text-slate-400 max-w-md mx-auto">
            Deploy in 5 minutes. Run your first experiment in 10. Pay nothing. Ever.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/login"
              className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition shadow-xl shadow-indigo-600/25"
            >
              Start for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://github.com/agdambagdam/abacus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-medium text-lg transition"
            >
              <Github className="w-5 h-5" />
              Star on GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="border-t border-white/[0.06] bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-400" />
              <span className="font-bold">Agdam Bagdam</span>
            </div>

            <p className="text-sm text-slate-500 text-center">
              Built with rage against overpriced SaaS
            </p>

            <div className="flex items-center gap-6 text-sm text-slate-500">
              <span>MIT License</span>
              <a
                href="https://github.com/agdambagdam/abacus"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition flex items-center gap-1"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a href="/docs" className="hover:text-white transition flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                Docs
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.04] text-center text-xs text-slate-600">
            Made in India{' '}
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 600'%3E%3Crect width='900' height='200' fill='%23FF9933'/%3E%3Crect y='200' width='900' height='200' fill='white'/%3E%3Crect y='400' width='900' height='200' fill='%23138808'/%3E%3Ccircle cx='450' cy='300' r='60' fill='%23000080'/%3E%3Ccircle cx='450' cy='300' r='52' fill='white'/%3E%3Ccircle cx='450' cy='300' r='16' fill='%23000080'/%3E%3C/svg%3E"
              alt="India flag"
              className="inline w-4 h-3 ml-1 align-baseline"
            />
            {' '}&bull; Open source, always.
          </div>
        </div>
      </footer>
    </div>
  );
}
