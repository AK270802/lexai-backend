import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center">
              L
            </div>
            <div className="font-semibold tracking-tight text-lg">LexAI</div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="h-10 px-4 inline-flex items-center justify-center rounded-md border border-zinc-200 text-sm font-semibold hover:bg-zinc-50"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="h-10 px-4 inline-flex items-center justify-center rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Create account
            </Link>
          </div>
        </header>

        <section className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
              Legal Intelligence Platform
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight">
              Research, review, and drafting in one trusted workspace.
            </h1>
            <p className="mt-5 text-zinc-600 leading-relaxed">
              LexAI combines citation-grounded research, contract clause analysis with exact highlights, organization playbooks,
              drafting workflows, realtime collaboration, client portal access, analytics, and audit visibility.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/register"
                className="h-11 px-5 inline-flex items-center justify-center rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Get started
              </Link>
              <Link
                href="/auth/login"
                className="h-11 px-5 inline-flex items-center justify-center rounded-md border border-zinc-200 text-sm font-semibold hover:bg-zinc-50"
              >
                Open workspace
              </Link>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
            <div className="text-sm font-semibold">What you can do</div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="font-semibold">AI Research</div>
                <div className="text-sm text-zinc-600 mt-1">Streamed answers grounded in your uploaded documents.</div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="font-semibold">Contract Review</div>
                <div className="text-sm text-zinc-600 mt-1">Clause risk, exact bbox highlights, and redline actions.</div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="font-semibold">Client Portal</div>
                <div className="text-sm text-zinc-600 mt-1">Secure, time-bound links for external review and acknowledgement.</div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="font-semibold">Analytics + Audit</div>
                <div className="text-sm text-zinc-600 mt-1">Usage dashboards and admin-visible audit trail with export.</div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-20 text-xs text-zinc-500">
          <div className="border-t border-zinc-200 pt-6 flex items-center justify-between">
            <div>LexAI</div>
            <div>© {new Date().getFullYear()}</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
