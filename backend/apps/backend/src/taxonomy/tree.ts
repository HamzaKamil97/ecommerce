/**
 * Hanoot taxonomy tree — Section → Category (→ Sub-category).
 *
 * Handles are dot-namespaced. Sections do NOT have schemas (they're
 * navigational only). Categories carry the default schema. Sub-categories,
 * when present, override/extend the Category schema.
 *
 * Adding a new node: add it here AND create the matching schemas/<handle>.ts
 * file. The boot-time integrity test (registry.test.ts) catches mismatches.
 *
 * Vendors cannot edit this tree — platform team only.
 */

export interface TreeNode {
  handle: string
  display_name: string
  /** Children. Empty array means this node is a leaf (Category with no sub-categories). */
  children: TreeNode[]
}

export const TAXONOMY_TREE: TreeNode[] = [
  {
    handle: "food", display_name: "Food",
    children: [
      { handle: "food.pizza",   display_name: "Pizza",   children: [] },
      { handle: "food.burger",  display_name: "Burger",  children: [] },
      { handle: "food.salad",   display_name: "Salad",   children: [] },
      { handle: "food.pasta",   display_name: "Pasta",   children: [] },
      { handle: "food.dessert", display_name: "Dessert", children: [] },
      { handle: "food.drink",   display_name: "Drink",   children: [] },
    ],
  },
  {
    handle: "grocery", display_name: "Grocery",
    children: [
      { handle: "grocery.rice",      display_name: "Rice & Grains", children: [] },
      { handle: "grocery.dairy",     display_name: "Dairy",         children: [] },
      { handle: "grocery.eggs",      display_name: "Eggs",          children: [] },
      { handle: "grocery.fruit",     display_name: "Fruit",         children: [] },
      { handle: "grocery.vegetable", display_name: "Vegetable",     children: [] },
      { handle: "grocery.oil",       display_name: "Oil",           children: [] },
      { handle: "grocery.bakery",    display_name: "Bakery",        children: [] },
      { handle: "grocery.snack",     display_name: "Snack",         children: [] },
    ],
  },
  {
    handle: "fashion", display_name: "Fashion",
    children: [
      { handle: "fashion.shirt",     display_name: "Shirt",     children: [] },
      { handle: "fashion.pants",     display_name: "Pants",     children: [] },
      { handle: "fashion.jacket",    display_name: "Jacket",    children: [] },
      { handle: "fashion.dress",     display_name: "Dress",     children: [] },
      { handle: "fashion.shoes",     display_name: "Shoes",     children: [] },
      { handle: "fashion.accessory", display_name: "Accessory", children: [] },
    ],
  },
  {
    handle: "electronics", display_name: "Electronics",
    children: [
      { handle: "electronics.headphones", display_name: "Headphones", children: [] },
      { handle: "electronics.earbuds",    display_name: "Earbuds",    children: [] },
      { handle: "electronics.charging",   display_name: "Charging",   children: [] },
      { handle: "electronics.smartwatch", display_name: "Smartwatch", children: [] },
      { handle: "electronics.power-bank", display_name: "Power bank", children: [] },
    ],
  },
  {
    handle: "home", display_name: "Home & Household",
    children: [
      { handle: "home.cookware",       display_name: "Cookware",       children: [] },
      { handle: "home.bath-textiles",  display_name: "Bath textiles",  children: [] },
      { handle: "home.bedding",        display_name: "Bedding",        children: [] },
      { handle: "home.cleaning",       display_name: "Cleaning",       children: [] },
      { handle: "home.decor",          display_name: "Decor",          children: [] },
      { handle: "home.appliance",      display_name: "Appliance",      children: [] },
      { handle: "home.frames",         display_name: "Frames",         children: [] },
    ],
  },
]

/**
 * Flatten the tree into a list of all nodes (Section + Category + Sub-category).
 * Order: depth-first, pre-order.
 */
export function flattenTree(): TreeNode[] {
  const out: TreeNode[] = []
  function walk(nodes: TreeNode[]) {
    for (const n of nodes) {
      out.push(n)
      if (n.children.length > 0) walk(n.children)
    }
  }
  walk(TAXONOMY_TREE)
  return out
}

/**
 * Return all leaf nodes (no children). These are the nodes that can have a schema
 * and that a vendor can pick as the terminal taxonomy node for a product.
 */
export function listLeaves(): TreeNode[] {
  return flattenTree().filter((n) => n.children.length === 0 && n.handle.includes("."))
}

/**
 * Find a node by exact handle. Returns null if not found.
 */
export function findNode(handle: string): TreeNode | null {
  return flattenTree().find((n) => n.handle === handle) ?? null
}
