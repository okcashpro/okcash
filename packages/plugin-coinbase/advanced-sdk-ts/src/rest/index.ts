import { RESTBase } from './rest-base';
import * as Accounts from './accounts';
import * as Converts from './converts';
import * as DataAPI from './dataAPI';
import * as Fees from './fees';
import * as Futures from './futures';
import * as Orders from './orders';
import * as Payments from './payments';
import * as Perpetuals from './perpetuals';
import * as Portfolios from './portfolios';
import * as Products from './products';
import * as Public from './public';

export class RESTClient extends RESTBase {
  constructor(key?: string | undefined, secret?: string | undefined) {
    super(key, secret);
  }

  // =============== ACCOUNTS endpoints ===============
  public getAccount = Accounts.getAccount.bind(this);
  public listAccounts = Accounts.listAccounts.bind(this);

  // =============== CONVERTS endpoints ===============
  public createConvertQuote = Converts.createConvertQuote.bind(this);
  public commitConvertTrade = Converts.commitConvertTrade.bind(this);
  public getConvertTrade = Converts.getConvertTrade.bind(this);

  // =============== DATA API endpoints ===============
  public getAPIKeyPermissions = DataAPI.getAPIKeyPermissions.bind(this);

  // =============== FEES endpoints ===============
  public getTransactionSummary = Fees.getTransactionSummary.bind(this);

  // =============== FUTURES endpoints ===============
  public getFuturesBalanceSummary = Futures.getFuturesBalanceSummary.bind(this);
  public getIntradayMarginSetting = Futures.getIntradayMarginSetting.bind(this);
  public setIntradayMarginSetting = Futures.setIntradayMarginSetting.bind(this);
  public getCurrentMarginWindow = Futures.getCurrentMarginWindow.bind(this);
  public listFuturesPositions = Futures.listFuturesPositions.bind(this);
  public getFuturesPosition = Futures.getFuturesPosition.bind(this);
  public scheduleFuturesSweep = Futures.scheduleFuturesSweep.bind(this);
  public listFuturesSweeps = Futures.listFuturesSweeps.bind(this);
  public cancelPendingFuturesSweep =
    Futures.cancelPendingFuturesSweep.bind(this);

  // =============== ORDERS endpoints ===============
  public createOrder = Orders.createOrder.bind(this);
  public cancelOrders = Orders.cancelOrders.bind(this);
  public editOrder = Orders.editOrder.bind(this);
  public editOrderPreview = Orders.editOrderPreview.bind(this);
  public listOrders = Orders.listOrders.bind(this);
  public listFills = Orders.listFills.bind(this);
  public getOrder = Orders.getOrder.bind(this);
  public previewOrder = Orders.previewOrder.bind(this);
  public closePosition = Orders.closePosition.bind(this);

  // =============== PAYMENTS endpoints ===============
  public listPaymentMethods = Payments.listPaymentMethods.bind(this);
  public getPaymentMethod = Payments.getPaymentMethod.bind(this);

  // =============== PERPETUALS endpoints ===============
  public allocatePortfolio = Perpetuals.allocatePortfolio.bind(this);
  public getPerpetualsPortfolioSummary =
    Perpetuals.getPerpetualsPortfolioSummary.bind(this);
  public listPerpetualsPositions =
    Perpetuals.listPerpetualsPositions.bind(this);
  public getPerpetualsPosition = Perpetuals.getPerpertualsPosition.bind(this);
  public getPortfolioBalances = Perpetuals.getPortfolioBalances.bind(this);
  public optInOutMultiAssetCollateral =
    Perpetuals.optInOutMultiAssetCollateral.bind(this);

  // =============== PORTFOLIOS endpoints ===============
  public listPortfolios = Portfolios.listPortfolios.bind(this);
  public createPortfolio = Portfolios.createPortfolio.bind(this);
  public deletePortfolio = Portfolios.deletePortfolio.bind(this);
  public editPortfolio = Portfolios.editPortfolio.bind(this);
  public movePortfolioFunds = Portfolios.movePortfolioFunds.bind(this);
  public getPortfolioBreakdown = Portfolios.getPortfolioBreakdown.bind(this);

  // =============== PRODUCTS endpoints ===============
  public getBestBidAsk = Products.getBestBidAsk.bind(this);
  public getProductBook = Products.getProductBook.bind(this);
  public listProducts = Products.listProducts.bind(this);
  public getProduct = Products.getProduct.bind(this);
  public getProductCandles = Products.getProductCandles.bind(this);
  public getMarketTrades = Products.getMarketTrades.bind(this);

  // =============== PUBLIC endpoints ===============
  public getServerTime = Public.getServerTime.bind(this);
  public getPublicProductBook = Public.getPublicProductBook.bind(this);
  public listPublicProducts = Public.listPublicProducts.bind(this);
  public getPublicProduct = Public.getPublicProduct.bind(this);
  public getPublicProductCandles = Public.getPublicProductCandles.bind(this);
  public getPublicMarketTrades = Public.getPublicMarketTrades.bind(this);
}
