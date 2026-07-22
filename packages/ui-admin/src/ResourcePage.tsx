// packages/ui-admin/src/ResourcePage.tsx
// Generic, metadata-driven admin page. Given a resource name + token, it loads
// /api/meta/:resource, builds the view-model, and renders a table + form + filters.
// No per-resource code required.

import { useEffect, useState } from 'react';
import { buildView, type ResourceView } from './view.js';
import {
  fetchResourceMeta,
  listRows,
  createRow,
  updateRow,
  deleteRow,
  type ApiEnvelope,
} from './client.js';

export interface ResourcePageProps {
  baseUrl: string;
  token: string;
  resource: string;
}

export function ResourcePage({ baseUrl, token, resource }: ResourcePageProps) {
  const [view, setView] = useState<ResourceView | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meta = await fetchResourceMeta(baseUrl, token, resource);
        setView(buildView(meta));
        const list = (await listRows(baseUrl, token, resource, { limit: 50 })) as ApiEnvelope<{
          data: any[];
        }>;
        setRows(list.data?.data ?? []);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [baseUrl, token, resource]);

  if (error) return <div className="error">{error}</div>;
  if (!view) return <div>Loading {resource}…</div>;

  return (
    <section className="resource-page" data-resource={resource}>
      <h1>{view.label}</h1>
      <table>
        <thead>
          <tr>
            {view.columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {view.columns.map((c) => (
                <td key={c.key}>{String(row[c.key] ?? '')}</td>
              ))}
              <td>
                <button onClick={() => deleteRow(baseUrl, token, resource, row.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
