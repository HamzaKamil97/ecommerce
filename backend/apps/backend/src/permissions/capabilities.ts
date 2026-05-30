/**
 * Single source of truth for all role-based capabilities in the platform.
 * Adding a new feature gated by permission = add a new entry here + a
 * `requirePermission(CAP_KEY)` middleware in the route. UI matrix reads
 * this file via API (added in H-3.2d when the staff UI lands).
 */

export const CAPABILITIES = {
  // PoS register
  'pos.ring_sales': 'Ring sales on the register',
  'pos.open_cash_drawer': 'Open the cash drawer manually',
  'pos.refund_or_void': 'Refund or void a sale',
  'pos.return_process': 'Process a return',
  'pos.end_of_day': 'Close the till with end-of-day reconciliation',
  // Catalog
  'catalog.view_products': 'View the product catalog list',
  'catalog.add_edit_product': 'Add or edit products',
  'catalog.csv_import': 'Bulk import products from CSV',
  'catalog.bulk_edit': 'Bulk edit existing products',
  'catalog.manage_departments': 'Create / edit / reorder departments',
  'catalog.manage_tags': 'Create / edit tags',
  'catalog.adjust_stock': 'Adjust stock manually',
  'catalog.stock_count': 'Run a stock count session',
  'catalog.report_damage': 'Report damaged stock',
  // Orders
  'orders.accept_reject_online': 'Accept or reject Hanoot online orders',
  'orders.pick_workflow': 'Pick orders for delivery',
  // Reports
  'reports.view': 'View reports and alerts',
  'reports.export': 'Export reports',
  'reports.custom_build': 'Build custom reports',
  // Staff
  'staff.manage': 'Create / edit / disable staff members',
  'staff.reset_pin': "Reset another staff member's PIN",
  // Shop
  'shop.settings_edit': 'Edit shop settings',
  'shop.receipt_designer': 'Edit the receipt template',
  'shop.promotions': 'Create and manage promotions',
  'shop.notifications_prefs': 'Edit own notification preferences',
} as const;

export type CapabilityKey = keyof typeof CAPABILITIES;

export type Role = 'owner' | 'manager' | 'cashier' | 'data_entry' | 'picker';

/**
 * Default capability grants per role. `true` = granted, `'pin'` = granted
 * but requires a fresh PIN re-prompt before commit. Owner can override any
 * cell per-user via the Staff form (writes to cashier.permission_overrides).
 */
export const ROLE_DEFAULTS: Record<Role, Partial<Record<CapabilityKey, true | 'pin'>>> = {
  owner: Object.fromEntries(Object.keys(CAPABILITIES).map((k) => [k, true])) as any,
  manager: {
    'pos.ring_sales': true, 'pos.open_cash_drawer': true, 'pos.refund_or_void': true,
    'pos.return_process': true, 'pos.end_of_day': true,
    'catalog.view_products': true,
    'catalog.add_edit_product': true, 'catalog.csv_import': true, 'catalog.bulk_edit': true,
    'catalog.manage_departments': true, 'catalog.manage_tags': true,
    'catalog.adjust_stock': true, 'catalog.stock_count': true, 'catalog.report_damage': true,
    'orders.accept_reject_online': true, 'orders.pick_workflow': true,
    'reports.view': true, 'reports.export': true,
    'staff.reset_pin': true,
    'shop.notifications_prefs': true,
  },
  cashier: {
    'pos.ring_sales': true, 'pos.open_cash_drawer': true,
    'pos.refund_or_void': 'pin', 'pos.return_process': 'pin',
    'pos.end_of_day': true,
    'catalog.view_products': true,
    'catalog.report_damage': 'pin',
    'orders.accept_reject_online': true,
    'shop.notifications_prefs': true,
  },
  data_entry: {
    'catalog.add_edit_product': true, 'catalog.csv_import': true, 'catalog.bulk_edit': true,
    'catalog.adjust_stock': true, 'catalog.stock_count': true,
    'shop.notifications_prefs': true,
  },
  picker: {
    'orders.pick_workflow': true,
    'shop.notifications_prefs': true,
  },
};

/**
 * Resolve effective grant for a user. Per-user overrides win over role default.
 * Returns: true (granted) | 'pin' (granted with re-prompt) | false (denied).
 */
export function resolveCapability(
  role: Role,
  capability: CapabilityKey,
  overrides: Partial<Record<CapabilityKey, true | false | 'pin'>> = {},
): true | 'pin' | false {
  if (capability in overrides) {
    return overrides[capability] ?? false;
  }
  return ROLE_DEFAULTS[role]?.[capability] ?? false;
}
