'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/stores/use-auth';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Settings, Save, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface LLMConfig {
  provider: 'ollama' | 'openrouter';
  ollama_host: string;
  models: {
    research: string;
    extraction: string;
    drafting: string;
  };
}

export default function LLMSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<LLMConfig>({
    provider: 'ollama',
    ollama_host: 'http://localhost:11434',
    models: {
      research: 'llama3',
      extraction: 'llama3',
      drafting: 'llama3',
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/org/settings/llm/');
      if (response.data && Object.keys(response.data).length > 0) {
        setConfig({
          provider: response.data.provider || 'ollama',
          ollama_host: response.data.ollama_host || 'http://localhost:11434',
          models: {
            research: response.data.models?.research || 'llama3',
            extraction: response.data.models?.extraction || 'llama3',
            drafting: response.data.models?.drafting || 'llama3',
          },
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch LLM settings:', err);
      setError('Could not load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await api.patch('/auth/org/settings/llm/', config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save LLM settings:', err);
      setError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LLM Configuration</h1>
        <p className="text-zinc-500 mt-2">
          Configure how LexAI routes AI tasks to local or cloud models for your organization.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your LLM settings have been updated successfully.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
            <Settings className="w-5 h-5 text-blue-600" />
            General Provider
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="provider">Active Provider</Label>
              <select
                id="provider"
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="openrouter">OpenRouter (Cloud)</option>
              </select>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Ollama is recommended for privacy and local-first development.
              </p>
            </div>

            {config.provider === 'ollama' && (
              <div className="space-y-2">
                <Label htmlFor="ollama_host">Ollama Host</Label>
                <Input
                  id="ollama_host"
                  value={config.ollama_host}
                  onChange={(e) => setConfig({ ...config, ollama_host: e.target.value })}
                  placeholder="http://localhost:11434"
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
            <Save className="w-5 h-5 text-blue-600" />
            Task Specific Models
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="model-research">Research Model</Label>
              <Input
                id="model-research"
                value={config.models.research}
                onChange={(e) => setConfig({ 
                  ...config, 
                  models: { ...config.models, research: e.target.value } 
                })}
                placeholder="llama3"
              />
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Strong Reasoning</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-extraction">Extraction Model</Label>
              <Input
                id="model-extraction"
                value={config.models.extraction}
                onChange={(e) => setConfig({ 
                  ...config, 
                  models: { ...config.models, extraction: e.target.value } 
                })}
                placeholder="llama3"
              />
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Fast Structured Output</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-drafting">Drafting Model</Label>
              <Input
                id="model-drafting"
                value={config.models.drafting}
                onChange={(e) => setConfig({ 
                  ...config, 
                  models: { ...config.models, drafting: e.target.value } 
                })}
                placeholder="llama3"
              />
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Creative Generation</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={saving} className="min-w-[120px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
