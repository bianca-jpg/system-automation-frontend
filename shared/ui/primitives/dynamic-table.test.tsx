import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DynamicTable } from '@/shared/ui/primitives/dynamic-table';

describe('DynamicTable — ordenação controlada pelo servidor', () => {
  it('notifica a nova ordenação sem reordenar parcialmente a página carregada', async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    const serverPage = [
      { id: '2', name: 'Bruno' },
      { id: '1', name: 'Ana' },
      { id: '3', name: 'Carla' },
    ];
    const { container } = render(
      <DynamicTable
        data={serverPage}
        columns={[{ key: 'name', label: 'Nome', sortable: true }]}
        rowKey={row => row.id}
        sorting={[{ id: 'name', desc: true }]}
        onSortingChange={onSortingChange}
        manualSorting
      />,
    );
    const renderedNames = () => Array.from(
      container.querySelectorAll('tbody tr[data-index]'),
      row => row.querySelector('td')?.textContent,
    );

    const headerButton = screen.getByRole('button', { name: 'Nome' });
    expect(headerButton.closest('th')).toHaveAttribute('aria-sort', 'descending');
    expect(renderedNames()).toEqual(['Bruno', 'Ana', 'Carla']);

    await user.click(headerButton);

    expect(onSortingChange).toHaveBeenCalledWith([]);
    expect(renderedNames()).toEqual(['Bruno', 'Ana', 'Carla']);
  });

  it('encaminha o limite nativo da busca para o input do design system', () => {
    render(
      <DynamicTable
        data={[]}
        columns={[{ key: 'name', label: 'Nome' }]}
        searchValue=""
        onSearchChange={() => {}}
        searchLabel="Buscar pessoas"
        searchMaxLength={120}
      />,
    );

    expect(
      screen.getByRole('searchbox', { name: 'Buscar pessoas' }),
    ).toHaveAttribute('maxlength', '120');
  });
});
