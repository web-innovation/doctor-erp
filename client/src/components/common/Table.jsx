import { useState, useMemo } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';

const Table = ({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon = null,
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  pageSize = 10,
  currentPage = 1,
  totalItems,
  onPageChange,
  sortable = true,
  defaultSortKey = null,
  defaultSortDirection = 'asc',
  className = '',
  stickyHeader = false,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: defaultSortKey,
    direction: defaultSortDirection,
  });
  const [internalPage, setInternalPage] = useState(1);

  const activePage = onPageChange ? currentPage : internalPage;
  const setActivePage = onPageChange || setInternalPage;

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortable) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortConfig, sortable]);

  // Paginate data (only if not server-side pagination)
  const paginatedData = useMemo(() => {
    if (totalItems !== undefined) return sortedData; // Server-side pagination
    const start = (activePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, activePage, pageSize, totalItems]);

  const totalPages = Math.ceil((totalItems ?? data.length) / pageSize);

  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectAll = (e) => {
    if (!onSelectionChange) return;
    
    if (e.target.checked) {
      onSelectionChange(paginatedData.map((row) => row.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id) => {
    if (!onSelectionChange) return;

    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter((rowId) => rowId !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 text-blue-600" />
    );
  };

  // Skeleton rows for loading state
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {selectable && (
        <td className="px-4 py-3">
          <div className="h-4 w-4 bg-gray-200 rounded" />
        </td>
      )}
      {columns.map((col, idx) => (
        <td key={idx} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );

  // Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const showEllipsis = totalPages > 7;

      if (!showEllipsis) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (activePage <= 3) {
          pages.push(1, 2, 3, 4, '...', totalPages);
        } else if (activePage >= totalPages - 2) {
          pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
          pages.push(1, '...', activePage - 1, activePage, activePage + 1, '...', totalPages);
        }
      }

      return pages;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
        <div className="text-sm text-gray-500">
          Showing {((activePage - 1) * pageSize) + 1} to{' '}
          {Math.min(activePage * pageSize, totalItems ?? data.length)} of{' '}
          {totalItems ?? data.length} results
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActivePage(activePage - 1)}
            disabled={activePage === 1}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activePage === page
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => setActivePage(activePage + 1)}
            disabled={activePage === totalPages}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={
                      paginatedData.length > 0 &&
                      paginatedData.every((row) => selectedRows.includes(row.id))
                    }
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                    column.sortable !== false && sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                  } ${column.headerClassName || ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable !== false && sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <SkeletonRow key={idx} />
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    {emptyIcon && <div className="mb-3">{emptyIcon}</div>}
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    ${onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'}
                    ${selectedRows.includes(row.id) ? 'bg-blue-50' : ''}
                    transition-colors
                  `}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm text-gray-900 ${column.cellClassName || ''}`}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination />
    </div>
  );
};

// Action column helper component
Table.Actions = ({ children }) => (
  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
    {children}
  </div>
);

export default Table;
