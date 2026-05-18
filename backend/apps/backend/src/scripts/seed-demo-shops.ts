import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createSalesChannelsWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { assignProductToTaxonomyWorkflow } from "../workflows/assign-product-to-taxonomy"
import { TENANT_MODULE } from "../modules/tenant"
import { MERCH_MODULE } from "../modules/merch"

// Seeds 5 demo shops for the Hanoot platform (SP-A final).
// Idempotent: upserts tenants by slug, soft-deletes and re-creates products.
// Every product is assigned a taxonomy_handle + schema-matching core_fields.
//
// Run with:
//   npx medusa exec ./src/scripts/seed-demo-shops.ts
//
// Prerequisites:
//   npx medusa exec ./src/scripts/sync-taxonomy.ts   (populates product_category taxonomy nodes)
//   npx medusa db:migrate                            (runs all pending migrations)

interface ProductSeed {
  handle: string
  title: string
  description: string
  thumbnail: string
  images: string[]
  price_minor: number
  taxonomy_handle: string
  core_fields: Record<string, unknown>
  custom_fields?: Record<string, unknown>
  merch_category_handle: string
}

interface MerchSeed {
  handle: string
  name: string
  position: number
}

interface ShopSeed {
  slug: string
  name: string
  vertical: "food" | "grocery" | "home" | "fashion" | "electronics" | "general"
  display_currency: "IQD" | "USD"
  branding: { logo_url: string; primary_color: string }
  merch_categories: MerchSeed[]
  products: ProductSeed[]
}

