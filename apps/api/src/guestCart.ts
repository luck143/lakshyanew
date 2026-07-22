// apps/api/src/guestCart.ts
// Public guest-cart API for the storefront (no auth). Carts are tenant-scoped and keyed by an
// opaque cart id returned to the client (stored in a cookie). Reuses the Cart/CartItem models.
import { prisma } from './crud.js';
import { ApiError } from './crud.js';

function tenantOf(req: any): string {
  return (req.headers['x-tenant'] as string) || process.env.DEFAULT_TENANT || 'default';
}

export async function createGuestCart(tenantId: string) {
  return prisma.cart.create({ data: { tenantId, status: 'active' } });
}

export async function getGuestCart(tenantId: string, cartId: string) {
  const cart = await prisma.cart.findFirst({
    where: { id: cartId, tenantId },
    include: { items: { include: { product: { select: { id: true, title: true, slug: true, price: true } } } } },
  });
  if (!cart) throw new ApiError(404, 'Cart not found');
  return cart;
}

export async function addGuestCartItem(tenantId: string, cartId: string, productId: string, qty: number) {
  const cart = await prisma.cart.findFirst({ where: { id: cartId, tenantId } });
  if (!cart) throw new ApiError(404, 'Cart not found');
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId, status: 'active' } });
  if (!product) throw new ApiError(404, 'Product not found');
  const existing = await prisma.cartItem.findFirst({ where: { cartId, productId } });
  if (existing) {
    return prisma.cartItem.update({ where: { id: existing.id }, data: { qty: existing.qty + qty } });
  }
  return prisma.cartItem.create({ data: { cartId, tenantId, productId, qty, price: product.price } });
}

export async function removeGuestCartItem(tenantId: string, cartId: string, itemId: string) {
  const cart = await prisma.cart.findFirst({ where: { id: cartId, tenantId } });
  if (!cart) throw new ApiError(404, 'Cart not found');
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  return { ok: true };
}

export async function checkoutGuestCart(tenantId: string, cartId: string, currency = 'INR') {
  const cart = await prisma.cart.findFirst({
    where: { id: cartId, tenantId },
    include: { items: { include: { product: { select: { id: true, title: true, price: true } } } } },
  });
  if (!cart) throw new ApiError(404, 'Cart not found');
  if (cart.items.length === 0) throw new ApiError(422, 'Cart is empty');
  const total = cart.items.reduce((s, it) => s + (it.price || 0) * it.qty, 0);
  const order = await prisma.order.create({
    data: {
      tenantId,
      status: 'pending',
      total,
      currency,
      items: {
        create: cart.items.map((it) => ({
          tenantId,
          productId: it.productId,
          qty: it.qty,
          price: it.price,
        })),
      },
    },
    include: { items: true },
  });
  await prisma.cart.update({ where: { id: cartId }, data: { status: 'converted' } });
  return order;
}
