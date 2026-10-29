/**
 * Phase 1 In-Memory Transient Store.
 * 
 * IMPORTANT NOTICE:
 * In Phase 1, data is held in-memory for testing customer authentication, token verification,
 * ownership scoping, and foundation routes.
 * 
 * Full persistent storage with PostgreSQL and Prisma schema models will be implemented in Phase 2.
 */

export type PaymentMethod = 'upi' | 'cod' | 'whatsapp_order';
export type PaymentStatus = 'Unpaid' | 'Paid';
export type OrderStatus = 'Received' | 'Processing' | 'Dispatched' | 'Delivered' | 'Cancelled';

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  alternatePhone?: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  deliveryNotes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  tamilName?: string;
  productImage: string;
  categoryName: string;
  selectedWeight: {
    id: string;
    label: string;
    price: number;
    originalPrice?: number;
  };
  quantity: number;
}

export interface OrderRecord {
  orderId: string;
  userId: string;
  userEmail?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  customer: AddressSnapshot; // Permanent snapshot at time of order placement
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus; // Defaults to 'Unpaid'
  orderStatus: OrderStatus; // Defaults to 'Received'
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  userId: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  deliveryNotes?: string;
  updatedAt: string;
}

class MemoryStore {
  private orders: OrderRecord[] = [];
  private profiles: Map<string, CustomerProfile> = new Map();

  // Orders
  public createOrder(order: OrderRecord): OrderRecord {
    this.orders.unshift(order); // Newest first
    return order;
  }

  public getOrdersByUser(userId: string): OrderRecord[] {
    return this.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(orderId: string): OrderRecord | undefined {
    return this.orders.find((o) => o.orderId === orderId);
  }

  public getAllOrders(): OrderRecord[] {
    return [...this.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public updatePaymentStatus(orderId: string, status: PaymentStatus): OrderRecord | null {
    const order = this.orders.find((o) => o.orderId === orderId);
    if (!order) return null;
    order.paymentStatus = status;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  public updateOrderStatus(orderId: string, status: OrderStatus): OrderRecord | null {
    const order = this.orders.find((o) => o.orderId === orderId);
    if (!order) return null;
    order.orderStatus = status;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  // Profile
  public getProfile(userId: string): CustomerProfile | undefined {
    return this.profiles.get(userId);
  }

  public saveProfile(profile: CustomerProfile): CustomerProfile {
    this.profiles.set(profile.userId, profile);
    return profile;
  }
}

export const memoryStore = new MemoryStore();

