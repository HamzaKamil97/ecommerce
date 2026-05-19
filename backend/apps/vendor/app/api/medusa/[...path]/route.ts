// Server-side proxy to the Medusa backend.
// Browser calls /api/medusa/<path> on the vendor origin (same-origin, no CORS).
// This handler forwards to http://localhost:9000/<path> with the publishable
// key + any vendor cookie/header attached.
import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

async function forward(req: NextRequest, params: { path: string[] }) {
  const path = "/" + (params.path?.join("/") ?? "")
  const search = req.nextUrl.search
  const target = `${BACKEND}${path}${search}`

  // Headers to forward — strip Host/Origin which would confuse Medusa
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === "host" || lower === "origin" || lower === "referer" || lower === "content-length") return
    headers[key] = value
  })
  // Always carry the publishable key for /store/* routes
  if (PK && !headers["x-publishable-api-key"]) headers["x-publishable-api-key"] = PK
  // Carry vendor identity from cookie when the wizard calls /vendor/* via the proxy
  const cookieMatch = req.cookies.get("vendor_user_id")?.value
  if (cookieMatch && !headers["x-vendor-user-id"]) headers["x-vendor-user-id"] = cookieMatch

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text()
  }

  const res = await fetch(target, init)
  const body = await res.text()
  const out = new NextResponse(body, { status: res.status })
  res.headers.forEach((v, k) => {
    const lower = k.toLowerCase()
    if (lower === "content-encoding" || lower === "transfer-encoding") return
    out.headers.set(k, v)
  })
  return out
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params)
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params)
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params)
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params)
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params)
}
