// apps/api/src/modulesAccess.ts
// Master SOM config — the allowed (object, mode) pairs (mirrors old modules_access).
// A user only ever gets a permission if it is present here AND granted via a SOM.
import type { SOM } from '@lakshya/core';

export const MODULES_ACCESS: SOM[] = [
  { object: 'topic', mode: 'view' },
  { object: 'topic', mode: 'create' },
  { object: 'topic', mode: 'edit' },
  { object: 'topic', mode: 'delete' },
  { object: 'topic', mode: 'publish' },

  { object: 'blogpost', mode: 'view' },
  { object: 'blogpost', mode: 'create' },
  { object: 'blogpost', mode: 'edit' },
  { object: 'blogpost', mode: 'delete' },
  { object: 'blogpost', mode: 'publish' },

  { object: 'category', mode: 'view' },
  { object: 'category', mode: 'create' },
  { object: 'category', mode: 'edit' },
  { object: 'category', mode: 'delete' },

  { object: 'product', mode: 'view' },
  { object: 'product', mode: 'create' },
  { object: 'product', mode: 'edit' },
  { object: 'product', mode: 'delete' },

  { object: 'order', mode: 'view' },
  { object: 'order', mode: 'create' },
  { object: 'order', mode: 'edit' },
  { object: 'order', mode: 'delete' },
  { object: 'orderitem', mode: 'view' },
  { object: 'orderitem', mode: 'create' },
  { object: 'orderitem', mode: 'edit' },
  { object: 'orderitem', mode: 'delete' },

  { object: 'media', mode: 'view' },
  { object: 'media', mode: 'create' },
  { object: 'media', mode: 'edit' },
  { object: 'media', mode: 'delete' },

  { object: 'review', mode: 'view' },
  { object: 'review', mode: 'create' },
  { object: 'review', mode: 'edit' },
  { object: 'review', mode: 'delete' },

  { object: 'cart', mode: 'view' },
  { object: 'cart', mode: 'create' },
  { object: 'cart', mode: 'edit' },
  { object: 'cart', mode: 'delete' },
  { object: 'cartitem', mode: 'view' },
  { object: 'cartitem', mode: 'create' },
  { object: 'cartitem', mode: 'edit' },
  { object: 'cartitem', mode: 'delete' },

  { object: 'coupon', mode: 'view' },
  { object: 'coupon', mode: 'create' },
  { object: 'coupon', mode: 'edit' },
  { object: 'coupon', mode: 'delete' },

  { object: 'subscription', mode: 'view' },
  { object: 'subscription', mode: 'create' },
  { object: 'subscription', mode: 'edit' },
  { object: 'subscription', mode: 'delete' },

  { object: 'contact', mode: 'view' },
  { object: 'contact', mode: 'create' },
  { object: 'contact', mode: 'edit' },
  { object: 'contact', mode: 'delete' },

  { object: 'mediavariant', mode: 'view' },
  { object: 'mediavariant', mode: 'create' },
  { object: 'mediavariant', mode: 'edit' },
  { object: 'mediavariant', mode: 'delete' },

  { object: 'setting', mode: 'view' },
  { object: 'setting', mode: 'create' },
  { object: 'setting', mode: 'edit' },
  { object: 'setting', mode: 'delete' },

  { object: 'network_users', mode: 'view' },
  { object: 'network_users', mode: 'manage' },
  { object: 'network_roles', mode: 'view' },
  { object: 'network_roles', mode: 'manage' },
];
