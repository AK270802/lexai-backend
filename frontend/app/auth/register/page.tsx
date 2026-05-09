'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scale, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  email: string;
  password: string;
  org_name: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  org_name?: string;
}

function validate(data: FormData): FormErrors {
  const errs: FormErrors = {};
  if (!data.name.trim()) errs.name = 'Full name is required.';
  if (!data.email.trim()) errs.email = 'Work email is required.';
  if (!data.password) errs.password = 'Password is required.';
  else if (data.password.length < 8) errs.password = 'Password must be at least 8 characters.';
  if (!data.org_name.trim()) errs.org_name = 'Organization name is required.';
  return errs;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    org_name: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (fieldErrors[id as keyof FormErrors]) {
      setFieldErrors((prev) => ({ ...prev, [id]: undefined }));
    }
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authApi.register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        org_name: formData.org_name,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login?registered=1');
      }, 1500);
    } catch (err: unknown) {
      const e = err as {
        response?: {
          data?: {
            detail?: string;
            message?: string;
            email?: string[];
            non_field_errors?: string[];
          };
        };
      };
      const data = e?.response?.data;
      setError(
        data?.detail ||
          data?.message ||
          (data?.email && data.email[0]) ||
          (data?.non_field_errors && data.non_field_errors[0]) ||
          'Registration failed. Please check your details and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="relative w-full max-w-[420px] animate-in">
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
            <h2 className="text-xl font-semibold text-foreground">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up your firm on LexAI in under a minute.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-5 border-green-500/30 bg-green-500/10 text-green-400">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <AlertDescription>Account created! Redirecting to sign in…</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                placeholder="Jane Smith"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading || success}
                className={cn(fieldErrors.name && 'border-destructive focus-visible:ring-destructive')}
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@firm.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading || success}
                className={cn(fieldErrors.email && 'border-destructive focus-visible:ring-destructive')}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading || success}
                className={cn(fieldErrors.password && 'border-destructive focus-visible:ring-destructive')}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org_name">Organization name</Label>
              <Input
                id="org_name"
                placeholder="Lexington Legal LLP"
                autoComplete="organization"
                value={formData.org_name}
                onChange={handleChange}
                required
                disabled={isLoading || success}
                className={cn(fieldErrors.org_name && 'border-destructive focus-visible:ring-destructive')}
              />
              {fieldErrors.org_name && (
                <p className="text-xs text-destructive">{fieldErrors.org_name}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full shadow-glow-sm"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
