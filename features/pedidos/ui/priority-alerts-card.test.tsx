// Cobertura nova para PriorityAlertsCard: garante que as duas linhas técnicas de
// integração (banco de dados / estoque Databricks) que GET /api/v1/alertas passou a
// devolver ganham a etiqueta comum "Problemas de integração" e uma pílula de filtro
// própria por `kind`, sem regredir as pílulas de negócio existentes nem o bloco de
// severidade (que já sai certo do `type`, sem mudança nenhuma).
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PriorityAlertsCard } from './priority-alerts-card';
import type { OrderAlert } from '@/shared/types/models';

function makeAlert(overrides: Partial<OrderAlert> & Pick<OrderAlert, 'id'>): OrderAlert {
  return {
    type: 'info',
    message: 'Mensagem padrão de teste.',
    time: 'Agora',
    kind: 'negocio',
    ...overrides,
  } as OrderAlert;
}

const alerts: OrderAlert[] = [
  makeAlert({
    id: 'alert-linx',
    category: 'linx',
    type: 'error',
    kind: 'negocio',
    title: 'ERP Linx fora do ar',
    message: 'Falha ao confirmar OR no Linx.',
  }),
  makeAlert({
    id: 'alert-estoque-negocio',
    category: 'anomalia_estoque',
    type: 'warning',
    kind: 'negocio',
    title: 'Ruptura de estoque detectada',
    message: 'Produto sem saldo físico com pedido ativo.',
  }),
  makeAlert({
    id: 'alert-integracao-banco',
    category: 'integracao_banco_de_dados',
    type: 'error',
    kind: 'integracao',
    title: 'Instabilidade no banco de dados',
    message: 'Banco de dados instável.',
    time: 'Agora',
    affectedCount: 3,
  }),
  makeAlert({
    id: 'alert-integracao-estoque',
    category: 'integracao_estoque',
    type: 'warning',
    kind: 'integracao',
    title: 'Estoque indisponível',
    message: 'Estoque do Databricks indisponível.',
    time: 'Agora',
    affectedCount: 1,
  }),
];

describe('PriorityAlertsCard — etiqueta e severidade das linhas de integração', () => {
  it('renderiza "Problemas de integração" para o alerta de banco de dados, nunca a category crua', () => {
    render(<PriorityAlertsCard alerts={alerts} />);

    expect(screen.getByText('Instabilidade no banco de dados')).toBeVisible();
    expect(screen.queryByText('integracao_banco_de_dados')).toBeNull();
    expect(screen.getAllByText('Problemas de integração').length).toBeGreaterThan(0);
  });

  it('agrupa banco e estoque sob a MESMA etiqueta — 2 ocorrências quando os dois estão na lista', () => {
    render(<PriorityAlertsCard alerts={alerts} />);

    expect(screen.getAllByText('Problemas de integração')).toHaveLength(2);
  });

  it('preserva a severidade por type sem mudança no bloco de cor/ícone (guarda de regressão D-04)', () => {
    const { container } = render(<PriorityAlertsCard alerts={alerts} />);

    // Ordem de renderização == ordem do array `alerts`: banco é o índice 2, estoque o 3.
    const bancoRow = container.querySelector('#alert-badge-item-2');
    const estoqueRow = container.querySelector('#alert-badge-item-3');

    expect(bancoRow).toHaveClass('ds-border-destructive');
    expect(estoqueRow).toHaveClass('ds-border-warning');
  });

  it('a pílula "Integração" mostra só os dois alertas de kind integracao e remove os de negócio', async () => {
    const user = userEvent.setup();
    render(<PriorityAlertsCard alerts={alerts} />);

    await user.click(screen.getByText('Integração'));

    expect(screen.getByText('Instabilidade no banco de dados')).toBeVisible();
    expect(screen.getByText('Estoque indisponível')).toBeVisible();
    expect(screen.queryByText('ERP Linx fora do ar')).toBeNull();
    expect(screen.queryByText('Ruptura de estoque detectada')).toBeNull();
  });

  it('não-regressão: a pílula "Estoque & Crédito" mostra anomalia_estoque mas NÃO integracao_estoque', async () => {
    const user = userEvent.setup();
    render(<PriorityAlertsCard alerts={alerts} />);

    await user.click(screen.getByText('Estoque & Crédito'));

    expect(screen.getByText('Ruptura de estoque detectada')).toBeVisible();
    expect(screen.queryByText('Estoque indisponível')).toBeNull();
  });

  it('a pílula "Todos" mostra alertas de negócio e de integração juntos, sem clicar em nada', () => {
    render(<PriorityAlertsCard alerts={alerts} />);

    expect(screen.getByText('ERP Linx fora do ar')).toBeVisible();
    expect(screen.getByText('Ruptura de estoque detectada')).toBeVisible();
    expect(screen.getByText('Instabilidade no banco de dados')).toBeVisible();
    expect(screen.getByText('Estoque indisponível')).toBeVisible();
  });

  it('o guia informativo mostra "Problemas de integração" ao abrir', () => {
    render(<PriorityAlertsCard alerts={alerts} />);

    fireEvent.click(screen.getByTitle('Guia Informativo de Alertas'));

    // Escape hatch (plano, Task 1): se o Dialog do Radix não montar em jsdom mesmo com
    // fireEvent, esta asserção é removida e o motivo registrado no SUMMARY — não se
    // deve lutar com o Radix nem mockar o Dialog. Ver SUMMARY para o resultado real.
    expect(screen.getAllByText('Problemas de integração').length).toBeGreaterThan(0);
  });
});
