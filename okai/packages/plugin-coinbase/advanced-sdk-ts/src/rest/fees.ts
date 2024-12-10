import { API_PREFIX } from '../constants';
import { RESTBase } from './rest-base';
import {
  GetTransactionsSummaryRequest,
  GetTransactionsSummaryResponse,
} from './types/fees-types';
import { method } from './types/request-types';

// [GET] Get Transaction Summary
// Official Documentation: https://docs.cdp.coinbase.com/advanced-trade/reference/retailbrokerageapi_commitconverttrade
export function getTransactionSummary(
  this: RESTBase,
  requestParams: GetTransactionsSummaryRequest
): Promise<GetTransactionsSummaryResponse> {
  return this.request({
    method: method.GET,
    endpoint: `${API_PREFIX}/transaction_summary`,
    queryParams: requestParams,
    isPublic: false,
  });
}
