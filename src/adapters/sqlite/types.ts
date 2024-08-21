interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}
export interface Statement<BindParameters extends unknown[]> {
  database: Database;
  source: string;
  reader: boolean;
  readonly: boolean;
  busy: boolean;

  run(...params: BindParameters): RunResult;
  get(...params: BindParameters): unknown;
  all(...params: BindParameters): unknown[];
  iterate(...params: BindParameters): IterableIterator<unknown>;
  pluck(toggleState?: boolean): this;
  expand(toggleState?: boolean): this;
  raw(toggleState?: boolean): this;
  bind(...params: BindParameters): this;
  columns(): ColumnDefinition[];
  safeIntegers(toggleState?: boolean): this;
}
interface ColumnDefinition {
  name: string;
  column: string | null;
  table: string | null;
  database: string | null;
  type: string | null;
}

export interface Database {
  memory: boolean;
  readonly: boolean;
  name: string;
  open: boolean;
  inTransaction: boolean;

  // eslint-disable-next-line @typescript-eslint/ban-types
  prepare<BindParameters extends unknown[] | {} = unknown[]>(
    source: string,
  ): BindParameters extends unknown[]
    ? Statement<BindParameters>
    : Statement<[BindParameters]>;
  exec(source: string): this;
  [key: string]: unknown;
}
