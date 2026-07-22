// packages/ui-admin/src/client.ts
// Thin fetch client for the admin: loads metadata and performs CRUD.
// Mirrors the generated typed client but runtime (admin is dynamic).

export interface ApiEnvelope<T> {
  status: number;
  data: T;
  message: string;
}

export async function fetchMeta(baseUrl: string, token: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/meta`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as ApiEnvelope<string[]>;
  return body.data;
}

export async function fetchResourceMeta(
  baseUrl: string,
  token: string,
  resource: string,
): Promise<any> {
  const res = await fetch(`${baseUrl}/api/meta/${resource}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as ApiEnvelope<any>;
  return body.data;
}

export async function listRows(
  baseUrl: string,
  token: string,
  resource: string,
  q?: Record<string, any>,
): Promise<any> {
  const url = new URL(`${baseUrl}/api/${resource}`);
  if (q) for (const [k, v] of Object.entries(q)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  return res.json();
}

export async function createRow(
  baseUrl: string,
  token: string,
  resource: string,
  body: any,
): Promise<any> {
  const res = await fetch(`${baseUrl}/api/${resource}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateRow(
  baseUrl: string,
  token: string,
  resource: string,
  id: string,
  body: any,
): Promise<any> {
  const res = await fetch(`${baseUrl}/api/${resource}/${id}`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteRow(
  baseUrl: string,
  token: string,
  resource: string,
  id: string,
): Promise<any> {
  const res = await fetch(`${baseUrl}/api/${resource}/${id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  return res.json();
}
