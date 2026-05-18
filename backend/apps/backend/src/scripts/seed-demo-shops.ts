import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  createSalesChannelsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

// Seeds 5 demo shops for the Hanoot investor demo (SP1).
// Idempotent: lookups tenant by slug and upserts.
//
// Run with:
//   npx medusa exec ./src/scripts/seed-demo-shops.ts
//
// NOTE on verticals:
//   The tenant.vertical CHECK constraint currently accepts only:
//     food, flowers, vegetables, electronics, fashion, general
//   So FreshMart (grocery) and Bayti (home) both use vertical: "general" at
//   the tenant level. Their per-product vertical metadata is attached via the
//   vertical_fields module using the appropriate template.
//
//   The vertical_product_fields.vertical enum DOES include "grocery" (used
//   for FreshMart products) but does NOT include "home" — Bayti products
//   therefore fall back to "general" with home-themed fields stored in the
//   JSON blob.

interface ShopProduct {
  handle: string
  title: string
  description: string
  images: string[]
  price_minor: number
  vertical_fields?: Record<string, any>
}

interface ShopSeed {
  slug: string
  name: string
  tenant_vertical: "food" | "fashion" | "electronics" | "general"
  vertical_template: "food" | "grocery" | "fashion" | "electronics" | "general"
  display_currency: "IQD" | "USD"
  branding: { logo_url: string; primary_color: string }
  products: ShopProduct[]
}