const SHOPS: ShopSeed[] = [
  // ============================================================
  // 1. Hamza's Kitchen — food, IQD, 6 products
  // ============================================================
  {
    slug: "hamzas-kitchen",
    name: "Hamza's Kitchen",
    vertical: "food",
    display_currency: "IQD",
    branding: {
      logo_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200",
      primary_color: "#D9534F",
    },
    merch_categories: [
      { handle: "pizzas",   name: "Pizzas",   position: 1 },
      { handle: "burgers",  name: "Burgers",  position: 2 },
      { handle: "salads",   name: "Salads",   position: 3 },
      { handle: "pasta",    name: "Pasta",    position: 4 },
      { handle: "desserts", name: "Desserts", position: 5 },
      { handle: "drinks",   name: "Drinks",   position: 6 },
    ],
    products: [
      {
        handle: "hk-margherita-pizza",
        title: "Margherita Pizza",
        description: "Wood-fired pizza with fresh basil, mozzarella, and San Marzano tomatoes.",
        thumbnail: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
        images: [
          "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600",
          "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600",
        ],
        price_minor: 12000,
        taxonomy_handle: "food.pizza",
        core_fields: {
          size_in: "12",
          prep_min: 18,
          toppings: ["basil", "mozzarella", "tomato"],
          allergens: ["gluten", "dairy"],
          is_vegan: false,
        },
        merch_category_handle: "pizzas",
      },
      {
        handle: "hk-beef-burger",
        title: "Classic Beef Burger",
        description: "Hand-pressed beef patty with cheddar, lettuce, tomato, and house sauce.",
        thumbnail: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
        images: [
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
          "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600",
          "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600",
          "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600",
        ],
        price_minor: 9000,
        taxonomy_handle: "food.burger",
        core_fields: {
          patty_type: "beef",
          prep_min: 15,
          spice_level: "mild",
          allergens: ["gluten", "dairy"],
        },
        merch_category_handle: "burgers",
      },
      {
        handle: "hk-greek-salad",
        title: "Greek Salad",
        description: "Crisp romaine, cucumber, tomato, feta, olives, and oregano vinaigrette.",
        thumbnail: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
        images: [
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
          "https://images.unsplash.com/photo-1551248429-40975aa4de74?w=600",
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
        ],
        price_minor: 7500,
        taxonomy_handle: "food.salad",
        core_fields: {
          prep_min: 8,
          dressing: "oregano vinaigrette",
          allergens: ["dairy"],
        },
        merch_category_handle: "salads",
      },
      {
        handle: "hk-pasta-arrabiata",
        title: "Penne Arrabiata",
        description: "Penne pasta in a spicy tomato sauce with garlic and chili flakes.",
        thumbnail: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600",
        images: [
          "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600",
          "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600",
          "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600",
          "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600",
        ],
        price_minor: 8500,
        taxonomy_handle: "food.pasta",
        core_fields: {
          prep_min: 18,
          sauce: "arrabiata",
          spice_level: "hot",
          allergens: ["gluten"],
        },
        merch_category_handle: "pasta",
      },
      {
        handle: "hk-chocolate-cake",
        title: "Chocolate Lava Cake",
        description: "Warm chocolate cake with a molten dark-chocolate center.",
        thumbnail: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600",
        images: [
          "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600",
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600",
          "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600",
          "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600",
        ],
        price_minor: 5000,
        taxonomy_handle: "food.dessert",
        core_fields: {
          prep_min: 10,
          allergens: ["gluten", "dairy", "egg"],
        },
        merch_category_handle: "desserts",
      },
      {
        handle: "hk-mint-lemonade",
        title: "Fresh Mint Lemonade",
        description: "Iced lemonade with crushed mint leaves and a hint of cane sugar.",
        thumbnail: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600",
        images: [
          "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600",
          "https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=600",
          "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600",
          "https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=600",
        ],
        price_minor: 3000,
        taxonomy_handle: "food.drink",
        core_fields: {
          prep_min: 3,
          volume_ml: 400,
          is_hot: false,
        },
        merch_category_handle: "drinks",
      },
    ],
  },

  // ============================================================
  // 2. FreshMart — grocery, IQD, 8 products
  // ============================================================
  {
    slug: "freshmart",
    name: "FreshMart",
    vertical: "grocery",
    display_currency: "IQD",
    branding: {
      logo_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
      primary_color: "#3DA35D",
    },
    merch_categories: [
      { handle: "pantry",  name: "Pantry",   position: 1 },
      { handle: "dairy",   name: "Dairy",    position: 2 },
      { handle: "fresh",   name: "Fresh",    position: 3 },
      { handle: "bakery",  name: "Bakery",   position: 4 },
      { handle: "snacks",  name: "Snacks",   position: 5 },
    ],
    products: [
      {
        handle: "fm-basmati-rice-5kg",
        title: "Basmati Rice — 5 kg",
        description: "Long-grain aromatic basmati rice. Family-size 5 kg bag.",
        thumbnail: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600",
        images: [
          "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600",
          "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600",
          "https://images.unsplash.com/photo-1599909533730-d51c9c3e8d05?w=600",
          "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600",
        ],
        price_minor: 12000,
        taxonomy_handle: "grocery.rice",
        core_fields: {
          weight_kg: 5,
          rice_type: "basmati",
          origin: "India",
        },
        merch_category_handle: "pantry",
      },
      {
        handle: "fm-fresh-milk-1l",
        title: "Fresh Cow Milk — 1 L",
        description: "Pasteurized full-fat cow milk, 1 litre carton.",
        thumbnail: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600",
        images: [
          "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600",
          "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600",
          "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600",
        ],
        price_minor: 3500,
        taxonomy_handle: "grocery.dairy",
        core_fields: {
          dairy_type: "milk",
          volume_ml: 1000,
          fat_percent: 3.5,
        },
        merch_category_handle: "dairy",
      },
      {
        handle: "fm-fresh-eggs-12",
        title: "Free-Range Eggs — Dozen",
        description: "Free-range brown eggs, carton of 12.",
        thumbnail: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600",
        images: [
          "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600",
          "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=600",
          "https://images.unsplash.com/photo-1607690424560-35d967d6ad7f?w=600",
          "https://images.unsplash.com/photo-1569288063643-5d29ad6e7a0a?w=600",
        ],
        price_minor: 5000,
        taxonomy_handle: "grocery.eggs",
        core_fields: {
          count: 12,
          is_free_range: true,
        },
        merch_category_handle: "fresh",
      },
      {
        handle: "fm-mixed-fruits-basket",
        title: "Mixed Seasonal Fruits Basket",
        description: "Curated basket of fresh seasonal fruits — apples, oranges, bananas, grapes.",
        thumbnail: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600",
        images: [
          "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600",
          "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600",
          "https://images.unsplash.com/photo-1490474504059-bf2db5ab2348?w=600",
          "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=600",
        ],
        price_minor: 18000,
        taxonomy_handle: "grocery.fruit",
        core_fields: {
          weight_kg: 3.5,
          origin: "Iraq",
          is_organic: false,
        },
        merch_category_handle: "fresh",
      },
      {
        handle: "fm-fresh-vegetables-mix",
        title: "Fresh Vegetables Mix",
        description: "Daily mix of fresh vegetables — tomatoes, cucumbers, peppers, onions.",
        thumbnail: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
        images: [
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
          "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600",
          "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600",
          "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600",
        ],
        price_minor: 9500,
        taxonomy_handle: "grocery.vegetable",
        core_fields: {
          weight_kg: 2,
          origin: "Iraq",
          is_organic: true,
        },
        merch_category_handle: "fresh",
      },
      {
        handle: "fm-olive-oil-1l",
        title: "Extra Virgin Olive Oil — 1 L",
        description: "Cold-pressed extra virgin olive oil, imported from the Mediterranean.",
        thumbnail: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600",
        images: [
          "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600",
          "https://images.unsplash.com/photo-1597040663051-c95a8ce2cd96?w=600",
          "https://images.unsplash.com/photo-1601925268185-2dee3a3d6f8b?w=600",
          "https://images.unsplash.com/photo-1531973486364-5fa64260d75b?w=600",
        ],
        price_minor: 22000,
        taxonomy_handle: "grocery.oil",
        core_fields: {
          volume_ml: 1000,
          oil_type: "olive",
        },
        merch_category_handle: "pantry",
      },
      {
        handle: "fm-arabic-bread-pack",
        title: "Arabic Flat Bread — 6 pack",
        description: "Soft flatbread, baked fresh daily. Pack of 6 loaves.",
        thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
        images: [
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
          "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600",
          "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=600",
          "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600",
        ],
        price_minor: 1500,
        taxonomy_handle: "grocery.bakery",
        core_fields: {
          weight_g: 600,
          bakery_type: "bread",
          allergens: ["gluten"],
        },
        merch_category_handle: "bakery",
      },
      {
        handle: "fm-snack-pack",
        title: "Mixed Snacks Pack",
        description: "Crisps, nuts, and crackers — perfect for a movie night.",
        thumbnail: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600",
        images: [
          "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600",
          "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600",
          "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600",
          "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=600",
        ],
        price_minor: 7000,
        taxonomy_handle: "grocery.snack",
        core_fields: {
          weight_g: 450,
          snack_type: "chips",
          flavor: "mixed",
        },
        merch_category_handle: "snacks",
      },
    ],
  },

  // ============================================================
  // 3. Style Hub — fashion, USD, 6 products
  // ============================================================
  {
    slug: "style-hub",
    name: "Style Hub",
    vertical: "fashion",
    display_currency: "USD",
    branding: {
      logo_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200",
      primary_color: "#222831",
    },
    merch_categories: [
      { handle: "tops",        name: "Tops",        position: 1 },
      { handle: "bottoms",     name: "Bottoms",     position: 2 },
      { handle: "dresses",     name: "Dresses",     position: 3 },
      { handle: "shoes",       name: "Shoes",       position: 4 },
      { handle: "accessories", name: "Accessories", position: 5 },
    ],
    products: [
      {
        handle: "sh-cotton-tee",
        title: "Premium Cotton T-Shirt",
        description: "Soft 100% combed cotton crew-neck tee. Pre-shrunk and tagless.",
        thumbnail: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
        images: [
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
          "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600",
          "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600",
          "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600",
        ],
        price_minor: 1999,
        taxonomy_handle: "fashion.shirt",
        core_fields: {
          size: "M",
          material: "100% cotton",
          color: "white",
          fit: "regular",
          gender: "unisex",
        },
        merch_category_handle: "tops",
      },
      {
        handle: "sh-slim-jeans",
        title: "Slim-Fit Jeans",
        description: "Mid-rise slim-fit jeans in stretch denim. Five pockets, classic five-stitch.",
        thumbnail: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600",
        images: [
          "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600",
          "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600",
          "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600",
          "https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600",
        ],
        price_minor: 4999,
        taxonomy_handle: "fashion.pants",
        core_fields: {
          waist_in: 32,
          length_in: 30,
          material: "98% cotton, 2% elastane",
          color: "indigo",
          gender: "mens",
        },
        merch_category_handle: "bottoms",
      },
      {
        handle: "sh-denim-jacket",
        title: "Classic Denim Jacket",
        description: "Mid-wash denim jacket, 100% cotton, unisex relaxed fit.",
        thumbnail: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600",
        images: [
          "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600",
          "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600",
          "https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=600",
          "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=600",
        ],
        price_minor: 7999,
        taxonomy_handle: "fashion.jacket",
        core_fields: {
          size: "M",
          material: "100% cotton denim",
          color: "indigo",
          season: "all",
          gender: "unisex",
        },
        merch_category_handle: "tops",
      },
      {
        handle: "sh-summer-dress",
        title: "Floral Summer Dress",
        description: "Lightweight floral-print dress with adjustable straps and side pockets.",
        thumbnail: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600",
        images: [
          "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600",
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
          "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600",
          "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=600",
        ],
        price_minor: 5999,
        taxonomy_handle: "fashion.dress",
        core_fields: {
          size: "S",
          material: "Rayon",
          color: "floral-pink",
          length: "midi",
        },
        merch_category_handle: "dresses",
      },
      {
        handle: "sh-leather-sneakers",
        title: "Leather Sneakers",
        description: "Minimalist white leather sneakers with cushioned insole.",
        thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
        images: [
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
          "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600",
          "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600",
          "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600",
        ],
        price_minor: 8999,
        taxonomy_handle: "fashion.shoes",
        core_fields: {
          size_eu: 42,
          material: "Full-grain leather",
          color: "white",
          style: "sneaker",
          gender: "unisex",
        },
        merch_category_handle: "shoes",
      },
      {
        handle: "sh-leather-belt",
        title: "Genuine Leather Belt",
        description: "Hand-stitched genuine leather belt with brushed buckle.",
        thumbnail: "https://images.unsplash.com/photo-1624222247344-550fb60ae8fa?w=600",
        images: [
          "https://images.unsplash.com/photo-1624222247344-550fb60ae8fa?w=600",
          "https://images.unsplash.com/photo-1517941875132-7c30c4eb1623?w=600",
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
          "https://images.unsplash.com/photo-1611923134239-b9be5816e23f?w=600",
        ],
        price_minor: 1499,
        taxonomy_handle: "fashion.accessory",
        core_fields: {
          accessory_type: "belt",
          material: "Genuine leather",
          color: "brown",
        },
        merch_category_handle: "accessories",
      },
    ],
  },

  // ============================================================
  // 4. TechPoint — electronics, USD, 5 products
  // ============================================================
  {
    slug: "techpoint",
    name: "TechPoint",
    vertical: "electronics",
    display_currency: "USD",
    branding: {
      logo_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200",
      primary_color: "#0F4C81",
    },
    merch_categories: [
      { handle: "audio",    name: "Audio",    position: 1 },
      { handle: "charging", name: "Charging", position: 2 },
      { handle: "wearables",name: "Wearables",position: 3 },
    ],
    products: [
      {
        handle: "tp-wireless-headphones",
        title: "Wireless Noise-Cancelling Headphones",
        description: "Over-ear Bluetooth 5.3 headphones with 40h battery and active noise cancellation.",
        thumbnail: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600",
        images: [
          "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600",
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
          "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600",
          "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=600",
        ],
        price_minor: 7999,
        taxonomy_handle: "electronics.headphones",
        core_fields: {
          brand: "Hanoot Audio",
          wireless: true,
          color: "black",
          noise_cancelling: true,
          battery_hours: 40,
        },
        merch_category_handle: "audio",
      },
      {
        handle: "tp-wireless-earbuds",
        title: "True Wireless Earbuds",
        description: "TWS earbuds with hybrid ANC, 30h total playtime, and IPX5 sweat resistance.",
        thumbnail: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=600",
        images: [
          "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=600",
          "https://images.unsplash.com/photo-1590658165737-15a047b07cd5?w=600",
          "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600",
          "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600",
        ],
        price_minor: 5999,
        taxonomy_handle: "electronics.earbuds",
        core_fields: {
          brand: "Hanoot Audio",
          wireless: true,
          color: "white",
          battery_hours: 30,
        },
        merch_category_handle: "audio",
      },
      {
        handle: "tp-usbc-charger-65w",
        title: "65W USB-C Fast Charger",
        description: "Compact GaN USB-C power adapter — charge laptops and phones quickly.",
        thumbnail: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600",
        images: [
          "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600",
          "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600",
          "https://images.unsplash.com/photo-1601524909162-ae8725290836?w=600",
          "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=600",
        ],
        price_minor: 1999,
        taxonomy_handle: "electronics.charging",
        core_fields: {
          brand: "Hanoot Power",
          connector: "usb-c",
          watts: 65,
        },
        merch_category_handle: "charging",
      },
      {
        handle: "tp-smartwatch",
        title: "Smartwatch — Fitness Edition",
        description: "Touchscreen smartwatch with heart-rate, SpO2, GPS and 7-day battery.",
        thumbnail: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600",
        images: [
          "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600",
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
          "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600",
          "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600",
        ],
        price_minor: 14999,
        taxonomy_handle: "electronics.smartwatch",
        core_fields: {
          brand: "Hanoot Wear",
          case_size_mm: 44,
          color: "black",
          band_material: "silicone",
          battery_hours: 168,
        },
        merch_category_handle: "wearables",
      },
      {
        handle: "tp-power-bank-20k",
        title: "20,000 mAh Power Bank",
        description: "Portable power bank with 65W USB-C PD output and dual USB-A ports.",
        thumbnail: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600",
        images: [
          "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600",
          "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600",
          "https://images.unsplash.com/photo-1600003263720-95b45a4035d5?w=600",
          "https://images.unsplash.com/photo-1591290619762-c0bea7b6d2b9?w=600",
        ],
        price_minor: 2999,
        taxonomy_handle: "electronics.power-bank",
        core_fields: {
          brand: "Hanoot Power",
          capacity_mah: 20000,
          ports: ["usb-a", "usb-c"],
          color: "black",
        },
        merch_category_handle: "charging",
      },
    ],
  },

  // ============================================================
  // 5. Bayti — home, IQD, 7 products
  // ============================================================
  {
    slug: "bayti",
    name: "Bayti — Home & Household",
    vertical: "home",
    display_currency: "IQD",
    branding: {
      logo_url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200",
      primary_color: "#B07D62",
    },
    merch_categories: [
      { handle: "kitchen",  name: "Kitchen",   position: 1 },
      { handle: "bedroom",  name: "Bedroom",   position: 2 },
      { handle: "bathroom", name: "Bathroom",  position: 3 },
      { handle: "decor",    name: "Decor",     position: 4 },
      { handle: "cleaning", name: "Cleaning",  position: 5 },
    ],
    products: [
      {
        handle: "by-cookware-set",
        title: "Non-Stick Cookware Set — 7 pcs",
        description: "Complete 7-piece non-stick cookware set: pots, pans, and lids.",
        thumbnail: "https://images.unsplash.com/photo-1584990347449-a8d5b3b6e2b1?w=600",
        images: [
          "https://images.unsplash.com/photo-1584990347449-a8d5b3b6e2b1?w=600",
          "https://images.unsplash.com/photo-1556909114-44e3e9699e2b?w=600",
          "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600",
          "https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=600",
        ],
        price_minor: 75000,
        taxonomy_handle: "home.cookware",
        core_fields: {
          material: "non-stick",
          pieces: 7,
          color: "black",
          induction_compatible: false,
        },
        merch_category_handle: "kitchen",
      },
      {
        handle: "by-bath-towel-set",
        title: "Cotton Bath Towel Set — 4 pcs",
        description: "Soft 100% Turkish cotton bath towels, set of 4. Quick-drying and absorbent.",
        thumbnail: "https://images.unsplash.com/photo-1600488999076-3b6b9d1f81f3?w=600",
        images: [
          "https://images.unsplash.com/photo-1600488999076-3b6b9d1f81f3?w=600",
          "https://images.unsplash.com/photo-1620656798579-1984d9e87df7?w=600",
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
          "https://images.unsplash.com/photo-1620315808304-66597517f188?w=600",
        ],
        price_minor: 28000,
        taxonomy_handle: "home.bath-textiles",
        core_fields: {
          material: "100% Turkish cotton",
          pieces: 4,
          color: "white",
          size: "bath",
        },
        merch_category_handle: "bathroom",
      },
      {
        handle: "by-cotton-bedding-set",
        title: "Cotton Bedding Set — Queen",
        description: "Queen-size duvet cover, fitted sheet, and two pillowcases in soft cotton sateen.",
        thumbnail: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600",
        images: [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600",
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600",
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600",
          "https://images.unsplash.com/photo-1592229505726-ca121723b8ef?w=600",
        ],
        price_minor: 65000,
        taxonomy_handle: "home.bedding",
        core_fields: {
          size: "queen",
          material: "Cotton sateen",
          color: "white",
          thread_count: 400,
        },
        merch_category_handle: "bedroom",
      },
      {
        handle: "by-cleaning-bundle",
        title: "Home Cleaning Bundle",
        description: "Everything you need: surface spray, floor cleaner, sponges, microfibre cloths.",
        thumbnail: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
        images: [
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
          "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600",
          "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600",
          "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600",
        ],
        price_minor: 22000,
        taxonomy_handle: "home.cleaning",
        core_fields: {
          cleaning_type: "bundle",
          pieces: 8,
        },
        merch_category_handle: "cleaning",
      },
      {
        handle: "by-soy-candle",
        title: "Hand-Poured Soy Candle",
        description: "Vanilla and sandalwood soy-wax candle, 40-hour burn time.",
        thumbnail: "https://images.unsplash.com/photo-1602874801006-1eea0a3d2e2e?w=600",
        images: [
          "https://images.unsplash.com/photo-1602874801006-1eea0a3d2e2e?w=600",
          "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600",
          "https://images.unsplash.com/photo-1608181831718-c9ffd8728c80?w=600",
          "https://images.unsplash.com/photo-1601295866024-ed05cf69a4c9?w=600",
        ],
        price_minor: 12000,
        taxonomy_handle: "home.decor",
        core_fields: {
          decor_type: "candle",
          color: "cream",
          material: "Soy wax",
          burn_hours: 40,
        },
        merch_category_handle: "decor",
      },
      {
        handle: "by-electric-kettle",
        title: "Electric Kettle — 1.7 L",
        description: "Stainless-steel cordless electric kettle with auto shut-off and boil-dry protection.",
        thumbnail: "https://images.unsplash.com/photo-1594221708779-94832f4320d1?w=600",
        images: [
          "https://images.unsplash.com/photo-1594221708779-94832f4320d1?w=600",
          "https://images.unsplash.com/photo-1571513800374-df1bbe650e56?w=600",
          "https://images.unsplash.com/photo-1597393353415-b3730f3719fe?w=600",
          "https://images.unsplash.com/photo-1593620659530-c75a4ee61e16?w=600",
        ],
        price_minor: 35000,
        taxonomy_handle: "home.appliance",
        core_fields: {
          brand: "Bayti Kitchen",
          appliance_type: "kettle",
          capacity_l: 1.7,
          watts: 2200,
        },
        merch_category_handle: "kitchen",
      },
      {
        handle: "by-picture-frames-set",
        title: "Picture Frames Gallery Set",
        description: "Set of 5 wooden picture frames in assorted sizes — perfect for a gallery wall.",
        thumbnail: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
        images: [
          "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
          "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600",
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600",
          "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600",
        ],
        price_minor: 18000,
        taxonomy_handle: "home.frames",
        core_fields: {
          size_cm: "20x30",
          material: "Pine wood",
          color: "natural",
          pieces: 5,
        },
        merch_category_handle: "decor",
      },
    ],
  },
]

