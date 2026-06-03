'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { draftsApi } from '@/lib/api/drafts';
import { mattersApi } from '@/lib/api/matters';
import type {
  DraftTemplate,
  GenerateDraftResponse,
  Matter,
  TemplateType,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Markdown } from '@/components/ui/markdown';
import { cn, parseErrorMessage } from '@/lib/utils';
import {
  FileText,
  Loader2,
  ChevronRight,
  Check,
  Copy,
  Download,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Shield,
  Briefcase,
  Users,
  Handshake,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

type DraftStep = 'select' | 'configure' | 'generating' | 'review';

// Template type metadata
const TEMPLATE_META: Record<
  TemplateType,
  { label: string; description: string; icon: React.ElementType; color: string }
> = {
  nda: {
    label: 'Non-Disclosure Agreement',
    description: 'Mutual or one-way confidentiality agreement protecting sensitive business information.',
    icon: Shield,
    color: 'text-violet-500',
  },
  msa: {
    label: 'Master Service Agreement',
    description: 'Framework agreement governing the ongoing relationship between service provider and client.',
    icon: Handshake,
    color: 'text-blue-500',
  },
  service_agreement: {
    label: 'Service Agreement',
    description: 'Detailed agreement outlining scope, deliverables, and terms for specific services.',
    icon: FileText,
    color: 'text-emerald-500',
  },
  employment_agreement: {
    label: 'Employment Agreement',
    description: 'Comprehensive employment contract covering compensation, duties, and termination terms.',
    icon: Users,
    color: 'text-amber-500',
  },
};

// Default variable labels for human-friendly display
const VARIABLE_LABELS: Record<string, string> = {
  party_a: 'Party A (First Party)',
  party_b: 'Party B (Second Party)',
  effective_date: 'Effective Date',
  jurisdiction: 'Jurisdiction',
  governing_law: 'Governing Law',
  notice_period: 'Notice Period',
  confidentiality_period: 'Confidentiality Period (years)',
  payment_terms: 'Payment Terms',
  termination_notice: 'Termination Notice Period',
  position: 'Position / Job Title',
  salary: 'Annual Salary',
  start_date: 'Start Date',
  services_description: 'Description of Services',
};

function labelForVar(key: string): string {
  return VARIABLE_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function placeholderForVar(key: string): string {
  const map: Record<string, string> = {
    party_a: 'e.g. Acme Corp.',
    party_b: 'e.g. Vendor Inc.',
    effective_date: 'e.g. 2026-01-01',
    jurisdiction: 'e.g. California, USA',
    governing_law: 'e.g. State of California',
    notice_period: 'e.g. 30 days',
    confidentiality_period: 'e.g. 3',
    payment_terms: 'e.g. Net-30',
    termination_notice: 'e.g. 14 days',
    position: 'e.g. Senior Engineer',
    salary: 'e.g. $120,000',
    start_date: 'e.g. 2026-02-01',
    services_description: 'e.g. Software development and consulting services',
  };
  return map[key] ?? '';
}

function isDateField(key: string) {
  return key.includes('date');
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { id: DraftStep; label: string }[] = [
  { id: 'select', label: 'Choose Template' },
  { id: 'configure', label: 'Fill Details' },
  { id: 'generating', label: 'Generating' },
  { id: 'review', label: 'Review & Save' },
];

function StepBar({ current }: { current: DraftStep }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.filter((s) => s.id !== 'generating').map((step, i) => {
        const logicalSteps = STEPS.filter((s) => s.id !== 'generating');
        const logicalIdx = logicalSteps.findIndex((s) => s.id === current);
        const isDone = i < logicalIdx;
        const isActive = step.id === current || (current === 'generating' && step.id === 'configure');
        return (
          <div key={step.id} className="flex items-center gap-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors flex-none',
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                    ? 'bg-primary/10 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground border-2 border-border'
                )}
              >
                {isDone ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-foreground' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/50'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < logicalSteps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-border mx-2 flex-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onSelect,
}: {
  template: DraftTemplate;
  onSelect: () => void;
}) {
  const meta = TEMPLATE_META[template.template_type] ?? {
    label: template.title,
    description: template.description,
    icon: FileText,
    color: 'text-muted-foreground',
  };
  const Icon = meta.icon;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-5 rounded-xl border border-border bg-card',
        'hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm',
        'transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-none',
            'bg-muted group-hover:bg-card transition-colors'
          )}
        >
          <Icon className={cn('w-5 h-5', meta.color)} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{template.title || meta.label}</p>
            <Badge variant="outline" className="text-[10px] px-1.5">
              {template.template_type.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {template.description || meta.description}
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-muted-foreground/60">
              {Object.keys(template.variables).length} variables required
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary flex-none mt-1 transition-colors" />
      </div>
    </button>
  );
}

// ─── Template skeletons ───────────────────────────────────────────────────────

function TemplateSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-5 rounded-xl border border-border bg-card flex items-start gap-4">
          <Skeleton className="w-10 h-10 rounded-xl flex-none" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DraftsPage() {
  const router = useRouter();

  // Step machine
  const [step, setStep] = useState<DraftStep>('select');

  // Data
  const [templates, setTemplates] = useState<DraftTemplate[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DraftTemplate | null>(null);

  // Form state
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [applyVault, setApplyVault] = useState(false);

  // Output state
  const [draftResult, setDraftResult] = useState<GenerateDraftResponse | null>(null);

  // UI state
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [mattersLoading, setMattersLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Boot ────────────────────────────────────────────────────────────────

  useEffect(() => {
    draftsApi
      .listTemplates()
      .then(setTemplates)
      .catch(() => setErrorMsg('Failed to load templates.'))
      .finally(() => setTemplatesLoading(false));

    mattersApi
      .list({ status: 'active' })
      .then(setMatters)
      .catch(() => {})
      .finally(() => setMattersLoading(false));
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSelectTemplate = (template: DraftTemplate) => {
    setSelectedTemplate(template);
    // Initialize inputs with empty strings for each variable
    const initInputs: Record<string, string> = {};
    Object.keys(template.variables).forEach((key) => {
      initInputs[key] = '';
    });
    setInputs(initInputs);
    setErrorMsg('');
    setStep('configure');
  };

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || !selectedMatterId) {
      setErrorMsg('Please select a matter before generating.');
      return;
    }
    setErrorMsg('');
    setGenerating(true);
    setStep('generating');

    try {
      const result = await draftsApi.generate({
        matter_id: selectedMatterId,
        template_type: selectedTemplate.template_type,
        template_id: selectedTemplate.id,
        inputs,
        apply_preferred_clauses: applyVault,
      });
      setDraftResult(result);
      setStep('review');
    } catch (err) {
      setErrorMsg(parseErrorMessage(err));
      setStep('configure');
    } finally {
      setGenerating(false);
    }
  }, [selectedTemplate, selectedMatterId, inputs, applyVault]);

  const handleSave = useCallback(async () => {
    if (!draftResult || !selectedTemplate || !selectedMatterId) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await draftsApi.save({
        matter_id: selectedMatterId,
        title: draftResult.generated_title,
        template_type: selectedTemplate.template_type,
        draft_content: draftResult.draft_content,
        used_clause_ids: draftResult.used_clause_ids,
      });
      setSaved(true);
      setTimeout(() => {
        router.push('/documents');
      }, 1500);
    } catch (err) {
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [draftResult, selectedTemplate, selectedMatterId, router]);

  const handleCopy = async () => {
    if (!draftResult?.draft_content) return;
    await navigator.clipboard.writeText(draftResult.draft_content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setDraftResult(null);
    setSaved(false);
    setErrorMsg('');
    setStep('configure');
  };

  const handleBack = () => {
    if (step === 'configure') {
      setSelectedTemplate(null);
      setInputs({});
      setErrorMsg('');
      setStep('select');
    } else if (step === 'review') {
      handleRegenerate();
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────

  const variableKeys = selectedTemplate ? Object.keys(selectedTemplate.variables) : [];
  const canGenerate = selectedMatterId && variableKeys.every((k) => inputs[k]?.trim());
  const selectedMatter = matters.find((m) => m.id === selectedMatterId);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Document Drafting</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate AI-powered legal documents from your organization&apos;s templates and preferred clauses.
          </p>
        </div>
        {step !== 'select' && (
          <Button variant="outline" size="sm" onClick={handleBack} className="gap-2 flex-none">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
        )}
      </div>

      {/* ── Step indicator ──────────────────────────────────────────────── */}
      <div className="px-1">
        <StepBar current={step} />
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-none" />
          <p>{errorMsg}</p>
          <button
            onClick={() => setErrorMsg('')}
            className="ml-auto text-xs hover:underline opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1: Template Selection
      ══════════════════════════════════════════════════════════════════ */}
      {step === 'select' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Select a document template to get started.</p>
            <span className="text-xs text-muted-foreground">
              {templates.length} template{templates.length !== 1 ? 's' : ''} available
            </span>
          </div>

          {templatesLoading ? (
            <TemplateSkeleton />
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">No templates found</p>
              <p className="text-xs text-muted-foreground">
                Contact your administrator to configure document templates.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleSelectTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 2: Configure Variables
      ══════════════════════════════════════════════════════════════════ */}
      {step === 'configure' && selectedTemplate && (
        <div className="space-y-6">
          {/* Template summary banner */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
            {(() => {
              const meta = TEMPLATE_META[selectedTemplate.template_type];
              const Icon = meta?.icon ?? FileText;
              return (
                <>
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-none">
                    <Icon className={cn('w-4.5 h-4.5', meta?.color ?? 'text-muted-foreground')} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{selectedTemplate.title}</p>
                    <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Matter selector — required */}
          <Card>
            <CardHeader>
              <CardTitle>Matter</CardTitle>
              <CardDescription>Select the matter this document belongs to.</CardDescription>
            </CardHeader>
            <CardContent>
              {mattersLoading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <select
                  value={selectedMatterId}
                  onChange={(e) => setSelectedMatterId(e.target.value)}
                  className={cn(
                    'w-full h-10 rounded-md border border-input bg-background px-3 text-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    !selectedMatterId && 'text-muted-foreground'
                  )}
                >
                  <option value="">— Select a matter (required) —</option>
                  {matters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              )}
              {matters.length === 0 && !mattersLoading && (
                <p className="text-xs text-destructive mt-2">
                  No active matters found. Create a matter first.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Document variables */}
          {variableKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Document Variables</CardTitle>
                <CardDescription>
                  Fill in the details that will be used to generate your document.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {variableKeys.map((key) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`var-${key}`} className="text-xs">
                        {labelForVar(key)}
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Input
                        id={`var-${key}`}
                        type={isDateField(key) ? 'date' : 'text'}
                        value={inputs[key] ?? ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        placeholder={placeholderForVar(key)}
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vault option */}
          <Card>
            <CardContent className="pt-5">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={applyVault}
                  onChange={(e) => setApplyVault(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <div>
                  <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                    Apply preferred clauses from Vault
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically substitute your organization&apos;s pre-approved clause language where applicable.
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Generate button */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              All required fields must be filled before generating.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="gap-2 px-6"
            >
              <Sparkles className="w-4 h-4" />
              Generate Draft
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 3: Generating
      ══════════════════════════════════════════════════════════════════ */}
      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center gap-6 py-24">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping opacity-30" />
          </div>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <p className="text-base font-semibold">AI is drafting your document…</p>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Applying your variables and preferred clauses to generate a tailored legal document.
            </p>
          </div>
          {selectedTemplate && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-xs">
              <FileText className="w-3.5 h-3.5" />
              <span>{selectedTemplate.title}</span>
              {selectedMatter && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{selectedMatter.title}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 4: Review & Save
      ══════════════════════════════════════════════════════════════════ */}
      {step === 'review' && draftResult && (
        <div className="space-y-5">
          {/* Title + actions header */}
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground">{draftResult.generated_title}</h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {selectedMatter && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="w-3 h-3" />
                    {selectedMatter.title}
                  </div>
                )}
                {selectedTemplate && (
                  <Badge variant="outline" className="text-[10px]">
                    {selectedTemplate.template_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
                {draftResult.used_clause_ids.length > 0 && (
                  <Badge variant="info" className="text-[10px] gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {draftResult.used_clause_ids.length} vault clause{draftResult.used_clause_ids.length !== 1 ? 's' : ''} applied
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-none">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate} className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                Regenerate
              </Button>
            </div>
          </div>

          {/* Warnings */}
          {draftResult.warnings.length > 0 && (
            <div className="space-y-2">
              {draftResult.warnings.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 text-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 flex-none mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Document preview */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/40">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Document Preview</span>
              <div className="ml-auto flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-border" />
              </div>
            </div>
            <div className="p-6 max-h-[520px] overflow-y-auto scrollbar-thin">
              <div className="ai-prose">
                <Markdown content={draftResult.draft_content} />
              </div>
            </div>
          </div>

          {/* Save action */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Review the generated document carefully before saving.
            </p>

            {saved ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                Saved — redirecting to Documents…
              </div>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 px-6"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Save to Documents
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
