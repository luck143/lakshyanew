import { z } from 'zod';
export const tenantCreateSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(3),
  settings: z.any().optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["network","publisher","user"] as [string, ...string[]]).optional(),
  roles: z.any().optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(["active","inactive","banned"] as [string, ...string[]]).optional(),
});

export const topicCreateSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().optional(),
  status: z.enum(["active","hidden","pending"] as [string, ...string[]]).optional(),
  content: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const blogpostCreateSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1),
  body: z.string().optional(),
  status: z.enum(["draft","published","archived"] as [string, ...string[]]).optional(),
  tags: z.array(z.string()).optional(),
  authorId: z.string().optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1),
  status: z.enum(["active","hidden"] as [string, ...string[]]).optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const productCreateSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().optional(),
  status: z.enum(["active","hidden","out_of_stock"] as [string, ...string[]]).optional(),
  categoryId: z.string().optional(),
  sku: z.string().optional(),
  stock: z.number().int().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const roleCreateSchema = z.object({
  key: z.string().min(1),
  name: z.string(),
  soms: z.any().optional(),
  status: z.enum(["active","inactive"] as [string, ...string[]]).optional(),
});

export const orderCreateSchema = z.object({
  userId: z.string().optional(),
  status: z.enum(["pending","paid","shipped","cancelled"] as [string, ...string[]]).optional(),
  total: z.number().optional(),
  currency: z.string().optional(),
});

export const orderitemCreateSchema = z.object({
  orderId: z.string().optional(),
  productId: z.string().optional(),
  qty: z.number().int().optional(),
  price: z.number().optional(),
});

export const mediaCreateSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().int().optional(),
  path: z.string().optional(),
  createdAt: z.string().optional(),
  variants: z.string().optional(),
});

export const reviewCreateSchema = z.object({
  productId: z.string(),
  userId: z.string().optional(),
  rating: z.number().int().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(["pending","approved","rejected"] as [string, ...string[]]).optional(),
  createdAt: z.string().optional(),
});

export const cartCreateSchema = z.object({
  userId: z.string().optional(),
  status: z.enum(["active","converted","abandoned"] as [string, ...string[]]).optional(),
  createdAt: z.string().optional(),
});

export const cartitemCreateSchema = z.object({
  cartId: z.string(),
  productId: z.string(),
  qty: z.number().int().optional(),
  price: z.number().optional(),
});

export const couponCreateSchema = z.object({
  code: z.string(),
  description: z.string().optional(),
  type: z.enum(["percent","fixed"] as [string, ...string[]]).optional(),
  value: z.number().optional(),
  minAmount: z.number().optional(),
  maxUses: z.number().int().optional(),
  usedCount: z.number().int().optional(),
  status: z.enum(["active","inactive","expired"] as [string, ...string[]]).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const subscriptionCreateSchema = z.object({
  userId: z.string(),
  plan: z.string(),
  status: z.enum(["trialing","active","past_due","canceled"] as [string, ...string[]]).optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  interval: z.enum(["month","year"] as [string, ...string[]]).optional(),
  currentPeriodEnd: z.string().optional(),
  canceledAt: z.string().optional(),
  createdAt: z.string().optional(),
});

export const contactCreateSchema = z.object({
  ownerId: z.string().optional(),
  firstName: z.string(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["lead","prospect","customer","churned"] as [string, ...string[]]).optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
});

export const mediavariantCreateSchema = z.object({
  mediaId: z.string(),
  format: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  path: z.string().optional(),
  size: z.number().int().optional(),
  createdAt: z.string().optional(),
});

export const settingCreateSchema = z.object({
  key: z.string(),
  value: z.any(),
  group: z.string().optional(),
  label: z.string().optional(),
  updatedAt: z.string().optional(),
});
