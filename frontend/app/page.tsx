'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import {
  Scale, Sparkles, Briefcase, Shield, ArrowRight, ChevronRight, Zap,
  Brain, Search, FileText, CheckCircle2, BarChart3, Clock, Users,
  Star, Menu, X, AlertTriangle, TrendingUp, Lock,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Contract Intelligence',
    description: 'Deep clause-level analysis with risk scoring, deviation detection, and AI-generated revision suggestions across every document.',
    color: 'from-blue-500 to-cyan-500',
    glowColor: 'rgba(59,130,246,0.15)',
  },
  {
    icon: Search,
    title: 'Legal Research Engine',
    description: 'Stream-cited answers to complex legal questions, backed by jurisdiction-aware sources and precedent analysis.',
    color: 'from-violet-500 to-purple-500',
    glowColor: 'rgba(124,58,237,0.15)',
  },
  {
    icon: Briefcase,
    title: 'Matter Management',
    description: 'Centralize every matter — parties, tasks, milestones, documents, and collaborative threads — in one intelligent workspace.',
    color: 'from-emerald-500 to-teal-500',
    glowColor: 'rgba(16,185,129,0.15)',
  },
  {
    icon: FileText,
    title: 'AI Document Drafting',
    description: 'Generate NDAs, MSAs, employment agreements, and more using your preferred clauses and playbook rules in seconds.',
    color: 'from-amber-500 to-orange-500',
    glowColor: 'rgba(245,158,11,0.15)',
  },
  {
    icon: Shield,
    title: 'Playbook Enforcement',
    description: "Codify your firm's standards as automated rules. Flag deviations, enforce preferred language, and reduce negotiation cycles.",
    color: 'from-rose-500 to-pink-500',
    glowColor: 'rgba(244,63,94,0.15)',
  },
  {
    icon: Users,
    title: 'Client Portal',
    description: 'Securely share documents with clients via time-limited, permission-controlled links — no account required.',
    color: 'from-indigo-500 to-blue-500',
    glowColor: 'rgba(99,102,241,0.15)',
  },
];

