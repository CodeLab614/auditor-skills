import type { ReactNode } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";

export function AdminTable({
  headers,
  rows,
  label,
}: {
  headers: string[];
  rows: { id: string; cells: ReactNode[] }[];
  label: string;
}) {
  const columns: Column<{ id: string; cells: ReactNode[] }>[] = headers.map((header, index) => ({
    key: header,
    header,
    render: (row) => row.cells[index],
  }));
  return <DataTable title={label} columns={columns} data={rows} tableClassName="min-w-[900px]" />;
}
