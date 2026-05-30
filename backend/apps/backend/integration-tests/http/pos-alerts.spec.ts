import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { bootstrapAdmin } from '../helpers/admin';

jest.setTimeout(120000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /pos/alerts", () => {
      let adminHeaders: Record<string, string>;

      beforeAll(async () => {
        const { headers } = await bootstrapAdmin(api, getContainer());
        adminHeaders = headers;
      })

      it("returns 200 with an alerts array", async () => {
        const res = await api.get("/pos/alerts?vendor_id=v_test", {
          headers: { ...adminHeaders, Origin: "http://localhost:9200" },
        })
        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.alerts)).toBe(true)
      })

      it("sends an Access-Control-Allow-Origin header for the POS origin", async () => {
        const res = await api.get("/pos/alerts?vendor_id=v_test", {
          headers: { ...adminHeaders, Origin: "http://localhost:9200" },
        })
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:9200")
      })
    })
  },
})
