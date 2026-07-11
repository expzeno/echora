export function exportToExcel(data: any[], filename: string, columns?: { field: string; header: string }[]) {
  if (!data || data.length === 0) return;

  const cols = columns || Object.keys(data[0]).map(k => ({ field: k, header: k }));
  const headers = cols.map(c => c.header);
  const rows = data.map(row => cols.map(c => {
    const val = row[c.field];
    if (val === null || val === undefined) return '';
    if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
    return val;
  }));

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
