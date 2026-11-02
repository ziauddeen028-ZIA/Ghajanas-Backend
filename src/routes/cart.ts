import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * Helper: Ensures a Profile exists for the customer to satisfy the foreign key,
 * and retrieves or creates their unique persistent Cart.
 */
async function getOrCreateCustomerCart(userId: string, userMeta?: any) {
  // 1. Ensure Profile row exists for userId
  await prisma.profile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      fullName: userMeta?.full_name || 'Valued Customer',
      phone: userMeta?.phone || '',
      addressLine: '',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      pincode: '',
    },
  });

  // 2. Find or create Cart
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }

  return cart;
}

/**
 * Helper: Formats all items in a cart into the frontend CartItem structure,
 * validating active status and live database prices.
 */
async function getFormattedCartItems(cartId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      product: {
        include: {
          category: {
            select: { name: true, slug: true },
          },
        },
      },
      variant: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Filter out any items where product or variant was permanently removed or deactivated
  const validItems = [];
  const invalidItemIds: string[] = [];

  for (const item of items) {
    if (!item.product || !item.variant || !item.product.isActive || !item.variant.isActive) {
      invalidItemIds.push(item.id);
      continue;
    }

    validItems.push({
      productId: item.productId,
      productName: item.product.name,
      tamilName: item.product.tamilName || undefined,
      productImage: item.product.images[0] || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
      categoryName: item.product.category?.name || 'Traditional Essentials',
      selectedWeight: {
        id: item.variant.id,
        label: item.variant.label,
        price: Number(item.variant.price),
        originalPrice: item.variant.originalPrice ? Number(item.variant.originalPrice) : undefined,
        inStock: item.variant.inStock && item.variant.stock > 0,
        stockCount: item.variant.stock,
      },
      quantity: item.quantity,
    });
  }

  // Clean up any stale/deactivated cart items in the background
  if (invalidItemIds.length > 0) {
    prisma.cartItem.deleteMany({
      where: { id: { in: invalidItemIds } },
    }).catch((err) => console.error('Failed to prune stale cart items:', err));
  }

  return validItems;
}

/**
 * GET /api/cart
 * Retrieves the persistent cart for the authenticated customer.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const cart = await getOrCreateCustomerCart(userId, req.user!.user_metadata);
    const items = await getFormattedCartItems(cart.id);

    res.json({
      cart: items,
      totalCount: items.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error: any) {
    console.error('Error fetching customer cart:', error);
    res.status(500).json({ error: 'Failed to retrieve your cart from database.' });
  }
});

/**
 * POST /api/cart/items
 * Adds a product variant with specified quantity to the authenticated customer's cart.
 * Validates product active status, variant existence, price, and available inventory.
 */
router.post('/items', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId, variantId, quantity = 1 } = req.body;

    if (!productId || typeof productId !== 'string') {
      res.status(400).json({ error: 'productId is required.' });
      return;
    }

    if (!variantId || typeof variantId !== 'string') {
      res.status(400).json({ error: 'variantId is required.' });
      return;
    }

    const qty = parseInt(String(quantity), 10);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ error: 'Quantity must be at least 1.' });
      return;
    }

    // 1. Validate Product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      res.status(404).json({ error: 'The selected product is currently unavailable.' });
      return;
    }

    // 2. Validate ProductVariant & Stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant || variant.productId !== productId || !variant.isActive) {
      res.status(404).json({ error: 'The selected weight variant does not exist for this product.' });
      return;
    }

    if (!variant.inStock || variant.stock <= 0) {
      res.status(400).json({
        error: `Variant "${variant.label}" of ${product.name} is currently out of stock.`,
      });
      return;
    }

    // 3. Get customer's cart
    const cart = await getOrCreateCustomerCart(userId, req.user!.user_metadata);

    // 4. Check existing cart item for this variant
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_variantId: {
          cartId: cart.id,
          productId,
          variantId,
        },
      },
    });

    const targetQuantity = existingItem ? existingItem.quantity + qty : qty;

    if (targetQuantity > variant.stock) {
      res.status(400).json({
        error: `Cannot add ${qty} more. Only ${variant.stock} units of "${variant.label}" are available in stock.`,
        availableStock: variant.stock,
      });
      return;
    }

    // 5. Upsert CartItem
    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: targetQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId,
          quantity: qty,
        },
      });
    }

    // 6. Return updated cart
    const updatedItems = await getFormattedCartItems(cart.id);

    res.json({
      message: `Added ${qty}x ${product.name} (${variant.label}) to cart.`,
      cart: updatedItems,
      totalCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error: any) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart. Please try again.' });
  }
});

/**
 * PUT /api/cart/items/:variantId
 * Updates the quantity for a specific variant in the customer's cart.
 * If quantity <= 0, deletes the item.
 */
router.put('/items/:variantId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { variantId } = req.params;
    const { quantity } = req.body;

    const qty = parseInt(String(quantity), 10);
    if (isNaN(qty)) {
      res.status(400).json({ error: 'Valid quantity number is required.' });
      return;
    }

    const targetVariantId = String(variantId);
    const cart = await getOrCreateCustomerCart(userId, req.user!.user_metadata);

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantId: targetVariantId,
      },
    });

    if (!existingItem) {
      res.status(404).json({ error: 'Cart item not found.' });
      return;
    }

    if (qty <= 0) {
      // Remove item
      await prisma.cartItem.delete({
        where: { id: existingItem.id },
      });
    } else {
      // Validate inventory stock
      const variant = await prisma.productVariant.findUnique({
        where: { id: targetVariantId },
      });

      if (!variant || !variant.isActive) {
        res.status(404).json({ error: 'Product variant is no longer available.' });
        return;
      }

      if (qty > variant.stock) {
        res.status(400).json({
          error: `Requested quantity (${qty}) exceeds available stock (${variant.stock}).`,
          availableStock: variant.stock,
        });
        return;
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: qty },
      });
    }

    const updatedItems = await getFormattedCartItems(cart.id);

    res.json({
      message: 'Cart updated successfully.',
      cart: updatedItems,
      totalCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error: any) {
    console.error('Error updating cart item quantity:', error);
    res.status(500).json({ error: 'Failed to update item quantity.' });
  }
});

/**
 * DELETE /api/cart/items/:variantId
 * Removes an item variant from the customer's cart.
 */
router.delete('/items/:variantId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const targetVariantId = String(req.params.variantId);

    const cart = await getOrCreateCustomerCart(userId, req.user!.user_metadata);

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        variantId: targetVariantId,
      },
    });

    const updatedItems = await getFormattedCartItems(cart.id);

    res.json({
      message: 'Item removed from cart.',
      cart: updatedItems,
      totalCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error: any) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ error: 'Failed to remove item from cart.' });
  }
});

/**
 * DELETE /api/cart
 * Clears the entire cart for the authenticated customer.
 */
router.delete('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const cart = await getOrCreateCustomerCart(userId, req.user!.user_metadata);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    res.json({
      message: 'Cart cleared successfully.',
      cart: [],
      totalCount: 0,
    });
  } catch (error: any) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart.' });
  }
});

export default router;
