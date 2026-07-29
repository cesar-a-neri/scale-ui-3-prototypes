'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Unified File Rendering & Management — shared building blocks + 5 aggregated
// layout explorations. Inline rendering, the drag-and-drop upload modal, and the
// full-screen lightbox are shared across all 5; the variants differ only in how
// files are *aggregated and managed* (sidebar list, gallery grid, slide-over
// sheet grouped by origin, inline dock, or full file-manager table).
//
// Design language mirrors customizable-agents.tsx: same tokens (#19202f text,
// #818ea9 muted, #e9e9eb / #D1DAEB borders, --proto-accent* accent vars),
// lucide icons, and hand-rolled cards/menus.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  FileText, FileSpreadsheet, FileCode2, Image as ImageIcon, Presentation,
  Download, X, Maximize2, Trash2, UploadCloud,
  Search, Paperclip, Plus,
  Check, ZoomIn, ZoomOut, Folder, ChevronRight,
} from 'lucide-react';

const ACCENT       = 'var(--proto-accent)';
const ACCENT_TINT  = 'var(--proto-accent-tint)';
const ACCENT_MUTED = 'var(--proto-accent-muted)';
const ACCENT_TEXT  = 'var(--proto-accent-text)';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FileKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'code' | 'slides';
export type FileOrigin = 'user' | 'agent';

export interface ChatFile {
  id: string;
  name: string;
  kind: FileKind;
  size: string;
  origin: FileOrigin;
  meta?: string;        // "12 pages", "PDF", "1,204 rows"…
  gradient?: string;    // CSS background for image thumbnails/previews
  date?: string;        // "Today", "Jun 20"
  thread?: string;      // source conversation — the Files view is agent-wide, not thread-scoped
  folderId?: string | null; // containing folder; null/undefined = root of the file tree
}

// ─── Folder tree ────────────────────────────────────────────────────────────
// The agent's files live in a nested folder structure. Views drill in by folder
// with breadcrumb navigation (search flattens across the whole tree).

export interface FileFolder { id: string; name: string; parentId: string | null }

export const folderChildren = (folders: FileFolder[], parentId: string | null) =>
  folders.filter(f => f.parentId === parentId);

export const filesInFolder = (files: ChatFile[], folderId: string | null) =>
  files.filter(f => (f.folderId ?? null) === folderId);

/** Ancestor chain (root → …→ folder) for breadcrumbs. */
export const folderPath = (folders: FileFolder[], folderId: string | null): FileFolder[] => {
  const path: FileFolder[] = [];
  let cur = folderId;
  while (cur) {
    const f = folders.find(x => x.id === cur);
    if (!f) break;
    path.unshift(f);
    cur = f.parentId;
  }
  return path;
};

// ─── File-type visuals ────────────────────────────────────────────────────────

const KIND_VISUAL: Record<FileKind, { Icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>; color: string; tint: string; label: string }> = {
  pdf:    { Icon: FileText,        color: '#E5484D', tint: '#FDECEC', label: 'PDF' },
  doc:    { Icon: FileText,        color: '#2563EB', tint: '#EAF1FE', label: 'Document' },
  sheet:  { Icon: FileSpreadsheet, color: '#1A7F37', tint: '#E7F5EC', label: 'Spreadsheet' },
  code:   { Icon: FileCode2,       color: '#7C3AED', tint: '#F1EBFE', label: 'Code' },
  slides: { Icon: Presentation,    color: '#EA580C', tint: '#FDEEE3', label: 'Slides' },
  image:  { Icon: ImageIcon,       color: '#0E7490', tint: '#E4F4F7', label: 'Image' },
};

/** Neutral file-type glyph — grey icon, no background tile. */
export const FileTypeTile = ({ kind, size = 32 }: { kind: FileKind; size?: number }) => {
  const v = KIND_VISUAL[kind];
  return (
    <span className="flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <v.Icon size={Math.round(size * 0.66)} style={{ color: '#818EA9' }} />
    </span>
  );
};