export default async function seedDemoShops({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const tenantSvc: any = container.resolve(TENANT_MODULE)
  const merchSvc: any = container.resolve(MERCH_MODULE)
  const productSvc: any = container.resolve(Modules.PRODUCT)

  logger.info(`Seeding ${SHOPS.length} demo shops with taxonomy...`)
  let totalProducts = 0

  for (const shop of SHOPS) {
    const currencyCode = shop.display_currency.toLowerCase()

    // ---- 1. Sales channel upsert ----
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

    // ---- 2. Tenant upsert ----
    const existingTenant = await tenantSvc.getBySlug(shop.slug)
    const tenantPayload = {
      slug: shop.slug,
      name: shop.name,
      sales_channel_id: channelId,
      vertical: shop.vertical,
      display_currency: shop.display_currency,
      show_secondary: true,
      branding: shop.branding,
      approval_status: "approved" as const,
    }

    let tenantId: string
    if (existingTenant) {
      await tenantSvc.updateTenants({ id: existingTenant.id, ...tenantPayload })
      tenantId = existingTenant.id
    } else {
      const created = await tenantSvc.createTenants(tenantPayload)
      tenantId = Array.isArray(created) ? created[0].id : created.id
    }

    // ---- 3. Merch categories upsert ----
    const merchByHandle: Record<string, any> = {}
    for (const m of shop.merch_categories) {
      const found = await merchSvc.getByHandleForTenant(tenantId, m.handle)
      if (found) {
        merchByHandle[m.handle] = found
      } else {
        const newMerch = await merchSvc.createForTenant(tenantId, {
          handle: m.handle,
          name: m.name,
          position: m.position,
        })
        merchByHandle[m.handle] = newMerch
      }
    }

    // ---- 4. Remove existing demo products (idempotent) ----
    // We must also soft-delete variants explicitly: Medusa's softDeleteProducts()
    // does NOT cascade to product_variant, so the unique SKU constraint would block
    // re-creation on subsequent runs.
    const handles = shop.products.map((p) => p.handle)
    const { data: existingProducts } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "variants.id"],
      filters: { handle: handles } as any,
    })

    if (existingProducts && existingProducts.length > 0) {
      const idsToDelete = existingProducts.map((p: any) => p.id)

      // Collect all variant ids and soft-delete them first
      const variantIds: string[] = existingProducts.flatMap(
        (p: any) => (p.variants ?? []).map((v: any) => v.id)
      )
      if (variantIds.length > 0) {
        await productSvc.softDeleteProductVariants(variantIds)
      }

      await productSvc.softDeleteProducts(idsToDelete)
      logger.info(`  Removed ${idsToDelete.length} pre-existing product(s) for re-seeding.`)
    }

    // ---- 5. Create products, assign taxonomy, tag merch ----
    for (const ps of shop.products) {
      const { result: created } = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              handle: ps.handle,
              title: ps.title,
              description: ps.description,
              thumbnail: ps.thumbnail,
              status: "published",
              sales_channels: [{ id: channelId }],
              images: ps.images.map((url) => ({ url })),
              options: [{ title: "Default", values: ["Default"] }],
              variants: [
                {
                  title: "Default",
                  sku: ps.handle.toUpperCase(),
                  manage_inventory: false,
                  prices: [{ amount: ps.price_minor, currency_code: currencyCode }],
                  options: { Default: "Default" },
                },
              ],
            },
          ],
        },
      })

      const productId = created[0].id

      // Assign taxonomy (stores core_fields in metadata + links product_category)
      await assignProductToTaxonomyWorkflow(container).run({
        input: {
          product_id: productId,
          taxonomy_handle: ps.taxonomy_handle,
          core_fields: ps.core_fields,
          custom_fields: ps.custom_fields,
        },
      })

      // Tag into per-shop merch category via the module link table
      const merch = merchByHandle[ps.merch_category_handle]
      if (merch) {
        // Dismiss any existing link for this product before (re-)creating
        try {
          await link.dismiss({
            [Modules.PRODUCT]: { product_id: productId },
            [MERCH_MODULE]: { merch_category_id: merch.id },
          })
        } catch {
          // No existing link — nothing to dismiss
        }
        await link.create({
          [Modules.PRODUCT]: { product_id: productId },
          [MERCH_MODULE]: { merch_category_id: merch.id },
        })
      } else {
        logger.warn(`    No merch_category found for handle "${ps.merch_category_handle}" in shop "${shop.slug}"`)
      }

      totalProducts++
    }

    logger.info(`✓ ${shop.name}: ${shop.products.length} products`)
  }

  logger.info(`Demo shops seeded. Total products: ${totalProducts}`)
}
