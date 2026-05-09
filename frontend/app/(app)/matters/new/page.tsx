'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { mattersApi } from '@/lib/api/matters';
import type { MatterStatus, Party } from '@/lib/types';
import { parseErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartyRow extends Party {
  _key: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewMatterPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<MatterStatus>('active');
  const [parties, setParties] = useState<PartyRow[]>([
    { _key: Date.now(), name: '', role: '', email: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Party helpers ──────────────────────────────────────────────────────────

  const addParty = () =>
    setParties((prev) => [...prev, { _key: Date.now(), name: '', role: '', email: '' }]);

  const removeParty = (key: number) =>
    setParties((prev) => prev.filter((p) => p._key !== key));

  const updateParty = (key: number, field: keyof Party, value: string) =>
    setParties((prev) =>
      prev.map((p) => (p._key === key ? { ...p, [field]: value } : p))
    );

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    const cleanParties: Party[] = parties
      .filter((p) => p.name.trim())
      .map(({ _key: _k, ...p }) => ({
        name: p.name.trim(),
        role: p.role.trim(),
        email: p.email?.trim() || undefined,
      }));

    try {
      const matter = await mattersApi.create({
        title: title.trim(),
        description: description.trim(),
        status,
        parties: cleanParties,
      });
      router.push(`/matters/${matter.id}`);
    } catch (err) {
      setError(parseErrorMessage(err));
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/matters">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">New Matter</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Open a new legal matter or case</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Enter the core information for this matter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Acme Corp — MSA Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
                className="h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Brief description of the matter, scope, background…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as MatterStatus)}
                disabled={submitting}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Parties</CardTitle>
                <CardDescription>Add the parties involved in this matter</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addParty}
                disabled={submitting}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Party
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {parties.map((party, idx) => (
              <div
                key={party._key}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg border border-border bg-muted/30 relative"
              >
                <div className="absolute top-3 right-3">
                  {parties.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeParty(party._key)}
                      disabled={submitting}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Name <span className="text-muted-foreground">(Party {idx + 1})</span>
                  </Label>
                  <Input
                    placeholder="Acme Corp"
                    value={party.name}
                    onChange={(e) => updateParty(party._key, 'name', e.target.value)}
                    disabled={submitting}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Input
                    placeholder="Client / Counterparty…"
                    value={party.role}
                    onChange={(e) => updateParty(party._key, 'role', e.target.value)}
                    disabled={submitting}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    placeholder="contact@example.com"
                    value={party.email ?? ''}
                    onChange={(e) => updateParty(party._key, 'email', e.target.value)}
                    disabled={submitting}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ))}

            {parties.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No parties added. Click &quot;Add Party&quot; to add one.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Link href="/matters">
            <Button type="button" variant="outline" size="sm" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" size="sm" disabled={submitting || !title.trim()} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Matter'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
