// In-app handoff export for the Falcon prototype. Bundles the prototype's source
// + HANDOFF.md into a .zip an engineer can read top-to-bottom. The source is
// embedded verbatim by scripts/gen-handoff.mjs (runs on dev/build) into
// sources.generated.ts — read from disk, so the engineer gets the original
// TypeScript (types/comments intact), not transpiled JS. Works on Vercel.
// Zero deps — the .zip is built with a tiny store-method writer.
//
// Scope: only the Falcon prototype source. ScaleUI3 components are NOT bundled —
// in production they come from the ScaleUI3 registry (see HANDOFF.md).

const ROOT = 'falcon-handoff';

interface BundleFile { path: string; content: string }

// ── minimal store-method ZIP writer (no compression, no deps) ──────────────

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(bytes: Uint8Array): number {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files: BundleFile[]): Uint8Array {
    const enc = new TextEncoder();
    const local: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;

    for (const f of files) {
        const name = enc.encode(f.path);
        const data = enc.encode(f.content);
        const crc = crc32(data);
        const size = data.length;

        const lhBuf = new ArrayBuffer(30 + name.length);
        const lh = new Uint8Array(lhBuf);
        const lv = new DataView(lhBuf);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0, true);
        lv.setUint16(8, 0, true);
        lv.setUint16(10, 0, true);
        lv.setUint16(12, 0x21, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, size, true);
        lv.setUint32(22, size, true);
        lv.setUint16(26, name.length, true);
        lv.setUint16(28, 0, true);
        lh.set(name, 30);
        local.push(lh, data);

        const chBuf = new ArrayBuffer(46 + name.length);
        const ch = new Uint8Array(chBuf);
        const cv = new DataView(chBuf);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, 0, true);
        cv.setUint16(14, 0x21, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, size, true);
        cv.setUint32(24, size, true);
        cv.setUint16(28, name.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, offset, true);
        ch.set(name, 46);
        central.push(ch);

        offset += lh.length + data.length;
    }

    const centralSize = central.reduce((s, c) => s + c.length, 0);
    const endBuf = new ArrayBuffer(22);
    const end = new Uint8Array(endBuf);
    const ev = new DataView(endBuf);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const out = new Uint8Array(offset + centralSize + end.length);
    let p = 0;
    for (const c of local) { out.set(c, p); p += c.length; }
    for (const c of central) { out.set(c, p); p += c.length; }
    out.set(end, p);
    return out;
}

/** Build the Falcon handoff bundle and trigger a browser download. */
export async function downloadFalconHandoff(): Promise<void> {
    // Loaded on demand so the embedded source isn't in the initial page bundle.
    const { HANDOFF_FILES } = await import('./sources.generated');
    const files: BundleFile[] = HANDOFF_FILES.map((f) => ({ path: `${ROOT}/${f.path}`, content: f.content }));
    const zip = buildZip(files);
    const blob = new Blob([zip as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ROOT}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
