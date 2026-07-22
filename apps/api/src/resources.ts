// apps/api/src/resources.ts
// Resource definitions for Phase 0. These mirror prisma/schema.prisma and are
// the single source of truth that drives API CRUD, validation, and admin UI.
//
// NOTE: In Phase 1 this will be generated from the Prisma schema via codegen.
// For Phase 0 we declare them explicitly to prove the loop.

import { defineResource } from '@lakshya/core';

export const Tenant = defineResource({
  name: 'tenant',
  table: 'Tenant',
  label: 'Tenant',
  labelPlural: 'Tenants',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1, max: 200 }, ui: { columns: true, sortable: true, filterable: true } },
    domain: { type: 'string', label: 'Domain', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 3 }, ui: { columns: true, filterable: true } },
    settings: { type: 'json', label: 'Settings', editable: ['create', 'update'], visible: ['get'] },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['name', 'domain'], defaultSort: 'name', pageSize: 50 },
  filters: ['domain'],
});

export const User = defineResource({
  name: 'user',
  table: 'User',
  label: 'User',
  labelPlural: 'Users',
  group: 'Access Control',
  icon: 'user',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    email: { type: 'string', label: 'Email', required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { email: true }, ui: { columns: true, filterable: true, searchable: true } },
    name: { type: 'string', label: 'Name', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    role: { type: 'enum', label: 'Role', options: { network: 'Network', publisher: 'Publisher', user: 'User' }, default: 'user', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    roles: { type: 'json', label: 'Direct SOM grants', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    permissions: { type: 'tags', label: 'Permissions', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', inactive: 'Inactive', banned: 'Banned' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['email', 'name', 'role', 'status'], defaultSort: 'email', pageSize: 50 },
  filters: ['role', 'status'],
});

export const Topic = defineResource({
  name: 'topic',
  table: 'Topic',
  label: 'Topic',
  labelPlural: 'Topics',
  group: 'Content',
  icon: 'tag',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1, max: 200 }, unique: true, ui: { columns: true, sortable: true, filterable: true, searchable: true } },
    parentId: { type: 'relation', label: 'Parent', options: { resource: 'topic', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get'], ui: { filterable: true } },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden', pending: 'Pending' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    content: { type: 'richtext', label: 'Content', editable: ['create', 'update'], visible: ['get'] },
    sortOrder: { type: 'int', label: 'Sort Order', default: 0, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['name', 'status', 'sortOrder'], defaultSort: 'name', pageSize: 50 },
  filters: ['status', 'parentId'],
  webView: { landing: true, slugField: 'name', detail: true },
});

export const BlogPost = defineResource({
  name: 'blogpost',
  table: 'BlogPost',
  label: 'Blog Post',
  labelPlural: 'Blog Posts',
  group: 'Content',
  icon: 'doc',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    title: { type: 'string', label: 'Title', required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1, max: 300 }, ui: { columns: true, sortable: true, filterable: true, searchable: true } },
    slug: { type: 'string', label: 'Slug', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 }, ui: { columns: true, filterable: true } },
    body: { type: 'richtext', label: 'Body', editable: ['create', 'update'], visible: ['get'] },
    status: { type: 'enum', label: 'Status', options: { draft: 'Draft', published: 'Published', archived: 'Archived' }, default: 'draft', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    tags: { type: 'tags', label: 'Tags', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    authorId: { type: 'relation', label: 'Author', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['title', 'status', 'slug'], defaultSort: 'title', pageSize: 50 },
  filters: ['status', 'tags'],
  webView: { landing: true, slugField: 'slug', detail: true, publicStatus: 'published' },
});

// ---- E-commerce (Phase 3) ----

export const Category = defineResource({
  name: 'category',
  table: 'Category',
  label: 'Category',
  labelPlural: 'Categories',
  group: 'E-commerce',
  icon: 'folder',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1, max: 200 }, unique: true, ui: { columns: true, sortable: true, filterable: true, searchable: true } },
    slug: { type: 'string', label: 'Slug', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 } },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    parentId: { type: 'relation', label: 'Parent', options: { resource: 'category', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get'] },
    sortOrder: { type: 'int', label: 'Sort Order', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['name', 'status', 'sortOrder'], defaultSort: 'sortOrder', pageSize: 50 },
  filters: ['status', 'parentId'],
  webView: { landing: true, slugField: 'slug', detail: true },
});

export const Product = defineResource({
  name: 'product',
  table: 'Product',
  label: 'Product',
  labelPlural: 'Products',
  group: 'E-commerce',
  icon: 'cart',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    title: { type: 'string', label: 'Title', required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1, max: 300 }, ui: { columns: true, sortable: true, filterable: true, searchable: true } },
    slug: { type: 'string', label: 'Slug', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 } },
    description: { type: 'richtext', label: 'Description', editable: ['create', 'update'], visible: ['get'] },
    price: { type: 'float', label: 'Price', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden', out_of_stock: 'Out of Stock' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    categoryId: { type: 'relation', label: 'Category', options: { resource: 'category', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    sku: { type: 'string', label: 'SKU', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    stock: { type: 'int', label: 'Stock', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    cover: { type: 'media', label: 'Cover Image', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    tags: { type: 'tags', label: 'Tags', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['title', 'price', 'status', 'categoryId'], defaultSort: 'title', pageSize: 50 },
  filters: ['status', 'categoryId'],
  webView: { landing: true, slugField: 'slug', detail: true },
});

// ---- Users & Roles (Phase 4: SOM permission model) ----

export const Role = defineResource({
  name: 'role',
  table: 'Role',
  label: 'Role',
  labelPlural: 'Roles',
  group: 'Access Control',
  icon: 'shield',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    key: { type: 'string', label: 'Key', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 } },
    name: { type: 'string', label: 'Name', required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    soms: { type: 'json', label: 'Permissions (SOM)', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', inactive: 'Inactive' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['name', 'key', 'status'], defaultSort: 'name', pageSize: 50 },
  filters: ['status'],
});

// ---- E-commerce: Orders (Phase 5) ----

export const Order = defineResource({
  name: 'order',
  table: 'Order',
  label: 'Order',
  labelPlural: 'Orders',
  group: 'E-commerce',
  icon: 'cart',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    userId: { type: 'relation', label: 'Customer', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    status: { type: 'enum', label: 'Status', options: { pending: 'Pending', paid: 'Paid', shipped: 'Shipped', cancelled: 'Cancelled' }, default: 'pending', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    total: { type: 'float', label: 'Total', visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    currency: { type: 'string', label: 'Currency', default: 'INR', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['status', 'total', 'currency', 'userId'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status', 'userId'],
});

export const OrderItem = defineResource({
  name: 'orderitem',
  table: 'OrderItem',
  label: 'Order Item',
  labelPlural: 'Order Items',
  group: 'E-commerce',
  icon: 'list',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    orderId: { type: 'relation', label: 'Order', options: { resource: 'order', labelField: 'id' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    productId: { type: 'relation', label: 'Product', options: { resource: 'product', labelField: 'title' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    qty: { type: 'int', label: 'Qty', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    price: { type: 'float', label: 'Unit Price', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['orderId', 'productId', 'qty', 'price'], defaultSort: 'orderId', pageSize: 50 },
  filters: ['orderId', 'productId'],
});

// ---- Media & File Management (Phase 7) ----

export const Media = defineResource({
  name: 'media',
  table: 'Media',
  label: 'Media',
  labelPlural: 'Media',
  group: 'Media',
  icon: 'image',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create', 'update'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    url: { type: 'media', label: 'File', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    mimeType: { type: 'string', label: 'MIME', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    size: { type: 'int', label: 'Size', visible: ['list', 'get'] },
    path: { type: 'string', label: 'Path', visible: ['get'] },
    createdAt: { type: 'datetime', label: 'Created', visible: ['list'] },
    variants: { type: 'relation', label: 'Variants', options: { resource: 'mediavariant', labelField: 'format' }, visible: ['get'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['name', 'mimeType', 'size', 'createdAt'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['mimeType'],
});

// ---- E-commerce: Reviews (Phase 9) ----

export const Review = defineResource({
  name: 'review',
  table: 'Review',
  label: 'Review',
  labelPlural: 'Reviews',
  group: 'E-commerce',
  icon: 'star',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    productId: { type: 'relation', label: 'Product', options: { resource: 'product', labelField: 'title' }, required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    userId: { type: 'relation', label: 'Author', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    rating: { type: 'int', label: 'Rating', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    title: { type: 'string', label: 'Title', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    body: { type: 'text', label: 'Body', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }, default: 'pending', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    createdAt: { type: 'datetime', label: 'Created', visible: ['list'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['productId', 'rating', 'status', 'createdAt'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['productId', 'status'],
});

// ---- E-commerce: Cart (Phase 10) ----

export const Cart = defineResource({
  name: 'cart',
  table: 'Cart',
  label: 'Cart',
  labelPlural: 'Carts',
  group: 'E-commerce',
  icon: 'cart',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    userId: { type: 'relation', label: 'Customer', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', converted: 'Converted', abandoned: 'Abandoned' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    createdAt: { type: 'datetime', label: 'Created', visible: ['list'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['userId', 'status', 'createdAt'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['userId', 'status'],
});

export const CartItem = defineResource({
  name: 'cartitem',
  table: 'CartItem',
  label: 'Cart Item',
  labelPlural: 'Cart Items',
  group: 'E-commerce',
  icon: 'list',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    cartId: { type: 'relation', label: 'Cart', options: { resource: 'cart', labelField: 'id' }, required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    productId: { type: 'relation', label: 'Product', options: { resource: 'product', labelField: 'title' }, required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    qty: { type: 'int', label: 'Qty', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    price: { type: 'float', label: 'Unit Price', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['cartId', 'productId', 'qty', 'price'], defaultSort: 'productId', pageSize: 50 },
  filters: ['cartId', 'productId'],
});

// ---- E-commerce: Coupons (Phase 11) ----

export const Coupon = defineResource({
  name: 'coupon',
  table: 'Coupon',
  label: 'Coupon',
  labelPlural: 'Coupons',
  group: 'E-commerce',
  icon: 'tag',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    code: { type: 'string', label: 'Code', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    description: { type: 'string', label: 'Description', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    type: { type: 'enum', label: 'Type', options: { percent: 'Percent', fixed: 'Fixed' }, default: 'percent', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    value: { type: 'float', label: 'Value', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    minAmount: { type: 'float', label: 'Min Amount', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    maxUses: { type: 'int', label: 'Max Uses', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    usedCount: { type: 'int', label: 'Used', visible: ['list', 'get'], ui: { columns: true } },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', inactive: 'Inactive', expired: 'Expired' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    startsAt: { type: 'datetime', label: 'Starts At', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    expiresAt: { type: 'datetime', label: 'Expires At', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['code', 'type', 'value', 'status', 'usedCount'], defaultSort: 'code', pageSize: 50 },
  filters: ['type', 'status'],
});

// ---- E-commerce: Subscriptions (Phase 12) ----

export const Subscription = defineResource({
  name: 'subscription',
  table: 'Subscription',
  label: 'Subscription',
  labelPlural: 'Subscriptions',
  group: 'E-commerce',
  icon: 'repeat',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    userId: { type: 'relation', label: 'Customer', options: { resource: 'user', labelField: 'name' }, required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    plan: { type: 'string', label: 'Plan', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    status: { type: 'enum', label: 'Status', options: { trialing: 'Trialing', active: 'Active', past_due: 'Past Due', canceled: 'Canceled' }, default: 'trialing', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    amount: { type: 'float', label: 'Amount', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    currency: { type: 'string', label: 'Currency', default: 'INR', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    interval: { type: 'enum', label: 'Interval', options: { month: 'Month', year: 'Year' }, default: 'month', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    currentPeriodEnd: { type: 'datetime', label: 'Renews On', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    canceledAt: { type: 'datetime', label: 'Canceled At', visible: ['list', 'get'] },
    createdAt: { type: 'datetime', label: 'Created', visible: ['list'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['userId', 'plan', 'status', 'amount', 'currentPeriodEnd'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['userId', 'status', 'interval'],
});

// ---- CRM: Contacts (Phase 13) ----

export const Contact = defineResource({
  name: 'contact',
  table: 'Contact',
  label: 'Contact',
  labelPlural: 'Contacts',
  group: 'CRM',
  icon: 'users',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    ownerId: { type: 'relation', label: 'Owner', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    firstName: { type: 'string', label: 'First Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    lastName: { type: 'string', label: 'Last Name', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    email: { type: 'string', label: 'Email', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    phone: { type: 'string', label: 'Phone', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    company: { type: 'string', label: 'Company', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    tags: { type: 'tags', label: 'Tags', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { lead: 'Lead', prospect: 'Prospect', customer: 'Customer', churned: 'Churned' }, default: 'lead', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    notes: { type: 'text', label: 'Notes', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    createdAt: { type: 'datetime', label: 'Created', visible: ['list'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['firstName', 'lastName', 'company', 'email', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status', 'ownerId', 'company'],
});

// ---- imgen: Media variants (Phase 14) ----

export const MediaVariant = defineResource({
  name: 'mediavariant',
  table: 'MediaVariant',
  label: 'Media Variant',
  labelPlural: 'Media Variants',
  group: 'Media',
  icon: 'layers',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    mediaId: { type: 'relation', label: 'Media', options: { resource: 'media', labelField: 'name' }, required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    format: { type: 'string', label: 'Format', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    width: { type: 'int', label: 'Width', visible: ['list', 'get'] },
    height: { type: 'int', label: 'Height', visible: ['list', 'get'] },
    path: { type: 'string', label: 'Path', visible: ['get', 'list', 'create', 'update'] },
    size: { type: 'int', label: 'Size', visible: ['list', 'get'] },
    createdAt: { type: 'datetime', label: 'Created', visible: ['list'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['mediaId', 'format', 'width', 'height', 'size'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['mediaId', 'format'],
});

// ---- Settings & Configuration (Phase 15) ----

export const Setting = defineResource({
  name: 'setting',
  table: 'Setting',
  label: 'Setting',
  labelPlural: 'Settings',
  group: 'Settings',
  icon: 'cog',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    key: { type: 'string', label: 'Key', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    value: { type: 'json', label: 'Value', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    group: { type: 'string', label: 'Group', default: 'general', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    label: { type: 'string', label: 'Label', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    updatedAt: { type: 'datetime', label: 'Updated', visible: ['list'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['key', 'group', 'label', 'updatedAt'], defaultSort: 'key', pageSize: 50 },
  filters: ['group', 'key'],
});

// ---- LMS / Quiz domain (Phase 22) ----
// Field schemas reverse-engineered from old ClickHouse resources:
//   api/packages/quiz/quiz.php, quiz_set.php, exam.php, topic.php, notes.php

// A single question in the question bank.
// Old `quiz` stored question/answer/solution/correct_ans/marks inside a JSON `extra`
// column. We keep `answer` (the options array) and the open `extra` blob as jsonb,
// but promote the first-class fields to real columns so they are queryable/typed.
export const Quiz = defineResource({
  name: 'quiz',
  table: 'Quiz',
  label: 'Question',
  labelPlural: 'Questions',
  group: 'LMS',
  icon: 'help',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    topicId: { type: 'relation', label: 'Topic', options: { resource: 'topic', labelField: 'name' }, required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    quesLevel: { type: 'enum', label: 'Level', options: { easy: 'Easy', medium: 'Medium', hard: 'Hard' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    quesLang: { type: 'enum', label: 'Language', options: { english: 'English', hindi: 'Hindi' }, default: 'english', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    quesType: { type: 'enum', label: 'Type', options: { mcq: 'MCQ', single_answer: 'Single Answer', one_direction: 'One Direction', multiple_correct: 'Multiple Correct', paper: 'Question Paper' }, default: 'mcq', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    question: { type: 'richtext', label: 'Question', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { searchable: true } },
    answer: { type: 'json', label: 'Answer Options', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    correctAns: { type: 'string', label: 'Correct Option', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    solution: { type: 'richtext', label: 'Solution', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    marks: { type: 'int', label: 'Marks', default: 1, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    quesTag: { type: 'tags', label: 'Question Tags', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    examTag: { type: 'tags', label: 'Exam Tags', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', pending: 'Pending', inactive: 'Inactive', hidden: 'Hidden' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    likeCount: { type: 'int', label: 'Likes', default: 0, visible: ['list', 'get'] },
    extra: { type: 'json', label: 'Extra', editable: ['create', 'update'], visible: ['get'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['question', 'topicId', 'quesLevel', 'quesType', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['topicId', 'quesLevel', 'quesType', 'status'],
});

// A curated set/booklet of questions (old `quiz_set`).
export const QuizSet = defineResource({
  name: 'quizset',
  table: 'QuizSet',
  label: 'Quiz Set',
  labelPlural: 'Quiz Sets',
  group: 'LMS',
  icon: 'layers',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 }, unique: true, ui: { columns: true, searchable: true } },
    topicId: { type: 'relation', label: 'Primary Topic', options: { resource: 'topic', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    topicList: { type: 'json', label: 'Topic List', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    numQuiz: { type: 'int', label: 'Question Count', default: 0, visible: ['list', 'get'] },
    description: { type: 'text', label: 'Description', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden', draft: 'Draft' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['name', 'topicId', 'numQuiz', 'status'], defaultSort: 'name', pageSize: 50 },
  filters: ['topicId', 'status'],
  webView: { landing: true, slugField: 'name', detail: true },
});

// An exam (hierarchical: boards/classes/subjects). Old `exams` with self `parentid`.
export const Exam = defineResource({
  name: 'exam',
  table: 'Exam',
  label: 'Exam',
  labelPlural: 'Exams',
  group: 'LMS',
  icon: 'award',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 }, unique: true, ui: { columns: true, searchable: true } },
    parentId: { type: 'relation', label: 'Parent Exam', options: { resource: 'exam', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get'] },
    topicId: { type: 'relation', label: 'Topic', options: { resource: 'topic', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    examType: { type: 'tags', label: 'Exam Type', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    examGroup: { type: 'tags', label: 'Exam Group', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    seoGroup: { type: 'tags', label: 'SEO Group', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden', pending: 'Pending' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    extra: { type: 'json', label: 'Extra', editable: ['create', 'update'], visible: ['get'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['name', 'examType', 'status'], defaultSort: 'name', pageSize: 50 },
  filters: ['parentId', 'status'],
});

// A study note attached to a topic (old `notes`).
export const Note = defineResource({
  name: 'note',
  table: 'Note',
  label: 'Note',
  labelPlural: 'Notes',
  group: 'LMS',
  icon: 'file',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    title: { type: 'string', label: 'Title', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 }, ui: { columns: true, searchable: true } },
    topicId: { type: 'relation', label: 'Topic', options: { resource: 'topic', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    body: { type: 'richtext', label: 'Body', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    order: { type: 'int', label: 'Order', default: 0, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden', draft: 'Draft' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['title', 'topicId', 'order', 'status'], defaultSort: 'order', pageSize: 50 },
  filters: ['topicId', 'status'],
});

// ---- LMS: delivery + engagement (Phase 22, continued) ----

// Live class / webinar (old `liveclass`).
export const LiveClass = defineResource({
  name: 'liveclass',
  table: 'LiveClass',
  label: 'Live Class',
  labelPlural: 'Live Classes',
  group: 'LMS',
  icon: 'video',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    title: { type: 'string', label: 'Title', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 }, ui: { columns: true, searchable: true } },
    description: { type: 'text', label: 'Description', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    instructor: { type: 'string', label: 'Instructor', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    link: { type: 'url', label: 'Stream Link', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    image: { type: 'media', label: 'Cover', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    datetime: { type: 'datetime', label: 'Starts At', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    duration: { type: 'int', label: 'Duration (s)', default: 0, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    subject: { type: 'string', label: 'Subject', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    topicId: { type: 'relation', label: 'Topic', options: { resource: 'topic', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    series: { type: 'string', label: 'Series', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    session: { type: 'string', label: 'Session', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    recordings: { type: 'json', label: 'Recordings', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    tags: { type: 'tags', label: 'Tags', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden', draft: 'Draft' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['title', 'instructor', 'datetime', 'status'], defaultSort: 'datetime', pageSize: 50 },
  filters: ['topicId', 'status', 'series'],
  webView: { landing: true, slugField: 'title', detail: true },
});

// Recorded video (old `videolist`).
export const VideoList = defineResource({
  name: 'videolist',
  table: 'VideoList',
  label: 'Video',
  labelPlural: 'Videos',
  group: 'LMS',
  icon: 'play',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    title: { type: 'string', label: 'Title', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 }, ui: { columns: true, searchable: true } },
    topicId: { type: 'relation', label: 'Topic', options: { resource: 'topic', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    vid: { type: 'string', label: 'Internal VID', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    ytVid: { type: 'string', label: 'YouTube ID', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    hlsVid: { type: 'string', label: 'HLS ID', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    mirrors: { type: 'json', label: 'Mirror URLs', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    content: { type: 'richtext', label: 'Description', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    priority: { type: 'int', label: 'Priority', default: 0, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    length: { type: 'int', label: 'Length (s)', default: 0, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    ecomPlan: { type: 'json', label: 'E-com Plan', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    tags: { type: 'tags', label: 'Tags', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden', draft: 'Draft' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['title', 'topicId', 'priority', 'status'], defaultSort: 'priority', pageSize: 50 },
  filters: ['topicId', 'status'],
  webView: { landing: true, slugField: 'title', detail: true },
});

// Comment on a question (old `comments` where type='question').
export const QuizComment = defineResource({
  name: 'quizcomment',
  table: 'QuizComment',
  label: 'Quiz Comment',
  labelPlural: 'Quiz Comments',
  group: 'LMS',
  icon: 'comment',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    qid: { type: 'relation', label: 'Question', options: { resource: 'quiz', labelField: 'question' }, required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    uid: { type: 'relation', label: 'User', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    email: { type: 'string', label: 'Email', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    comment: { type: 'text', label: 'Comment', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    url: { type: 'url', label: 'URL', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    likeCount: { type: 'int', label: 'Likes', default: 0, visible: ['list', 'get'] },
    upvote: { type: 'int', label: 'Upvotes', default: 0, visible: ['list', 'get'] },
    downvote: { type: 'int', label: 'Downvotes', default: 0, visible: ['list', 'get'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', pending: 'Pending', hidden: 'Hidden', spam: 'Spam' }, default: 'pending', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['qid', 'name', 'likeCount', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['qid', 'status'],
});

// Current affairs snippet (old `currentaffairs`, quiz_exp).
export const CurrentAffairs = defineResource({
  name: 'currentaffairs',
  table: 'CurrentAffairs',
  label: 'Current Affair',
  labelPlural: 'Current Affairs',
  group: 'LMS',
  icon: 'newspaper',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    title: { type: 'string', label: 'Title', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { min: 1 }, ui: { columns: true, searchable: true } },
    link: { type: 'url', label: 'Source Link', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    date: { type: 'date', label: 'Published Date', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden', draft: 'Draft' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['title', 'date', 'status'], defaultSort: 'date', pageSize: 50 },
  filters: ['status'],
});

// ---- Network admin domain (Phase 23) ----
// Reverse-engineered from old ClickHouse network/* packages. `password` fields
// are intentionally omitted — auth lives on the User model, not generic CRUD.

// Invoice (old network/invoice).
export const Invoice = defineResource({
  name: 'invoice',
  table: 'Invoice',
  label: 'Invoice',
  labelPlural: 'Invoices',
  group: 'Network',
  icon: 'receipt',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    title: { type: 'string', label: 'Title', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    amount: { type: 'float', label: 'Amount', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true } },
    date: { type: 'date', label: 'Date', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    period: { type: 'string', label: 'Period', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    type: { type: 'enum', label: 'Type', options: { subscription: 'Subscription', commission: 'Commission', refund: 'Refund', other: 'Other' }, default: 'subscription', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    status: { type: 'enum', label: 'Status', options: { paid: 'Paid', pending: 'Pending', cancelled: 'Cancelled', overdue: 'Overdue' }, default: 'pending', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    uid: { type: 'relation', label: 'User', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    affiliateName: { type: 'string', label: 'Affiliate', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    payment: { type: 'json', label: 'Payment', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    message: { type: 'text', label: 'Message', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    extra: { type: 'json', label: 'Extra', editable: ['create', 'update'], visible: ['get'] },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['title', 'amount', 'status', 'date'], defaultSort: 'date', pageSize: 50 },
  filters: ['status', 'type', 'uid'],
});

// Support ticket (old network/ticket).
export const Ticket = defineResource({
  name: 'ticket',
  table: 'Ticket',
  label: 'Ticket',
  labelPlural: 'Tickets',
  group: 'Network',
  icon: 'life-buoy',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    title: { type: 'string', label: 'Title', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    message: { type: 'text', label: 'Message', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    parent: { type: 'relation', label: 'Parent Ticket', options: { resource: 'ticket', labelField: 'title' }, editable: ['create', 'update'], visible: ['list', 'get'] },
    priority: { type: 'enum', label: 'Priority', options: { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }, default: 'medium', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    status: { type: 'enum', label: 'Status', options: { open: 'Open', pending: 'Pending', resolved: 'Resolved', closed: 'Closed' }, default: 'open', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    type: { type: 'enum', label: 'Type', options: { general: 'General', billing: 'Billing', technical: 'Technical', affiliate: 'Affiliate' }, default: 'general', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    uid: { type: 'relation', label: 'User', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    uploads: { type: 'json', label: 'Attachments', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    affiliateName: { type: 'string', label: 'Affiliate', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['title', 'priority', 'status', 'uid'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status', 'priority', 'type', 'uid'],
});

// Staff member (old network/staff). Password omitted — auth on User.
export const Staff = defineResource({
  name: 'staff',
  table: 'Staff',
  label: 'Staff',
  labelPlural: 'Staff',
  group: 'Network',
  icon: 'users',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], unique: true, ui: { columns: true, searchable: true } },
    email: { type: 'string', label: 'Email', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { email: true } },
    title: { type: 'string', label: 'Title', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    department: { type: 'string', label: 'Department', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    managerName: { type: 'string', label: 'Manager', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    skype: { type: 'string', label: 'Skype', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    wechat: { type: 'string', label: 'WeChat', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    image: { type: 'media', label: 'Photo', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    address: { type: 'text', label: 'Address', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    payment: { type: 'json', label: 'Payment', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    permissions: { type: 'json', label: 'Permissions', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    comment: { type: 'text', label: 'Comment', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', inactive: 'Inactive' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['name', 'title', 'department', 'status'], defaultSort: 'name', pageSize: 50 },
  filters: ['status', 'department'],
});

// Domain (old network/domain).
export const Domain = defineResource({
  name: 'domain',
  table: 'Domain',
  label: 'Domain',
  labelPlural: 'Domains',
  group: 'Network',
  icon: 'globe',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], unique: true, ui: { columns: true, searchable: true } },
    type: { type: 'enum', label: 'Type', options: { primary: 'Primary', parked: 'Parked', redirect: 'Redirect' }, default: 'primary', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    scheme: { type: 'enum', label: 'Scheme', options: { http: 'HTTP', https: 'HTTPS' }, default: 'https', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', inactive: 'Inactive' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    processStatus: { type: 'enum', label: 'Process', options: { live: 'Live', pending: 'Pending', suspended: 'Suspended' }, default: 'live', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    hidden: { type: 'bool', label: 'Hidden', default: false, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    comment: { type: 'text', label: 'Comment', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['name', 'type', 'status', 'processStatus'], defaultSort: 'name', pageSize: 50 },
  filters: ['status', 'type'],
});

// Feature module (old network/module).
export const Module = defineResource({
  name: 'module',
  table: 'Module',
  label: 'Module',
  labelPlural: 'Modules',
  group: 'Network',
  icon: 'grid',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], unique: true, ui: { columns: true, searchable: true } },
    parent: { type: 'relation', label: 'Parent Module', options: { resource: 'module', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get'] },
    subscriptionType: { type: 'enum', label: 'Subscription', options: { free: 'Free', paid: 'Paid', enterprise: 'Enterprise' }, default: 'free', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    resultFormat: { type: 'string', label: 'Result Format', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    newStatus: { type: 'string', label: 'New Status', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['name', 'subscriptionType', 'parent'], defaultSort: 'name', pageSize: 50 },
  filters: ['subscriptionType'],
});

// Subscriber (old network/subscriber) — marketing/CRM contact.
export const Subscriber = defineResource({
  name: 'subscriber',
  table: 'Subscriber',
  label: 'Subscriber',
  labelPlural: 'Subscribers',
  group: 'Network',
  icon: 'mail',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    email: { type: 'string', label: 'Email', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { email: true }, ui: { columns: true, filterable: true } },
    phone: { type: 'string', label: 'Phone', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    city: { type: 'string', label: 'City', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    state: { type: 'string', label: 'State', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    country: { type: 'string', label: 'Country', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    gender: { type: 'enum', label: 'Gender', options: { m: 'Male', f: 'Female', o: 'Other' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    dob: { type: 'date', label: 'DOB', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    avatar: { type: 'media', label: 'Avatar', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    refid: { type: 'string', label: 'Ref ID', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    verified: { type: 'bool', label: 'Verified', default: false, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', inactive: 'Inactive', blocked: 'Blocked' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    extra: { type: 'json', label: 'Extra', editable: ['create', 'update'], visible: ['get'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['name', 'email', 'city', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status', 'country'],
});

// Event (old network/event).
export const Event = defineResource({
  name: 'event',
  table: 'Event',
  label: 'Event',
  labelPlural: 'Events',
  group: 'Network',
  icon: 'calendar',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    email: { type: 'string', label: 'Email', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { email: true } },
    phone: { type: 'string', label: 'Phone', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    reason: { type: 'text', label: 'Reason', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    tags: { type: 'tags', label: 'Tags', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    uid: { type: 'relation', label: 'User', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    status: { type: 'enum', label: 'Status', options: { new: 'New', contacted: 'Contacted', done: 'Done', cancelled: 'Cancelled' }, default: 'new', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['name', 'email', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status'],
});

// Notice / notification (old network/notice).
export const Notice = defineResource({
  name: 'notice',
  table: 'Notice',
  label: 'Notice',
  labelPlural: 'Notices',
  group: 'Network',
  icon: 'bell',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    message: { type: 'text', label: 'Message', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    type: { type: 'enum', label: 'Type', options: { email: 'Email', sms: 'SMS', push: 'Push', inapp: 'In-App' }, default: 'inapp', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    subtype: { type: 'string', label: 'Subtype', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    fromid: { type: 'relation', label: 'From', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get'] },
    toid: { type: 'relation', label: 'To', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['list', 'get'] },
    totype: { type: 'enum', label: 'To Type', options: { user: 'User', staff: 'Staff', publisher: 'Publisher' }, default: 'user', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    readtime: { type: 'datetime', label: 'Read At', visible: ['list', 'get'] },
    status: { type: 'enum', label: 'Status', options: { sent: 'Sent', delivered: 'Delivered', failed: 'Failed', read: 'Read' }, default: 'sent', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    extra: { type: 'json', label: 'Extra', editable: ['create', 'update'], visible: ['get'] },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['message', 'type', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status', 'type'],
});

// ---- Publisher admin domain (Phase 23) ----
// Publisher profile (old publisher/profile). Password omitted — auth on User.
export const PublisherProfile = defineResource({
  name: 'publisherprofile',
  table: 'PublisherProfile',
  label: 'Publisher',
  labelPlural: 'Publishers',
  group: 'Publisher',
  icon: 'building',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], unique: true, ui: { columns: true, searchable: true } },
    companyname: { type: 'string', label: 'Company', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    email: { type: 'string', label: 'Email', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], validate: { email: true } },
    phone: { type: 'string', label: 'Phone', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    website: { type: 'url', label: 'Website', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    address: { type: 'text', label: 'Address', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    city: { type: 'string', label: 'City', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    avatar: { type: 'media', label: 'Logo', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    skype: { type: 'string', label: 'Skype', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    payment: { type: 'json', label: 'Payment', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    paymentMethod: { type: 'string', label: 'Payment Method', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    points: { type: 'int', label: 'Points', default: 0, visible: ['list', 'get'] },
    verified: { type: 'bool', label: 'Verified', default: false, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['name', 'status'], defaultSort: 'name', pageSize: 50 },
  filters: ['status'],
});

// Blog category (old blog/blog_categories).
export const BlogCategory = defineResource({
  name: 'blogcategory',
  table: 'BlogCategory',
  label: 'Blog Category',
  labelPlural: 'Blog Categories',
  group: 'Blog',
  icon: 'folder',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    slug: { type: 'string', label: 'Slug', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    image: { type: 'url', label: 'Image', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    type: { type: 'string', label: 'Type', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['name', 'type', 'status'], defaultSort: 'name', pageSize: 50 },
  filters: ['status'],
});

// Blog comment (old blog/comment).
export const BlogComment = defineResource({
  name: 'blogcomment',
  table: 'BlogComment',
  label: 'Blog Comment',
  labelPlural: 'Blog Comments',
  group: 'Blog',
  icon: 'message',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    email: { type: 'string', label: 'Email', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    comment: { type: 'text', label: 'Comment', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    postId: { type: 'string', label: 'Post', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    authorId: { type: 'relation', label: 'Author', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['get'] },
    status: { type: 'enum', label: 'Status', options: { pending: 'Pending', approved: 'Approved', spam: 'Spam' }, default: 'pending', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['name', 'postId', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status'],
});

// User Q&A (old quiz/ask_question).
export const AskQuestion = defineResource({
  name: 'askquestion',
  table: 'AskQuestion',
  label: 'Asked Question',
  labelPlural: 'Asked Questions',
  group: 'Support',
  icon: 'help',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    question: { type: 'text', label: 'Question', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    userId: { type: 'relation', label: 'User', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['get'] },
    status: { type: 'enum', label: 'Status', options: { pending: 'Pending', answered: 'Answered', closed: 'Closed' }, default: 'pending', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['question', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status'],
});

// Reported problems (old quiz/raise_problem).
export const RaiseProblem = defineResource({
  name: 'raiseproblem',
  table: 'RaiseProblem',
  label: 'Reported Problem',
  labelPlural: 'Reported Problems',
  group: 'Support',
  icon: 'alert',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    issue: { type: 'text', label: 'Issue', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    problem: { type: 'text', label: 'Problem', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    quizId: { type: 'relation', label: 'Quiz', options: { resource: 'quiz', labelField: 'question' }, editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    url: { type: 'url', label: 'URL', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    userName: { type: 'string', label: 'User Name', editable: ['create', 'update'], visible: ['list', 'get'] },
    userId: { type: 'relation', label: 'User', options: { resource: 'user', labelField: 'name' }, editable: ['create', 'update'], visible: ['get'] },
    status: { type: 'enum', label: 'Status', options: { pending: 'Pending', resolved: 'Resolved', rejected: 'Rejected' }, default: 'pending', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['issue', 'quizId', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status'],
});

// Success stories (old blog/story / wstories).
export const SuccessStory = defineResource({
  name: 'successstory',
  table: 'SuccessStory',
  label: 'Success Story',
  labelPlural: 'Success Stories',
  group: 'CMS',
  icon: 'star',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Title', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    author: { type: 'string', label: 'Author', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    description: { type: 'text', label: 'Description', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    image: { type: 'url', label: 'Image', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    tags: { type: 'tags', label: 'Tags', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    brand: { type: 'string', label: 'Brand', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', hidden: 'Hidden' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
    publishedAt: { type: 'datetime', label: 'Published At', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'] },
  },
  scopes: { admin: { access: 'network' } },
  listView: { columns: ['name', 'author', 'status'], defaultSort: 'createdAt', pageSize: 50 },
  filters: ['status'],
});

// Publisher API token (old publisher/token).
export const PublisherToken = defineResource({
  name: 'publishertoken',
  table: 'PublisherToken',
  label: 'Publisher Token',
  labelPlural: 'Publisher Tokens',
  group: 'Publisher',
  icon: 'key',
  fields: {
    id: { type: 'uuid', label: 'ID', generated: true, visible: ['list', 'get'] },
    name: { type: 'string', label: 'Name', required: ['create'], editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, searchable: true } },
    token: { type: 'string', label: 'Token', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    apps: { type: 'json', label: 'Apps', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    domains: { type: 'json', label: 'Domains', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    ips: { type: 'json', label: 'IPs', editable: ['create', 'update'], visible: ['get', 'create', 'update'] },
    status: { type: 'enum', label: 'Status', options: { active: 'Active', inactive: 'Inactive' }, default: 'active', editable: ['create', 'update'], visible: ['list', 'get', 'create', 'update'], ui: { columns: true, filterable: true } },
  },
  scopes: { admin: { access: 'network' }, publisher: { access: 'publisher' } },
  listView: { columns: ['name', 'status'], defaultSort: 'name', pageSize: 50 },
  filters: ['status'],
});
