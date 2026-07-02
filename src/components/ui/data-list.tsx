"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface DataListColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataListProps {
  columns: DataListColumn[];
  data: any[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  emptyText?: string;
  loading?: boolean;
  isAdmin?: boolean;
}

export function DataList({ columns, data, onEdit, onDelete, emptyText = "Няма данни", loading, isAdmin = true }: DataListProps) {
  const hasActions = isAdmin && !!(onEdit || onDelete);

  if (loading) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">Зареждане...</CardContent></Card>;
  }

  if (data.length === 0) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">{emptyText}</CardContent></Card>;
  }

  return (
    <>
      {/* DESKTOP: md+ table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col.key} className="whitespace-nowrap">{col.label}</TableHead>
                    ))}
                    {hasActions && <TableHead className="w-[100px]">Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row: any) => (
                    <TableRow key={row.id}>
                      {columns.map((col) => (
                        <TableCell key={col.key} className="whitespace-nowrap">
                          {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                        </TableCell>
                      ))}
                      {hasActions && (
                        <TableCell>
                          <div className="flex gap-1">
                            {onEdit && <Button variant="outline" size="sm" onClick={() => onEdit(row.id)}>✏️</Button>}
                            {onDelete && <Button variant="destructive" size="sm" onClick={() => onDelete(row.id)}>🗑️</Button>}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MOBILE: card list */}
      <div className="md:hidden space-y-3">
        {data.map((row: any) => (
          <Card key={row.id}>
            <CardContent className="p-4 space-y-2">
              {columns.map((col, i) => (
                <div key={col.key} className={i === 0 ? "" : "flex justify-between text-sm"}>
                  {i === 0 ? (
                    <div className="font-semibold text-base">
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                    </div>
                  ) : (
                    <>
                      <span className="text-muted-foreground">{col.label}:</span>
                      <span className="font-medium text-right">
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                      </span>
                    </>
                  )}
                </div>
              ))}
              {hasActions && (
                <div className="flex gap-2 pt-2 border-t">
                  {onEdit && <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(row.id)}>✏️ Редакция</Button>}
                  {onDelete && <Button variant="destructive" size="sm" className="flex-1" onClick={() => onDelete(row.id)}>🗑️ Изтрий</Button>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
