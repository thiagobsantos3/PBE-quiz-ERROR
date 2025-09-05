import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  width?: string;
}

interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  emptyState?: {
    icon?: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
  };
  className?: string;
  loading?: boolean;
  onRowClick?: (item: T, index: number) => void;
  getRowClassName?: (item: T, index: number) => string;
}

export function Table<T = any>({
  columns,
  data,
  emptyState,
  className = '',
  loading = false,
  onRowClick,
  getRowClassName
}: TableProps<T>) {
  const safeData = data || [];
  const EmptyIcon = emptyState?.icon;

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.headerClassName || ''}`}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {safeData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  {emptyState ? (
                    <>
                      {EmptyIcon && <EmptyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{emptyState.title}</h3>
                      <p className="text-gray-600 mb-4">{emptyState.description}</p>
                      {emptyState.action}
                    </>
                  ) : (
                    <p className="text-gray-500">No data available</p>
                  )}
                </td>
              </tr>
            ) : (
              safeData.map((item, index) => (
                <tr
                  key={index}
                  className={`hover:bg-gray-50 transition-colors duration-200 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${getRowClassName ? getRowClassName(item, index) : ''}`}
                  onClick={() => onRowClick?.(item, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 sm:px-6 py-4 ${column.className || ''}`}
                    >
                      {column.render 
                        ? column.render(item, index)
                        : (item as any)[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}