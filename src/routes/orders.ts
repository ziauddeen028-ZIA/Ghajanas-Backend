import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  memoryStore,
  OrderRecord,
  PaymentMethod,
  AddressSnapshot,
  OrderItem,
} from '../store/memoryStore.js';

const router = Router();

/**
 * GET /api/orders
 * Returns orders belonging EXCLUSIVELY to the authenticated customer.
 * Ownership is enforced from req.user.id. Client-supplied IDs are never trusted.
 */
router.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userOrders = memoryStore.getOrdersByUser(userId);
  res.json({
    orders: userOrders,
    count: userOrders.length,
    phase: 'Phase 1 - In-Memory transient store. PostgreSQL persistence arrives in Phase 2.',
  });
});

/**
 * GET /api/orders/:orderId
 * Fetches single order details. Enforces ownership: only owner or admin can view.
 */
router.get('/:orderId', requireAuth, (req: Request, res: Response) => {
  const orderId = String(req.params.orderId);
  const order = memoryStore.getOrderById(orderId);

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

  res.json({ order });
});

/**
 * POST /api/orders
 * Creates a new order attached strictly to req.user.id.
 * Freezes snapshot of delivery address.
 * Sets initial paymentStatus to 'Unpaid' and orderStatus to 'Received'.
 */
router.post('/', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userEmail = req.user!.email;
  const {
    items,
    subtotal,
    deliveryFee,
    discount = 0,
    total,
    customer,
    paymentMethod,
  } = req.body;

  // Validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Order must include at least one item.' });
    return;
  }

  if (!customer || !customer.fullName || !customer.phone || !customer.addressLine || !customer.pincode) {
    res.status(400).json({ error: 'Incomplete delivery address snapshot provided.' });
    return;
  }

  const validPaymentMethods: PaymentMethod[] = ['upi', 'cod', 'whatsapp_order'];
  if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
    res.status(400).json({ error: 'Invalid payment method. Must be "upi" or "cod".' });
    return;
  }

  // Generate unique order ID
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderId = `NJ-${dateStr}-${randomSuffix}`;

  const addressSnapshot: AddressSnapshot = {
    fullName: String(customer.fullName).trim(),
    phone: String(customer.phone).trim(),
    alternatePhone: customer.alternatePhone ? String(customer.alternatePhone).trim() : undefined,
    addressLine: String(customer.addressLine).trim(),
    landmark: customer.landmark ? String(customer.landmark).trim() : undefined,
    city: String(customer.city || 'Tiruchirappalli').trim(),
    state: String(customer.state || 'Tamil Nadu').trim(),
    pincode: String(customer.pincode).trim(),
    deliveryNotes: customer.deliveryNotes ? String(customer.deliveryNotes).trim() : undefined,
  };

  const formattedItems: OrderItem[] = items.map((i: any) => ({
    productId: String(i.productId),
    productName: String(i.productName),
    tamilName: i.tamilName ? String(i.tamilName) : undefined,
    productImage: String(i.productImage || ''),
    categoryName: String(i.categoryName || ''),
    selectedWeight: {
      id: String(i.selectedWeight?.id || 'standard'),
      label: String(i.selectedWeight?.label || 'Standard'),
      price: Number(i.selectedWeight?.price || 0),
      originalPrice: i.selectedWeight?.originalPrice ? Number(i.selectedWeight.originalPrice) : undefined,
    },
    quantity: Math.max(1, Number(i.quantity) || 1),
  }));

  const newOrder: OrderRecord = {
    orderId,
    userId,
    userEmail,
    items: formattedItems,
    subtotal: Number(subtotal) || 0,
    deliveryFee: Number(deliveryFee) || 0,
    discount: Number(discount) || 0,
    total: Number(total) || 0,
    customer: addressSnapshot,
    paymentMethod,
    paymentStatus: 'Unpaid', // Independent status: Admin verifies UPI or collects COD manually
    orderStatus: 'Received',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createdOrder = memoryStore.createOrder(newOrder);

  res.status(201).json({
    message: 'Order placed successfully.',
    order: createdOrder,
  });
});

/**
 * ADMIN ENDPOINTS
 */

/**
 * GET /api/orders/admin/all
 * Returns all orders in system. Protected by requireAdmin.
 */
router.get('/admin/all', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  const orders = memoryStore.getAllOrders();
  res.json({
    orders,
    count: orders.length,
  });
});

/**
 * PATCH /api/orders/:orderId/payment-status
 * Admin manually marks an order as Paid / Unpaid after verifying UPI receipt or collecting COD.
 */
router.patch('/:orderId/payment-status', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const orderId = String(req.params.orderId);
  const { paymentStatus } = req.body;

  if (paymentStatus !== 'Unpaid' && paymentStatus !== 'Paid') {
    res.status(400).json({ error: 'Payment status must be either "Unpaid" or "Paid".' });
    return;
  }

  const updated = memoryStore.updatePaymentStatus(orderId, paymentStatus);
  if (!updated) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  res.json({
    message: `Payment status updated to ${paymentStatus}.`,
    order: updated,
  });
});

/**
 * PATCH /api/orders/:orderId/order-status
 * Admin updates order progress (Received -> Processing -> Dispatched -> Delivered).
 */
router.patch('/:orderId/order-status', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const orderId = String(req.params.orderId);
  const { orderStatus } = req.body;

  const validStatuses = ['Received', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(orderStatus)) {
    res.status(400).json({ error: `Invalid order status. Allowed: ${validStatuses.join(', ')}` });
    return;
  }

  const updated = memoryStore.updateOrderStatus(orderId, orderStatus);
  if (!updated) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  res.json({
    message: `Order status updated to ${orderStatus}.`,
    order: updated,
  });
});

export default router;
