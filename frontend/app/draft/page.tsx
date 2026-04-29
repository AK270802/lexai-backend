'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PenTool, Sparkles, Save, ChevronRight, ChevronLeft } from 'lucide-react';

type Matter = { id: string; title: string };

type TemplateVar = { key: string; label: string; type: 'text' | 'textarea' | 'date' | 'number'; required: boolean };

type DraftTemplate = {
  id: string | null;
  template_type: string;
  title: string;
  description?: string;
  variables: TemplateVar[];
};

export default function DraftPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [matters, setMatters] = useState<Matter[]>([]);
  const [templates, setTemplates] = useState<DraftTemplate[]>([]);

  const [matterId, setMatterId] = useState('');
  const [templateType, setTemplateType] = useState('nda');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [applyPreferred, setApplyPreferred] = useState(true);

  const [title, setTitle] = useState('');
  const [inputs, setInputs] = useState<Record<string, any>>({});

  const [draftContent, setDraftContent] = useState('');
  const [usedClauseIds, setUsedClauseIds] = useState<string[]>([]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      const [mRes, tRes] = await Promise.all([
        api.get('/matters/'),
        api.get('/drafts/templates/'),
      ]);
      setMatters(Array.isArray(mRes.data.results) ? mRes.data.results : mRes.data);
      setTemplates(Array.isArray(tRes.data.results) ? tRes.data.results : tRes.data);
    } catch (e: any) {
      setError('Failed to load drafting data.');
    } finally {
      setLoading(false);
    }
  };

  const availableTemplates = useMemo(() => templates.filter((t) => t.template_type === templateType), [templates, templateType]);
  const selectedTemplate = useMemo(() => {
    if (templateId) return availableTemplates.find((t) => t.id === templateId) || availableTemplates[0] || null;
    return availableTemplates[0] || null;
  }, [availableTemplates, templateId]);

  const variables = selectedTemplate?.variables || [];

  const validateStep3 = () => {
    const missing = variables.filter((v) => v.required && !String(inputs[v.key] || '').trim());
    if (missing.length) {
      setError(`Missing required fields: ${missing.map((m) => m.label).join(', ')}`);
      return false;
    }
    return true;
  };

  const generate = async () => {
    if (!matterId) {
      setError('Select a matter.');
      return;
    }
    if (!validateStep3()) return;

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);
      const res = await api.post('/drafts/generate/', {
        matter_id: matterId,
        template_type: templateType,
        template_id: templateId,
        title: title || undefined,
        inputs,
        apply_preferred_clauses: applyPreferred,
      });
      setTitle(res.data.generated_title);
      setDraftContent(res.data.draft_content);
      setUsedClauseIds(res.data.used_clause_ids || []);
      setStep(4);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.error || 'Draft generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await api.post('/drafts/save/', {
        matter_id: matterId,
        template_type: templateType,
        title: title || 'Draft',
        draft_content: draftContent,
        used_clause_ids: usedClauseIds,
      });
      setSuccess(`Saved draft as document: ${res.data.file_name}`);
      setStep(5);
    } catch (e: any) {
      setError('Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drafting</h1>
          <p className="text-zinc-500 mt-2">Generate first drafts from templates and structured intake.</p>
        </div>
        <div className="text-xs text-zinc-500 font-semibold uppercase">Step {step} / 5</div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <PenTool className="w-4 h-4 text-blue-600" /> Draft Wizard
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && step < 5 && (
              <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            {step === 1 && (
              <Button onClick={() => setStep(2)} className="gap-2" disabled={!matterId}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => setStep(3)} className="gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={generate} className="gap-2" disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate
              </Button>
            )}
            {step === 4 && (
              <Button onClick={saveDraft} className="gap-2" disabled={saving || !draftContent}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save to Matter
              </Button>
            )}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-sm font-semibold">Select Matter</div>
              <select
                className="h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                value={matterId}
                onChange={(e) => setMatterId(e.target.value)}
              >
                <option value="">Choose a matter</option>
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              <div className="text-xs text-zinc-500">Drafts will be saved into the selected matter as documents.</div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Template Type</Label>
                  <select
                    className="h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                    value={templateType}
                    onChange={(e) => {
                      setTemplateType(e.target.value);
                      setTemplateId(null);
                      setInputs({});
                      setDraftContent('');
                    }}
                  >
                    <option value="nda">NDA</option>
                    <option value="msa">MSA</option>
                    <option value="service_agreement">Service Agreement</option>
                    <option value="employment_agreement">Employment Agreement</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Draft Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Mutual NDA - Acme x Contoso" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" checked={applyPreferred} onChange={(e) => setApplyPreferred(e.target.checked)} />
                <div className="text-sm">Apply preferred clauses from Vault</div>
              </div>

              <div className="text-xs text-zinc-500">Selected template schema will define the intake fields.</div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-sm font-semibold">Intake Form</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {variables.map((v) => (
                  <div key={v.key} className="space-y-2">
                    <Label>
                      {v.label} {v.required ? <span className="text-red-500">*</span> : null}
                    </Label>
                    {v.type === 'textarea' ? (
                      <textarea
                        className="w-full min-h-[110px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm"
                        value={inputs[v.key] || ''}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [v.key]: e.target.value }))}
                      />
                    ) : (
                      <Input
                        type={v.type === 'date' ? 'date' : v.type === 'number' ? 'number' : 'text'}
                        value={inputs[v.key] || ''}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [v.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Generated Draft</Label>
                <textarea
                  className="w-full min-h-[520px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-sm leading-relaxed font-serif"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                />
              </div>
              <div className="space-y-4">
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                  <div className="text-sm font-semibold">Draft Metadata</div>
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
                    <div><span className="font-semibold">Type:</span> {templateType}</div>
                    <div><span className="font-semibold">Used Vault Clauses:</span> {usedClauseIds.length}</div>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  Save will store the draft as a matter document (markdown) and keep content in document metadata.
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div className="text-lg font-semibold">Draft saved to matter</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-300">You can now find it in the matter documents list.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

