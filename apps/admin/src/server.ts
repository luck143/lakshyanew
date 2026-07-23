// apps/admin/src/server.ts
// Served admin UI. Server-renders a metadata-driven admin with modern UX:
// advanced filters, global search, sortable tables, bulk actions, inline quick
// actions, and polished forms. All query/CRUD goes through the API app via
// in-process inject. No per-resource code.

import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { app as apiApp } from '@lakshya/api/src/server.js';
import { signToken } from '@lakshya/api/src/auth.js';

const ADMIN_USER = {
  uid: 'admin-1',
  tenantId: process.env.ADMIN_TENANT ?? 'default',
  role: 'network' as const,
  permissions: ['role_superadmin'],
  status: 'active' as const,
};
const TOKEN = signToken(ADMIN_USER);

export interface AdminSurface {
  role: 'network' | 'publisher';
  token?: string;
  title: string;
  basePath: string;
}

async function apiFor(token: string) {
  return async (method: any, url: string, body?: any): Promise<any> => {
    const res = await apiApp.inject({
      method,
      url,
      headers: { authorization: 'Bearer ' + token },
      payload: body,
    } as any);
    return (res as any).json();
  };
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function escAttr(s: string): string {
  return escapeHtml(s);
}

// helpers
const n = (v: any) => (v == null ? '' : String(v));
const qs = (obj: Record<string, any>, ignoreEmpty = true) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (ignoreEmpty && (v === '' || v == null)) continue;
    q.set(k, String(v));
  }
  return q;
};

const STYLE = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}
:root{
  --neu-bg:#e8ecf1;--neu-ink:#0f172a;--neu-muted:#475569;--neu-line:#e2e8f0;--neu-line-2:#cbd5e1;
  --teal:#0d9488;--teal-2:#14b8a6;--teal-soft:#ccfbf1;--teal-ink:#134e4a;
  --orange:#d97706;--orange-2:#f59e0b;--orange-soft:#fef3c7;--orange-ink:#78350f;
  --green:#16a34a;--green-2:#22c55e;--green-soft:#dcfce7;--green-ink:#14532d;--text:#0f172a;--accent:#6366f1;
  --radius:18px;--radius-sm:14px;
  color-scheme: light;
}
[data-theme="dark"], .dark { color-scheme: dark; }
:root[data-theme="dark"], .dark {
  --neu-bg:#0f172a;--neu-ink:#f1f5f9;--neu-muted:#94a3b8;--neu-line:#1e293b;--neu-line-2:#334155;
  --teal:#14b8a6;--teal-2:#2dd4bf;--teal-soft:#042f2e;--teal-ink:#ccfbf1;
  --orange:#f59e0b;--orange-2:#fbbf24;--orange-soft:#451a03;--orange-ink:#fef3c7;
  --green:#22c55e;--green-2:#4ade80;--green-soft:#052e16;--green-ink:#dcfce7;
}

