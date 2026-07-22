// apps/admin-publisher/src/server.ts
// Publisher-scoped admin surface. Reuses the SAME generic renderer from
// @lakshya/admin (buildApp) but authenticates as a publisher, so /api/meta/nav
// returns only publisher-accessible resources. Two nav trees, one renderer
// (per the migration plan §11.13). Proves the metadata-driven loop supports
// multiple admin surfaces with zero per-surface UI code.

import { buildApp, type AdminSurface } from '@lakshya/admin/src/server.js';
import { signToken } from '@lakshya/api/src/auth.js';

const PUBLISHER_USER = {
  uid: 'pub-1',
  tenantId: '00000000-0000-0000-0000-0000000000t0',
  role: 'publisher' as const,
  permissions: ['role_superadmin'], // publisher superadmin within its scope
  status: 'active' as const,
};

const surface: AdminSurface = {
  role: 'publisher',
  token: signToken(PUBLISHER_USER),
  title: 'Lakshya Publisher',
  basePath: '/panel/publisher',
};

const publisherPort = Number(process.env.PUBLISHER_PORT || 3101);
const isMain = process.argv[1] && process.argv[1].endsWith('server.ts');
if (isMain) {
  const app = await buildApp(surface);
  await app.listen({ port: publisherPort, host: '0.0.0.0' });
  console.log(`Publisher admin listening on :${publisherPort}`);
}

export { surface };
