// packages/core/src/types.ts
// Core metadata types for the metadata-driven framework.
// This is the single source of truth: one resource definition powers
// API CRUD, validation, admin UI, public site, and docs.

export type Op = 'list' | 'get' | 'create' | 'update' | 'delete' | 'bulk';

export type FieldType =
  | 'uuid' | 'string' | 'text' | 'richtext'
  | 'int' | 'float' | 'bool'
  | 'enum' | 'date' | 'datetime'
  | 'relation' | 'media' | 'tags' | 'json' | 'url'
  | 'computed' | 'virtual';

export interface ValidateSpec {
  min?: number;
  max?: number;
  regex?: string;
  unique?: boolean;
  email?: boolean;
  positive?: boolean;
}

export interface RelationRef {
  resource: string;     // target resource name
  labelField?: string;  // field shown in lookups (default: name/title)
  many?: boolean;       // one-to-many vs many-to-many
}

export interface FieldUi {
  widget?: string;          // override default widget for this type
  placeholder?: string;
  help?: string;
  columns?: boolean;        // show in default list columns
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
}

export interface FieldPermissions {
  modules?: string[];   // required feature modules
  perms?: string[];     // required permission flags
  settings?: string[];  // required tenant settings
}

export interface Field {
  type: FieldType;
  label: string;
  description?: string;
  // Per-operation visibility. Mirrors old dimensions() $dim[field][op]['include'].
  // If omitted, field is visible on all ops where it makes sense.
  required?: Op[];
  visible?: Op[];            // ops where the field is returned/exposed
  editable?: Op[];           // ops where the field can be written (default create+update)
  validate?: ValidateSpec;
  options?: Record<string, string> | RelationRef;  // enum options OR relation ref
  default?: unknown;
  generated?: boolean;       // server-generated (uuid, timestamps) — not client-writable
  ui?: FieldUi;
  permissions?: FieldPermissions;
  unique?: boolean;            // natural-key uniqueness (generic create guard, tenant-scoped)
}

export type ScopeRole = 'network' | 'publisher' | 'user' | 'public';

export interface Scope {
  access: ScopeRole | ScopeRole[];   // who can reach this resource
  perm?: string[];                   // required permission flags
  modules?: string[];                // required feature modules
}

export interface ResourceListView {
  columns: string[];
  defaultSort?: string;
  defaultOrder?: 'asc' | 'desc';
  pageSize?: number;
}

export interface WebView {
  landing?: boolean;     // expose a public listing/landing page
  slugField?: string;    // field used for the public slug
  detail?: boolean;      // expose a public detail page
  publicStatus?: string; // status value considered "published" for public listings (default "active")
}

export interface Resource {
  name: string;                 // unique resource key, e.g. "topic"
  table: string;                // DB table name
  label: string;                // human label
  labelPlural?: string;
  group?: string;               // nav section, e.g. "Content", "E-commerce" (for sidebar)
  icon?: string;                // optional icon key for the nav UI
  fields: Record<string, Field>;
  relations?: Relation[];       // explicit relation metadata (optional; inferred too)
  scopes: {
    admin?: Scope;     // network / full admin
    publisher?: Scope; // publisher-scoped
    user?: Scope;      // current-user-scoped data
    public?: Scope;    // anonymous read
  };
  listView?: ResourceListView;
  filters?: string[];
  webView?: WebView;
  versioned?: boolean;          // append-only history (default false)
}

export interface Relation {
  field: string;        // local field holding the FK/id
  to: string;           // target resource name
  type: 'one' | 'many';
}

export interface DefineResourceInput extends Omit<Resource, 'name'> {
  name: string;
}