/* Layout/sidebar */
html,body{margin:0;padding:0}
body{background:var(--neu-bg);color:var(--neu-ink);font-family:'Inter',system-ui,sans-serif;font-size:13.5px;line-height:1.45}
.layout{display:grid;grid-template-columns:256px 1fr;min-height:100vh;background:var(--neu-bg)}
.side{background:#ffffff;color:#334155;padding:16px 12px;position:sticky;top:0;height:100vh;overflow:auto;border-right:1px solid var(--neu-line);box-shadow:6px 0 24px rgba(13,148,136,.08)}
.brand{display:flex;align-items:center;gap:10px;padding:2px 6px 14px;font-weight:800;color:#0f172a;font-size:14px}
.brand .dot{width:10px;height:10px;border-radius:50%;background:var(--teal);box-shadow:0 0 0 3px rgba(13,148,136,.25)}
.nav-grp{margin:18px 0 6px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--neu-muted);padding:0 10px;font-weight:800}
.nav a{display:flex;align-items:center;gap:10px;color:#334155;text-decoration:none;padding:10px 12px;border-radius:12px;margin:2px 0;font-weight:600;transition:all .15s;border:1px solid transparent;font-size:13px}
.nav a:hover{background:#f8fafc;color:#0f172a;border-color:var(--neu-line)}
.nav a.active{background:linear-gradient(180deg,#f0fdfa,#e6f7ff);color:#0f172a;border-color:rgba(13,148,136,.3);box-shadow:0 4px 12px rgba(13,148,136,.12)}
.nav .ic{width:18px;height:18px;opacity:.85;flex:none}

/* Main shell */
.main{padding:20px 22px 60px}
.topbar{position:sticky;top:0;z-index:5;background:rgba(232,236,241,.85);backdrop-filter:saturate(140%) blur(12px);border-bottom:1px solid var(--neu-line);margin:-20px -22px 18px;padding:14px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.topbar h1{margin:0;font-size:18px;font-weight:800;letter-spacing:-.2px;color:#0f172a}
.topbar .sub{color:var(--neu-muted);font-size:12px;margin-top:2px;font-weight:500}
.topbar .r{margin-left:auto;display:flex;align-items:center;gap:8px}
.search{padding:10px 12px;border:1px solid var(--neu-line-2);border-radius:var(--radius-sm);background:#ffffff;color:var(--neu-ink);min-width:240px;font:inherit;box-shadow:0 2px 8px rgba(15,23,41,.06);transition:border-color .15s,box-shadow .15s}
.search:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 4px rgba(13,148,136,.15)}

/* Cards */
.card{background:#ffffff;border:1px solid var(--neu-line);border-radius:var(--radius);padding:16px;box-shadow:0 12px 30px rgba(15,23,41,.08);transition:transform .1s, box-shadow .2s}
.card:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(15,23,41,.12)}
.card + .card{margin-top:10px}

/* Filter panel */
.filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end;margin-bottom:12px;background:#ffffff;padding:14px;border-radius:var(--radius);border:1px solid var(--neu-line);box-shadow:0 8px 24px rgba(15,23,41,.07)}
.filters .f{display:flex;flex-direction:column;gap:4px}
.filters label{font-size:10px;font-weight:700;color:var(--neu-muted);text-transform:uppercase;letter-spacing:.06em}
.filters input,.filters select{padding:9px 10px;border:1px solid var(--neu-line-2);border-radius:var(--radius-sm);font:inherit;background:#f8fafc;color:var(--neu-ink);box-shadow:inset 0 1px 2px rgba(15,23,41,.06);transition:border-color .15s,box-shadow .15s}
.filters input:focus,.filters select:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 4px rgba(13,148,136,.15)}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(180deg,var(--teal-2),var(--teal));color:#fff;border:0;padding:8px 14px;border-radius:var(--radius-sm);font-weight:700;cursor:pointer;font-size:12px;box-shadow:0 6px 18px rgba(13,148,136,.25);transition:transform .1s,box-shadow .18s}
.btn:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(13,148,136,.32)}
.btn:active{transform:translateY(0);box-shadow:inset 0 2px 4px rgba(0,0,0,.15)}
.btn.sec{background:#ffffff;color:#0f172a;border:1px solid var(--neu-line-2);box-shadow:0 4px 14px rgba(15,23,41,.1)}
.btn.sec:hover{background:#f8fafc;box-shadow:0 8px 20px rgba(15,23,41,.14)}
.btn.sec:active{box-shadow:inset 0 2px 4px rgba(15,23,41,.08)}
.btn.danger{background:linear-gradient(180deg,#f87171,#ef4444);box-shadow:0 6px 18px rgba(239,68,68,.25)}
.btn.danger:hover{box-shadow:0 10px 22px rgba(239,68,68,.32)}
.btn.sm{padding:5px 10px;font-size:11px;border-radius:9px}

/* Tables */
table{border-collapse:separate;border-spacing:0;width:100%;overflow:hidden;border-radius:var(--radius-sm);background:#ffffff;border:1px solid var(--neu-line);box-shadow:0 8px 24px rgba(15,23,41,.07)}
th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--neu-line);font-size:13px;vertical-align:middle}
th{background:#f1f5f9;color:#334155;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;user-select:none;border-bottom:2px solid #e2e8f0}
th a{color:inherit;text-decoration:none}
th a:hover{color:var(--teal)}
th .arr{color:var(--teal);font-size:10px;margin-left:2px}
tr:hover td{background:#f8fafc;box-shadow:inset 0 0 0 1px rgba(13,148,136,.1)}
tr:last-child td{border-bottom:0}

/* Badges */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid transparent}
.badge.ok{background:var(--green-soft);color:var(--green-ink);border-color:rgba(34,197,94,.25);box-shadow:0 4px 12px rgba(34,197,94,.15)}
.badge.warn{background:var(--orange-soft);color:var(--orange-ink);border-color:rgba(245,158,11,.25);box-shadow:0 4px 12px rgba(245,158,11,.15)}
.badge.danger{background:#fef2f2;color:#991b1b;border-color:rgba(239,68,68,.2);box-shadow:0 4px 12px rgba(239,68,68,.12)}
.badge.default{background:#f1f5f9;color:#334155;border-color:rgba(15,23,41,.08);box-shadow:0 4px 12px rgba(15,23,41,.06)}
.bool{font-weight:700}
.bool.y{color:var(--green)}.bool.n{color:var(--orange)}

/* Actions */
a.lnk{color:var(--teal);text-decoration:none;font-weight:700;font-size:13px}
a.lnk:hover{text-decoration:underline;color:var(--teal-2)}
.actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}

/* Forms */
form label{display:block;margin:8px 0 4px;font-weight:700;color:#334155;font-size:12px;letter-spacing:.08px;text-transform:uppercase}
input,select,textarea{width:100%;padding:9px 10px;border:1px solid var(--neu-line-2);border-radius:var(--radius-sm);font:inherit;background:#ffffff;color:#0f172a;box-shadow:0 1px 2px rgba(15,23,41,.06);transition:border-color .15s,box-shadow .15s;font-size:13px}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 4px rgba(13,148,136,.15)}
textarea{min-height:110px;resize:vertical}
form .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field{margin-bottom:10px}
.field .help{color:var(--neu-muted);font-size:11.5px;margin-top:3px;font-weight:500}
.errors{color:#dc2626;font-size:11.5px;margin-top:3px}

/* Bulk bar */
.bulkbar{display:flex;gap:8px;align-items:center;margin:0 0 12px;padding:10px 12px;background:#ffffff;border:1px solid var(--neu-line);border-radius:var(--radius-sm);box-shadow:0 8px 20px rgba(15,23,41,.07)}
.bulkbar .selinfo{margin-left:auto;color:var(--neu-muted);font-size:11.5px;font-weight:700}

/* Quick create */
.quick-create{margin:0 0 12px;padding:14px;background:#ffffff;border:1px solid var(--neu-line);border-radius:var(--radius);border-left:4px solid var(--teal);box-shadow:0 12px 30px rgba(13,148,136,.1)}
.quick-create .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
[data-theme="dark"] .quick-create{background:#0b1220;border-color:#1e293b}
[data-theme="dark"] .quick-create input,[data-theme="dark"] .quick-create textarea,[data-theme="dark"] .quick-create select{background:#0f172a;color:#f1f5f9;border-color:#334155}
[data-theme="dark"] .card,[data-theme="dark"] .filters,[data-theme="dark"] .bulkbar,[data-theme="dark"] .col-toggle .chip,[data-theme="dark"] .stat,[data-theme="dark"] table{background:#0b1220;border-color:#1e293b}
[data-theme="dark"] .nav a:hover{background:#0f172a}

/* Column toggle */
.col-toggle{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.col-toggle .chip{cursor:pointer;user-select:none;background:#ffffff;border:1px solid var(--neu-line);box-shadow:0 4px 12px rgba(15,23,41,.06)}
.col-toggle .chip.hidden-col{opacity:.55;text-decoration:line-through}

/* Pager / empty */
.pager{display:flex;gap:8px;align-items:center;margin-top:12px;color:var(--neu-muted);font-weight:600;font-size:12px}
.empty{color:var(--neu-muted);padding:40px;text-align:center;font-weight:600}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#ffffff;color:#334155;border:1px solid var(--neu-line);box-shadow:0 4px 12px rgba(15,23,41,.06)}
.chip a{color:#334155;text-decoration:none;opacity:.8}
.chip a:hover{opacity:1}
.header-actions{display:flex;align-items:center;gap:8px}
.section{margin-bottom:14px}
.section h2{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.08px;color:var(--neu-muted);font-weight:700}

/* Stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0 14px}
.stat{background:#ffffff;border:1px solid var(--neu-line);border-radius:var(--radius-sm);padding:12px 14px;box-shadow:0 10px 24px rgba(15,23,41,.08);border-top:3px solid var(--teal);transition:transform .12s ease,box-shadow .2s ease}
.stat:hover{transform:translateY(-1px);box-shadow:0 14px 32px rgba(15,23,41,.12)}
.stat .lbl{font-size:10px;font-weight:700;color:var(--neu-muted);text-transform:uppercase;letter-spacing:.06em}
.stat .val{font-size:20px;font-weight:800;margin-top:2px;color:#0f172a}
.stat .sub{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.stat .chip{background:#f1f5f9;color:#334155;box-shadow:0 2px 8px rgba(15,23,41,.05)}

/* Small actions */
.sm{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:9px;font-weight:700;font-size:11px;border:1px solid var(--neu-line);cursor:pointer;color:#334155;background:#ffffff;text-decoration:none;box-shadow:0 4px 12px rgba(15,23,41,.06);transition:transform .1s,box-shadow .15s}
.sm:hover{background:#f8fafc;box-shadow:0 8px 20px rgba(15,23,41,.1);transform:translateY(-1px)}
.sm.danger{color:#991b1b;background:#fff1f2}
.sm.danger:hover{background:#fee2e2}

/* Polish: constrain long text columns, align headers, stronger bulk delete */
td[data-col="title"]{max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
th a{display:inline-flex;align-items:center;gap:2px;white-space:nowrap}
th{text-align:left}
.bulkbar .btn.danger{background:linear-gradient(180deg,#f87171,#ef4444);color:#fff;border:0}
.bulkbar{position:sticky;top:64px;z-index:4}
.quick-create .row{align-items:end}

/* Form groups (ui.group) */
.form-group{background:#fff;border:1px solid var(--neu-line);border-radius:var(--radius);padding:14px 16px;margin-bottom:14px;box-shadow:0 8px 24px rgba(15,23,41,.06)}
.form-group > h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--neu-muted);font-weight:800;border-bottom:1px solid var(--neu-line);padding-bottom:8px}
[data-theme="dark"] .form-group{background:#0b1220;border-color:#1e293b}
[data-theme="dark"] .form-group > h3{border-color:#1e293b}

.menu{display:none;position:absolute;right:0;top:28px;background:#ffffff;border:1px solid var(--neu-line);border-radius:var(--radius-sm);box-shadow:0 12px 34px rgba(15,23,41,.12);min-width:160px;z-index:20;padding:4px}
.menu.show{display:block}
.menu a,.menu form{display:flex;width:100%}
.menu a{padding:7px 9px;color:#0f172a;text-decoration:none;border-radius:8px;font-size:12px;font-weight:600}
.menu a:hover{background:#f1f5f9}
.menu button{width:100%;justify-content:flex-start;background:transparent;color:#991b1b;border:none;font-size:12px}
.menu button:hover{background:#fee2e2}

/* UX extras */
.theme-toggle{margin-left:auto}
.backdrop{position:fixed;inset:0;background:rgba(15,23,41,.25);opacity:0;pointer-events:none;transition:opacity .2s;z-index:40}
.backdrop.open{opacity:1;pointer-events:auto}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,100vw);background:#ffffff;border-left:1px solid var(--neu-line);box-shadow:0 20px 50px rgba(15,23,41,.18);transform:translateX(100%);transition:transform .25s;z-index:50;overflow:auto;padding:14px}
.drawer.open{transform:translateX(0)}
.toast{position:fixed;left:50%;transform:translateX(-50%) translateY(20px);bottom:14px;background:#0f172a;color:#fff;padding:10px 16px;border-radius:var(--radius-sm);box-shadow:0 12px 34px rgba(0,0,0,.18);z-index:60;opacity:0;transition:all .25s;font-size:13px}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}

@media (max-width: 980px) {
  .layout{grid-template-columns:1fr}
  .side{display:none}
  .topbar .r{width:100%;margin-left:0}
}
`;
function renderShell(sidebarHtml: string, contentHtml: string, activePath = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lakshya Admin</title>
<style>${STYLE}</style></head>
<body><div class="layout">
<aside class="side"><div class="brand"><span class="dot"></span>Lakshya</div><nav class="nav">{{SIDEBAR}}</nav>
<div style="margin-top:auto;padding:14px 8px;border-top:1px solid rgba(255,255,255,.08);color:#64748b;font-size:11.5px;font-weight:500">Admin · ${escapeHtml(surfaceTitle)}</div></aside>
<main class="main">{{CONTENT}}</main></div>
<script>window.__RESOURCE__ = ${JSON.stringify({ path: '', name: '', cols: [], fields: [], listFields: {}, createFields: {}, updateFields: {} })};</script>
<script src="/admin.js"></script></body></html>`
    .replace('{{SIDEBAR}}', sidebarHtml)
    .replace('{{CONTENT}}', contentHtml);
}

let surfaceTitle = 'Lakshya Admin';
function renderStatsCards(total: number, rows: any[], meta: any): string {
  const statusField = meta.fields?.list?.status ?? meta.fields?.create?.status;
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const k = statusField ? String(r[statusField.key ?? 'status'] ?? 'unknown') : 'all';
    counts[k] = (counts[k] || 0) + 1;
  }
  const countsHtml = buildPillsHtml(counts);
  return `<div class="stats">
    <div class="stat" style="border-top:3px solid var(--accent)">
      <div class="lbl">Total ${escapeHtml(meta.labelPlural ?? meta.label)}</div>
      <div class="val">${total}</div>
      ${countsHtml ? `<div class="sub">${countsHtml}</div>` : ''}
    </div>
  </div>`;
}

function buildPillsHtml(counts: Record<string, number>): string {
  const accentMap: Record<string, string> = { active: 'ok', Active: 'ok', hidden: 'warn', Hidden: 'warn', inactive: 'danger', Inactive: 'danger', disabled: 'danger', 'out of stock': 'warn' };
  const pills = Object.entries(counts)
    .map(([k, v]) => {
      const cls = accentMap[k.toLowerCase()] ? `badge ${accentMap[k.toLowerCase()]}` : 'badge';
      return `<span class="chip" style="padding:3px 8px"><span class="${cls}" style="padding:2px 8px;font-size:11px">${escapeHtml(k)}</span> <span style="font-weight:700">${v}</span></span>`;
    })
    .join('');
  return pills;
}

function renderStatsPresetCounts(meta: any, rows: any[]): string { return buildPillsHtml((() => {
  const statusField = meta.fields?.list?.status ?? meta.fields?.create?.status;
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const k = statusField ? String(r[statusField.key ?? 'status'] ?? 'unknown') : 'all';
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
})()); }
function renderSidebar(nav: any[], _basePath: string, activePath = ''): string {
  const ICONS: Record<string, string> = { users: '👤', roles: '🛡', topics: '🏷', 'blog-posts': '📝', products: '📦', orders: '🧾', coupons: '🎟', media: '🖼', settings: '⚙', questions: '❓', exams: '📋', notes: '📚', 'live-classes': '🎥', videos: '🎬', invoices: '💳', tickets: '🎫', staff: '👥', domains: '🌐', modules: '🧩', subscribers: '📬', events: '📅', notices: '📢', publishers: '🏢' };
  const navHtml = nav
    .map(
      (sec) =>
        `<div class="nav-grp">${escapeHtml(sec.group)}</div>` +
        sec.items
          .map((i: any) => {
            const active = activePath === `/${i.name}` || activePath.startsWith(`/${i.name}/`) ? ' active' : '';
            const ic = ICONS[i.name] || '◈';
            return `<a class="navlink${active}" href="${i.href}"><span class="ic">${ic}</span><span>${escapeHtml(i.label)}</span></a>`;
          })
          .join(''),
    )
    .join('');
  const builderActive = activePath.startsWith('/_builder') ? ' active' : '';
  const builderHtml = `<div class="nav-grp">Builder</div>
    <a class="navlink${builderActive}" href="/_builder"><span class="ic">🛠</span><span>Resource Builder</span></a>`;
  return navHtml + builderHtml;
}

// ---- value formatting -------------------------------------------------------
function formatCell(fieldType: string | undefined, val: any, field?: any): string {
  const ui = field?.ui ?? {};
  const render = ui.render ?? null;
  const empty = '<span style="color:var(--muted)">—</span>';
  if (val === null || val === undefined || val === '') return empty;

  // Explicit display hints take precedence over type-based defaults.
  if (render === 'badge') {
    const label = field?.options ? (field.options[String(val)] ?? String(val)) : String(val);
    const cls = String(val).toLowerCase();
    const badgeClass = ['active', 'published', 'ok', 'paid', 'done'].includes(cls) ? 'badge ok'
      : ['inactive', 'hidden', 'disabled', 'banned', 'unpaid', 'failed', 'cancelled'].includes(cls) ? 'badge danger'
      : ['pending', 'draft', 'archived', 'out_of_stock', 'review'].includes(cls) ? 'badge warn' : 'badge';
    return `<span class="${badgeClass}">${escapeHtml(label)}</span>`;
  }
  if (render === 'boolean' || fieldType === 'bool' || fieldType === 'boolean') {
    const b = val === true || val === 'true' || val === 1 || val === '1';
    return `<span class="bool ${b ? 'y' : 'n'}">${b ? '✓ Yes' : '✕ No'}</span>`;
  }
  if (render === 'currency') {
    const num = Number(val);
    if (!isNaN(num)) {
      const sym = ui.currency ?? '₹';
      const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(num) ? 0 : 2, maximumFractionDigits: 2 });
      return `<span class="mono">${escapeHtml(sym)}${formatted}</span>`;
    }
  }
  if (render === 'color') {
    const c = String(val);
    return `<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:4px;background:${escapeHtml(c)};border:1px solid var(--neu-line-2);display:inline-block"></span>${escapeHtml(c)}</span>`;
  }
  if (render === 'link') {
    const href = (ui.href ?? String(val)).replace(/\{[^}]*\}/g, () => String(val));
    const external = /^https?:\/\//.test(href);
    return `<a class="lnk" href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noopener"' : ''}>${escapeHtml(String(val))}</a>`;
  }
  if (render === 'avatar') {
    const src = String(val);
    return `<span style="display:inline-flex;align-items:center;gap:6px"><img src="${escapeHtml(src)}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1px solid var(--neu-line-2)" onerror="this.style.display='none'">${escapeHtml(String(val))}</span>`;
  }
  if (render === 'datetime' || fieldType === 'date' || fieldType === 'datetime') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return `<span class="mono">${escapeHtml(d.toLocaleString())}</span>`;
  }
  if (render === 'json' || (val && typeof val === 'object')) {
    const j = JSON.stringify(val);
    return `<span class="mono">${escapeHtml(j.slice(0, 60))}${j.length > 60 ? '…' : ''}</span>`;
  }
  if (fieldType === 'enum' && field?.options) {
    const label = field.options[String(val)] ?? String(val);
    const cls = String(val).toLowerCase();
    const badgeClass = ['active', 'published', 'ok'].includes(cls) ? 'badge ok' : ['inactive', 'hidden', 'disabled', 'banned'].includes(cls) ? 'badge danger' : 'badge';
    return `<span class="${badgeClass}">${escapeHtml(label)}</span>`;
  }
  const s = String(val);
  return escapeHtml(s.length > 80 ? s.slice(0, 80) + '…' : s);
}

// ---- relation options ------------------------------------------------------
async function relationOptions(api: (m: string, u: string) => Promise<any>, field: any): Promise<{ value: string; label: string }[]> {
  const ref = field.options as any;
  if (!ref || !ref.resource) return [];
  try {
    const res = await api('GET', `/api/${ref.resource}?limit=200`);
    const rows = res.data?.data ?? [];
    const labelField = ref.labelField ?? 'name';
    return rows.map((r: any) => ({ value: String(r.id), label: String(r[labelField] ?? r.id) }));
  } catch {
    return [];
  }
}

// ---- filters ---------------------------------------------------------------
async function renderFilters(meta: any, api: any, current: Record<string, any>, presetChipsHtml = '', q: any = {}): Promise<string> {
  const filters: string[] = meta.filters ?? [];
  if (!filters.length) return '';

  const listFields = meta.fields?.list ?? meta.fields?.get ?? {};
  const createFields = meta.fields?.create ?? {};
  const updateFields = meta.fields?.update ?? {};

  const groups: Record<string, Array<{ key: string; html: string }>> = {
    Basic: [],
    Advanced: [],
  };

  const inputs = await Promise.all(
    filters.map(async (key) => {
      const f = listFields[key] ?? createFields[key] ?? updateFields[key];
      const label = f?.label ?? key;
      const cur = current[key] != null ? String(current[key]) : '';
      let control: string;
      let hint = 'Matches exact value.';
      if (f?.type === 'enum') {
        const opts = Object.entries(f.options ?? {})
          .map(([v, l]) => `<option value="${escAttr(v)}"${cur === v ? ' selected' : ''}>${escapeHtml(String(l))}</option>`)
          .join('');
        control = `<select name="f_${escAttr(key)}"><option value="">Any</option>${opts}</select>`;
        hint = 'Filter by status type.';
      } else if (f?.type === 'relation') {
        const opts = await relationOptions(api, f);
        const o = opts.map((o) => `<option value="${escAttr(o.value)}"${cur === o.value ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('');
        control = `<select name="f_${escAttr(key)}"><option value="">Any</option>${o}</select>`;
        hint = 'Filter by related record.';
      } else if (f?.type === 'bool') {
        control = `<select name="f_${escAttr(key)}"><option value="">Any</option><option value="true"${cur === 'true' ? ' selected' : ''}>Yes</option><option value="false"${cur === 'false' ? ' selected' : ''}>No</option></select>`;
        hint = 'Yes/No filter.';
      } else if (f?.type === 'date' || f?.type === 'datetime') {
        control = `<input type="date" name="f_${escAttr(key)}" value="${escAttr(cur)}">`;
        hint = 'Use exact date.';
      } else if (f?.type === 'int' || f?.type === 'float' || f?.type === 'number') {
        control = `<input type="number" step="any" name="f_${escAttr(key)}" value="${escAttr(cur)}">`;
        hint = 'Exact number match.';
      } else {
        control = `<input type="text" name="f_${escAttr(key)}" placeholder="Filter ${escapeHtml(label)}…" value="${escAttr(cur)}">`;
        hint = 'Case-insensitive contains query.';
      }

      const helpHtml = f?.help ? `<div class="help">${escapeHtml(f.help)}</div>` : `<div class="help">${escapeHtml(hint)}</div>`;
      const group = ['id', 'name', 'title', 'slug', 'email'].includes(key) ? 'Basic' : 'Advanced';
      groups[group].push({ key, html: `<div class="f"><label>${escapeHtml(label)}</label>${control}${helpHtml}</div>` });
    }),
  );

  const chips = Object.entries(current)
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => {
      const f = listFields[k] ?? createFields[k] ?? updateFields[k];
      const val = typeof v === 'string' ? escapeHtml(v) : escapeHtml(JSON.stringify(v));
      const label = f?.label ?? k;
      const help = f?.help ? escapeHtml(f.help) : null;
      const href = `/${escAttr(meta.name)}?${qs({ ...qs(current), ['f_' + k]: '' }, true).toString()}`;
      const title = help ? ` title="${help}"` : '';
      return `<span class="chip"${title}>${escapeHtml(label)}: ${val} <a href="${href}">×</a></span>`;
    });

  const fieldOptions = Object.entries(listFields).map(([key, f]: [string, any]) => ({ value: key, label: f?.label || key }));

  const ruleRows = (() => {
    const qq = q ?? {};
    const fields = qq['fr_field[]'] ?? qq['fr_field'];
    const ops = qq['fr_op[]'] ?? qq['fr_op'];
    const values = qq['fr_value[]'] ?? qq['fr_value'];
    const values2 = qq['fr_value2[]'] ?? qq['fr_value2'];
    const fArr = Array.isArray(fields) ? fields : fields ? [fields] : [];
    const oArr = Array.isArray(ops) ? ops : ops ? [ops] : [];
    const vArr = Array.isArray(values) ? values : values ? [values] : [];
    const vArr2 = Array.isArray(values2) ? values2 : values2 ? [values2] : [];
    const items: Array<{ field: string; op: string; value: any; value2?: any }> = [];
    for (let i = 0; i < Math.max(fArr.length, oArr.length, vArr.length, vArr2.length); i += 1) {
      const field = String(fArr[i] || '').trim();
      const op = String(oArr[i] || '').trim();
      const value = vArr[i];
      const value2 = vArr2[i];
      if (!field || !op) continue;
      items.push({ field, op, value, value2 });
    }
    if (!items.length) return '';
    const esc = (s: any) => escapeHtml(String(s ?? ''));
    const opts = (sel: string, val: string) => fieldOptions.map(o => `<option value="${escAttr(o.value)}"${o.value === val ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('');
    const opOpts = (val: string) => `<option value="eq"${val==='eq'?' selected':''}>=</option><option value="neq"${val==='neq'?' selected':''}>≠</option><option value="contains"${val==='contains'?' selected':''}>contains</option><option value="gt"${val==='gt'?' selected':''}>&gt;</option><option value="gte"${val==='gte'?' selected':''}>≥</option><option value="lt"${val==='lt'?' selected':''}>&lt;</option><option value="lte"${val==='lte'?' selected':''}>≤</option><option value="between"${val==='between'?' selected':''}>between</option>`;
    return items.map((it, idx) => {
      const isBetween = it.op === 'between';
      const rule = `<div class="filter-rule" style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px">
        <select class="fr-field" name="fr_field[]" style="flex:2" onchange="onFilterField(this)"><option value="">Field</option>${opts('field', it.field)}</select>
        <select class="fr-op" name="fr_op[]" style="flex:1" onchange="onFilterOp(this)">${opOpts(it.op)}</select>
        <input class="fr-value" name="fr_value[]" type="text" placeholder="Value" style="flex:2" value="${esc(it.value)}">
        <input class="fr-value2" name="fr_value2[]" type="text" placeholder="To" style="flex:2;${isBetween ? '' : 'display:none'}" value="${esc(it.value2)}">
        <button type="button" class="btn sec sm" onclick="removeRule(this)">Remove</button>
      </div>`;
      return idx === 0 ? rule : `<div style="margin-top:8px">${rule}</div>`;
    }).join('');
  })();

  const renderedRules = q['fr_field[]'] || q['fr_field'] ? ruleRows : '';

  return `<div class="section">
      <form method="get" action="/${escAttr(meta.name)}" style="margin-top:0;display:flex;flex-direction:column;gap:14px">
        <div class="filters" id="filter-grid">${(groups.Basic ?? []).map(x => x.html).join('')}</div>
        <div style="padding:14px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(180deg,rgba(99,102,241,.04),rgba(255,255,255,0))">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between">
            <div style="font-weight:700;color:var(--text)">Advanced filters</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="chip" href="/${escAttr(meta.name)}?f_status=active">Active</a>
              <a class="chip" href="/${escAttr(meta.name)}?f_status=hidden">Hidden</a>
              <a class="chip" href="/${escAttr(meta.name)}?f_status=out_of_stock">Out of stock</a>
              <a class="chip" href="/${escAttr(meta.name)}?f_stock=0">Stock: 0</a>
              <a class="chip" href="/${escAttr(meta.name)}">Clear</a>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap" class="preset-chips" id="preset-chips">
              ${presetChipsHtml}
            </div>
          </div>
          <div style="margin-top:12px" id="filter-rules">
            ${renderedRules || `<div class="filter-rule" style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px">
              <select class="fr-field" name="fr_field[]" style="flex:2" onchange="onFilterField(this)">
                <option value="">Field</option>
                ${fieldOptions.map((o) => `<option value="${escAttr(o.value)}">${escapeHtml(o.label)}</option>`).join('')}
              </select>
              <select class="fr-op" name="fr_op[]" style="flex:1" onchange="onFilterOp(this)">
                <option value="eq">=</option>
                <option value="neq">≠</option>
                <option value="contains">contains</option>
                <option value="gt">&gt;</option>
                <option value="gte">≥</option>
                <option value="lt">&lt;</option>
                <option value="lte">≤</option>
                <option value="between">between</option>
              </select>
              <input class="fr-value" name="fr_value[]" type="text" placeholder="Value" style="flex:2">
              <input class="fr-value2" name="fr_value2[]" type="text" placeholder="To" style="flex:2;display:none">
              <button type="button" class="btn sec sm" onclick="removeRule(this)">Remove</button>
            </div>`}
          </div>
          <button type="button" class="btn sec sm" style="margin-top:4px" onclick="addRule()">+ Add filter</button>
          <div style="display:flex;gap:10px;align-items:center;margin-top:10px">
            <button class="btn sm" type="submit">Apply</button>
            <a class="btn sec sm" href="/${escAttr(meta.name)}">Clear</a>
          </div>
        </div>
        ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
      </form>
    </div>
  <script>
    const _fieldOptions = ${JSON.stringify(fieldOptions).replace(/</g, '\\u003C')};
    function removeRule(btn){ const row=btn.closest('.filter-rule'); if(row) row.remove(); }
    function addRule(){
      const container=document.getElementById('filter-rules');
      const rule=document.createElement('div');
      rule.className='filter-rule';
      rule.style.cssText='display:flex;gap:8px;align-items:flex-end;margin-bottom:8px';
      const options = _fieldOptions.map(o => '<option value="' + String(o.value).replace(/\"/g,'&quot;') + '">' + String(o.label).replace(/</g,'&lt;') + '</option>').join('');
      rule.innerHTML = '<select class="fr-field" name="fr_field[]" style="flex:2"><option value="">Field</option>' + options + '</select>' +
        '<select class="fr-op" name="fr_op[]" style="flex:1"><option value="eq">=</option><option value="neq">≠</option><option value="contains">contains</option><option value="gt">&gt;</option><option value="gte">≥</option><option value="lt">&lt;</option><option value="lte">≤</option></select>' +
        '<input class="fr-value" name="fr_value[]" type="text" placeholder="Value" style="flex:2">' +
        '<button type="button" class="btn sec sm" onclick="removeRule(this)">Remove</button>';
      container.appendChild(rule);
    }
  </script>
  <style>
    .preset-chips .chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(99,102,241,.08);color:var(--accent);font-weight:600;font-size:12px;text-decoration:none;border:1px solid rgba(99,102,241,.18)}
    .preset-chips .chip:hover{background:rgba(99,102,241,.14)}
    .filter-rule select, .filter-rule input {
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      font: inherit;
    }
    .filter-rule select:focus, .filter-rule input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(99,102,241,.12);
    }
  </style>`;
}

// ---- table ------------------------------------------------------------------
async function renderTable(meta: any, rows: any[], api: any, state: { sortby?: string; sortorder?: string; filters: Record<string, any>; q?: string }, visibleCols?: Set<string>): Promise<string> {
  const allCols = Object.keys(meta.listView.columns);
  const cols = visibleCols ? allCols.filter(c => visibleCols.has(c)) : allCols;
  const listFields = meta.fields?.list ?? meta.fields?.get ?? {};
  const query = qs(state.filters, true);
  if (state.q) query.set('q', state.q);
  const baseQ = query.toString();

  const canEdit = true;
  const canDelete = true;

  const head = `<tr><th><input type="checkbox" id="selall" style="width:16px;height:16px;cursor:pointer"></th>` +
    cols
      .map((c) => {
        const f = listFields[c];
        const sortable = f || ['createdAt', 'updatedAt'].includes(c);
        const label = escapeHtml(meta.listView.columns[c]);
        const hint = f?.type ? `<span title="${escapeHtml(f.type)}" style="opacity:.55;margin-left:4px;font-weight:400">●</span>` : '';
        if (!sortable) return `<th>${label}${hint}</th>`;
        const next = state.sortby === c && state.sortorder === 'asc' ? 'desc' : 'asc';
        const arr = state.sortby === c ? `<span class="arr">${state.sortorder === 'asc' ? '▲' : '▼'}</span>` : '';
        const href = `/${escAttr(meta.name)}?${baseQ ? baseQ + '&' : ''}sortby=${escAttr(c)}&sortorder=${next}`;
        return `<th><a href="${escapeHtml(href)}">${label} ${arr}${hint}</a></th>`;
      })
      .join('') +
    '<th style="width:180px">Actions</th></tr>';

  const relLabels: Record<string, Record<string, string>> = {};
  for (const c of cols) {
    const f = listFields[c];
    if (f?.type === 'relation') {
      const opts = await relationOptions(api, f);
      relLabels[c] = Object.fromEntries(opts.map((o) => [o.value, o.label]));
    }
  }

  const body = rows
    .map((r) => {
      const cells = cols
        .map((c) => {
          const f = listFields[c];
          if (f?.type === 'relation' && relLabels[c]) return `<td data-col="${escAttr(c)}">${escapeHtml(relLabels[c][String(r[c])] ?? String(r[c] ?? ''))}</td>`;
          return `<td data-col="${escAttr(c)}">${formatCell(f?.type, r[c], f)}</td>`;
        })
        .join('');
      const actions = [];
      actions.push(`<button type="button" class="btn sm" data-inline-edit="${escAttr(String(r.id))}">Edit</button>`);
      actions.push(`<button type="button" class="btn sm" data-inline-save="${escAttr(String(r.id))}" style="display:none">Save</button>`);
      if (canDelete) actions.push(`<form method="post" action="/${escAttr(meta.name)}/${escAttr(String(r.id))}/quick-delete" onsubmit="return confirm('Delete this record?')" style="display:inline"><button class="btn danger sm" type="submit">Delete</button></form>`);
      return `<tr data-id="${escAttr(String(r.id))}" data-name="${escAttr(meta.name)}" data-cols="${escAttr(cols.join('|'))}"><td><input type="checkbox" class="sel" name="ids" value="${escAttr(String(r.id))}" style="width:16px;height:16px;cursor:pointer"></td>${cells}
        <td><div style="position:relative;display:inline-flex;gap:8px">${actions.join(' ')}</div></td></tr>`;
    })
    .join('');

  const hasStatus = !!listFields['status'] || !!meta.fields?.create?.status;
  const statusOpts = (meta.fields?.create?.status?.options ?? meta.fields?.update?.status?.options ?? { active: 'Active', hidden: 'Hidden', inactive: 'Inactive' });
  const bulk = `<form class="bulkbar" method="post" action="/${escAttr(meta.name)}/bulk-delete" onsubmit="return confirm('Delete selected records? This cannot be undone.')">
    <input type="checkbox" id="selall2" style="width:16px;height:16px;cursor:pointer"><label for="selall2" style="font-weight:700;color:#3730a3">Select all</label>
    <button class="btn danger sm" type="submit">Delete selected</button>
    ${hasStatus ? `<select name="status" style="min-width:150px"><option value="">Set status…</option>${Object.entries(statusOpts).map(([v,l])=>`<option value="${escAttr(v)}">${escapeHtml(String(l))}</option>`).join('')}</select><button class="btn sm sec" type="submit" formaction="/${escAttr(meta.name)}/bulk-status">Apply status</button>` : ''}
    <span class="selinfo" id="selcount"></span></form>`;

  return `${bulk}<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function renderPagination(meta: any, state: { page: number; limit: number; total: number; sortby?: string; sortorder?: string; filters: Record<string, any>; q?: string }): string {
  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
  const q = qs(state.filters, true);
  if (state.q) q.set('q', state.q);
  if (state.sortby) q.set('sortby', state.sortby);
  if (state.sortorder) q.set('sortorder', state.sortorder);
  const mk = (p: number) => `/${escAttr(meta.name)}?${q.toString()}${q.toString() ? '&' : ''}page=${p}`;
  const prev = state.page > 1 ? `<a class="btn sec sm" href="${escapeHtml(mk(state.page - 1))}">‹ Prev</a>` : `<span class="btn sec sm" style="opacity:.4;cursor:not-allowed">‹ Prev</span>`;
  const next = state.page < totalPages ? `<a class="btn sm" href="${escapeHtml(mk(state.page + 1))}">Next ›</a>` : `<span class="btn sec sm" style="opacity:.4;cursor:not-allowed">Next ›</span>`;
  return `<div class="pager">${prev}<span>Page ${state.page} of ${totalPages} · ${state.total} total</span>${next}</div>`;
}

// ---- forms ----------------------------------------------------------------
async function renderForm(meta: any, api: any, row?: any): Promise<string> {
  const create = meta.fields?.create ?? {};
  const update = meta.fields?.update ?? {};
  const keys = [...new Set([...Object.keys(create), ...Object.keys(update)])];

  const inputs = await Promise.all(
    keys.map(async (key) => {
      const f = create[key] ?? update[key];
      if (!f) return '';
      const raw = row?.[key];
      const val = raw == null ? '' : typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
      const ui = f.ui ?? {};
      const ph = ui.placeholder ? ` placeholder="${escAttr(ui.placeholder)}"` : '';
      const lab = `<label>${escapeHtml(f.label)}${f.required ? ' <span style="color:var(--danger)">*</span>' : ''}</label>`;
      const help = f.help ? `<div class="help">${escapeHtml(f.help)}</div>` : '';
      const req = f.required ? ' required' : '';
      const select = (optsHtml: string) => `<div class="field" data-group="${escAttr(ui.group ?? '')}">${lab}${help}<select name="${escAttr(key)}"${req}><option value="">—</option>${optsHtml}</select></div>`;
      if (f.type === 'enum') {
        const opts = Object.entries(f.options ?? {})
          .map(([v, l]) => `<option value="${escAttr(v)}"${String(raw) === v ? ' selected' : ''}>${escapeHtml(String(l))}</option>`)
          .join('');
        return select(opts);
      }
      if (f.type === 'relation') {
        const opts = (await relationOptions(api, f)).map((o) => `<option value="${escAttr(o.value)}"${String(raw) === o.value ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('');
        return select(opts);
      }
      // Static options from ui.options (non-enum fixed set)
      if (ui.options && !f.type.startsWith('bool')) {
        const opts = Object.entries(ui.options)
          .map(([v, l]) => `<option value="${escAttr(v)}"${String(raw) === v ? ' selected' : ''}>${escapeHtml(String(l))}</option>`)
          .join('');
        return select(opts);
      }
      if (f.type === 'bool') return `<div class="field" data-group="${escAttr(ui.group ?? '')}" style="display:flex;align-items:center;gap:8px;margin-top:18px"><input type="checkbox" name="${escAttr(key)}" value="true"${raw === true || raw === 'true' ? ' checked' : ''} style="width:18px;height:18px;cursor:pointer"><span style="font-weight:600;color:#334155">${escapeHtml(f.label)}</span>${help}</div>`;
      if (f.type === 'media') return `<div class="field" data-group="${escAttr(ui.group ?? '')}">${lab}${help}<input type="file" name="${escAttr(key)}_file"><input type="text" name="${escAttr(key)}" value="${escAttr(val)}" placeholder="or paste URL"></div>`;
      if (f.type === 'tags') return `<div class="field" data-group="${escAttr(ui.group ?? '')}">${lab}${help}<input type="text" name="${escAttr(key)}" value="${escAttr(Array.isArray(raw) ? raw.join(', ') : val)}" placeholder="comma separated"></div>`;
      if (ui.input === 'textarea' || f.type === 'richtext' || f.type === 'text') return `<div class="field" data-group="${escAttr(ui.group ?? '')}">${lab}${help}<textarea name="${escAttr(key)}"${ph}${req}>${escapeHtml(val)}</textarea></div>`;
      if (ui.input === 'number' || f.type === 'int' || f.type === 'float' || f.type === 'number') return `<div class="field" data-group="${escAttr(ui.group ?? '')}">${lab}${help}<input type="number" step="any" name="${escAttr(key)}" value="${escAttr(val)}"${ph}${req}></div>`;
      if (ui.input === 'date' || f.type === 'date') return `<div class="field" data-group="${escAttr(ui.group ?? '')}">${lab}${help}<input type="date" name="${escAttr(key)}" value="${escAttr(val)}"${ph}${req}></div>`;
      if (ui.input === 'datetime-local' || f.type === 'datetime') return `<div class="field" data-group="${escAttr(ui.group ?? '')}">${lab}${help}<input type="datetime-local" name="${escAttr(key)}" value="${escAttr(val)}"${ph}${req}></div>`;
      const tag = ui.input === 'textarea' ? 'textarea' : 'input';
      return `<div class="field" data-group="${escAttr(ui.group ?? '')}">${lab}${help}<${tag} name="${escAttr(key)}" ${tag === 'textarea' ? '' : 'value="' + escAttr(val) + '"'}${ph}${req}>${tag === 'textarea' ? escapeHtml(val) : ''}</${tag}></div>`;
    }),
  );

  // Group fields into labelled cards when ui.group is set, else flat row layout.
  const grouped = keys.some((k) => (create[k] ?? update[k])?.ui?.group);
  let formBody: string;
  if (grouped) {
    const order: string[] = [];
    const buckets: Record<string, string[]> = {};
    keys.forEach((k, i) => {
      const f = create[k] ?? update[k];
      const g = (f?.ui?.group as string) ?? '';
      if (!inputs[i]) return;
      (buckets[g] ??= []).push(inputs[i] as string);
      if (g && !order.includes(g)) order.push(g);
    });
    formBody = order.map((g) => `<div class="form-group"><h3>${escapeHtml(g)}</h3>${buckets[g].join('')}</div>`).join('')
      + (buckets[''] ? `<div class="form-group">${buckets[''].join('')}</div>` : '');
  } else {
    formBody = `<div class="row">${inputs.slice(0, Math.ceil(keys.length / 2)).join('')}</div>\n    <div class="row">${inputs.slice(Math.ceil(keys.length / 2)).join('')}</div>`;
  }

  const action = row ? `/${meta.name}/${escAttr(String(row.id))}` : `/${meta.name}`;
  const verb = row ? 'Save changes' : `Create ${escapeHtml(meta.label)}`;
  const backBtn = row ? `<a class="btn sec" href="/${escAttr(meta.name)}">← Cancel</a>` : '';
  return `<form method="post" action="${action}">
    ${formBody}
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn" type="submit">${verb}</button>
      ${backBtn}
    </div>
  </form>`;
}

// ---- app ------------------------------------------------------------------
export async function buildApp(surface: AdminSurface = { role: 'network', title: 'Lakshya Admin', basePath: '/panel/network' }) {
  surfaceTitle = surface.title;
  const effectiveToken =
    surface?.token ||
    signToken({ ...ADMIN_USER, tenantId: process.env.ADMIN_TENANT ?? ADMIN_USER.tenantId });
  const api = await apiFor(effectiveToken);
  const app = Fastify({ logger: false });
  if (!apiApp.ready) await apiApp.ready();
  await app.register(formbody);

  const parseFilters = (q: any): Record<string, any> => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(q ?? {})) {
      if (k.startsWith('f_') && v !== '' && v != null) out[k.slice(2)] = v;
    }
    return out;
  };
  const parseFilterRules = (q: any): Array<{ field: string; op: string; value: unknown }> => {
    const rules: Array<{ field: string; op: string; value: unknown }> = [];
    const fields = q['fr_field[]'] ?? q['fr_field'];
    const ops = q['fr_op[]'] ?? q['fr_op'];
    const values = q['fr_value[]'] ?? q['fr_value'];
    const values2 = q['fr_value2[]'] ?? q['fr_value2'];
    const fieldArr = Array.isArray(fields) ? fields : fields ? [fields] : [];
    const opArr = Array.isArray(ops) ? ops : ops ? [ops] : [];
    const valueArr = Array.isArray(values) ? values : values ? [values] : [];
    const valueArr2 = Array.isArray(values2) ? values2 : values2 ? [values2] : [];
    const len = Math.max(fieldArr.length, opArr.length, valueArr.length, valueArr2.length);
    for (let i = 0; i < len; i += 1) {
      const field = String(fieldArr[i] || '').trim();
      const op = String(opArr[i] || '').trim();
      const value = valueArr[i];
      const value2 = valueArr2[i];
      if (!field || !op) continue;
      if (op === 'between') {
        if (value !== '' && value != null && value2 !== '' && value2 != null) {
          rules.push({ field, op: 'gte', value });
          rules.push({ field, op: 'lte', value: value2 });
        }
        continue;
      }
      if (value === '' || value == null) continue;
      rules.push({ field, op, value });
    }
    return rules;
  };

  app.get('/', async (req, reply) => {
    const nav = (await api('GET', '/api/meta/nav')).data;
    const content = `<div class="topbar" style="position:relative;border-bottom:0;margin:0 0 16px">
      <div><h1>${escapeHtml(surface.title)}</h1><div class="sub">Metadata-driven admin · ${nav.reduce((n: number, s: any) => n + s.items.length, 0)} resources</div></div>
    </div>
    <div class="card empty" style="margin-top:0">Select a resource from the sidebar to manage its records.</div>`;
    return reply.type('text/html').send(renderShell(renderSidebar(nav, surface.basePath), content));
  });

  // ---- Resource Builder (network-admin) ----
  const FIELD_TYPES = ['string','text','richtext','int','float','bool','enum','date','datetime','relation','media','tags','json','url','uuid'];
  function fieldRow(f: any = {}, idx: number): string {
    const key = f.key ?? '';
    const label = f.label ?? '';
    const type = f.type ?? 'string';
    const req = f.required ? ' checked' : '';
    const cols = f.ui?.columns ? ' checked' : '';
    const search = f.ui?.searchable ? ' checked' : '';
    const filter = f.ui?.filterable ? ' checked' : '';
    const opts = f.options ? (typeof f.options === 'string' ? f.options : JSON.stringify(f.options)) : '';
    const types = FIELD_TYPES.map(t => `<option value="${t}"${t===type?' selected':''}>${t}</option>`).join('');
    const isEnum = type === 'enum';
    const isRel = type === 'relation';
    return `<tr class="fb-field" data-idx="${idx}">
      <td><input class="fb-k" value="${escapeHtml(key)}" placeholder="field_key" required></td>
      <td><input class="fb-l" value="${escapeHtml(label)}" placeholder="Label" required></td>
      <td><select class="fb-t">${types}</select></td>
      <td style="text-align:center"><input class="fb-req" type="checkbox"${req}></td>
      <td style="text-align:center"><input class="fb-col" type="checkbox"${cols}></td>
      <td style="text-align:center"><input class="fb-sea" type="checkbox"${search}></td>
      <td style="text-align:center"><input class="fb-fil" type="checkbox"${filter}></td>
      <td><input class="fb-opt" value="${escapeHtml(opts)}" placeholder="${isEnum?'key:Label,..':isRel?'resource:name':'—'}"></td>
      <td style="text-align:center"><button type="button" class="sm danger fb-del">✕</button></td>
    </tr>`;
  }
  function renderBuilder(existing?: any): string {
    const ex = existing ?? {};
    const name = ex.name ?? '';
    const label = ex.label ?? '';
    const group = ex.group ?? 'Builder';
    const table = ex.table ?? (name ? name.charAt(0).toUpperCase()+name.slice(1) : '');
    const fields = ex.fields ? Object.entries(ex.fields).map(([k,f]:any)=>({key:k,...f})) : [{key:'title',label:'Title',type:'string',required:['create','update'],ui:{columns:true,searchable:true}}];
    const fieldsHtml = fields.map((f,i)=>fieldRow(f,i)).join('');
    return `<div class="topbar" style="position:relative;border-bottom:0;margin:0 0 16px">
        <div><h1>Resource Builder</h1><div class="sub">Define a new resource — the table, CRUD, admin UI and validation are generated automatically.</div></div>
      </div>
      <form id="fb-form" class="card" style="margin-bottom:16px">
        <div class="row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="field"><label>Resource name (key)*</label><input name="name" value="${escapeHtml(name)}" placeholder="e.g. project_note" ${name?'readonly':''} required pattern="[a-z][a-z0-9_]*"></div>
          <div class="field"><label>Label*</label><input name="label" value="${escapeHtml(label)}" placeholder="Project Note"></div>
          <div class="field"><label>Group (sidebar section)</label><input name="group" value="${escapeHtml(group)}" placeholder="Builder"></div>
          <div class="field"><label>DB table name*</label><input name="table" value="${escapeHtml(table)}" placeholder="ProjectNote"></div>
        </div>
        <h3 style="margin:16px 0 8px">Fields</h3>
        <table class="fb-table" style="width:100%"><thead><tr>
          <th>Key</th><th>Label</th><th>Type</th><th>Req</th><th>Col</th><th>Search</th><th>Filter</th><th>Options (enum/relation)</th><th></th>
        </tr></thead><tbody>${fieldsHtml}</tbody></table>
        <button type="button" class="btn sec sm" id="fb-add" style="margin-top:8px">+ Add field</button>
        <div style="margin-top:14px;display:flex;gap:10px;align-items:center">
          <button type="submit" class="btn" id="fb-save">${name?'Update resource':'Create resource'}</button>
          <span id="fb-msg" style="font-weight:700"></span>
        </div>
      </form>
      <div id="fb-list" class="card"></div>`;
  }
  app.get('/_builder', async (req, reply) => {
    const nav = (await api('GET', '/api/meta/nav')).data;
    return reply.type('text/html').send(renderShell(renderSidebar(nav, surface.basePath, '/_builder'), renderBuilder()));
  });
  app.get('/_builder/:name', async (req, reply) => {
    const nav = (await api('GET', '/api/meta/nav')).data;
    const name = (req.params as any).name;
    let existing: any = null;
    try { existing = (await api('GET', `/api/_meta/resource/${name}`)).data; } catch { /* new */ }
    return reply.type('text/html').send(renderShell(renderSidebar(nav, surface.basePath, '/_builder'), renderBuilder(existing)));
  });
  // Builder save + list (JSON API used by the inline JS in /admin.js)
  app.post('/_builder/api', async (req, reply) => {
    const payload = (req.body as any);
    const res = await api('POST', '/api/_meta/resource', payload);
    return reply.code(res.status === 1 ? 201 : 422).send(res);
  });
  app.get('/_builder/api/list', async (_req, reply) => {
    const res = await api('GET', '/api/_meta/resource');
    return reply.send(res);
  });
  app.delete('/_builder/api/:name', async (req, reply) => {
    const drop = (req.query as any).drop === '1' ? '?drop=1' : '';
    const res = await api('DELETE', `/api/_meta/resource/${(req.params as any).name}${drop}`);
    return reply.send(res);
  });

  app.get('/:resource', async (req, reply) => {
    const { resource } = req.params as any;
    const q = req.query as any;
    const navRes = await api('GET', '/api/meta/nav');
    const metaRes = await api('GET', `/api/meta/${resource}`);
    const meta = metaRes.data;
    const nav = navRes.data;
    if (!meta || !meta.listView) {
      return reply.type('text/html').status(404).send(renderShell(renderSidebar(nav, surface.basePath), `<div class="card"><h1>Not found</h1><p>Unknown resource: ${escapeHtml(resource)}</p></div>`));
    }

    const filters = parseFilters(q);
    const filterRules = parseFilterRules(q);
    const search = (q.q as string | undefined)?.trim() || '';
    const page = Math.max(1, parseInt(String(q.page ?? '1'), 10) || 1);
    const limit = 50;
    const sortby = (q.sortby as string | undefined) || undefined;
    const sortorder = (q.sortorder as string | undefined) || 'asc';

    surfaceTitle = meta.labelPlural || meta.label || resource;

    const apiArgs: Record<string, unknown> = { limit, page, sortby, sortorder };
    if (Object.keys(filters).length) apiArgs.filters = JSON.stringify(filters);
    if (search) apiArgs.q = search;
    if (filterRules.length) apiArgs.filterRules = JSON.stringify(filterRules);
    let rowsData;
    try {
      rowsData = await api('GET', `/api/${resource}?${new URLSearchParams(apiArgs as any).toString()}`);
    } catch (e) {
      return reply.type('text/html').status(500).send(renderShell(renderSidebar(nav, surface.basePath, `/${resource}`), `<div class="card">Failed to load ${escapeHtml(resource)}: ${String(e)}</div>`));
    }

    const data = rowsData.data || {};
    const rows: any[] = data.data ?? [];
    const total: number = data.total ?? rows.length;
    const currentPath = `/${resource}`;

    const filtersHtml = await renderFilters(meta, api, filters, renderStatsPresetCounts(meta, rows), q);
    const tableHtml = rows.length === 0 ? '<tr><td colspan="100"><div class="empty">No records found. Create one to get started.</div></td></tr>' : await renderTable(meta, rows, api, { sortby, sortorder, filters, q: search });
    const pagerHtml = renderPagination(meta, { page, limit, total, sortby, sortorder, filters, q: search });
    const statsHtml = renderStatsCards(total, rows, meta);

    const quickFormHref = `/${resource}/new`;

    const csvAction = `/${resource}/export.csv?${new URLSearchParams(apiArgs as any).toString()}`;

    const content = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px">
        <div>
          <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:-.2px">${escapeHtml(meta.labelPlural ?? meta.label ?? resource)}</h1>
          <div class="sub" style="color:var(--muted);font-size:12.5px;margin-top:3px;font-weight:500">${total} record${total === 1 ? '' : 's'}</div>
        </div>
        <div class="header-actions">
          <form method="get" action="/${escAttr(resource)}" style="display:flex;gap:8px">
            <input class="search" name="q" placeholder="Search ${escapeHtml(meta.labelPlural ?? meta.label ?? resource)}…" value="${escapeHtml(search)}">
            <button class="btn sm" type="submit">Search</button>
          </form>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn sec sm" href="${csvAction}">Export CSV</a>
            <button class="btn sec sm" id="theme-btn">Theme</button>
          </div>
        </div>
      </div>
      ${statsHtml}
      <form class="quick-create" method="post" action="/${escAttr(resource)}">
        <div style="font-weight:700;color:var(--neu-ink);margin-bottom:10px">Quick create</div>
        <div class="row">
          ${Object.entries(meta.fields?.create ?? {}).slice(0,4).map(([key, f]: [string, any]) => {
            const req = f.required ? ' required' : '';
            const lab = f.label || key;
            if (f.type === 'enum') {
              const opts = Object.entries(f.options ?? {})
                .map(([v, l]) => `<option value="${escAttr(v)}">${escapeHtml(String(l))}</option>`).join('');
              return `<select name="${escAttr(key)}"${req}><option value="">${escapeHtml(lab)}</option>${opts}</select>`;
            }
            if (f.type === 'bool') return `<select name="${escAttr(key)}"${req}><option value="true">Yes</option><option value="false">No</option></select>`;
            if (f.type === 'int' || f.type === 'float' || f.type === 'number') return `<input name="${escAttr(key)}" type="number" step="any" placeholder="${escapeHtml(lab)}"${req}>`;
            return `<input name="${escAttr(key)}" placeholder="${escapeHtml(lab)}"${req}>`;
          }).join('')}
        </div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn sm" type="submit">Create</button>
          <a class="btn sec sm" href="/${escAttr(resource)}?${new URLSearchParams({ ...(filters as any), q: search }).toString()}">Cancel</a>
        </div>
      </form>
      <div class="card" style="padding:0;overflow:auto">
        <div style="padding:12px 16px 0;display:flex;align-items:center;gap:10px">
          <div style="color:var(--muted);font-size:12px;font-weight:700">Columns</div>
          <div class="col-toggle">
            ${Object.keys(meta.listView.columns).map(c=>`<span class="chip" data-col="${escAttr(c)}">${escapeHtml(meta.listView.columns[c] ?? c)}</span>`).join('')}
          </div>
        </div>
        ${filtersHtml}
        <div style="padding:0 16px">
          ${tableHtml}
          ${pagerHtml}
        </div>
      </div>
    `;
    return reply.type('text/html').send(renderShell(renderSidebar(nav, surface.basePath, currentPath), content));
  });

  function csvEscape(v: any): string {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function toCsv(rows: any[], cols: string[]): string {
    const head = cols.map(csvEscape).join(',');
    const body = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(',')).join('\n');
    return `${head}\n${body}`;
  }

  app.get('/:resource/export.csv', async (req, reply) => {
    const { resource } = req.params as any;
    const q = req.query as any;
    const metaRes = await api('GET', `/api/meta/${resource}`);
    const meta = metaRes.data;
    if (!meta || !meta.listView) return reply.type('text/plain').code(404).send('Unknown resource');
    const cols = Object.keys(meta.listView.columns);
    const apiArgs: Record<string, unknown> = { limit: 1000, page: 1, sortby: q.sortby, sortorder: q.sortorder ?? 'asc' };
    if (q.filters) apiArgs.filters = q.filters;
    if (q.q) apiArgs.q = q.q;
    const rowsData = await api('GET', `/api/${resource}?${new URLSearchParams(apiArgs as any).toString()}`);
    const rows: any[] = (rowsData.data?.data ?? []).filter((r: any) => r && typeof r === 'object');
    const csv = toCsv(rows, cols);
    const safeName = (meta.labelPlural ?? meta.label ?? resource).replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="${safeName}.csv"`)
      .send(csv);
  });

  app.get('/:resource/new', async (req, reply) => {
    const { resource } = req.params as any;
    const navRes = await api('GET', '/api/meta/nav');
    const metaRes = await api('GET', `/api/meta/${resource}`);
    const meta = metaRes.data;
    const nav = navRes.data;
    const formHtml = await renderForm(meta, api);
    const content = `
      <div class="topbar" style="position:relative;border-bottom:0;margin:0 0 16px">
        <div><h1>New ${escapeHtml(meta.label)}</h1><div class="sub">${escapeHtml(meta.labelPlural ?? meta.label ?? resource)}</div></div>
      </div>
      <div class="card">${formHtml}</div>`;
    return reply.type('text/html').send(renderShell(renderSidebar(nav, surface.basePath, `/${resource}`), content));
  });

  app.get('/:resource/:id', async (req, reply) => {
    const { resource, id } = req.params as any;
    const navRes = await api('GET', '/api/meta/nav');
    const metaRes = await api('GET', `/api/meta/${resource}`);
    const rowRes = await api('GET', `/api/${resource}/${id}`);
    const meta = metaRes.data;
    const nav = navRes.data;
    const row = rowRes.data;
    if (!row) return reply.type('text/html').status(404).send(renderShell(renderSidebar(nav, surface.basePath, `/${resource}`), `<div class="card">Record not found.</div>`));
    const formHtml = await renderForm(meta, api, row);
    const content = `
      <div class="topbar" style="position:relative;border-bottom:0;margin:0 0 16px">
        <div><h1>Edit ${escapeHtml(meta.label)}</h1><div class="sub">${escapeHtml(meta.labelPlural ?? meta.label ?? resource)} · ${escapeHtml(String(row.id))}</div></div>
      </div>
      <div class="card">${formHtml}</div>`;
    return reply.type('text/html').send(renderShell(renderSidebar(nav, surface.basePath, `/${resource}`), content));
  });

  app.post('/:resource', async (req, reply) => {
    const { resource } = req.params as any;
    const body = (req as any).body || {};
    const navRes = await api('GET', '/api/meta/nav');
    const metaRes = await api('GET', `/api/meta/${resource}`);
    const meta = metaRes.data;
    const createFields = meta.fields?.create ?? {};
    for (const key of Object.keys(createFields)) {
      if (createFields[key].type === 'number' || createFields[key].type === 'float' || createFields[key].type === 'int') {
        if (body[key] !== undefined && body[key] !== '') body[key] = parseFloat(String(body[key]));
      }
    }
    const res = await api('POST', `/api/${resource}`, body);
    const id = res.data?.id ?? res.data?.data?.id;
    if (!id) return reply.type('text/html').status(400).send(renderShell(renderSidebar(navRes.data, surface.basePath, `/${resource}`), `<div class="card">Create failed. Check fields and try again.</div>`));
    return reply.redirect(`/${resource}/${id}`);
  });

  app.post('/:resource/:id', async (req, reply) => {
    const { resource, id } = req.params as any;
    const body = (req as any).body || {};
    const navRes = await api('GET', '/api/meta/nav');
    const updateFields = (await api('GET', `/api/meta/${resource}`)).data.fields?.update ?? {};
    for (const key of Object.keys(updateFields)) {
      if (updateFields[key].type === 'number' || updateFields[key].type === 'float' || updateFields[key].type === 'int') {
        if (body[key] !== undefined && body[key] !== '') body[key] = parseFloat(String(body[key]));
      }
    }
    await api('PATCH', `/api/${resource}/${id}`, body);
    return reply.redirect(`/${resource}`);
  });

  app.post('/:resource/bulk-delete', async (req, reply) => {
    const { resource } = req.params as any;
    const body = (req as any).body || {};
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : body.ids ? [body.ids] : [];
    for (const id of ids) {
      try { await api('DELETE', `/api/${resource}/${encodeURIComponent(String(id))}`); } catch {}
    }
    return reply.redirect(`/${resource}`);
  });

  app.post('/:resource/bulk-status', async (req, reply) => {
    const { resource } = req.params as any;
    const body = (req as any).body || {};
    const status = body.status;
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : body.ids ? [body.ids] : [];
    if (!status || ids.length === 0) return reply.redirect(`/${resource}`);
    for (const id of ids) await api('PATCH', `/api/${resource}/${encodeURIComponent(String(id))}`, { status });
    return reply.redirect(`/${resource}`);
  });

  app.post('/:resource/:id/quick-delete', async (req, reply) => {
    const { resource, id } = req.params as any;
    await api('DELETE', `/api/${resource}/${encodeURIComponent(String(id))}`);
    return reply.redirect(`/${resource}`);
  });

  app.get('/admin.js', (_req, reply) => {
    reply.type('application/javascript').send(`
      (function(){
        const drawer = document.createElement('div');
        drawer.className = 'backdrop';
        drawer.innerHTML = '<div class="drawer" id="admin-drawer"></div><button id="drawer-x" style="position:absolute;right:14px;top:14px" class="btn sec sm">Close</button>';
        document.body.appendChild(drawer);
        const panel = drawer.querySelector('#admin-drawer');
        const x = drawer.querySelector('#drawer-x');
        const open = (html) => { panel.innerHTML = html; drawer.classList.add('open'); };
        const close = () => drawer.classList.remove('open');
        x?.addEventListener('click', close);
        drawer.addEventListener('click', (e) => { if (e.target === drawer) close(); });
        window.toast = (msg) => {
          const el = document.createElement('div');
          el.className = 'toast';
          el.textContent = msg;
          document.body.appendChild(el);
          requestAnimationFrame(() => el.classList.add('show'));
          setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 1800);
        };

        window.openDrawer = async (href) => {
          if (!href) return;
          try {
            const res = await fetch(href);
            const text = await res.text();
            const m = text.match(/<main class="main">([\\s\\S]*)<\\/main>/);
            open(m ? m[1] : '<div class="card">No content</div>');
          } catch {
            window.toast?.('Failed to load drawer');
          }
        };

        document.querySelectorAll('[data-drawer-id]').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const href = btn.getAttribute('href');
            await window.openDrawer(href);
          });
        });

        document.addEventListener('submit', async (e) => {
          const form = e.target;
          if (!(form instanceof HTMLFormElement)) return;
          const action = form.getAttribute('action') || '';
          const isQuickDelete = action.split('/').filter(Boolean).length >= 3 && action.endsWith('/quick-delete');
          const isBulk = action.endsWith('/bulk-delete') || action.endsWith('/bulk-status');
          if (!isQuickDelete && !isBulk) return;
          e.preventDefault();
          try {
            await fetch(action, { method: 'POST', body: new URLSearchParams(new FormData(form)), headers: { 'x-requested-with': 'admin' } });
            window.toast?.('Saved.');
            setTimeout(() => location.reload(), 250);
          } catch {
            window.toast?.('Action failed');
          }
        });

        const themeBtn = document.getElementById('theme-btn');
        const root = document.documentElement;
        const stored = localStorage.getItem('admin-theme');
        if (stored === 'dark' || (!stored && window.matchMedia?.('(prefers-color-scheme: dark)').matches)) {
          root.setAttribute('data-theme', 'dark');
        }
        themeBtn?.addEventListener('click', () => {
          const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
          root.setAttribute('data-theme', next);
          localStorage.setItem('admin-theme', next);
        });

      document.addEventListener('click', e => {
        if (!e.target.closest('[data-menu]')) {
          document.querySelectorAll('.menu.show').forEach(m => m.classList.remove('show'));
        }
      });
      const selall = document.getElementById('selall');
      const selall2 = document.getElementById('selall2');
      const apply = () => {
        document.querySelectorAll('.sel').forEach(cb => { cb.checked = selall?.checked ?? false; });
      };
      selall?.addEventListener('change', apply);
      const apply2 = () => {
        document.querySelectorAll('.sel').forEach(cb => { cb.checked = selall2?.checked ?? false; });
        const count = document.querySelectorAll('.sel:checked').length;
        const el = document.getElementById('selcount');
        if (el) el.textContent = count ? count + ' selected' : '';
      };
      selall2?.addEventListener('change', apply2);
      document.querySelectorAll('.sel').forEach(cb => cb.addEventListener('change', apply2));

  const colToggle = () => {
    document.querySelectorAll('.col-toggle .chip').forEach((chip) => {
      const col = chip.getAttribute('data-col');
      if (!col) return;
      // admin-cols stores HIDDEN columns
      const hidden = new Set((localStorage.getItem('admin-cols') || '').split(',').filter(Boolean));
      chip.classList.toggle('hidden-col', hidden.has(col));
      chip.addEventListener('click', () => {
        const set = new Set((localStorage.getItem('admin-cols') || '').split(',').filter(Boolean));
        if (set.has(col)) set.delete(col); else set.add(col);
        localStorage.setItem('admin-cols', [...set].join(','));
        const rows = document.querySelectorAll('tr[data-cols]');
        rows.forEach((tr) => {
          (tr.getAttribute('data-cols')||'').split('|').forEach((existing) => {
            const td = tr.querySelector('td[data-col="' + existing + '"]');
            if (!td) return;
            td.style.display = set.has(existing) ? 'none' : '';
          });
        });
        chip.classList.toggle('hidden-col', set.has(col));
      });
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', colToggle);
  } else {
    colToggle();
  }
})();

      (function inlineEdit(){
        const base = (id)=>'[data-inline-edit="' + id + '"],[data-inline-save="' + id + '"]';
        document.querySelectorAll('[data-inline-edit]').forEach((editBtn)=>{
          const row = editBtn.closest('tr');
          if(!row) return;
          const id = editBtn.getAttribute('data-inline-edit');
          const saveBtn = row.querySelector('[data-inline-save="' + id + '"]');
          const editable = () => row.querySelectorAll('td[data-col]');
          editBtn?.addEventListener('click', (e)=>{
            e.preventDefault();
            editable().forEach((td)=>{
              const c = td.getAttribute('data-col');
              if(!c) return;
              const input = document.createElement('input');
              input.value = td.textContent.trim();
              input.dataset.col = c;
              input.style.cssText='width:100%;min-width:120px';
              td.textContent='';
              td.appendChild(input);
            });
            editBtn.style.display='none';
            saveBtn.style.display='';
          });
          const save = async ()=>{
            const data = { _method:'PATCH' };
            editable().forEach((td)=>{
              const c = td.querySelector('input')?.dataset.col || td.dataset.col;
              const val = td.querySelector('input')?.value ?? td.textContent.trim();
              if(c) data[c]=val;
            });
            const name = row.getAttribute('data-name');
            const action = '/' + name + '/' + encodeURIComponent(id);
            try {
              await fetch(action,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString()});
              window.toast?.('Saved');
              setTimeout(()=>location.reload(),180);
            } catch {
              window.toast?.('Action failed');
            }
          };
          saveBtn?.addEventListener('click', async (e)=>{
            e.preventDefault();
            const data = { _method:'PATCH' };
            editable().forEach((td)=>{
              const c = td.querySelector('input')?.dataset.col || td.dataset.col;
              const val = td.querySelector('input')?.value ?? td.textContent.trim();
              if(c) data[c]=val;
            });
            const name = row.getAttribute('data-name');
            const action = '/' + name + '/' + encodeURIComponent(id);
            try {
              await fetch(action,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString()});
              window.toast?.('Saved');
              setTimeout(()=>location.reload(),180);
            } catch {
              window.toast?.('Action failed');
            }
          });
        });
      })();

      // ---- Resource Builder client wiring ----
      (function(){
        const q = (s,r=document)=>r.querySelector(s);
        const qa = (s,r=document)=>[...r.querySelectorAll(s)];
        function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
        async function loadList(){
          const box = q('#fb-list'); if(!box) return;
          try{
            const res = await fetch('/_builder/api/list'); const j = await res.json();
            const items = (j.data||[]);
            if(!items.length){ box.innerHTML = '<h3 style="margin:0 0 8px">Existing builder resources</h3><div class="empty" style="padding:14px">No custom resources yet. Create one above.</div>'; return; }
            box.innerHTML = '<h3 style="margin:0 0 8px">Existing builder resources ('+items.length+')</h3>' + items.map(it=>
              '<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--neu-line)">'+
              '<a class="lnk" href="/'+it.name+'">'+escapeHtml(it.label)+'</a>'+
              '<span style="color:var(--neu-muted);font-size:11px">'+escapeHtml(it.table)+'</span>'+
              '<span style="margin-left:auto;display:flex;gap:6px">'+
                '<a class="sm" href="/_builder/'+it.name+'">Edit</a>'+
                '<button class="sm danger" data-del="'+it.name+'">Delete</button>'+
              '</span></div>').join('');
            qa('[data-del]',box).forEach(b=>b.addEventListener('click',async()=>{
              if(!confirm('Delete resource definition "'+b.getAttribute('data-del')+'"? (data table kept unless you drop it)')) return;
              await fetch('/_builder/api/'+b.getAttribute('data-del'),{method:'DELETE'});
              window.toast?.('Deleted'); loadList();
            }));
          }catch(e){ box.innerHTML='<div class="empty">Failed to load list</div>'; }
        }
        function collect(){
          const form = q('#fb-form'); if(!form) return null;
          const fields = qa('.fb-field',form).map(tr=>{
            const key = q('.fb-k',tr).value.trim();
            const label = q('.fb-l',tr).value.trim();
            const type = q('.fb-t',tr).value;
            if(!key || !label) return null;
            const f = { key, label, type };
            if(q('.fb-req',tr).checked) f.required=['create','update'];
            const om = {};
            if(q('.fb-col',tr).checked) om.columns=true;
            if(q('.fb-sea',tr).checked) om.searchable=true;
            if(q('.fb-fil',tr).checked) om.filterable=true;
            if(Object.keys(om).length) f.ui=om;
            const opt = q('.fb-opt',tr).value.trim();
            if(opt){
              if(type==='enum'){ const o={}; opt.split(',').forEach(p=>{const [k,v]=p.split(':'); if(k) o[k.trim()]=(v||k).trim();}); f.options=o; }
              else if(type==='relation'){ const m=opt.match(/resource:\s*(\w+)/); f.options={resource: m?m[1]:opt}; }
            }
            return f;
          }).filter(Boolean);
          const payload = {
            name: form.name.value.trim(),
            label: form.label.value.trim(),
            group: form.group.value.trim()||'Builder',
            table: form.table.value.trim(),
            fields: fields.map(f=>({key:f.key,label:f.label,type:f.type,...(f.required?{required:f.required}:{}),...(f.ui?{ui:f.ui}:{}),...(f.options?{options:f.options}:{})})),
            columns: fields.filter(f=>f.ui&&f.ui.columns).map(f=>f.key),
          };
          return payload;
        }
        function addRow(){
          const tbody = q('.fb-table tbody'); if(!tbody) return;
          const tr = document.createElement('tr');
          tr.className='fb-field';
          tr.innerHTML = '<td><input class="fb-k" placeholder="field_key" required></td>'+
            '<td><input class="fb-l" placeholder="Label" required></td>'+
            '<td><select class="fb-t"></select></td>'+
            '<td style="text-align:center"><input class="fb-req" type="checkbox"></td>'+
            '<td style="text-align:center"><input class="fb-col" type="checkbox"></td>'+
            '<td style="text-align:center"><input class="fb-sea" type="checkbox"></td>'+
            '<td style="text-align:center"><input class="fb-fil" type="checkbox"></td>'+
            '<td><input class="fb-opt" placeholder="—"></td>'+
            '<td style="text-align:center"><button type="button" class="sm danger fb-del">✕</button></td>';
          const sel = tr.querySelector('.fb-t');
          ['string','text','richtext','int','float','bool','enum','date','datetime','relation','media','tags','json','url','uuid'].forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;sel.appendChild(o);});
          tr.querySelector('.fb-del').addEventListener('click',()=>tr.remove());
          tbody.appendChild(tr);
        }
        const form = q('#fb-form');
        if(form){
          q('#fb-add',form)?.addEventListener('click',addRow);
          qa('.fb-del',form).forEach(b=>b.addEventListener('click',()=>b.closest('tr')?.remove()));
          form.addEventListener('submit',async(e)=>{
            e.preventDefault();
            const payload = collect(); const msg = q('#fb-msg');
            if(!payload || !payload.name || !payload.label || !payload.table){ msg.textContent='Fill name, label and table.'; msg.style.color='var(--danger)'; return; }
            if(!payload.fields.length){ msg.textContent='Add at least one field.'; msg.style.color='var(--danger)'; return; }
            try{
              const res = await fetch('/_builder/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
              const j = await res.json();
              if(j.status===1){ msg.textContent='✓ '+(payload.name?'updated':'created')+' — table created.'; msg.style.color='var(--green)'; setTimeout(()=>location.reload(),700); }
              else { msg.textContent='✕ '+(j.message||'Failed'); msg.style.color='var(--danger)'; }
            }catch(err){ msg.textContent='✕ Network error'; msg.style.color='var(--danger)'; }
          });
          loadList();
        }
      })();
    `);
  });

  // Surface-specific mounts can add auth/role middleware before this generic mount.
  return app;
}

// Local dev runner: supports ADMIN_TENANT and ADMIN_PORT env.
const runLocal = async () => {
  const port = Number(process.env.ADMIN_PORT || 3100);
  const app = await buildApp();
  await app.listen({ port, host: '0.0.0.0' });
  console.log('Admin listening on :' + port);
};

// Only run when this file is the actual entry point — NOT when imported by
// admin-publisher (whose own entry is also named server.ts). A generic
// /server\.(ts|js)$/ guard would wrongly start admin here and hijack port 3100.
const _adminEntry = process.argv[1] ?? '';
const _isAdminEntry = _adminEntry.endsWith('apps/admin/src/server.ts') || _adminEntry.endsWith('admin/src/server.ts');
if (_isAdminEntry) {
  runLocal().catch((err) => { console.error(err); process.exit(1); });
}