/** Gradient image thumbnail with rounded corners. */
export const ImageThumb = ({ file, size = 32, radius = 8 }: { file: ChatFile; size?: number; radius?: number }) => (
  <span className="block shrink-0 bg-cover bg-center" style={{ width: size, height: size, borderRadius: radius, backgroundImage: file.gradient, backgroundColor: '#E8ECF2' }} />
);

/** Origin marker — plain text distinguishing user uploads from agent-generated files. */
export const OriginTag = ({ origin }: { origin: FileOrigin; compact?: boolean }) => (
  <span className="text-[11px] text-[#818EA9] shrink-0">{origin === 'agent' ? 'Agent' : 'You'}</span>
);

// ─── Shared actions (hover / menu) ─────────────────────────────────────────────

interface FileActionHandlers {
  onExpand: (f: ChatFile) => void;
  onDownload: (f: ChatFile) => void;
  onRemove: (f: ChatFile) => void;
}

const ActionBtn = ({ title, onClick, children }: { title: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) => (
  <button type="button" title={title}
    onClick={e => { e.stopPropagation(); onClick(e); }}
    className="flex items-center justify-center w-6 h-6 rounded-md text-[#818EA9] hover:text-[#19202F] hover:bg-[#EDEEF1] transition-colors">
    {children}
  </button>
);

const RowActions = ({ file, on }: { file: ChatFile; on: FileActionHandlers }) => (
  <div className="flex items-center gap-0.5 shrink-0">
    <ActionBtn title="Expand" onClick={() => on.onExpand(file)}><Maximize2 size={13} /></ActionBtn>
    <ActionBtn title="Download" onClick={() => on.onDownload(file)}><Download size={13} /></ActionBtn>
    <ActionBtn title="Remove" onClick={() => on.onRemove(file)}><Trash2 size={13} /></ActionBtn>
  </div>
);

// ─── Inline rendering (inside message bubbles) ──────────────────────────────────

/** A single inline file chip (documents). Compact, hover reveals expand/download. */
const InlineChip = ({ file, on }: { file: ChatFile; on: FileActionHandlers }) => {
  const v = KIND_VISUAL[file.kind];
  return (
    <div className="group/chip inline-flex items-center gap-2.5 pl-2 pr-2.5 py-2 rounded-xl bg-white max-w-[280px] transition-shadow hover:shadow-sm cursor-pointer"
      style={{ border: '1px solid #e9e9eb' }}
      onClick={() => on.onExpand(file)}>
      <FileTypeTile kind={file.kind} size={34} />
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-medium text-[#19202f] truncate leading-tight">{file.name}</span>
        <span className="text-[11px] text-[#818ea9] truncate leading-tight mt-0.5">{file.meta ?? v.label} · {file.size}</span>
      </div>
      <div className="ml-1 opacity-0 group-hover/chip:opacity-100 transition-opacity flex items-center">
        <ActionBtn title="Download" onClick={() => on.onDownload(file)}><Download size={13} /></ActionBtn>
      </div>
    </div>
  );
};

/** Inline image thumbnail with expand-on-hover overlay. */
const InlineImage = ({ file, on }: { file: ChatFile; on: FileActionHandlers }) => (
  <button type="button" onClick={() => on.onExpand(file)}
    className="group/img relative block rounded-xl overflow-hidden shrink-0"
    style={{ width: 148, height: 108, border: '1px solid #e9e9eb', backgroundImage: file.gradient, backgroundColor: '#E8ECF2', backgroundSize: 'cover' }}>
    <span className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors" />
    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/90 text-[#19202f]"><Maximize2 size={14} /></span>
    </span>
    <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white bg-black/45 truncate max-w-[130px]">{file.name}</span>
  </button>
);

/**
 * Inline files attached to a message. `align` follows the bubble (user = right).
 * Renders images as thumbnails and documents as chips.
 */
export const InlineFiles = ({ files, on, align = 'left', showOrigin = false }: {
  files: ChatFile[]; on: FileActionHandlers; align?: 'left' | 'right'; showOrigin?: boolean;
}) => {
  if (!files.length) return null;
  const images = files.filter(f => f.kind === 'image');
  const docs = files.filter(f => f.kind !== 'image');
  return (
    <div className={`flex flex-col gap-2 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      {showOrigin && <OriginTag origin={files[0].origin} />}
      {images.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
          {images.map(f => <InlineImage key={f.id} file={f} on={on} />)}
        </div>
      )}
      {docs.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
          {docs.map(f => <InlineChip key={f.id} file={f} on={on} />)}
        </div>
      )}
    </div>
  );
};

// ─── Drag-and-drop upload modal ────────────────────────────────────────────────

interface StagedUpload { id: string; name: string; kind: FileKind; size: string; progress: number }

const STAGE_PRESET: Omit<StagedUpload, 'id' | 'progress'>[] = [
  { name: 'quarterly-metrics.xlsx', kind: 'sheet', size: '284 KB' },
  { name: 'competitive-brief.pdf', kind: 'pdf', size: '1.2 MB' },
];

export const UploadModal = ({ open, onClose, onComplete }: {
  open: boolean; onClose: () => void; onComplete: (files: ChatFile[]) => void;
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [staged, setStaged] = useState<StagedUpload[]>([]);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    if (!open) { setStaged([]); setDragOver(false); timers.current.forEach(clearInterval); timers.current = []; }
    return () => { timers.current.forEach(clearInterval); timers.current = []; };
  }, [open]);

  // Simulate an upload: add staged rows and tick their progress up.
  const simulate = () => {
    const items: StagedUpload[] = STAGE_PRESET.map((p, i) => ({ ...p, id: `up-${Date.now()}-${i}`, progress: 0 }));
    setStaged(prev => [...prev, ...items]);
    items.forEach(item => {
      const t = setInterval(() => {
        setStaged(prev => prev.map(s => s.id === item.id ? { ...s, progress: Math.min(100, s.progress + 12 + Math.round(item.name.length % 7)) } : s));
      }, 220);
      timers.current.push(t);
    });
  };

  const allDone = staged.length > 0 && staged.every(s => s.progress >= 100);

  const commit = () => {
    onComplete(staged.map(s => ({ id: `f-${s.id}`, name: s.name, kind: s.kind, size: s.size, origin: 'user', meta: KIND_VISUAL[s.kind].label, date: 'Just now' })));
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6" style={{ background: 'rgba(15,18,28,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}
        style={{ border: '1px solid #e9e9eb' }}>
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-semibold text-[#19202f]">Add files</h2>
            <p className="text-[12px] text-[#818ea9]">Attach documents or images to this conversation.</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-[#818ea9] hover:bg-[#F0F0F3] transition-colors"><X size={16} /></button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3">
          <button type="button"
            onClick={simulate}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); simulate(); }}
            className="flex flex-col items-center justify-center gap-2 rounded-xl py-8 px-4 transition-colors text-center"
            style={{
              border: `1.5px dashed ${dragOver ? ACCENT : '#D1DAEB'}`,
              background: dragOver ? ACCENT_TINT : '#FAFBFC',
            }}>
            <span className="flex items-center justify-center w-11 h-11 rounded-full" style={{ background: dragOver ? ACCENT_MUTED : '#F0F1F4' }}>
              <UploadCloud size={20} style={{ color: dragOver ? ACCENT_TEXT : '#818ea9' }} />
            </span>
            <span className="text-[13px] text-[#19202f]"><span style={{ color: ACCENT_TEXT, fontWeight: 600 }}>Click to upload</span> or drag and drop</span>
            <span className="text-[11px] text-[#818ea9]">PDF, DOCX, XLSX, PNG, JPG · up to 25 MB</span>
          </button>

          {staged.length > 0 && (
            <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto">
              {staged.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ border: '1px solid #e9e9eb' }}>
                  <FileTypeTile kind={s.kind} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-medium text-[#19202f] truncate">{s.name}</span>
                      <span className="text-[11px] text-[#818ea9] shrink-0">{s.progress >= 100 ? s.size : `${s.progress}%`}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: '#EDEEF1' }}>
                      <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${s.progress}%`, background: s.progress >= 100 ? '#1A7F37' : ACCENT }} />
                    </div>
                  </div>
                  {s.progress >= 100
                    ? <Check size={15} className="shrink-0" style={{ color: '#1A7F37' }} />
                    : <button type="button" onClick={() => setStaged(prev => prev.filter(x => x.id !== s.id))} className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[#818ea9] hover:bg-[#F0F0F3]"><X size={13} /></button>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#F0F1F4]">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md text-[13px] font-medium text-[#19202f] border border-[#D1DAEB] bg-white hover:bg-[#F5F5F8] transition-colors">Cancel</button>
          <button type="button" disabled={!allDone} onClick={commit}
            className="h-9 px-4 rounded-md text-[13px] font-medium text-white transition-opacity"
            style={{ background: ACCENT, opacity: allDone ? 1 : 0.45 }}>
            Add {staged.length > 0 ? `${staged.length} file${staged.length > 1 ? 's' : ''}` : 'files'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Full-screen lightbox ───────────────────────────────────────────────────────

export const Lightbox = ({ file, onClose, onDownload }: { file: ChatFile | null; onClose: () => void; onDownload: (f: ChatFile) => void }) => {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    setZoom(1);
    if (!file) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [file, onClose]);
  if (!file) return null;
  const isImage = file.kind === 'image';
  const v = KIND_VISUAL[file.kind];
  return (
    <div className="fixed inset-0 z-[1300] flex flex-col" style={{ background: 'rgba(9,11,16,0.92)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 h-14 shrink-0 text-white/90">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-medium truncate">{file.name}</span>
          <span className="text-[12px] text-white/50 shrink-0">{file.meta ?? v.label} · {file.size}</span>
          <span className="shrink-0"><OriginTag origin={file.origin} /></span>
          {file.thread && <span className="text-[12px] text-white/40 shrink-0 hidden sm:inline">· {file.thread}</span>}
        </div>
        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <button type="button" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"><ZoomOut size={16} /></button>
              <span className="text-[12px] w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"><ZoomIn size={16} /></button>
              <span className="w-px h-5 bg-white/15 mx-1.5" />
            </>
          )}
          <button type="button" onClick={() => onDownload(file)} className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] hover:bg-white/10 transition-colors"><Download size={15} /> Download</button>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors ml-1"><X size={18} /></button>
        </div>
      </div>
      {/* Stage */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-8" onClick={onClose}>
        {isImage ? (
          <div className="rounded-lg shadow-2xl transition-transform" onClick={e => e.stopPropagation()}
            style={{ width: 'min(70vw, 900px)', height: 'min(70vh, 620px)', backgroundImage: file.gradient, backgroundColor: '#2a2d36', backgroundSize: 'cover', backgroundPosition: 'center', transform: `scale(${zoom})` }} />
        ) : (
          // Document preview mock: a "page" sheet with the type glyph + faux text lines.
          <div className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()} style={{ width: 'min(60vw, 680px)', height: 'min(78vh, 760px)' }}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[#EDEEF1]">
              <FileTypeTile kind={file.kind} size={36} />
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-[#19202f]">{file.name}</span>
                <span className="text-[12px] text-[#818ea9]">{file.meta ?? v.label}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-3">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-3 rounded" style={{ background: i % 5 === 0 ? '#E8ECF2' : '#F1F2F5', width: `${[100, 92, 96, 70, 88, 60, 94, 82, 98, 74, 90, 66, 86, 50][i]}%` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Shared single-line file row for the grouped-sections file view.
// A selection checkbox sits in the left gutter (shown on hover, or always once
// any file is selected) without shifting the file icon's x-position.
const TreeFile = ({ file, on, pad = 8, slot = false, selected = false, onToggleSelect, showCheckbox = false }: {
  file: ChatFile; on: FileActionHandlers; pad?: number; slot?: boolean; selected?: boolean; onToggleSelect?: () => void; showCheckbox?: boolean;
}) => {
  const v = KIND_VISUAL[file.kind];
  return (
    <div className={`group relative flex items-center gap-2.5 h-9 rounded-md cursor-pointer pr-2 transition-colors ${selected ? '' : 'hover:bg-[#F5F5F8]'}`}
      style={{ paddingLeft: pad, background: selected ? ACCENT_TINT : undefined }} onClick={() => on.onExpand(file)}>
      {onToggleSelect && (
        <button type="button" onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          className={`absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded border items-center justify-center transition-colors ${(showCheckbox || selected) ? 'flex' : 'hidden group-hover:flex'}`}
          style={{ borderColor: selected ? ACCENT : '#CBD3E1', background: selected ? ACCENT : '#fff' }}>
          {selected && <Check size={11} className="text-white" />}
        </button>
      )}
      {slot && <span className="w-3.5 shrink-0" />}
      {file.kind === 'image' ? <ImageThumb file={file} size={22} radius={5} /> : <FileTypeTile kind={file.kind} size={22} />}
      <span className="text-[13px] font-medium text-[#19202f] truncate shrink min-w-0">{file.name}</span>
      <span className="text-[11px] text-[#818ea9] truncate shrink-0 hidden sm:inline">{file.meta ?? v.label} · {file.size}</span>
      <span className="ml-auto shrink-0 group-hover:hidden"><OriginTag origin={file.origin} /></span>
      <div className="ml-auto hidden group-hover:flex shrink-0"><RowActions file={file} on={on} /></div>
    </div>
  );
};

const FolderGlyph = ({ size = 16 }: { size?: number }) => <Folder size={size} className="shrink-0 text-[#7C89A0]" style={{ fill: '#DCE3EE' }} />;

// ── Grouped collapsible sections, one per folder (Claude-style file panel) ──
// `query` filters files by name; sections with no matches are hidden.
const TreeSections = ({ files, folders, query = '', on, selected, onToggleSelect }: {
  files: ChatFile[]; folders: FileFolder[]; query?: string; on: FileActionHandlers;
  selected?: Set<string>; onToggleSelect?: (id: string) => void;
}) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const mf = (f: ChatFile) => f.name.toLowerCase().includes(query.toLowerCase());
  const anySelected = (selected?.size ?? 0) > 0;

  // Depth-first folder order, then keep only groups that hold matching files.
  const order: (string | null)[] = [null];
  const walk = (parentId: string | null) => folderChildren(folders, parentId).forEach(f => { order.push(f.id); walk(f.id); });
  walk(null);
  const groups = order.map(id => ({ id, files: filesInFolder(files, id).filter(mf) })).filter(g => g.files.length > 0);
  const label = (id: string | null) => id === null ? 'Files (root)' : folderPath(folders, id).map(f => f.name).join(' / ');

  if (groups.length === 0) return <p className="text-center text-[13px] text-[#818ea9] py-10">{query ? 'No files match your search.' : 'No files.'}</p>;

  return (
    <div className="flex flex-col gap-4">
      {groups.map(g => {
        const key = g.id ?? '__root';
        const open = !collapsed.has(key);
        return (
          <section key={key}>
            {/* Header: px-2 + 14px chevron + gap-2.5 lands the folder glyph at x=30,
                matching TreeFile's pad so file icons align under folder icons. */}
            <button type="button" onClick={() => toggle(key)}
              className="flex items-center gap-2.5 w-full h-8 rounded-md hover:bg-[#F5F5F8] transition-colors px-2">
              <ChevronRight size={14} className="w-3.5 shrink-0 text-[#818ea9] transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
              <span className="flex items-center justify-center w-[22px] h-[22px] shrink-0"><FolderGlyph size={16} /></span>
              <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5B6579] truncate">{label(g.id)}</span>
            </button>
            {open && <div className="mt-0.5">{g.files.map(f => (
              <TreeFile key={f.id} file={f} on={on} pad={32}
                selected={selected?.has(f.id)}
                onToggleSelect={onToggleSelect ? () => onToggleSelect(f.id) : undefined}
                showCheckbox={anySelected} />
            ))}</div>}
          </section>
        );
      })}
    </div>
  );
};

// Floating bulk-actions toolbar (matches the platform's selection pattern):
// selection count + Select all, ghost actions with icons, destructive Delete in red.
const BulkActionsBar = ({ count, allSelected, onSelectAll, onClear, onDelete }: {
  count: number; allSelected: boolean; onSelectAll: () => void; onClear: () => void; onDelete: () => void;
}) => {
  const ghost = 'flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium transition-colors';
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 pl-4 pr-2 h-12 rounded-xl bg-white"
      style={{ border: '1px solid #E6E7EC', boxShadow: '0 8px 24px rgba(15,18,28,0.14)' }}>
      <span className="text-[13px] font-medium text-[#5B6579] whitespace-nowrap">{count} file{count === 1 ? '' : 's'} selected</span>
      <button type="button" onClick={allSelected ? onClear : onSelectAll} className="text-[13px] font-medium ml-2 hover:underline" style={{ color: ACCENT_TEXT }}>
        {allSelected ? 'Deselect all' : 'Select all'}
      </button>
      <span className="w-px h-6 bg-[#ECECEF] mx-2" />
      <button type="button" className={`${ghost} text-[#19202f] hover:bg-[#F5F5F8]`}><Download size={14} /> Download</button>
      <button type="button" onClick={onDelete} className={`${ghost} text-[#DC2626] hover:bg-[#FEF2F2]`}><Trash2 size={14} /> Delete</button>
    </div>
  );
};

// ─── Full files manager — grouped-sections tree (Variants 2 in-chat tab & 3 left-nav) ───

export const FilesManager = ({ files, folders, on, onUpload }: { files: ChatFile[]; folders: FileFolder[]; on: FileActionHandlers; onUpload: () => void }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const matching = files.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
  const allSelected = matching.length > 0 && matching.every(f => selected.has(f.id));
  const selectAll = () => setSelected(new Set(matching.map(f => f.id)));
  const clearSel = () => setSelected(new Set());
  const deleteSelected = () => { matching.filter(f => selected.has(f.id)).forEach(on.onRemove); setSelected(new Set()); };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-white">
      <div className="max-w-[900px] w-full mx-auto px-8 pt-10 pb-6 flex flex-col gap-5 flex-1 min-h-0">
        <div className="flex flex-col gap-0.5 shrink-0">
          <h1 className="text-[20px] font-semibold text-[#19202f]">Files</h1>
          <span className="text-[12px] text-[#9CA3AF]">Every file shared with this agent, across all conversations</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 h-9 px-2.5 rounded-md flex-1 max-w-[320px]" style={{ border: '1px solid #e9e9eb', background: '#fff' }}>
            <Search size={14} className="text-[#818ea9] shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search files…" className="flex-1 min-w-0 text-[13px] bg-transparent outline-none text-[#19202f] placeholder:text-[#9CA3AF]" />
          </div>
          <button type="button" onClick={onUpload} className="ml-auto flex items-center gap-2 h-9 px-3.5 rounded-md text-[13px] font-medium text-white transition-opacity hover:opacity-90 shrink-0" style={{ background: ACCENT }}><Plus size={15} /> Add files</button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pb-24">
          <TreeSections files={files} folders={folders} query={query} on={on} selected={selected} onToggleSelect={toggleSelect} />
        </div>
      </div>

      {selected.size > 0 && (
        <BulkActionsBar count={selected.size} allSelected={allSelected} onSelectAll={selectAll} onClear={clearSel} onDelete={deleteSelected} />
      )}
    </div>
  );
};
