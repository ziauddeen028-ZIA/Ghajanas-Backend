import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { Prisma } from '@prisma/client';

const router = Router();

// Free delivery threshold & standard fee constants
const FREE_DELIVERY_THRESHOLD = 500;
const STANDARD_DELIVERY_FEE = 40;

/**
 * Helper to format a database Order record into the frontend OrderDetails interface
 */
const formatOrder = (order: any) => {
  return {
    orderId: order.orderNumber,
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    userEmail: order.userEmail || undefined,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    discount: Number(order.discount),
    total: Number(order.total),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
    customer: {
      fullName: order.customerName,
      phone: order.customerPhone,
      alternatePhone: order.alternatePhone || undefined,
      addressLine: order.addressLine,
      landmark: order.landmark || undefined,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      deliveryNotes: order.deliveryNotes || undefined,
      paymentMethod: order.paymentMethod,
    },
    items: (order.items || []).map((item: any) => ({
      productId: item.productId || '',
      productName: item.productName,
      tamilName: item.tamilName || undefined,
      productImage: item.productImage,
      categoryName: item.categoryName,
      quantity: item.quantity,
      selectedWeight: {
        id: item.variantId || 'standard',
        label: item.variantLabel,
        price: Number(item.price),
        originalPrice: item.originalPrice !== null && item.originalPrice !== undefined ? Number(item.originalPrice) : undefined,
        inStock: true,
      },
    })),
  };
};

/**
 * GET /api/orders
 * Returns orders belonging EXCLUSIVELY to the authenticated customer, newest first.
 * Ownership is enforced from req.user.id. Client-supplied IDs are never trusted.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      orders: orders.map(formatOrder),
      count: orders.length,
    });
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ error: 'Failed to retrieve order history from database.' });
  }
});

/**
 * GET /api/orders/:orderId
 * Fetches single order details. Enforces ownership: only owner or admin can view.
 * Accepts either unique orderNumber (e.g. "NJ-...") or internal UUID id.
 */
router.get('/:orderId', requireAuth, async (req: Request, res: Response) => {
  try {
    const orderId = String(req.params.orderId);

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderNumber: orderId },
        ],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    // Ownership verification: user must own order or be admin
    const isOwner = order.userId === req.user!.id;
    const isAdmin = req.user!.isAdmin;

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Forbidden: You do not have access to view this order.' });
      return;
    }

    res.json({ order: formatOrder(order) });
  } catch (error: any) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Failed to retrieve order details.' });
  }
});

