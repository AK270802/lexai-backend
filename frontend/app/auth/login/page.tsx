'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scale, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/stores/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setAuth = useAuth((state) => state.setAuth);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!formData.email || !formData.password) return;
      setIsLoading(true);
      setError(null);

      try {
        const tokens = await authApi.login(formData.email, formData.password);
        setAuth(tokens.user, tokens.access, tokens.refresh);
        router.push('/dashboard');
      } catch (err: unknown) {
        const e = err as { response?: { data?: { detail?: string; message?: string; non_field_errors?: string[] } } };
        const data = e?.response?.data;
        setError(
          data?.detail ||
            data?.message ||
            (data?.non_field_errors && data.non_field_errors[0]) ||
            'Invalid email or password. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [formData, setAuth, router]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, isLoading]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Subtle radial gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(217 91% 60% / 0.07) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 100%, hsl(250 91% 65% / 0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[400px] animate-in">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              'bg-primary/10 ring-1 ring-primary/20 shadow-glow-sm'
            )}
          >
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">LexAI</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Legal Intelligence Platform</p>
          </div>
        </div>

        {/* Card */}
        <div
          className={cn(
            'glass rounded-2xl border border-border/60 p-8 shadow-xl',
            'ring-1 ring-white/5'
          )}
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back. Enter your credentials to continue.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@firm.com"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full shadow-glow-sm"
              disabled={isLoading || !formData.email || !formData.password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
