import { MedusaService } from '@medusajs/framework/utils'
import { PosRefundRequest } from './models/pos-refund-request'

class PosRefundRequestService extends MedusaService({ PosRefundRequest }) {
  async createRequest(input: {
    vendor_id: string
    original_sale_id: string
    total_minor: number
    reason: string
    requested_by: string
    requested_by_name?: string | null
    payload: any
  }) {
    return this.createPosRefundRequests({ ...input, status: 'pending' })
  }

  async listForVendor(vendor_id: string, status?: string) {
    const where: any = { vendor_id }
    if (status) where.status = status
    return this.listPosRefundRequests(where, { order: { created_at: 'ASC' } })
  }

  async markStatus(
    id: string,
    status: 'approved' | 'declined',
    approver_id: string,
    approved_at: Date
  ) {
    return this.updatePosRefundRequests({ id, status, approved_by: approver_id, approved_at })
  }
}

export default PosRefundRequestService
