import { moduleIntegrationTestRunner } from '@medusajs/test-utils'
import { POS_REFUND_REQUEST_MODULE } from '../index'
import { PosRefundRequest } from '../models/pos-refund-request'
import path from 'path'

moduleIntegrationTestRunner({
  moduleName: POS_REFUND_REQUEST_MODULE,
  moduleModels: [PosRefundRequest],
  resolve: path.join(__dirname, '..'),
  testSuite: ({ service }: any) => {
    describe('PosRefundRequestService', () => {
      it('createRequest returns a row with status pending', async () => {
        const row = await service.createRequest({
          vendor_id: 'v_t',
          original_sale_id: 'sale_001',
          total_minor: 5000,
          reason: 'changed_mind',
          requested_by: 'cashier_1',
          requested_by_name: 'Ali',
          payload: { vendor_id: 'v_t', cashier_id: 'cashier_1', manager_id: 'mgr_1', terminal_id: 'term_1', original_sale_id: 'sale_001', lines: [], method: 'cash', client_id: 'client_1' },
        })
        expect(row.status).toBe('pending')
        expect(row.vendor_id).toBe('v_t')
        expect(row.total_minor).toBe(5000)
        expect(row.reason).toBe('changed_mind')
      })

      it('listForVendor includes pending row; markStatus approved removes from pending list', async () => {
        const row = await service.createRequest({
          vendor_id: 'v_t',
          original_sale_id: 'sale_002',
          total_minor: 1500,
          reason: 'damaged',
          requested_by: 'cashier_2',
          requested_by_name: null,
          payload: { vendor_id: 'v_t', cashier_id: 'cashier_2', manager_id: 'mgr_1', terminal_id: 'term_1', original_sale_id: 'sale_002', lines: [], method: 'cash', client_id: 'client_2' },
        })
        expect(row.id).toBeDefined()

        const pending = await service.listForVendor('v_t', 'pending')
        const found = pending.find((r: any) => r.id === row.id)
        expect(found).toBeDefined()

        await service.markStatus(row.id, 'approved', 'owner_mgr', new Date())

        const pendingAfter = await service.listForVendor('v_t', 'pending')
        const stillPending = pendingAfter.find((r: any) => r.id === row.id)
        expect(stillPending).toBeUndefined()

        const approved = await service.listForVendor('v_t', 'approved')
        const approvedRow = approved.find((r: any) => r.id === row.id)
        expect(approvedRow).toBeDefined()
        expect(approvedRow.status).toBe('approved')
        expect(approvedRow.approved_by).toBe('owner_mgr')
      })
    })
  },
})
