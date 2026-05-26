import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    { resolve: "./src/modules/pos" },
    { resolve: "./src/modules/approval" },
    { resolve: "./src/modules/tenant" },
    { resolve: "./src/modules/merch" },
    { resolve: "./src/modules/ai" },

    { resolve: "./src/modules/delivery" },
    { resolve: "./src/modules/notification" },
    { resolve: "./src/modules/reviews" },
    { resolve: "./src/modules/addresses" },
    { resolve: "./src/modules/wallet" },
    { resolve: "./src/modules/loyalty" },
    { resolve: "./src/modules/payments" },
    { resolve: "./src/modules/promotions" },
    { resolve: "./src/modules/wms" },
    { resolve: "./src/modules/pos_terminal", dependencies: ['wmsService'] },
    { resolve: "./src/modules/catalog_schema" },
  ],
})