/**
 * POST /api/orders
 * Creates a new order attached strictly to req.user.id.
 * 1. Validates delivery address snapshot.
 * 2. Validates product availability and live inventory stock.
 * 3. Calculates totals securely on the backend using current database prices.
 * 4. Runs within an atomic Prisma database transaction.
 * 5. Freezes permanent snapshots of customer details and order items.
 * 6. Reduces product variant stock safely.
 * 7. Clears customer's database cart after order creation.
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email || null;
    const { items, customer, paymentMethod, discount = 0 } = req.body;

    // 1. Validate Items Array
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Order must include at least one item.' });
      return;
    }

    // 2. Validate Customer Address Snapshot
    if (!customer || !customer.fullName || !customer.phone || !customer.addressLine || !customer.pincode) {
      res.status(400).json({ error: 'Incomplete delivery address snapshot provided.' });
      return;
    }

    // 3. Validate Payment Method
    const validPaymentMethods = ['upi', 'cod', 'whatsapp_order'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      res.status(400).json({ error: 'Invalid payment method. Allowed: "upi", "cod", or "whatsapp_order".' });
      return;
    }

    const cleanPaymentMethod = paymentMethod === 'whatsapp_order' ? 'whatsapp_order' : paymentMethod;

    // 4. Validate all products and variants against live database before transaction
    interface ResolvedItem {
      productId: string;
      variantId: string;
      productName: string;
      tamilName?: string;
      productImage: string;
      categoryName: string;
      variantLabel: string;
      price: number;
      originalPrice?: number;
      quantity: number;
      lineTotal: number;
    }

    const resolvedItems: ResolvedItem[] = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const productId = String(item.productId);
      const variantId = String(item.selectedWeight?.id || item.variantId);
      const quantity = Math.max(1, parseInt(String(item.quantity), 10) || 1);

      if (!productId || !variantId) {
        res.status(400).json({ error: 'Each order item must specify productId and variantId.' });
        return;
      }

      // Fetch live product & variant from database
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: { select: { name: true } },
          variants: true,
        },
      });

      if (!product || !product.isActive) {
        res.status(400).json({
          error: `Product "${item.productName || productId}" is currently unavailable or inactive.`,
        });
        return;
      }

      const variant = product.variants.find((v) => v.id === variantId);

      if (!variant || !variant.isActive) {
        res.status(400).json({
          error: `The requested weight option for "${product.name}" is no longer available.`,
        });
        return;
      }

      // Stock check
      if (!variant.inStock || variant.stock < quantity) {
        res.status(400).json({
          error: `Insufficient stock for "${product.name}" (${variant.label}). Available: ${variant.stock}, Requested: ${quantity}.`,
          availableStock: variant.stock,
        });
        return;
      }

      const unitPrice = Number(variant.price);
      const lineTotal = unitPrice * quantity;
      calculatedSubtotal += lineTotal;

      resolvedItems.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        tamilName: product.tamilName || undefined,
        productImage: product.images[0] || 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
        categoryName: product.category?.name || 'Traditional Essentials',
        variantLabel: variant.label,
        price: unitPrice,
        originalPrice: variant.originalPrice ? Number(variant.originalPrice) : undefined,
        quantity,
        lineTotal,
      });
    }

    // 5. Calculate secure totals on backend
    const deliveryFee = calculatedSubtotal >= FREE_DELIVERY_THRESHOLD || calculatedSubtotal === 0 ? 0 : STANDARD_DELIVERY_FEE;
    const finalDiscount = Math.max(0, Number(discount) || 0);
    const calculatedTotal = Math.max(0, calculatedSubtotal + deliveryFee - finalDiscount);

    // 6. Generate unique orderNumber
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `NJ-${dateStr}-${randomSuffix}`;

    // 7. Execute order creation in an atomic Prisma transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 7a. Ensure Profile exists to satisfy foreign key constraint
      await tx.profile.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          fullName: String(customer.fullName).trim(),
          phone: String(customer.phone).trim(),
          alternatePhone: customer.alternatePhone ? String(customer.alternatePhone).trim() : null,
          addressLine: String(customer.addressLine).trim(),
          landmark: customer.landmark ? String(customer.landmark).trim() : null,
          city: String(customer.city || 'Tiruchirappalli').trim(),
          state: String(customer.state || 'Tamil Nadu').trim(),
          pincode: String(customer.pincode).trim(),
          deliveryNotes: customer.deliveryNotes ? String(customer.deliveryNotes).trim() : null,
        },
      });

      // 7b. Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          userEmail,
          customerName: String(customer.fullName).trim(),
          customerPhone: String(customer.phone).trim(),
          alternatePhone: customer.alternatePhone ? String(customer.alternatePhone).trim() : null,
          addressLine: String(customer.addressLine).trim(),
          landmark: customer.landmark ? String(customer.landmark).trim() : null,
          city: String(customer.city || 'Tiruchirappalli').trim(),
          state: String(customer.state || 'Tamil Nadu').trim(),
          pincode: String(customer.pincode).trim(),
          deliveryNotes: customer.deliveryNotes ? String(customer.deliveryNotes).trim() : null,
          subtotal: new Prisma.Decimal(calculatedSubtotal),
          deliveryFee: new Prisma.Decimal(deliveryFee),
          discount: new Prisma.Decimal(finalDiscount),
          total: new Prisma.Decimal(calculatedTotal),
          paymentMethod: cleanPaymentMethod as any,
          paymentStatus: 'Unpaid',
          orderStatus: 'Received',
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName,
              tamilName: item.tamilName || null,
              productImage: item.productImage,
              categoryName: item.categoryName,
              variantLabel: item.variantLabel,
              price: new Prisma.Decimal(item.price),
              originalPrice: item.originalPrice ? new Prisma.Decimal(item.originalPrice) : null,
              quantity: item.quantity,
              totalPrice: new Prisma.Decimal(item.lineTotal),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 7c. Safely reduce inventory stock for each variant
      for (const item of resolvedItems) {
        const currentVariant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (currentVariant) {
          const newStock = Math.max(0, currentVariant.stock - item.quantity);
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: newStock,
              inStock: newStock > 0,
            },
          });
        }
      }

      // 7d. Clear customer's database cart after order creation
      const customerCart = await tx.cart.findUnique({
        where: { userId },
      });

      if (customerCart) {
        await tx.cartItem.deleteMany({
          where: { cartId: customerCart.id },
        });
      }

      return newOrder;
    });

    res.status(201).json({
      message: 'Order created successfully in database.',
      order: formatOrder(createdOrder),
    });
  } catch (error: any) {
    console.error('Error creating order in database:', error);
    res.status(500).json({
      error: 'Failed to place order in database. Please review your cart and retry.',
      details: error?.message,
    });
  }
});

/**
 * ADMIN ENDPOINTS
 */

/**
 * GET /api/orders/admin/all
 * Returns all orders in system from Supabase PostgreSQL, newest first.
 * Protected by requireAdmin.
 */
router.get('/admin/all', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      orders: orders.map(formatOrder),
      count: orders.length,
    });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

/**
 * PATCH /api/orders/:orderId/payment-status
 * Admin manually marks an order as Paid / Unpaid after verifying UPI receipt or collecting COD.
 */
router.patch('/:orderId/payment-status', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const orderId = String(req.params.orderId);
    const { paymentStatus } = req.body;

    if (paymentStatus !== 'Unpaid' && paymentStatus !== 'Paid') {
      res.status(400).json({ error: 'Payment status must be either "Unpaid" or "Paid".' });
      return;
    }

    // Find order by either id or orderNumber
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderNumber: orderId },
        ],
      },
    });

    if (!existingOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: existingOrder.id },
      data: { paymentStatus },
      include: { items: true },
    });

    res.json({
      message: `Payment status updated to ${paymentStatus}.`,
      order: formatOrder(updated),
    });
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status.' });
  }
});

/**
 * PATCH /api/orders/:orderId/order-status
 * Admin updates order progress (Received -> Processing -> Dispatched -> Delivered -> Cancelled).
 */
router.patch('/:orderId/order-status', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const orderId = String(req.params.orderId);
    const { orderStatus } = req.body;

    const validStatuses = ['Received', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      res.status(400).json({ error: `Invalid order status. Allowed: ${validStatuses.join(', ')}` });
      return;
    }

    // Find order by either id or orderNumber
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderNumber: orderId },
        ],
      },
    });

    if (!existingOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: existingOrder.id },
      data: { orderStatus: orderStatus as any },
      include: { items: true },
    });

    res.json({
      message: `Order status updated to ${orderStatus}.`,
      order: formatOrder(updated),
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

export default router;
