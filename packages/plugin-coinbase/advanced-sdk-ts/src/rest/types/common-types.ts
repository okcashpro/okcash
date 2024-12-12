// ----- ENUMS -----
export enum ProductType {
  UNKNOWN = 'UNKNOWN_PRODUCT_TYPE',
  SPOT = 'SPOT',
  FUTURE = 'FUTURE',
}

export enum ContractExpiryType {
  UNKNOWN = 'UNKNOWN_CONTRACT_EXPIRY_TYPE',
  EXPIRING = 'EXPIRING',
  PERPETUAL = 'PERPETUAL',
}

export enum ExpiringContractStatus {
  UNKNOWN = 'UNKNOWN_EXPIRING_CONTRACT_STATUS',
  UNEXPIRED = 'STATUS_UNEXPIRED',
  EXPIRED = 'STATUS_EXPIRED',
  ALL = 'STATUS_ALL',
}

export enum PortfolioType {
  UNDEFINED = 'UNDEFINED',
  DEFAULT = 'DEFAULT',
  CONSUMER = 'CONSUMER',
  INTX = 'INTX',
}

export enum MarginType {
  CROSS = 'CROSS',
  ISOLATED = 'ISOLATED',
}

export enum OrderPlacementSource {
  UNKNOWN = 'UNKNOWN_PLACEMENT_SOURCE',
  RETAIL_SIMPLE = 'RETAIL_SIMPLE',
  RETAIL_ADVANCED = 'RETAIL_ADVANCED',
}

