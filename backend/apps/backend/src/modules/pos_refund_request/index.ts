import { Module } from '@medusajs/framework/utils'
import PosRefundRequestService from './service'

export const POS_REFUND_REQUEST_MODULE = 'pos_refund_request'

export default Module(POS_REFUND_REQUEST_MODULE, { service: PosRefundRequestService })
