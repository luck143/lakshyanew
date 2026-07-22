export interface Tenant {
  id?: string;
  name: string;
  domain: string;
  settings?: unknown;
}

export interface User {
  id?: string;
  email: string;
  name?: string;
  role?: string;
  roles?: unknown;
  permissions?: string[];
  status?: string;
}

export interface Topic {
  id?: string;
  name: string;
  parentId?: string;
  status?: string;
  content?: string;
  sortOrder?: number;
}

export interface Blogpost {
  id?: string;
  title: string;
  slug: string;
  body?: string;
  status?: string;
  tags?: string[];
  authorId?: string;
}

export interface Category {
  id?: string;
  name: string;
  slug: string;
  status?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface Product {
  id?: string;
  title: string;
  slug: string;
  description?: string;
  price?: number;
  status?: string;
  categoryId?: string;
  sku?: string;
  stock?: number;
  cover?: string;
  tags?: string[];
}

export interface Role {
  id?: string;
  key: string;
  name: string;
  soms?: unknown;
  status?: string;
}

export interface Order {
  id?: string;
  userId?: string;
  status?: string;
  total?: number;
  currency?: string;
}

export interface Orderitem {
  id?: string;
  orderId?: string;
  productId?: string;
  qty?: number;
  price?: number;
}

export interface Media {
  id?: string;
  name: string;
  url?: string;
  mimeType?: string;
  size?: number;
  path?: string;
  createdAt?: string;
  variants?: string;
}

export interface Review {
  id?: string;
  productId: string;
  userId?: string;
  rating?: number;
  title?: string;
  body?: string;
  status?: string;
  createdAt?: string;
}

export interface Cart {
  id?: string;
  userId?: string;
  status?: string;
  createdAt?: string;
}

export interface Cartitem {
  id?: string;
  cartId: string;
  productId: string;
  qty?: number;
  price?: number;
}

export interface Coupon {
  id?: string;
  code: string;
  description?: string;
  type?: string;
  value?: number;
  minAmount?: number;
  maxUses?: number;
  usedCount?: number;
  status?: string;
  startsAt?: string;
  expiresAt?: string;
}

export interface Subscription {
  id?: string;
  userId: string;
  plan: string;
  status?: string;
  amount?: number;
  currency?: string;
  interval?: string;
  currentPeriodEnd?: string;
  canceledAt?: string;
  createdAt?: string;
}

export interface Contact {
  id?: string;
  ownerId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  status?: string;
  notes?: string;
  createdAt?: string;
}

export interface Mediavariant {
  id?: string;
  mediaId: string;
  format?: string;
  width?: number;
  height?: number;
  path?: string;
  size?: number;
  createdAt?: string;
}

export interface Setting {
  id?: string;
  key: string;
  value: unknown;
  group?: string;
  label?: string;
  updatedAt?: string;
}
