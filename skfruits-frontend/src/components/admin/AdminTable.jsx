import { useMemo, useState } from "react";

function normalize(v) {
  return String(v ?? "").toLowerCase();
}

export default function AdminTable({
  title,
  subtitle,
  items,
  columns,
  getRowId,
  actions,
  emptyState,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return safeItems;

    return safeItems.filter((row) => {
      const haystack = columns
        .map((c) => (typeof c.searchText === "function" ? c.searchText(row) : ""))
        .join(" ");
      return normalize(haystack).includes(q);
    });
  }, [safeItems, query, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const hasActions = typeof actions === "function";

  if (safeItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
        {emptyState || <p className="text-gray-600 font-medium">No data yet.</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {title} <span className="text-gray-500">({filtered.length})</span>
          </h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search…"
              className="w-full sm:w-72 px-4 py-2.5 rounded-lg border-2 border-gray-200 text-sm focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2.5 rounded-lg border-2 border-gray-200 text-sm focus:outline-none focus:border-pink-500 transition bg-white"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap"
                >
                  {c.header}
                </th>
              ))}
              {hasActions && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paged.map((row) => (
              <tr key={getRowId(row)} className="hover:bg-gray-50 transition">
                {columns.map((c) => (
                  <td key={c.key} className="px-6 py-4 text-sm text-gray-700 align-top">
                    {typeof c.render === "function" ? c.render(row) : null}
                  </td>
                ))}
                {hasActions && <td className="px-6 py-4">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold">{safePage}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 disabled:opacity-50"
          >
            First
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 disabled:opacity-50"
          >
            Next
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 disabled:opacity-50"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

