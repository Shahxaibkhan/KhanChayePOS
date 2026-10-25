// Per-cup parcel/takeaway packaging charge. Applied per unit marked as
// parcel in the cart (not per order) — 3 parcel chai = 3× this.
// Bump this if the price of parcel cups changes; existing orders keep
// whatever rate was in effect when they were placed (see order_items.parcel_fee).
export const PARCEL_FEE_PER_CUP = 20;
