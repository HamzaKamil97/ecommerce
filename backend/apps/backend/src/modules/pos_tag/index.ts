import { Module } from '@medusajs/framework/utils'
import PosTagService from './service'

export const POS_TAG_MODULE = 'pos_tag'

export default Module(POS_TAG_MODULE, { service: PosTagService })