export enum SortBy {
  UNKNOWN = 'UNKNOWN_SORT_BY',
  LIMIT_PRICE = 'LIMIT_PRICE',
  LAST_FILL_TIME = 'LAST_FILL_TIME',
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum StopDirection {
  UP = 'STOP_DIRECTION_STOP_UP',
  DOWN = 'STOP_DIRECTION_STOP_DOWN',
}

export enum Granularity {
  UNKNOWN = 'UNKNOWN_GRANULARITY',
  ONE_MINUTE = 'ONE_MINUTE',
  FIVE_MINUTE = 'FIVE_MINUTE',
  FIFTEEN_MINUTE = 'FIFTEEN_MINUTE',
  THIRTY_MINUTE = 'THIRTY_MINUTE',
  ONE_HOUR = 'ONE_HOUR',
  TWO_HOUR = 'TWO_HOUR',
  SIX_HOUR = 'SIX_HOUR',
  ONE_DAY = 'ONE_DAY',
}

export enum ProductVenue {
  UNKNOWN = 'UNKNOWN_VENUE_TYPE',
  CBE = 'CBE',
  FCM = 'FCM',
  INTX = 'INTX',
}

export enum IntradayMarginSetting {
  UNSPECIFIED = 'INTRADAY_MARGIN_SETTING_UNSPECIFIED',
  STANDARD = 'INTRADAY_MARGIN_SETTING_STANDARD',
  INTRADAY = 'INTRADAY_MARGIN_SETTING_INTRADAY',
}

// ----- TYPES -----
export type Account = {
  uuid?: string;
  name?: string;
  currency?: string;
  available_balance?: Record<string, any>;
  default?: boolean;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  type?: Record<string, any>;
  ready?: boolean;
  hold?: Record<string, any>;
  retail_portfolio_id?: string;
};

export type TradeIncentiveMetadata = {
  userIncentiveId?: string;
  codeVal?: string;
};

export type OrderConfiguration =
  | { market_market_ioc: MarketMarketIoc }
  | { sor_limit_ioc: SorLimitIoc }
  | { limit_limit_gtc: LimitLimitGtc }
  | { limit_limit_gtd: LimitLimitGtd }
  | { limit_limit_fok: LimitLimitFok }
  | { stop_limit_stop_limit_gtc: StopLimitStopLimitGtc }
  | { stop_limit_stop_limit_gtd: StopLimitStopLimitGtd }
  | { trigger_bracket_gtc: TriggerBracketGtc }
  | { trigger_bracket_gtd: TriggerBracketGtd };

export type MarketMarketIoc = { quote_size: string } | { base_size: string };

export type SorLimitIoc = {
  baseSize: string;
  limitPrice: string;
};

export type LimitLimitGtc = {
  baseSize: string;
  limitPrice: string;
  postOnly: boolean;
};

export type LimitLimitGtd = {
  baseSize: string;
  limitPrice: string;
  endTime: string;
  postOnly: boolean;
};

export type LimitLimitFok = {
  baseSize: string;
  limitPrice: string;
};

export type StopLimitStopLimitGtc = {
  baseSize: string;
  limitPrice: string;
  stopPrice: string;
  stopDirection: StopDirection;
};

export type StopLimitStopLimitGtd = {
  baseSize: string;
  limitPrice: string;
  stopPrice: string;
  endTime: string;
  stopDirection: StopDirection;
};

export type TriggerBracketGtc = {
  baseSize: string;
  limitPrice: string;
  stopTriggerPrice: string;
};

export type TriggerBracketGtd = {
  baseSize: string;
  limitPrice: string;
  stopTriggerPrice: string;
  endTime: string;
};

export type RatConvertTrade = {
  id?: string;
  status?: Record<string, any>;
  user_entered_amount?: Record<string, any>;
  amount?: Record<string, any>;
  subtotal?: Record<string, any>;
  total?: Record<string, any>;
  fees?: Record<string, any>;
  total_fee?: Record<string, any>;
  source?: Record<string, any>;
  target?: Record<string, any>;
  unit_price?: Record<string, any>;
  user_warnings?: Record<string, any>;
  user_reference?: string;
  source_curency?: string;
  cancellation_reason?: Record<string, any>;
  source_id?: string;
  target_id?: string;
  subscription_info?: Record<string, any>;
  exchange_rate?: Record<string, any>;
  tax_details?: Record<string, any>;
  trade_incentive_info?: Record<string, any>;
  total_fee_without_tax?: Record<string, any>;
  fiat_denoted_total?: Record<string, any>;
};

export type FCMBalanceSummary = {
  futures_buying_power?: Record<string, any>;
  total_usd_balance?: Record<string, any>;
  cbi_usd_balance?: Record<string, any>;
  cfm_usd_balance?: Record<string, any>;
  total_open_orders_hold_amount?: Record<string, any>;
  unrealized_pnl?: Record<string, any>;
  daily_realized_pnl?: Record<string, any>;
  initial_margin?: Record<string, any>;
  available_margin?: Record<string, any>;
  liquidation_threshold?: Record<string, any>;
  liquidation_buffer_amount?: Record<string, any>;
  liquidation_buffer_percentage?: string;
  intraday_margin_window_measure?: Record<string, any>;
  overnight_margin_window_measure?: Record<string, any>;
};

export type FCMPosition = {
  product_id?: string;
  expiration_time?: Record<string, any>;
  side?: Record<string, any>;
  number_of_contracts?: string;
  current_price?: string;
  avg_entry_price?: string;
  unrealized_pnl?: string;
  daily_realized_pnl?: string;
};

export type FCMSweep = {
  id: string;
  requested_amount: Record<string, any>;
  should_sweep_all: boolean;
  status: Record<string, any>;
  schedule_time: Record<string, any>;
};

export type CancelOrderObject = {
  success: boolean;
  failure_reason: Record<string, any>;
  order_id: string;
};

export type Order = {
  order_id: string;
  product_id: string;
  user_id: string;
  order_configuration: OrderConfiguration;
  side: OrderSide;
  client_order_id: string;
  status: Record<string, any>;
  time_in_force?: Record<string, any>;
  created_time: Record<string, any>;
  completion_percentage: string;
  filled_size?: string;
  average_filled_price: string;
  fee?: string;
  number_of_fills: string;
  filled_value?: string;
  pending_cancel: boolean;
  size_in_quote: boolean;
  total_fees: string;
  size_inclusive_of_fees: boolean;
  total_value_after_fees: string;
  trigger_status?: Record<string, any>;
  order_type?: Record<string, any>;
  reject_reason?: Record<string, any>;
  settled?: boolean;
  product_type?: ProductType;
  reject_message?: string;
  cancel_message?: string;
  order_placement_source?: OrderPlacementSource;
  outstanding_hold_amount?: string;
  is_liquidation?: boolean;
  last_fill_time?: Record<string, any>;
  edit_history?: Record<string, any>[];
  leverage?: string;
  margin_type?: MarginType;
  retail_portfolio_id?: string;
  originating_order_id?: string;
  attached_order_id?: string;
};

export type PaymentMethod = {
  id?: string;
  type?: string;
  name?: string;
  currency?: string;
  verified?: boolean;
  allow_buy?: boolean;
  allow_sell?: boolean;
  allow_deposit?: boolean;
  allow_withdraw?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PerpetualPortfolio = {
  portfolio_uuid?: string;
  collateral?: string;
  position_notional?: string;
  open_position_notional?: string;
  pending_fees?: string;
  borrow?: string;
  accrued_interest?: string;
  rolling_debt?: string;
  portfolio_initial_margin?: string;
  portfolio_im_notional?: Record<string, any>;
  liquidation_percentage?: string;
  liquidation_buffer?: string;
  margin_type?: Record<string, any>;
  margin_flags?: Record<string, any>;
  liquidation_status?: Record<string, any>;
  unrealized_pnl?: Record<string, any>;
  total_balance?: Record<string, any>;
};

export type PortfolioSummary = {
  unrealized_pnl?: Record<string, any>;
  buying_power?: Record<string, any>;
  total_balance?: Record<string, any>;
  max_withdrawal_amount?: Record<string, any>;
};

export type PositionSummary = {
  aggregated_pnl?: Record<string, any>;
};

export type Position = {
  product_id?: string;
  product_uuid?: string;
  portfolio_uuid?: string;
  symbol?: string;
  vwap?: Record<string, any>;
  entry_vwap?: Record<string, any>;
  position_side?: Record<string, any>;
  margin_type?: Record<string, any>;
  net_size?: string;
  buy_order_size?: string;
  sell_order_size?: string;
  im_contribution?: string;
  unrealized_pnl?: Record<string, any>;
  mark_price?: Record<string, any>;
  liquidation_price?: Record<string, any>;
  leverage?: string;
  im_notional?: Record<string, any>;
  mm_notional?: Record<string, any>;
  position_notional?: Record<string, any>;
  aggregated_pnl?: Record<string, any>;
};

export type Balance = {
  asset: Record<string, any>;
  quantity: string;
  hold: string;
  transfer_hold: string;
  collateral_value: string;
  collateral_weight: string;
  max_withdraw_amount: string;
  loan: string;
  loan_collateral_requirement_usd: string;
  pledged_quantity: string;
};

export type Portfolio = {
  name?: string;
  uuid?: string;
  type?: string;
};

export type PortfolioBreakdown = {
  portfolio?: Portfolio;
  portfolio_balances?: Record<string, any>;
  spot_positions?: Record<string, any>[];
  perp_positions?: Record<string, any>[];
  futures_positions?: Record<string, any>[];
};

export type PriceBook = {
  product_id: string;
  bids: Record<string, any>[];
  asks: Record<string, any>[];
  time?: Record<string, any>;
};

export type Products = {
  products?: Product[];
  num_products?: number;
};

export type Product = {
  product_id: string;
  price: string;
  price_percentage_change_24h: string;
  volume_24h: string;
  volume_percentage_change_24h: string;
  base_increment: string;
  quote_increment: string;
  quote_min_size: string;
  quote_max_size: string;
  base_min_size: string;
  base_max_size: string;
  base_name: string;
  quote_name: string;
  watched: boolean;
  is_disabled: boolean;
  new: boolean;
  status: string;
  cancel_only: boolean;
  limit_only: boolean;
  post_only: boolean;
  trading_disabled: boolean;
  auction_mode: boolean;
  product_type?: ProductType;
  quote_currency_id?: string;
  base_currency_id?: string;
  fcm_trading_session_details?: Record<string, any>;
  mid_market_price?: string;
  alias?: string;
  alias_to?: string[];
  base_display_symbol: string;
  quote_display_symbol?: string;
  view_only?: boolean;
  price_increment?: string;
  display_name?: string;
  product_venue?: ProductVenue;
  approximate_quote_24h_volume?: string;
  future_product_details?: Record<string, any>;
};

export type Candles = {
  candles?: Candle[];
};

export type Candle = {
  start?: string;
  low?: string;
  high?: string;
  open?: string;
  close?: string;
  volume?: string;
};

export type HistoricalMarketTrade = {
  trade_id?: string;
  product_id?: string;
  price?: string;
  size?: string;
  time?: string;
  side?: OrderSide;
};

export type PortfolioBalance = {
  portfolio_uuid?: string;
  balances?: Balance[];
  is_margin_limit_reached?: boolean;
};
