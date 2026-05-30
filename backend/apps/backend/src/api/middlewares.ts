import { defineMiddlewares } from "@medusajs/framework/http"
import cors from "cors"
import { text } from "express"
import { auditLogMiddleware } from './middlewares/audit-log'
import { requireSuperAdmin } from './middlewares/require-super-admin'
import { requirePermission } from './middlewares/require-permission'

// Custom /vendor/* CORS — Medusa's built-in CORS only handles /store, /admin,
// /auth namespaces. The vendor portal lives at localhost:9100 (Next.js dev)
// and calls /vendor/* from the browser. Without these headers the browser
// blocks the response, JS fetch rejects, dashboard shows "Not signed in".
//
// Allowed origins are derived from VENDOR_CORS env var (comma-separated) and
// fall back to localhost:9100 for dev.
const VENDOR_CORS = (process.env.VENDOR_CORS ?? "http://localhost:9100")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

export default defineMiddlewares({
  routes: [
    {
      matcher: "/vendor/*",
      middlewares: [
        cors({
          origin: VENDOR_CORS,
          credentials: true,
          allowedHeaders: [
            "Content-Type",
            "Authorization",
            "x-vendor-user-id",
            "x-publishable-api-key",
          ],
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        }),
      ],
    },
    {
      // Express text() defaults to text/plain only; CSV import needs text/csv
      // parsed as a string in req.body. We add a text/* parser here so that
      // Medusa's default body-parser chain is bypassed for this route and the
      // raw CSV string lands in req.body.
      matcher: "/admin/catalog/import-csv",
      method: "POST",
      middlewares: [
        text({ type: "text/*", limit: "10mb" }),
      ],
    },
    {
      matcher: '/super-admin/*',
      middlewares: [requireSuperAdmin],
    },
    {
      matcher: '/admin/*',
      method: ['POST', 'PUT', 'PATCH', 'DELETE'],
      middlewares: [auditLogMiddleware],
    },
    {
      matcher: '/vendor/*',
      method: ['POST', 'PUT', 'PATCH', 'DELETE'],
      middlewares: [auditLogMiddleware],
    },
    {
      matcher: '/pos/*',
      method: ['POST', 'PUT', 'PATCH', 'DELETE'],
      middlewares: [auditLogMiddleware],
    },
    {
      matcher: '/pos/cash-session/close',
      method: ['POST'],
      middlewares: [requirePermission('pos.end_of_day')],
    },
    {
      matcher: '/pos/inventory-count/*/apply',
      method: ['POST'],
      middlewares: [requirePermission('catalog.stock_count')],
    },
    {
      matcher: '/pos/refunds',
      method: ['POST'],
      middlewares: [requirePermission('pos.refund_or_void')],
    },
    {
      matcher: '/admin/catalog/manager-products',
      method: ['GET'],
      middlewares: [requirePermission('catalog.view_products')],
    },
    {
      matcher: '/admin/catalog/manager-products',
      method: ['POST'],
      middlewares: [requirePermission('catalog.add_edit_product')],
    },
    {
      matcher: '/admin/audit-log*',
      method: ['GET'],
      middlewares: [requirePermission('reports.view')],
    },
    {
      matcher: '/admin/staff/*/capabilities',
      method: ['PUT'],
      middlewares: [requirePermission('staff.manage')],
    },
    {
      matcher: '/admin/approvals/refunds/bulk',
      method: ['POST'],
      middlewares: [requirePermission('pos.refund_or_void')],
    },
    {
      matcher: '/admin/departments/reorder',
      method: ['PUT'],
      middlewares: [requirePermission('catalog.manage_departments')],
    },
    {
      matcher: '/admin/tags',
      method: ['GET'],
      middlewares: [requirePermission('catalog.view_products')],
    },
    {
      matcher: '/admin/tags',
      method: ['POST'],
      middlewares: [requirePermission('catalog.add_edit_product')],
    },
    {
      matcher: '/admin/tags/*',
      method: ['PATCH', 'DELETE'],
      middlewares: [requirePermission('catalog.add_edit_product')],
    },
  ],
})
