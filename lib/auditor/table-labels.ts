import type { TableViewLabels } from "@/components/dashboard/table-view/types";

export function auditorTableLabels(
  noun: { singular: string; plural: string },
  empty: string,
): Partial<TableViewLabels> {
  return {
    searchPlaceholder: "Buscar…",
    clearSearch: "Borrar la búsqueda",
    filters: "Filtros",
    clearAll: "Quitar todos",
    activeFilters: "Filtros activos:",
    columns: "Columnas",
    toggleColumns: "Mostrar u ocultar columnas",
    results: ({ from, to, total }) => {
      if (total === 0) {
        return `Mostrando 0 de 0 ${noun.plural}`;
      }
      const unit = total === 1 ? noun.singular : noun.plural;
      return `Mostrando ${from}–${to} de ${total} ${unit}`;
    },
    selected: (count) =>
      count === 1 ? "1 seleccionado" : `${count} seleccionados`,
    clearSelection: "Quitar la selección",
    openRowMenu: "Abrir el menú",
    rowMenuTitle: "Acciones",
    removeFilter: (chip) => `Quitar ${chip}`,
    empty,
    footer: {
      rowsPerPage: "Filas por página",
      page: (page, totalPages) => `Página ${page} de ${totalPages}`,
      firstPage: "Ir a la primera página",
      previousPage: "Ir a la página anterior",
      nextPage: "Ir a la página siguiente",
      lastPage: "Ir a la última página",
    },
  };
}
