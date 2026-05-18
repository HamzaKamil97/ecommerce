import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { AI_MODULE } from "../modules/ai"
import type AiService from "../modules/ai/service"

// When a product is created or updated, refresh its semantic embedding.
export default async function indexProductForSearch({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = event.data.id
  if (!productId) return

  const productModule = container.resolve("product")
  const product = await productModule.retrieveProduct(productId).catch(() => null as any)
  if (!product) return

  const sourceText = [product.title, product.subtitle, product.description, ...(product.tags ?? []).map((t: any) => t.value)]
    .filter(Boolean)
    .join(" — ")

  const ai = container.resolve(AI_MODULE) as AiService
  await ai.indexProduct(productId, sourceText)
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}
