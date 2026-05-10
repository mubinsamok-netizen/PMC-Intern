export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function paginateRows<T>(rows: T[], options: { page?: string | null; pageSize?: string | null }) {
  const hasPagination = options.page || options.pageSize;
  if (!hasPagination) {
    return {
      rows,
      pagination: {
        page: 1,
        pageSize: rows.length,
        total: rows.length,
        totalPages: rows.length > 0 ? 1 : 0,
      } satisfies PaginationMeta,
    };
  }

  const page = Math.max(1, Number(options.page || 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 50) || 50));
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      total: rows.length,
      totalPages,
    } satisfies PaginationMeta,
  };
}
