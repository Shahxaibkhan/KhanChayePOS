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

// pending = punched, bill with the waiter, money not received yet (not counted in sales)
export type OrderStatus = "pending" | "completed" | "voided" | "returned";
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
  edited_at: string | null;
  edited_by: string | null;
  client_id: string | null;
  client_name: string | null;
  paid_at: string | null;
  paid_by: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  parcel_qty: number;
  parcel_fee: number;
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
  parcelQty: number; // how many of `quantity` are packed as parcel (0..quantity)
};

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  low_threshold: number;
  created_at: string;
  updated_at: string;
};

export type RecipeRow = {
  item_id: string;
  ingredient_id: string;
  qty_per_unit: number;
};
