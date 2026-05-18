import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

// Seeds sample products across multiple verticals to validate the super-app design.
// Run with: npx medusa exec ./src/scripts/seed-multi-category.ts

export default async function seedMultiCategory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Seeding multi-category products...")

  // Find the default sales channel created by the initial seed.
  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const defaultChannel = channels?.[0]
  if (!defaultChannel) {
    logger.error("No sales channel found. Run the initial seed first.")
    return
  }

  // Find the default shipping profile.
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfileId = profiles?.[0]?.id

  const categoriesData = [
    { name: "Food", handle: "food", description: "Prepared meals, snacks, groceries" },
    { name: "Flowers", handle: "flowers", description: "Fresh flowers and bouquets" },
    { name: "Vegetables", handle: "vegetables", description: "Fresh produce" },
    { name: "Electronics", handle: "electronics", description: "Consumer electronics" },
    { name: "Fashion", handle: "fashion", description: "Clothing and accessories" },
  ]

  const { result: categories } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: categoriesData.map((c) => ({
        name: c.name,
        handle: c.handle,
        description: c.description,
        is_active: true,
      })),
    },
  })
  logger.info(`Created ${categories.length} categories.`)

  const byHandle = Object.fromEntries(categories.map((c) => [c.handle, c.id]))

  const products = [
    // FOOD
    {
      title: "Margherita Pizza",
      handle: "margherita-pizza",
      description: "Wood-fired pizza with fresh basil, mozzarella, and San Marzano tomatoes.",
      category_ids: [byHandle.food],
      thumbnail: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
      variants: [{ title: "Regular", manage_inventory: false, sku: "FOOD-PIZZA-MARG-REG", prices: [{ amount: 1499, currency_code: "usd" }] }],
    },
    {
      title: "Chocolate Croissant",
      handle: "chocolate-croissant",
      description: "Buttery, flaky croissant with dark chocolate filling.",
      category_ids: [byHandle.food],
      thumbnail: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600",
      variants: [{ title: "Single", manage_inventory: false, sku: "FOOD-CROISSANT-CHOC", prices: [{ amount: 449, currency_code: "usd" }] }],
    },
    // FLOWERS
    {
      title: "Red Roses Bouquet",
      handle: "red-roses-bouquet",
      description: "A dozen long-stem red roses, hand-tied with seasonal greenery.",
      category_ids: [byHandle.flowers],
      thumbnail: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600",
      variants: [
        { title: "12 stems", manage_inventory: false, sku: "FLOWERS-ROSE-RED-12", prices: [{ amount: 3999, currency_code: "usd" }] },
        { title: "24 stems", manage_inventory: false, sku: "FLOWERS-ROSE-RED-24", prices: [{ amount: 6999, currency_code: "usd" }] },
      ],
    },
    {
      title: "Tulip Mix",
      handle: "tulip-mix",
      description: "Mixed-color tulip bouquet, locally grown.",
      category_ids: [byHandle.flowers],
      thumbnail: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600",
      variants: [{ title: "20 stems", manage_inventory: false, sku: "FLOWERS-TULIP-MIX-20", prices: [{ amount: 2999, currency_code: "usd" }] }],
    },
    // VEGETABLES
    {
      title: "Organic Carrots",
      handle: "organic-carrots",
      description: "Locally grown organic carrots. Sold per kilogram.",
      category_ids: [byHandle.vegetables],
      thumbnail: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600",
      variants: [{ title: "1 kg", manage_inventory: false, sku: "VEG-CARROT-ORG-1KG", prices: [{ amount: 399, currency_code: "usd" }] }],
    },
    {
      title: "Cherry Tomatoes",
      handle: "cherry-tomatoes",
      description: "Sweet cherry tomatoes, perfect for salads.",
      category_ids: [byHandle.vegetables],
      thumbnail: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600",
      variants: [{ title: "500 g", manage_inventory: false, sku: "VEG-TOMATO-CHERRY-500G", prices: [{ amount: 599, currency_code: "usd" }] }],
    },
    // ELECTRONICS
    {
      title: "Wireless Headphones",
      handle: "wireless-headphones",
      description: "Over-ear Bluetooth 5.3 headphones with 40h battery life and active noise cancellation.",
      category_ids: [byHandle.electronics],
      thumbnail: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600",
      variants: [
        { title: "Black", manage_inventory: false, sku: "ELEC-HEADPHONE-BLK", prices: [{ amount: 14999, currency_code: "usd" }] },
        { title: "Silver", manage_inventory: false, sku: "ELEC-HEADPHONE-SLV", prices: [{ amount: 14999, currency_code: "usd" }] },
      ],
    },
    {
      title: "USB-C Power Bank",
      handle: "usbc-power-bank",
      description: "20,000 mAh portable charger with 65W USB-C PD output.",
      category_ids: [byHandle.electronics],
      thumbnail: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600",
      variants: [{ title: "20000 mAh", manage_inventory: false, sku: "ELEC-POWERBANK-20K", prices: [{ amount: 4999, currency_code: "usd" }] }],
    },
    // FASHION
    {
      title: "Classic Denim Jacket",
      handle: "classic-denim-jacket",
      description: "Mid-wash denim jacket, 100% cotton, unisex fit.",
      category_ids: [byHandle.fashion],
      thumbnail: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600",
      variants: [
        { title: "S", manage_inventory: false, sku: "FASH-JACKET-DENIM-S", prices: [{ amount: 7999, currency_code: "usd" }] },
        { title: "M", manage_inventory: false, sku: "FASH-JACKET-DENIM-M", prices: [{ amount: 7999, currency_code: "usd" }] },
        { title: "L", manage_inventory: false, sku: "FASH-JACKET-DENIM-L", prices: [{ amount: 7999, currency_code: "usd" }] },
      ],
    },
    {
      title: "Cotton T-Shirt",
      handle: "cotton-t-shirt",
      description: "Premium 100% cotton crew-neck tee, pre-shrunk.",
      category_ids: [byHandle.fashion],
      thumbnail: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
      variants: [
        { title: "S / White", manage_inventory: false, sku: "FASH-TEE-WHT-S", prices: [{ amount: 1999, currency_code: "usd" }] },
        { title: "M / White", manage_inventory: false, sku: "FASH-TEE-WHT-M", prices: [{ amount: 1999, currency_code: "usd" }] },
        { title: "L / Black", manage_inventory: false, sku: "FASH-TEE-BLK-L", prices: [{ amount: 1999, currency_code: "usd" }] },
      ],
    },
  ]

  await createProductsWorkflow(container).run({
    input: {
      products: products.map((p) => ({
        title: p.title,
        handle: p.handle,
        description: p.description,
        status: ProductStatus.PUBLISHED,
        thumbnail: p.thumbnail,
        category_ids: p.category_ids,
        sales_channels: [{ id: defaultChannel.id }],
        shipping_profile_id: shippingProfileId,
        options: [{ title: "Variant", values: p.variants.map((v) => v.title) }],
        variants: p.variants.map((v) => ({
          title: v.title,
          sku: v.sku,
          manage_inventory: v.manage_inventory,
          prices: v.prices,
          options: { Variant: v.title },
        })),
      })),
    },
  })

  logger.info(`Seeded ${products.length} products across 5 categories.`)
}