const STATS = [
  { value: '10×', label: 'Faster contract review' },
  { value: '94%', label: 'Risk detection accuracy' },
  { value: '60%', label: 'Reduction in drafting time' },
  { value: '∞', label: 'Matters, no per-seat limits' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Upload your documents', desc: 'Drop PDFs and DOCX files. LexAI parses, structures, and indexes every clause automatically.' },
  { step: '02', title: 'AI analysis runs instantly', desc: 'Risk scoring, playbook comparison, redline suggestions, and research citations generated in real time.' },
  { step: '03', title: 'Review, collaborate, and close', desc: 'Accept or reject redlines, assign tasks, share with clients, and track every decision in the audit trail.' },
];

// ─── 3D Floating Mock Dashboard ───────────────────────────────────────────────

function MockDashboard() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [12, -12]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-12, 12]), { stiffness: 100, damping: 30 });

  return (
    <div
      className="relative w-full max-w-[560px] mx-auto"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left - rect.width / 2);
        mouseY.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
      style={{ perspective: '1400px' }}
    >
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative">
        {/* Main card */}
        <div
          className="relative rounded-2xl border border-white/10 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15,22,54,0.97) 0%, rgba(10,14,30,0.99) 100%)',
            boxShadow: '0 40px 80px -20px rgba(59,130,246,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          {/* Chrome bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <div className="flex-1 mx-4 h-5 rounded bg-white/5 flex items-center px-3">
              <span className="text-[10px] text-white/30">app.lexai.io/dashboard</span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Active Matters', value: '24', icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Documents', value: '187', icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { label: 'Risk Flags', value: '6', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className={`w-6 h-6 rounded-md ${kpi.bg} flex items-center justify-center mb-2`}>
                    <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                  </div>
                  <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* AI analysis */}
            <div className="rounded-xl p-3.5 border border-blue-500/20" style={{ background: 'rgba(59,130,246,0.06)' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-semibold text-blue-300">AI Clause Analysis</span>
                <span className="ml-auto text-[10px] text-blue-400/60">Acme Corp MSA.pdf</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { type: 'Liability Cap', risk: 'HIGH', pct: 78 },
                  { type: 'Termination', risk: 'MED', pct: 45 },
                  { type: 'Indemnity', risk: 'LOW', pct: 20 },
                ].map((row) => (
                  <div key={row.type} className="flex items-center gap-2">
                    <span className="text-[10px] text-white/50 w-20 shrink-0">{row.type}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.risk === 'HIGH' ? '#f97316' : row.risk === 'MED' ? '#eab308' : '#22c55e' }} />
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: row.risk === 'HIGH' ? '#f97316' : row.risk === 'MED' ? '#eab308' : '#22c55e', background: row.risk === 'HIGH' ? 'rgba(249,115,22,0.1)' : row.risk === 'MED' ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)' }}>{row.risk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="space-y-2">
              {[
                { icon: CheckCircle2, text: 'Redline accepted — Indemnity clause', time: '2m ago', color: 'text-emerald-400' },
                { icon: Brain, text: 'AI research: "limitation of liability NY"', time: '18m ago', color: 'text-blue-400' },
                { icon: FileText, text: 'NDA draft generated for Matter #47', time: '1h ago', color: 'text-violet-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <item.icon className={`w-3.5 h-3.5 ${item.color} shrink-0`} />
                  <span className="text-[11px] text-white/60 flex-1 truncate">{item.text}</span>
                  <span className="text-[10px] text-white/30 shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating: Research */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-8 -right-10 w-48 rounded-xl border border-violet-500/20 p-3"
          style={{ background: 'rgba(20,10,50,0.95)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 40px -10px rgba(124,58,237,0.3)', transform: 'translateZ(40px)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Search className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-semibold text-violet-300">Legal Research</span>
          </div>
          <div className="text-[10px] text-white/50 leading-relaxed">"Force majeure in SaaS contracts under NY law..."</div>
          <div className="mt-2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[9px] text-violet-400/70">Streaming response...</span>
          </div>
        </motion.div>

        {/* Floating: Risk */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-6 -left-10 w-44 rounded-xl border border-amber-500/20 p-3"
          style={{ background: 'rgba(30,20,10,0.95)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 40px -10px rgba(245,158,11,0.25)', transform: 'translateZ(30px)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-amber-300">Risk Score</span>
            <span className="text-lg font-bold text-amber-400">7.2</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 mb-1">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
          </div>
          <span className="text-[9px] text-white/40">Above firm threshold (6.0)</span>
        </motion.div>

        {/* Floating: Matter closed */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute top-1/3 -right-14 w-36 rounded-xl border border-emerald-500/20 p-2.5"
          style={{ background: 'rgba(5,30,20,0.95)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 40px -10px rgba(16,185,129,0.25)', transform: 'translateZ(50px)' }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-300">Matter Closed</span>
          </div>
          <div className="text-[10px] text-white/50">Acme Corp Series B</div>
          <div className="text-[9px] text-emerald-400/70 mt-1">3.2 days avg close</div>
        </motion.div>
      </motion.div>

      {/* Glow */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-30" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.4) 0%, rgba(124,58,237,0.2) 50%, transparent 70%)' }} />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(5,8,22,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">LexAI</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How it Works'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm text-white/60 hover:text-white transition-colors">
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2">Sign in</Link>
          <Link href="/auth/register" className="text-sm font-semibold px-5 py-2 rounded-lg text-white transition-all hover:scale-105 active:scale-95" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)', boxShadow: '0 0 20px rgba(59,130,246,0.35)' }}>
            Get Started
          </Link>
        </div>

        <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 px-6 py-4 space-y-3"
            style={{ background: 'rgba(5,8,22,0.95)', backdropFilter: 'blur(20px)' }}
          >
            {['Features', 'How it Works'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="block text-sm text-white/60 hover:text-white py-1">{item}</a>
            ))}
            <div className="pt-3 flex flex-col gap-2 border-t border-white/10">
              <Link href="/auth/login" className="text-sm text-white/70 py-2">Sign in</Link>
              <Link href="/auth/register" className="text-sm font-semibold text-center py-2.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)' }}>Get Started</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, -60]);

  return (
    <div ref={containerRef} className="min-h-screen text-white overflow-x-hidden" style={{ background: '#050816' }}>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }} />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }} className="absolute top-[30%] right-[-15%] w-[600px] h-[600px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)' }} />
        <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.08, 0.15, 0.08] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }} className="absolute bottom-[10%] left-[20%] w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)' }} />
      </div>

      <Navbar />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-16">
        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="max-w-7xl mx-auto px-6 w-full py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Copy */}
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 mb-8" style={{ background: 'rgba(59,130,246,0.08)' }}>
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-blue-300">AI-Native Legal Operating System</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-5xl sm:text-6xl font-bold leading-[1.05] tracking-tight mb-6">
                Legal work,{' '}
                <span className="block" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 50%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  reimagined
                </span>
                with AI.
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg text-white/55 leading-relaxed mb-10 max-w-lg">
                LexAI gives elite law firms and enterprise legal teams a unified platform for contract intelligence, legal research, matter management, and AI-powered drafting.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-wrap gap-4">
                <Link href="/auth/register" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)', boxShadow: '0 0 30px rgba(59,130,246,0.4), 0 0 60px rgba(124,58,237,0.15)' }}>
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/auth/login" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  Sign in <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }} className="flex items-center gap-6 mt-10 pt-10 border-t border-white/5">
                {[{ icon: Lock, text: 'SOC 2 compliant' }, { icon: Shield, text: 'End-to-end encrypted' }, { icon: Zap, text: 'Setup in 5 minutes' }].map((item) => (
                  <div key={item.text} className="flex items-center gap-1.5 text-xs text-white/40">
                    <item.icon className="w-3.5 h-3.5" />{item.text}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* 3D mockup */}
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <MockDashboard />
            </motion.div>
          </div>
        </motion.div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="flex flex-col items-center justify-center py-10 px-6 text-center" style={{ background: '#050816' }}>
                <div className="text-4xl font-bold mb-2" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stat.value}</div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-white/50">Everything you need</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">Built for the full legal workflow</h2>
            <p className="text-white/50 max-w-lg mx-auto">From first draft to final signature — every step powered by AI that understands legal context.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }} whileHover={{ y: -4, scale: 1.01 }} className="group relative rounded-2xl border border-white/[0.07] p-6 overflow-hidden transition-all duration-300 cursor-default" style={{ background: 'linear-gradient(135deg, rgba(15,20,40,0.8) 0%, rgba(10,14,30,0.9) 100%)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(circle at 30% 30%, ${feature.glowColor} 0%, transparent 70%)` }} />
                <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="relative text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="relative text-sm text-white/50 leading-relaxed">{feature.description}</p>
                <div className="relative mt-4 flex items-center gap-1 text-xs text-white/30 group-hover:text-white/60 transition-colors">
                  <span>Learn more</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative py-28">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 mb-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-white/50">Simple by design</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">How it works</h2>
            <p className="text-white/50 max-w-md mx-auto">Three steps from document upload to closed matter.</p>
          </motion.div>

          <div className="relative">
            <div className="absolute top-10 left-10 right-10 h-px hidden lg:block" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.3), rgba(124,58,237,0.3), transparent)' }} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {HOW_IT_WORKS.map((step, i) => (
                <motion.div key={step.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }} className="relative text-center">
                  <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(124,58,237,0.15) 100%)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <span className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{step.step}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI showcase ── */}
      <section className="relative py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(15,22,54,0.9) 0%, rgba(10,14,30,0.95) 100%)', border: '1px solid rgba(59,130,246,0.15)', boxShadow: '0 40px 80px -20px rgba(59,130,246,0.2)' }}>
            <div className="absolute top-0 right-0 w-[600px] h-[400px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.6) 0%, transparent 60%)' }} />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="p-12 lg:p-16">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 mb-6" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <Brain className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-300">Powered by frontier AI</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-5">
                  Your firm&apos;s knowledge,<br />
                  <span style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>amplified by AI.</span>
                </h2>
                <p className="text-white/55 leading-relaxed mb-8">LexAI learns your playbooks, preferred clauses, and negotiation history. Every suggestion gets smarter with use.</p>
                <ul className="space-y-3">
                  {['Clause-level risk explanation in plain English', 'Jurisdiction-aware legal research with citations', 'Playbook-enforced drafting at every step', 'Full audit trail for compliance and review'].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-white/60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mini AI chat mockup */}
              <div className="p-8 lg:p-12 flex items-center">
                <div className="w-full rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(5,8,22,0.8)' }}>
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs text-white/50 font-medium">LexAI Research</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Scale className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 text-xs text-white/50 leading-relaxed rounded-lg p-3 rounded-tl-none" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        Under New York law, limitation of liability clauses in B2B SaaS agreements are generally enforceable, but courts scrutinize unconscionable outcomes...
                        <span className="text-blue-400/80 ml-1">[1]</span>
                        <span className="text-blue-400/80 ml-0.5">[2]</span>
                      </div>
                    </div>
                    <div className="pl-8 space-y-1.5">
                      {['Biotronik SE & Co. v. Bartron Corp. (2019)', 'NY UCC § 2-719(3)'].map((src) => (
                        <div key={src} className="flex items-center gap-2 text-[10px] text-white/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40" />{src}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <input readOnly value="What's the enforceability of mutual indemnification..." className="flex-1 text-xs rounded-lg px-3 py-2 text-white/30 cursor-default" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                      <button className="px-3 py-2 rounded-lg text-xs font-medium text-white" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)' }}>Ask</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-32 overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] opacity-20 pointer-events-none blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.5) 0%, rgba(124,58,237,0.3) 50%, transparent 70%)' }} />
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative">
            <h2 className="text-5xl font-bold tracking-tight mb-6">Ready to transform<br />your legal team?</h2>
            <p className="text-white/50 text-lg mb-10">Join leading firms using LexAI to close deals faster, reduce risk, and scale their practice.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/auth/register" className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)', boxShadow: '0 0 40px rgba(59,130,246,0.4), 0 0 80px rgba(124,58,237,0.15)' }}>
                Get started for free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/auth/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all" style={{ background: 'rgba(255,255,255,0.04)' }}>
                Sign in to your workspace
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">LexAI</span>
            <span className="text-white/30 text-sm ml-2">AI-native legal OS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/60 transition-colors">Security</a>
            <span>© {new Date().getFullYear()} LexAI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
