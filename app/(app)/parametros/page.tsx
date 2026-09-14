"use client";

import { Sliders, ShieldCheck, Plus, Send, Lock } from "@/shared/ui/icons";
import { useCallback, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/shared/ui/primitives/card";
import { Typography } from "@/shared/ui/primitives/Typography";
import { Can, usePermissions } from "@/shared/config/auth/permissions";
import {
  requestParameterCreation,
  requestParameterDeletion,
  requestParameterUpdate,
} from "@/features/parametros/api/change-requests.api";
import { CreateParameterModal } from "@/features/parametros/ui/create-parameter-modal";
import { EditParameterModal } from "@/features/parametros/ui/edit-parameter-modal";
import { DeleteParameterModal } from "@/features/parametros/ui/delete-parameter-modal";
import {
  ParametrosResumoCardsSkeleton,
  ParametrosTableSkeleton,
} from "@/features/parametros/ui/parametros-page-skeleton";
import { ParametrosTable } from "@/features/parametros/ui/parametros-table";
import { StandardPageHeader } from "@/shared/ui/composite/StandardPageHeader";
import { MetricCard } from "@/shared/ui/primitives/metric-card";
import { PageShell } from "@/shared/ui/primitives/page-shell";
import { ErrorState } from "@/shared/ui/composite/DataState";
import { paraEnvio, paraExibicao } from "@/shared/lib/format/numero-br";
import type { Parameter, ParameterEditDraft } from "@/entities/parametro/model/types";
import {
  fetchParametros,
  type ParametersSort,
} from "@/entities/parametro/api/parametros.api";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { usePagedResource } from "@/shared/hooks/use-paged-resource";
import type { DynamicTableSortingState } from "@/shared/ui/primitives/dynamic-table";

export default function ParametrosPage() {
  const { hasMinLevel } = usePermissions();
  const canViewTable = hasMinLevel(30);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [sorting, setSorting] = useState<DynamicTableSortingState>([
    { id: "name", desc: false },
  ]);
  const currentSort = sorting[0];
  const fetchPage = useCallback((page: number, signal: AbortSignal) => {
    const sort: ParametersSort = currentSort?.id === "type"
      ? "type"
      : currentSort?.id === "value"
        ? "value"
        : currentSort?.id === "name"
          ? "name"
          : "id";
    return fetchParametros({
      page,
      search: debouncedSearch,
      sort,
      order: currentSort?.desc ? "desc" : "asc",
      signal,
    });
  }, [currentSort?.desc, currentSort?.id, debouncedSearch]);
  const parameters = usePagedResource({
    enabled: canViewTable,
    queryKey: `${debouncedSearch}|${currentSort?.id ?? "name"}|${currentSort?.desc ? "desc" : "asc"}`,
    fetchPage,
  });
  const fetchSummaryPage = useCallback((_page: number, signal: AbortSignal) => (
    fetchParametros({ page: 1, pageSize: 2, sort: "id", order: "asc", signal })
  ), []);
  // Sem `enabled`: depende do default `true` do hook consolidado.
  const summary = usePagedResource({
    queryKey: "summary|id|asc",
    fetchPage: fetchSummaryPage,
  });
  const params = parameters.rows;
  const summaryParams = summary.rows;
  // O hook consolidado zera `loadedOnce` sempre que `queryKey` muda (busca ou
  // ordenação), para não exibir "last-good" de outro filtro. Sem esta trava,
  // `parametersLoading` voltaria a `true` a cada busca/ordenação e trocaria a
  // tabela inteira pelo esqueleto, desmontando o campo de busca em foco. O
  // esqueleto abaixo é só da PRIMEIRA carga; buscar/ordenar recarrega em cima
  // da tabela existente, não por baixo dela.
  //
  // Ajuste de estado durante o render (padrão do próprio hook consolidado, ver
  // `navigation` em use-paged-resource.ts) em vez de useRef: o lint deste
  // projeto (react-hooks/refs) proíbe ler `.current` durante o render.
  const [parametrosJaCarregaram, setParametrosJaCarregaram] = useState(false);
  if (parameters.loadedOnce && !parametrosJaCarregaram) {
    setParametrosJaCarregaram(true);
  }
  const parametersLoading = canViewTable && parameters.loading && !parametrosJaCarregaram;
  const summaryLoading = summary.loading && !summary.loadedOnce;
  const erroDeCarga = parameters.error ?? summary.error;
  const tentarNovamenteRecursos = useCallback(() => {
    if (canViewTable) parameters.reload();
    summary.reload();
  }, [canViewTable, parameters, summary]);
  // Administrador+ altera direto; gestor só solicita (mesmos modais, o backend
  // resolve: POST /change-requests exige gestor, approve/reject exige admin).
  const canEdit = hasMinLevel(40);
  const canRequest = hasMinLevel(30) && !hasMinLevel(40);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [novoParam, setNovoParam] = useState({ nome: "", tipo: "string", valor: "", descricao: "" });
  const [paramToEdit, setParamToEdit] = useState<ParameterEditDraft | null>(null);
  const [paramToDelete, setParamToDelete] = useState<Parameter | null>(null);
  const [modalFeedback, setModalFeedback] = useState<{tipo: 'sucesso'|'erro', texto: string} | null>(null);

  const handleEditClick = (param: Parameter) => {
    const rawType = param.type?.toLowerCase() || '';
    let mappedType = 'string';
    if (rawType.includes('num') || rawType.includes('int') || rawType.includes('float') || rawType.includes('percent')) mappedType = 'float';
    else if (rawType.includes('bool')) mappedType = 'bool';

    setParamToEdit({
      id: param.id,
      nome: param.name,
      tipo: mappedType,
      // A API guarda ponto decimal; a tela mostra vírgula. `paraExibicao` faz a
      // ida, `paraEnvio` faz a volta no submit — as duas pontas têm que andar
      // juntas, senão o valor volta errado para o servidor.
      valor: mappedType === "float"
        ? paraExibicao(param.value ?? "")
        : param.value?.toString() || "",
      descricao: param.description || "",
    });
    setEditModalOpen(true);
    setModalFeedback(null);
  };

  const handleDeleteClick = (param: Parameter) => {
    setParamToDelete(param);
    setDeleteModalOpen(true);
    setModalFeedback(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paramToEdit) return;
    setIsSubmitting(true);
    setModalFeedback(null);
    try {
      await requestParameterUpdate(paramToEdit.id, {
        chave: paramToEdit.nome,
        tipo: paramToEdit.tipo,
        // De volta ao formato da API: ponto decimal, sem separador de milhar.
        valor: paramToEdit.tipo === "float" ? paraEnvio(paramToEdit.valor) : paramToEdit.valor,
        descricao: paramToEdit.descricao,
      });
      setModalFeedback({ tipo: "sucesso", texto: "Solicitação enviada com sucesso!" });
      setTimeout(() => { setEditModalOpen(false); setParamToEdit(null); setModalFeedback(null); }, 2000);
    } catch { setModalFeedback({ tipo: "erro", texto: "Erro ao enviar solicitação." }); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteSubmit = async () => {
    if (!paramToDelete) return;
    setIsSubmitting(true);
    setModalFeedback(null);
    try {
      await requestParameterDeletion(paramToDelete.id);
      setModalFeedback({ tipo: "sucesso", texto: "Solicitação enviada com sucesso!" });
      setTimeout(() => { setDeleteModalOpen(false); setParamToDelete(null); setModalFeedback(null); }, 2000);
    } catch { setModalFeedback({ tipo: "erro", texto: "Erro ao enviar solicitação." }); }
    finally { setIsSubmitting(false); }
  };

  const handleCreateParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalFeedback(null);
    try {
      await requestParameterCreation({
        chave: novoParam.nome,
        tipo: novoParam.tipo,
        valor: novoParam.tipo === "float" || novoParam.tipo === "int"
          ? paraEnvio(novoParam.valor)
          : novoParam.valor,
        descricao: novoParam.descricao,
      });

      setModalFeedback({ tipo: "sucesso", texto: "Solicitação enviada com sucesso!" });
      setTimeout(() => {
        setIsModalOpen(false);
        setNovoParam({ nome: "", tipo: "string", valor: "", descricao: "" });
        setModalFeedback(null);
      }, 2000);
    } catch {
      setModalFeedback({ tipo: "erro", texto: "Erro ao enviar solicitação." });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <PageShell>
      <StandardPageHeader
        page="parametros"
        className="mb-0"
        actions={
          <>
            <div className="text-right text-xs text-muted-foreground mr-4">
              <p>Última alteração</p>
              <p className="font-medium text-foreground">—</p>
              <p className="text-muted-foreground">Aguardando dados</p>
            </div>
            <Can minLevel={30}>
              <Button className="w-fit gap-2" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} />
                Novo parâmetro
              </Button>
            </Can>
            {/* Gestor solicita, administrador aprova. O aviso abaixo explica isso
                em vez do antigo botão "Solicitar alteração", que só mudava o
                estado local e exibia "Solicitação enviada!" sem chamar API
                nenhuma — as solicitações reais saem dos modais da tabela. */}
            {canRequest && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-control bg-warning/10 border ds-border-warning text-warning-text text-xs font-medium">
                <Send size={14} />
                Suas alterações entram como solicitação para aprovação do Admin.
              </div>
            )}
            {!canEdit && !canRequest && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-control bg-muted border ds-border-neutral text-muted-foreground text-xs font-medium">
                <Lock size={14} />
                Somente leitura
              </div>
            )}
          </>
        }
      />

      {erroDeCarga ? (
        <div className="mt-6">
          <ErrorState message={erroDeCarga} onRetry={tentarNovamenteRecursos} />
        </div>
      ) : null}

      {!erroDeCarga || params.length > 0 ? (
      <div className="flex flex-col gap-6">
        {/* Tabela detalhada: gestor+ (30). `basico` e `operacional` ficam só com o
            "Resumo da Aplicação" abaixo — eles não solicitam nem aprovam parâmetro,
            então a tabela com limites, descrições e ações não lhes serve. */}
        <Can minLevel={30}>
          <section className="flex flex-col gap-4">
            {/* Título e descrição da seção saíram de dentro do cartão: o
                `DynamicTable` traz o próprio `Card`, e o topo dele agora é a
                barra de busca. Como são texto fixo, continuam reais durante o
                carregamento — só a tabela vira esqueleto. */}
            <div className="flex flex-col gap-1">
              {/* `CardTitle` do design system renderiza um <div>, e esta seção
                  precisa de heading real: h2, irmão do "Resumo da Aplicação" e
                  degrau abaixo do h1 do StandardPageHeader. O `Typography` no
                  variant `h4` é o mesmo tamanho/peso que estava manual. */}
              <Typography as="h2" variant="h4" className="text-foreground">
                Parâmetros
              </Typography>
              <Typography variant="small" color="soft">
                Defina e edite os parâmetros utilizados na simulação.
              </Typography>
            </div>

            {/* O esqueleto fica DENTRO do mesmo `Can` da tabela: quem não pode
                ver a tabela não pode ver o esqueleto dela — senão a tela
                prometeria um conteúdo que nunca vai chegar para esse papel. */}
            {parametersLoading ? (
              <ParametrosTableSkeleton />
            ) : (
              <ParametrosTable
                parametros={params}
                canEdit={canEdit}
                canRequest={canRequest}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                page={parameters.page}
                pageSize={parameters.pageSize}
                total={parameters.total}
                onPageChange={parameters.setPage}
                loading={parameters.loading || parameters.refreshing}
                searchValue={search}
                onSearchChange={value => setSearch(value.slice(0, 120))}
                isSearching={search !== debouncedSearch}
                sorting={sorting}
                onSortingChange={setSorting}
              />
            )}
          </section>
        </Can>

        {/* Resumo da Aplicação — visível para todos os papéis. O `variant="soft"`
            do Card é a superfície neutra que o `bg-muted/10` manual buscava. */}
        <Card variant="soft" className="mt-10 gap-6">
          <CardHeader className="gap-1">
            {/* h2, irmão do "Parâmetros" acima: as duas são seções de primeiro
                nível da rota, abaixo do h1 do StandardPageHeader. */}
            <Typography
              as="h2"
              variant="h4"
              className="text-foreground uppercase tracking-wide"
            >
              Resumo da Aplicação
            </Typography>
            <CardDescription className="tracking-wide">
              Resumo consolidado dos parâmetros e regras ativos na simulação atual.
            </CardDescription>
          </CardHeader>

          {/* Título e descrição do resumo são texto fixo da tela — não viram
              esqueleto. Só os indicadores, que dependem dos parâmetros do
              back-end, são substituídos enquanto a carga não termina.

              Big numbers usam o MetricCard do design system: ícone no canto
              superior direito, em `text-muted-foreground` e sem fundo. Caixa de
              ícone com fundo é o idioma de cabeçalho de card/seção, não de
              indicador — ver `ChartCardHeader`. */}
          <CardContent>
          {summaryLoading ? (
            <ParametrosResumoCardsSkeleton />
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Adequação"
              icon={Sliders}
              value={`${summaryParams[0]?.value || '5'}${summaryParams[0]?.unit ?? ''}`}
              valueClassName="font-mono font-bold"
              description={`Máx: ${summaryParams[0]?.limits ?? '—'}`}
            />
            <MetricCard
              title="Segurança CD"
              icon={ShieldCheck}
              value={`${summaryParams[1]?.value || '10'}${summaryParams[1]?.unit ?? ''}`}
              valueClassName="font-mono font-bold"
              description="Reserva retida no CD"
            />
          </div>
          )}
          </CardContent>
        </Card>
      </div>
      ) : null}

      <CreateParameterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        novoParam={novoParam}
        onChangeNovoParam={setNovoParam}
        onSubmit={handleCreateParameter}
        isSubmitting={isSubmitting}
        modalFeedback={modalFeedback}
      />

      <EditParameterModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        paramToEdit={paramToEdit}
        onChangeParamToEdit={setParamToEdit}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
        modalFeedback={modalFeedback}
      />

      <DeleteParameterModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        paramToDelete={paramToDelete}
        onConfirm={handleDeleteSubmit}
        isSubmitting={isSubmitting}
        modalFeedback={modalFeedback}
      />
    </PageShell>
  );
}
