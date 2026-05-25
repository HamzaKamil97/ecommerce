import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('pos_sale + pos_sale_line tables', () => {
      it('inserts and reads back a sale with two lines', async () => {
        const svc: any = getContainer().resolve('posTerminalService');

        // MedusaService generates plural CRUD methods: createSales, createSaleLines,
        // listAndCountSales, listAndCountSaleLines. The singular form (createSale)
        // does not exist on the generated base. createSales with a single object
        // returns a single entity (not an array) — same as createStockPools in WMS.
        const sale = await svc.createSales({
          vendor_id: 'v_test',
          cashier_id: 'c_test',
          terminal_id: 't_test',
          client_id: 'cli_abc',
          total_minor: 7500,
          paid_amount_minor: 10000,
          change_due_minor: 2500,
          currency_code: 'iqd',
          status: 'completed',
        });

        // createSales with a single-object argument returns a single entity.
        // Guard defensively in case the framework wraps it in an array.
        const saleEntity = Array.isArray(sale) ? sale[0] : sale;

        await svc.createSaleLines([
          {
            sale_id: saleEntity.id,
            variant_id: 'var_1',
            qty: 1,
            unit_price_minor: 5000,
            name_snapshot: 'Bread',
          },
          {
            sale_id: saleEntity.id,
            variant_id: 'var_2',
            qty: 1,
            unit_price_minor: 2500,
            name_snapshot: 'Milk',
          },
        ]);

        const [rows] = await svc.listAndCountSales({ id: saleEntity.id });
        expect(rows).toHaveLength(1);

        const [lines] = await svc.listAndCountSaleLines({ sale_id: saleEntity.id });
        expect(lines).toHaveLength(2);
      });
    });
  },
});
