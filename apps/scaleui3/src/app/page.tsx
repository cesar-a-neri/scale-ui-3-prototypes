import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Proto Platform</h1>
      <p className="text-muted-foreground">
        Press <kbd className="rounded border px-1.5 py-0.5 text-sm">⌘K</kbd> to open the prototype switcher.
      </p>
      <div className="flex flex-col gap-2">
        <Link href="/falcon" className="text-primary underline underline-offset-4">
          Open Project Falcon →
        </Link>
        <Link href="/sgp-nav" className="text-primary underline underline-offset-4">
          Open SGP Navigation IA →
        </Link>
        <Link href="/golden-agent" className="text-primary underline underline-offset-4">
          Open Golden Agent →
        </Link>
      </div>
    </main>
  );
}
