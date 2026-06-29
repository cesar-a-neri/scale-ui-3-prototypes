// sync-ui.mjs
//
// Pulls the latest ScaleUI3 design-system components straight from the
// official GitHub repo and copies them into this prototype app.
//
// WHY THIS EXISTS:
//   The "official" way to update components is the shadcn registry served at
//   https://scaleui.internal.scale.com — but that host requires the eng VPN
//   (GlobalProtect / engvpn.scale.com). Until that access is sorted, we get the
//   exact same component files from GitHub instead, which only needs the
//   GitHub access every engineer already has.
//
// USAGE:
//   pnpm ui:sync           # clone latest, copy components, show what changed
//
// WHEN VPN ACCESS IS GRANTED LATER:
//   You can switch to the official tool instead of this script:
//     pnpm dlx shadcn@latest add https://scaleui.internal.scale.com/r/<name>.json
//   ...but this script will keep working either way.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'https://github.com/scaleapi/scaleui3.git';
const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Files/folders to pull from the official repo, relative to its root.
// We deliberately SKIP *.figma.tsx files — those are Figma "Code Connect"
// templates, not runtime code, and they import @figma/code-connect which this
// app doesn't use.
const COPY = [
  { from: 'src/components/ui',                to: 'src/components/ui' },
  { from: 'src/components/active-direction.tsx', to: 'src/components/active-direction.tsx' },
  { from: 'src/hooks/use-mobile.tsx',        to: 'src/hooks/use-mobile.tsx' },
  { from: 'src/lib/utils.ts',                to: 'src/lib/utils.ts' },
];

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

const work = mkdtempSync(join(tmpdir(), 'scaleui3-sync-'));
try {
  console.log(`\n→ Cloning ${REPO} (shallow)…`);
  run('git', ['clone', '--depth', '1', REPO, work], { stdio: 'pipe' });

  const sha = execFileSync('git', ['-C', work, 'rev-parse', '--short', 'HEAD'])
    .toString().trim();
  console.log(`→ Got latest commit ${sha}\n`);

  for (const { from, to } of COPY) {
    const src = join(work, from);
    const dest = join(APP_ROOT, to);
    if (!existsSync(src)) {
      console.warn(`  ! skipped (not found in repo): ${from}`);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, {
      recursive: true,
      // drop Figma Code Connect templates
      filter: (s) => !s.endsWith('.figma.tsx'),
    });
    console.log(`  ✓ ${from} → ${to}`);
  }

  // The components are written against specific versions of a handful of npm
  // packages. If the official repo bumps one (e.g. a new major of
  // react-day-picker), the copied component code can break against whatever
  // version this app has installed. Compare the two and warn so it's an
  // obvious "run pnpm add" fix rather than a confusing typecheck failure.
  const WATCH = [
    'cmdk', 'date-fns', 'embla-carousel-react', 'input-otp', 'next-themes',
    'react-day-picker', 'react-resizable-panels', 'recharts', 'sonner', 'vaul',
  ];
  const official = JSON.parse(
    execFileSync('cat', [join(work, 'package.json')]).toString()
  ).dependencies || {};
  const ours = JSON.parse(
    execFileSync('cat', [join(APP_ROOT, 'package.json')]).toString()
  ).dependencies || {};
  // Only a different MAJOR version (or a missing package) actually breaks the
  // component code — minor/patch differences within a caret range are fine.
  const major = (range) => (String(range).match(/\d+/) || ['?'])[0];
  const breaking = WATCH.filter(
    (p) => official[p] && (!ours[p] || major(ours[p]) !== major(official[p]))
  );
  if (breaking.length) {
    console.log('\n⚠️  These packages are a different major version than the library expects:');
    for (const p of breaking) {
      console.log(`  ${p}: this app has ${ours[p] || '(missing)'}, library wants ${official[p]}`);
    }
    console.log('   Fix with:');
    console.log('     pnpm add ' + breaking.map((p) => `${p}@${official[p]}`).join(' '));
  }

  console.log('\n✅ Sync complete. Review what changed with:  git status && git diff');
  console.log('   (Run `pnpm typecheck` to confirm everything still builds.)\n');
} finally {
  rmSync(work, { recursive: true, force: true });
}
