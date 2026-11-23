export type PageMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
};

export class Paginated<T> {
  readonly meta: PageMeta;

  constructor(
    readonly data: T[],
    page: number,
    pageSize: number,
    totalItems: number,
    extraMeta: Record<string, unknown> = {},
  ) {
    this.meta = { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize), ...extraMeta };
  }
}