const SHOPS: ShopSeed[] = [
  // ============================================================
  // 1. Hamza's Kitchen — food, IQD, 6 products
  // ============================================================
  {
    slug: "hamzas-kitchen",
    name: "Hamza's Kitchen",
    tenant_vertical: "food",
    vertical_template: "food",
    display_currency: "IQD",
    branding: { logo_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200", primary_color: "#D9534F" },
    products: [
      {
        handle: "hk-margherita-pizza",
        title: "Margherita Pizza",
        description: "Wood-fired pizza with fresh basil, mozzarella, and San Marzano tomatoes.",
        price_minor: 12000,
        images: [
          "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600",
          "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600",
        ],
        vertical_fields: { prep_minutes: 20, spice_level: "none", allergens: ["gluten", "dairy"], ingredients: ["dough", "mozzarella", "basil", "tomato"], calories: 850 },
      },
      {
        handle: "hk-beef-burger",
        title: "Classic Beef Burger",
        description: "Hand-pressed beef patty with cheddar, lettuce, tomato, and house sauce.",
        price_minor: 9000,
        images: [
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
          "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600",
          "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600",
          "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600",
        ],
        vertical_fields: { prep_minutes: 15, spice_level: "mild", allergens: ["gluten", "dairy"], ingredients: ["beef", "bun", "cheddar", "lettuce"], calories: 750 },
      },
      {
        handle: "hk-greek-salad",
        title: "Greek Salad",
        description: "Crisp romaine, cucumber, tomato, feta, olives, and oregano vinaigrette.",
        price_minor: 7500,
        images: [
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
          "https://images.unsplash.com/photo-1551248429-40975aa4de74?w=600",
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
        ],
        vertical_fields: { prep_minutes: 8, spice_level: "none", allergens: ["dairy"], ingredients: ["romaine", "feta", "olives", "cucumber"], calories: 320 },
      },
      {
        handle: "hk-pasta-arrabiata",
        title: "Penne Arrabiata",
        description: "Penne pasta in a spicy tomato sauce with garlic and chili flakes.",
        price_minor: 8500,
        images: [
          "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600",
          "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600",
          "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600",
          "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600",
        ],
        vertical_fields: { prep_minutes: 18, spice_level: "hot", allergens: ["gluten"], ingredients: ["penne", "tomato", "garlic", "chili"], calories: 620 },
      },
      {
        handle: "hk-chocolate-cake",
        title: "Chocolate Lava Cake",
        description: "Warm chocolate cake with a molten dark-chocolate center.",
        price_minor: 5000,
        images: [
          "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600",
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600",
          "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600",
          "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600",
        ],
        vertical_fields: { prep_minutes: 10, spice_level: "none", allergens: ["gluten", "dairy", "egg"], ingredients: ["chocolate", "flour", "butter", "egg"], calories: 480 },
      },
      {
        handle: "hk-mint-lemonade",
        title: "Fresh Mint Lemonade",
        description: "Iced lemonade with crushed mint leaves and a hint of cane sugar.",
        price_minor: 3000,
        images: [
          "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600",
          "https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=600",
          "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600",
          "https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=600",
        ],
        vertical_fields: { prep_minutes: 3, spice_level: "none", allergens: [], ingredients: ["lemon", "mint", "sugar", "water"], calories: 120 },
      },
    ],
  },

  // ============================================================
  // 2. FreshMart — general (grocery template), IQD, 8 products
  // ============================================================
  {
    slug: "freshmart",
    name: "FreshMart",
    tenant_vertical: "general",
    vertical_template: "grocery",
    display_currency: "IQD",
    branding: { logo_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200", primary_color: "#3DA35D" },
    products: [
      {
        handle: "fm-basmati-rice-5kg",
        title: "Basmati Rice — 5 kg",
        description: "Long-grain aromatic basmati rice. Family-size 5 kg bag.",
        price_minor: 12000,
        images: [
          "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600",
          "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600",
          "https://images.unsplash.com/photo-1599909533730-d51c9c3e8d05?w=600",
          "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600",
        ],
        vertical_fields: { unit: "kg", weight_per_unit_g: 5000, origin: "India", organic: false },
      },
      {
        handle: "fm-fresh-milk-1l",
        title: "Fresh Cow Milk — 1 L",
        description: "Pasteurized full-fat cow milk, 1 litre carton.",
        price_minor: 3500,
        images: [
          "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600",
          "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600",
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
          "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600",
        ],
        vertical_fields: { unit: "L", weight_per_unit_g: 1030, origin: "Iraq", organic: false },
      },
      {
        handle: "fm-fresh-eggs-12",
        title: "Free-Range Eggs — Dozen",
        description: "Free-range brown eggs, carton of 12.",
        price_minor: 5000,
        images: [
          "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600",
          "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600",
          "https://images.unsplash.com/photo-1607690424560-35d967d6ad7f?w=600",
          "https://images.unsplash.com/photo-1569288063643-5d29ad6e7a0a?w=600",
        ],
        vertical_fields: { unit: "each", weight_per_unit_g: 720, origin: "Iraq", organic: true },
      },
      {
        handle: "fm-mixed-fruits-basket",
        title: "Mixed Seasonal Fruits Basket",
        description: "Curated basket of fresh seasonal fruits — apples, oranges, bananas, grapes.",
        price_minor: 18000,
        images: [
          "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600",
          "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600",
          "https://images.unsplash.com/photo-1490474504059-bf2db5ab2348?w=600",
          "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=600",
        ],
        vertical_fields: { unit: "each", weight_per_unit_g: 3500, origin: "Iraq", organic: false },
      },
      {
        handle: "fm-fresh-vegetables-mix",
        title: "Fresh Vegetables Mix",
        description: "Daily mix of fresh vegetables — tomatoes, cucumbers, peppers, onions.",
        price_minor: 9500,
        images: [
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
          "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600",
          "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600",
          "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600",
        ],
        vertical_fields: { unit: "kg", weight_per_unit_g: 2000, origin: "Iraq", organic: true },
      },
      {
        handle: "fm-olive-oil-1l",
        title: "Extra Virgin Olive Oil — 1 L",
        description: "Cold-pressed extra virgin olive oil, imported from the Mediterranean.",
        price_minor: 22000,
        images: [
          "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600",
          "https://images.unsplash.com/photo-1597040663051-c95a8ce2cd96?w=600",
          "https://images.unsplash.com/photo-1601925268185-2dee3a3d6f8b?w=600",
          "https://images.unsplash.com/photo-1531973486364-5fa64260d75b?w=600",
        ],
        vertical_fields: { unit: "L", weight_per_unit_g: 920, origin: "Italy", organic: true },
      },
      {
        handle: "fm-arabic-bread-pack",
        title: "Arabic Flat Bread — 6 pack",
        description: "Soft flatbread, baked fresh daily. Pack of 6 loaves.",
        price_minor: 1500,
        images: [
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
          "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600",
          "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=600",
          "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600",
        ],
        vertical_fields: { unit: "each", weight_per_unit_g: 600, origin: "Iraq", organic: false },
      },
      {
        handle: "fm-snack-pack",
        title: "Mixed Snacks Pack",
        description: "Crisps, nuts, and crackers — perfect for a movie night.",
        price_minor: 7000,
        images: [
          "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600",
          "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600",
          "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600",
          "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=600",
        ],
        vertical_fields: { unit: "each", weight_per_unit_g: 450, origin: "Turkey", organic: false },
      },
    ],
  },

  // ============================================================
  // 3. Style Hub — fashion, USD, 6 products
  // ============================================================
  {
    slug: "style-hub",
    name: "Style Hub",
    tenant_vertical: "fashion",
    vertical_template: "fashion",
    display_currency: "USD",
    branding: { logo_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200", primary_color: "#222831" },
    products: [
      {
        handle: "sh-cotton-tee",
        title: "Premium Cotton T-Shirt",
        description: "Soft 100% combed cotton crew-neck tee. Pre-shrunk and tagless.",
        price_minor: 1999,
        images: [
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
          "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600",
          "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600",
          "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600",
        ],
        vertical_fields: { sizes: ["S", "M", "L", "XL"], colors: ["white", "black", "navy"], material: "100% cotton", gender: "unisex" },
      },
      {
        handle: "sh-slim-jeans",
        title: "Slim-Fit Jeans",
        description: "Mid-rise slim-fit jeans in stretch denim. Five pockets, classic five-stitch.",
        price_minor: 4999,
        images: [
          "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600",
          "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600",
          "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600",
          "https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600",
        ],
        vertical_fields: { sizes: ["S", "M", "L", "XL"], colors: ["indigo", "black", "stone-wash"], material: "98% cotton, 2% elastane", gender: "men" },
      },
      {
        handle: "sh-denim-jacket",
        title: "Classic Denim Jacket",
        description: "Mid-wash denim jacket, 100% cotton, unisex relaxed fit.",
        price_minor: 7999,
        images: [
          "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600",
          "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600",
          "https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=600",
          "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=600",
        ],
        vertical_fields: { sizes: ["S", "M", "L", "XL"], colors: ["indigo"], material: "100% cotton denim", gender: "unisex" },
      },
      {
        handle: "sh-summer-dress",
        title: "Floral Summer Dress",
        description: "Lightweight floral-print dress with adjustable straps and side pockets.",
        price_minor: 5999,
        images: [
          "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600",
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
          "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600",
          "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=600",
        ],
        vertical_fields: { sizes: ["XS", "S", "M", "L"], colors: ["floral-pink", "floral-blue"], material: "Rayon", gender: "women" },
      },
      {
        handle: "sh-leather-sneakers",
        title: "Leather Sneakers",
        description: "Minimalist white leather sneakers with cushioned insole.",
        price_minor: 8999,
        images: [
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
          "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600",
          "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600",
          "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600",
        ],
        vertical_fields: { sizes: ["S", "M", "L", "XL"], colors: ["white", "black"], material: "Full-grain leather", gender: "unisex" },
      },
      {
        handle: "sh-leather-belt",
        title: "Genuine Leather Belt",
        description: "Hand-stitched genuine leather belt with brushed buckle.",
        price_minor: 1499,
        images: [
          "https://images.unsplash.com/photo-1624222247344-550fb60ae8fa?w=600",
          "https://images.unsplash.com/photo-1517941875132-7c30c4eb1623?w=600",
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
          "https://images.unsplash.com/photo-1611923134239-b9be5816e23f?w=600",
        ],
        vertical_fields: { sizes: ["S", "M", "L", "XL"], colors: ["brown", "black"], material: "Genuine leather", gender: "unisex" },
      },
    ],
  },

  // ============================================================
  // 4. TechPoint — electronics, USD, 5 products
  // ============================================================
  {
    slug: "techpoint",
    name: "TechPoint",
    tenant_vertical: "electronics",
    vertical_template: "electronics",
    display_currency: "USD",
    branding: { logo_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200", primary_color: "#0F4C81" },
    products: [
      {
        handle: "tp-wireless-headphones",
        title: "Wireless Noise-Cancelling Headphones",
        description: "Over-ear Bluetooth 5.3 headphones with 40h battery and active noise cancellation.",
        price_minor: 7999,
        images: [
          "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600",
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
          "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600",
          "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=600",
        ],
        vertical_fields: { brand: "Hanoot Audio", model: "HA-700", warranty_months: 12, in_box_items: ["headphones", "USB-C cable", "carrying case"] },
      },
      {
        handle: "tp-usbc-charger-65w",
        title: "65W USB-C Fast Charger",
        description: "Compact GaN USB-C power adapter — charge laptops and phones quickly.",
        price_minor: 1999,
        images: [
          "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600",
          "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600",
          "https://images.unsplash.com/photo-1601524909162-ae8725290836?w=600",
          "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=600",
        ],
        vertical_fields: { brand: "Hanoot Power", model: "HP-65", warranty_months: 24, in_box_items: ["charger", "USB-C cable"] },
      },
      {
        handle: "tp-smartwatch",
        title: "Smartwatch — Fitness Edition",
        description: "Touchscreen smartwatch with heart-rate, SpO2, GPS and 7-day battery.",
        price_minor: 14999,
        images: [
          "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600",
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
          "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600",
          "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600",
        ],
        vertical_fields: { brand: "Hanoot Wear", model: "HW-Fit", warranty_months: 12, in_box_items: ["watch", "magnetic charger", "extra strap"] },
      },
      {
        handle: "tp-power-bank-20k",
        title: "20,000 mAh Power Bank",
        description: "Portable power bank with 65W USB-C PD output and dual USB-A ports.",
        price_minor: 2999,
        images: [
          "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600",
          "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600",
          "https://images.unsplash.com/photo-1600003263720-95b45a4035d5?w=600",
          "https://images.unsplash.com/photo-1591290619762-c0bea7b6d2b9?w=600",
        ],
        vertical_fields: { brand: "Hanoot Power", model: "HP-PB20", warranty_months: 18, in_box_items: ["power bank", "USB-C cable", "pouch"] },
      },
      {
        handle: "tp-wireless-earbuds",
        title: "True Wireless Earbuds",
        description: "TWS earbuds with hybrid ANC, 30h total playtime, and IPX5 sweat resistance.",
        price_minor: 5999,
        images: [
          "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=600",
          "https://images.unsplash.com/photo-1590658165737-15a047b07cd5?w=600",
          "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600",
          "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600",
        ],
        vertical_fields: { brand: "Hanoot Audio", model: "HA-Buds-Pro", warranty_months: 12, in_box_items: ["earbuds", "charging case", "ear tips", "USB-C cable"] },
      },
    ],
  },

  // ============================================================
  // 5. Bayti — general (home theme), IQD, 7 products
  // ============================================================
  // NOTE: vertical_fields module enum has no "home" — use template "general"
  // and store home-themed metadata in the JSON blob.
  {
    slug: "bayti",
    name: "Bayti — Home & Household",
    tenant_vertical: "general",
    vertical_template: "general",
    display_currency: "IQD",
    branding: { logo_url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200", primary_color: "#B07D62" },
    products: [
      {
        handle: "by-cookware-set",
        title: "Non-Stick Cookware Set — 7 pcs",
        description: "Complete 7-piece non-stick cookware set: pots, pans, and lids.",
        price_minor: 75000,
        images: [
          "https://images.unsplash.com/photo-1584990347449-a8d5b3b6e2b1?w=600",
          "https://images.unsplash.com/photo-1556909114-44e3e9699e2b?w=600",
          "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600",
          "https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=600",
        ],
        vertical_fields: { category: "cookware", material: "Aluminium + non-stick coating", pieces: 7 },
      },
      {
        handle: "by-bath-towel-set",
        title: "Cotton Bath Towel Set — 4 pcs",
        description: "Soft 100% Turkish cotton bath towels, set of 4. Quick-drying and absorbent.",
        price_minor: 28000,
        images: [
          "https://images.unsplash.com/photo-1600488999076-3b6b9d1f81f3?w=600",
          "https://images.unsplash.com/photo-1620656798579-1984d9e87df7?w=600",
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
          "https://images.unsplash.com/photo-1620315808304-66597517f188?w=600",
        ],
        vertical_fields: { category: "bath", material: "100% Turkish cotton", pieces: 4 },
      },
      {
        handle: "by-cotton-bedding-set",
        title: "Cotton Bedding Set — Queen",
        description: "Queen-size duvet cover, fitted sheet, and two pillowcases in soft cotton sateen.",
        price_minor: 65000,
        images: [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600",
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600",
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600",
          "https://images.unsplash.com/photo-1592229505726-ca121723b8ef?w=600",
        ],
        vertical_fields: { category: "bedding", material: "Cotton sateen", size: "queen" },
      },
      {
        handle: "by-cleaning-bundle",
        title: "Home Cleaning Bundle",
        description: "Everything you need to keep your home spotless: surface spray, floor cleaner, sponges, microfibre cloths.",
        price_minor: 22000,
        images: [
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
          "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600",
          "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600",
          "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600",
        ],
        vertical_fields: { category: "cleaning", items: 8 },
      },
      {
        handle: "by-soy-candle",
        title: "Hand-Poured Soy Candle",
        description: "Vanilla and sandalwood soy-wax candle, 40-hour burn time.",
        price_minor: 12000,
        images: [
          "https://images.unsplash.com/photo-1602874801006-1eea0a3d2e2e?w=600",
          "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600",
          "https://images.unsplash.com/photo-1608181831718-c9ffd8728c80?w=600",
          "https://images.unsplash.com/photo-1601295866024-ed05cf69a4c9?w=600",
        ],
        vertical_fields: { category: "decor", material: "Soy wax", burn_hours: 40 },
      },
      {
        handle: "by-electric-kettle",
        title: "Electric Kettle — 1.7 L",
        description: "Stainless-steel cordless electric kettle with auto shut-off and boil-dry protection.",
        price_minor: 35000,
        images: [
          "https://images.unsplash.com/photo-1594221708779-94832f4320d1?w=600",
          "https://images.unsplash.com/photo-1571513800374-df1bbe650e56?w=600",
          "https://images.unsplash.com/photo-1597393353415-b3730f3719fe?w=600",
          "https://images.unsplash.com/photo-1593620659530-c75a4ee61e16?w=600",
        ],
        vertical_fields: { category: "appliance", capacity_l: 1.7, wattage: 2200 },
      },
      {
        handle: "by-picture-frames-set",
        title: "Picture Frames Gallery Set",
        description: "Set of 5 wooden picture frames in assorted sizes — perfect for a gallery wall.",
        price_minor: 18000,
        images: [
          "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
          "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600",
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600",
          "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600",
        ],
        vertical_fields: { category: "decor", material: "Pine wood", pieces: 5 },
      },
    ],
  },
]

export default async function seedDemoShops({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const tenantSvc: any = container.resolve("tenant")
  const verticalFieldsSvc: any = container.resolve("vertical_fields")

  logger.info("Seeding demo shops for Hanoot SP1 investor demo...")

  // Need a shipping profile id (Medusa requires it when creating products).
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfileId = profiles?.[0]?.id
  if (!shippingProfileId) {
    logger.error("No shipping profile found. Run the initial Medusa seed first.")
    return
  }

  let totalProducts = 0

  for (const shop of SHOPS) {
    const currencyCode = shop.display_currency.toLowerCase()

    // ---- 1. Resolve or create the sales channel for this shop ----
    const { data: existingChannels } = await query.graph({
      entity: "sales_channel",
      fields: ["id", "name"],
      filters: { name: shop.name } as any,
    })

    let channelId: string
    if (existingChannels && existingChannels.length > 0) {
      channelId = existingChannels[0].id
      logger.info(`  Sales channel "${shop.name}" already exists — reusing.`)
    } else {
      const { result: channels } = await createSalesChannelsWorkflow(container).run({
        input: {
          salesChannelsData: [
            {
              name: shop.name,
              description: `Sales channel for tenant ${shop.slug}`,
            },
          ],
        },
      })
      channelId = channels[0].id
    }

    // ---- 2. Upsert the tenant ----
    const existingTenant = await tenantSvc.getBySlug(shop.slug)
    const tenantPayload = {
      slug: shop.slug,
      name: shop.name,
      sales_channel_id: channelId,
      vertical: shop.tenant_vertical,
      display_currency: shop.display_currency,
      show_secondary: true,
      branding: shop.branding,
      approval_status: "approved" as const,
    }

    if (existingTenant) {
      await tenantSvc.updateTenants({ id: existingTenant.id, ...tenantPayload })
    } else {
      await tenantSvc.createTenants(tenantPayload)
    }

    // ---- 3. Create products for this shop ----
    // Delete any existing products with the handles we're about to create so this stays idempotent.
    const handles = shop.products.map((p) => p.handle)
    const { data: existingProducts } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: { handle: handles } as any,
    })

    if (existingProducts && existingProducts.length > 0) {
      const productModuleService: any = container.resolve("product")
      const idsToDelete = existingProducts.map((p: any) => p.id)
      await productModuleService.softDeleteProducts(idsToDelete)
      logger.info(`  Removed ${idsToDelete.length} pre-existing product(s) for re-seeding.`)
    }

    const { result: createdProducts } = await createProductsWorkflow(container).run({
      input: {
        products: shop.products.map((p) => ({
          title: p.title,
          handle: p.handle,
          description: p.description,
          status: ProductStatus.PUBLISHED,
          thumbnail: p.images[0],
          sales_channels: [{ id: channelId }],
          shipping_profile_id: shippingProfileId,
          images: p.images.map((url) => ({ url })),
          options: [{ title: "Default", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              sku: p.handle.toUpperCase(),
              manage_inventory: false,
              prices: [{ amount: p.price_minor, currency_code: currencyCode }],
              options: { Default: "Default" },
            },
          ],
        })),
      },
    })

    // ---- 4. Attach vertical fields ----
    for (let i = 0; i < shop.products.length; i++) {
      const p = shop.products[i]
      const created = createdProducts[i]
      if (p.vertical_fields && created?.id) {
        try {
          await verticalFieldsSvc.setForProduct(created.id, shop.vertical_template, p.vertical_fields)
        } catch (err: any) {
          logger.warn(`    Skipped vertical fields for ${p.handle}: ${err.message}`)
        }
      }
    }

    totalProducts += createdProducts.length
    logger.info(`✓ ${shop.name}: ${createdProducts.length} products`)
  }

  logger.info(`Demo shops seeded. Total products: ${totalProducts}`)
}
