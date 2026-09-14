import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAppData: vi.fn(),
  ordersList: vi.fn(),
}));

vi.mock('@/features/pedidos/model/app-data-provider', () => ({
  useAppData: mocks.useAppData,
}));
vi.mock('@/widgets/pedido-dashboard/ui/orders-list', () => ({
  OrdersList: (props: unknown) => {
    mocks.ordersList(props);
    return null;
  },
}));
vi.mock('@/widgets/pedido-dashboard/ui/orders-list-skeleton', () => ({
  OrdersRouteLoading: () => null,
}));
vi.mock('@/shared/ui/composite/StandardPageHeader', () => ({
  StandardPageHeader: () => null,
}));
vi.mock('@/shared/ui/primitives/feature-boundary', () => ({
  FeatureBoundary: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/shared/ui/primitives/page-shell', () => ({
  PageShell: ({ children }: { children: ReactNode }) => children,
}));

import PedidosPage from './page';

const baseAppData = {
  selectedChannel: 'Todos' as const,
  selectedMonthSimulated: 8,
  erroDeCarga: null,
  tentarNovamenteRecursos: vi.fn(),
  refetchPedidosResumo: vi.fn(),
};

describe('PedidosPage — contagens autoritativas', () => {
  beforeEach(() => {
    mocks.ordersList.mockReset();
    mocks.useAppData.mockReset();
  });

  it('usa editingOrderCount e nunca soma métricas históricas de OR', () => {
    mocks.useAppData.mockReturnValue({
      ...baseAppData,
      resumo: {
        statsByChannel: {
          Todos: {
            totalOrdersCount: 400,
            liberadosCount: 5,
            editingOrderCount: 7,
            editingProductCount: 2,
            orComAdequacaoCount: 100,
            orSemAdequacaoCount: 200,
            processadoErpCount: 0,
            pecasBloqueadasCount: 0,
            pecasBloqueadasPercent: 0,
            bloqueadosSemCreditoCount: 0,
            liberadosPercent: 0,
            bloqueadosSemCreditoPercent: 0,
          },
        },
      },
    });

    render(<PedidosPage />);

    expect(mocks.ordersList).toHaveBeenCalledWith(expect.objectContaining({
      awaitingChannelTotal: 5,
      editingChannelTotal: 7,
      channelTotalsLoading: false,
      channelTotalsError: null,
    }));
  });

  it('não substitui resumo indisponível pelo total de linhas de produto', () => {
    mocks.useAppData.mockReturnValue({
      ...baseAppData,
      resumo: null,
      erroDeCarga: 'resumo indisponível',
    });

    render(<PedidosPage />);

    expect(mocks.ordersList).toHaveBeenCalledWith(expect.objectContaining({
      awaitingChannelTotal: undefined,
      editingChannelTotal: undefined,
      channelTotalsLoading: false,
      channelTotalsError: 'resumo indisponível',
    }));
  });
});
