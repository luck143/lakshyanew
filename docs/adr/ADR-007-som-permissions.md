# ADR-007: SOM (Scoped Object Model) as the permission primitive

**Status:** Accepted (2026-07-20)
**Context:** The legacy lakshya system gates every admin/module action via the
**SOM** — a triple `{ object, mode, scope }` gathered from a user's own
`users_modules_som` plus their role memberships' `users_modules_roles_som`,
and only honoured when `(object, mode)` is listed in a master `modules_access`
config. We needed an equivalent in the new system that is (a) fine-grained,
(b) role-composable, (c) row-scope aware (global/tenant/self), and
(d) decoupled from the flat `role_*` permission strings used for coarse RBAC.

**Decision:** Model permissions as SOM triples in `@lakshya/core`
(`packages/core/src/permissions.ts`): `can(ctx, object, mode)`, `scopeFor(...)`,
`effectiveSoms(user, roles)`, `somsToFlat(...)`. The master list is
`MODULES_ACCESS` (api/src/modulesAccess.ts). At request time the API resolves a
user's effective SOMs from `User.roles` JSON ∪ joined `Role.soms`
(`loadEffectiveSoms` in api/src/auth.ts) and enforces them in `requireSom(...)`
wired into every generic CRUD route. Superadmin bypasses. Row scope
(global/tenant/self) drives the WHERE clause in `crud.listResource`.

**Consequences:**
- A permission is granted only if it exists in BOTH the user's effective SOMs AND
  the master `MODULES_ACCESS` — mirroring the legacy dual-gate exactly.
- Roles are first-class, composable templates; a user can hold many.
- The flat `role_*` strings remain for coarse role/feature flags (legacy compat).
- New resources automatically participate in the permission system (the route
  enforces `object = resourceName`); no per-resource permission code required.
- Deferred: UI for editing SOMs in the Role admin (currently via raw JSON field);
  `self` scope requires a `createdBy` column to be meaningful (best-effort today).
