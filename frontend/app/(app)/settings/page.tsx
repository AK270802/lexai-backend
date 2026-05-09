'use client';

import { useEffect, useState } from 'react';
import {
  User,
  Settings,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Shield,
  Building2,
  Lock,
} from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import type { LLMConfig } from '@/lib/types';
import { useAuth } from '@/stores/use-auth';
import { cn, parseErrorMessage, roleColor } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'llm';

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }

  const fields = [
    { label: 'Full Name', value: user.name, icon: User },
    { label: 'Email Address', value: user.email, icon: User },
    { label: 'Role', value: user.role, icon: Shield, isRole: true },
    { label: 'Organization', value: user.organization?.name ?? '—', icon: Building2 },
    { label: 'Account Status', value: user.is_active ? 'Active' : 'Inactive', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-muted-foreground" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white', 'bg-primary')}>
              {user.name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{f.label}</Label>
                <div className="flex items-center h-10 rounded-md border border-input bg-muted/40 px-3 text-sm">
                  {f.isRole ? (
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize', roleColor(f.value))}>
                      {f.value}
                    </span>
                  ) : (
                    <span className="text-foreground capitalize">{f.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mt-2">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            Profile information is managed by your organization administrator. Contact your admin to make changes.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── LLM Config Tab ───────────────────────────────────────────────────────────

const MODEL_TASKS = [
  { key: 'research', label: 'Research Model', hint: 'Strong reasoning capability' },
  { key: 'extraction', label: 'Extraction Model', hint: 'Fast structured output' },
  { key: 'drafting', label: 'Drafting Model', hint: 'Creative text generation' },
  { key: 'embedding', label: 'Embedding Model', hint: 'Semantic search & similarity' },
] as const;

type ModelTask = typeof MODEL_TASKS[number]['key'];

interface LLMFormState {
  provider: 'ollama' | 'openrouter';
  ollama_host: string;
  openrouter_api_key: string;
  openrouter_base_url: string;
  models: Record<ModelTask, string>;
}

function LLMTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [form, setForm] = useState<LLMFormState>({
    provider: 'ollama',
    ollama_host: 'http://localhost:11434',
    openrouter_api_key: '',
    openrouter_base_url: 'https://openrouter.ai/api/v1',
    models: { research: '', extraction: '', drafting: '', embedding: '' },
  });

  useEffect(() => {
    authApi.getLLMConfig()
      .then((config: LLMConfig) => {
        setForm({
          provider: config.provider ?? 'ollama',
          ollama_host: config.ollama_host ?? 'http://localhost:11434',
          openrouter_api_key: config.openrouter_api_key ?? '',
          openrouter_base_url: 'https://openrouter.ai/api/v1',
          models: {
            research: config.models?.research ?? '',
            extraction: config.models?.extraction ?? '',
            drafting: config.models?.drafting ?? '',
            embedding: config.models?.embedding ?? '',
          },
        });
      })
      .catch(() => {
        // Non-fatal — use defaults
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: Partial<LLMConfig> = {
        provider: form.provider,
        models: form.models,
      };
      if (form.provider === 'ollama') {
        payload.ollama_host = form.ollama_host;
      } else {
        if (form.openrouter_api_key) payload.openrouter_api_key = form.openrouter_api_key;
      }
      await authApi.updateLLMConfig(payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Admin access required</p>
            <p className="text-sm text-muted-foreground mt-1">
              LLM configuration can only be modified by organization administrators.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const set = (k: keyof Omit<LLMFormState, 'models'>) => (val: string) =>
    setForm((f) => ({ ...f, [k]: val }));

  const setModel = (k: ModelTask) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, models: { ...f.models, [k]: e.target.value } }));

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          LLM configuration saved successfully.
        </div>
      )}

      {/* Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4 text-muted-foreground" />
            Provider Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="llm-provider">Active Provider</Label>
              <select
                id="llm-provider"
                value={form.provider}
                onChange={(e) => set('provider')(e.target.value as 'ollama' | 'openrouter')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="openrouter">OpenRouter (Cloud)</option>
              </select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3 flex-shrink-0" />
                Ollama is recommended for data privacy and local deployments.
              </p>
            </div>

            {form.provider === 'ollama' ? (
              <div className="space-y-1.5">
                <Label htmlFor="llm-host">Ollama Host URL</Label>
                <Input
                  id="llm-host"
                  value={form.ollama_host}
                  onChange={(e) => set('ollama_host')(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="llm-or-key">OpenRouter API Key</Label>
                  <div className="relative">
                    <Input
                      id="llm-or-key"
                      type={showKey ? 'text' : 'password'}
                      value={form.openrouter_api_key}
                      onChange={(e) => set('openrouter_api_key')(e.target.value)}
                      placeholder="sk-or-..."
                      className="pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-task models */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4 text-muted-foreground" />
            Per-Task Model Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODEL_TASKS.map((task) => (
              <div key={task.key} className="space-y-1.5">
                <Label htmlFor={`model-${task.key}`}>{task.label}</Label>
                <Input
                  id={`model-${task.key}`}
                  value={form.models[task.key]}
                  onChange={setModel(task.key)}
                  placeholder={form.provider === 'ollama' ? 'llama3' : 'openai/gpt-4o-mini'}
                />
                <p className="text-xs text-muted-foreground">{task.hint}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2 min-w-[140px]">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'llm', label: 'LLM Configuration', icon: Settings },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and organization configuration.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'llm' && <LLMTab />}
      </div>
    </div>
  );
}
