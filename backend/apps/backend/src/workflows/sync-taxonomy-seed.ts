import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { TAXONOMY_TREE, flattenTree, type TreeNode } from "../taxonomy/tree"
import { getSchemaByHandle } from "../taxonomy/registry"

interface SyncStats {
  created: number
  updated: number
  unchanged: number
  total: number
}

const syncStep = createStep(
  "sync-taxonomy-tree",
  async (_input: void, { container }): Promise<StepResponse<SyncStats>> => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productSvc = container.resolve(Modules.PRODUCT) as any

    const nodes = flattenTree()
    const stats: SyncStats = { created: 0, updated: 0, unchanged: 0, total: nodes.length }

    const handles = nodes.map((n) => n.handle)
    const allCategories = await productSvc.listProductCategories(
      { handle: handles },
      {
        take: handles.length + 10,
        select: ["id", "handle", "name", "parent_category_id", "metadata"],
      }
    )
    const byHandle: Map<string, any> = new Map(allCategories.map((c: any) => [c.handle, c]))

    function depth(n: TreeNode): number {
      return n.handle.split(".").length
    }
    const sorted = [...nodes].sort((a, b) => depth(a) - depth(b))

    for (const node of sorted) {
      const parentHandle = node.handle.includes(".")
        ? node.handle.split(".").slice(0, -1).join(".")
        : null
      const parentRow = parentHandle ? byHandle.get(parentHandle) : null
      const desired = {
        name: node.display_name,
        handle: node.handle,
        is_internal: true,
        parent_category_id: parentRow?.id ?? null,
        metadata: {
          is_taxonomy: true,
          schema_handle: getSchemaByHandle(node.handle) ? node.handle : null,
        },
      }

      let existing = byHandle.get(node.handle)
      if (!existing) {
        try {
          const [created] = await productSvc.createProductCategories([desired])
          byHandle.set(node.handle, created)
          stats.created++
          logger.info(`[taxonomy] created ${node.handle}`)
        } catch (err: any) {
          // Race or stale query: handle already exists — fetch it and treat as existing
          if (err?.message?.includes("already exists")) {
            const [fetched] = await productSvc.listProductCategories(
              { handle: node.handle },
              { take: 1 }
            )
            if (fetched) {
              byHandle.set(node.handle, fetched)
              existing = fetched
              // fall through to drift check below
            } else {
              throw err
            }
          } else {
            throw err
          }
        }
      }
      // Re-check existing after potential catch above
      if (existing) {
        const sameName = existing.name === desired.name
        const sameParent = (existing.parent_category_id ?? null) === (desired.parent_category_id ?? null)
        const sameSchema = (existing.metadata?.schema_handle ?? null) === (desired.metadata.schema_handle ?? null)
        if (sameName && sameParent && sameSchema) {
          stats.unchanged++
        } else {
          await productSvc.updateProductCategories(existing.id, desired)
          stats.updated++
          logger.info(`[taxonomy] updated ${node.handle}`)
        }
      }
    }

    logger.info(`[taxonomy] sync done: ${JSON.stringify(stats)}`)
    return new StepResponse(stats)
  }
)

export const syncTaxonomySeedWorkflow = createWorkflow(
  "sync-taxonomy-seed",
  () => {
    const stats = syncStep()
    return new WorkflowResponse(stats)
  }
)
