export type Role = "staff" | "admin";

export type Item = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OrderStatus = "completed" | "voided" | "returned";
export type PaymentMethod = "cash" | "card" | "online";

export type Order = {
  id: string;
  order_number: number;
  created_at: string;
  subtotal: number;
  total: number;
  payment_method: PaymentMethod;
  note: string | null;
  created_by: string | null;
  status: OrderStatus;
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderWithItems = Order & { order_items: OrderItem[] };

export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  created_by: string | null;
  created_at: string;
};

export type CartLine = {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type Wastage = {
  id: string;
  item_id: string | null;
  description: string;
  category: string;
  quantity: number;
  estimated_cost: number;
  wastage_date: string;
  created_by: string | null;
  created_at: string;
};
