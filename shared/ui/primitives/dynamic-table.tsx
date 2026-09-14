// Reexport da tabela de dados do design-system. `DynamicTable` já traz busca,
// funil de filtros, ordenação por cabeçalho (com as setinhas), virtualização e o
// menu "..." de ações por linha — nada disso deve ser remontado à mão nas
// features/widgets.
export { DynamicTable } from '@system-automation/design-system';
export type {
  Action,
  ColumnConfig,
  DynamicTableSortingState,
} from '@system-automation/design-system';
