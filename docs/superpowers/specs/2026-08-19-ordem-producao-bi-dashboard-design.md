# Dashboard BI — Ordem de Produção (React + Design System novo)

**Data:** 2026-08-19
**Status:** Em revisão
**Skill de referência:** `dashboard-sankhya` (seção 6 — BI Component com React + Design System novo)
**Template base:** https://github.com/wansleynery/Design-System-BI
**Catálogo de componentes:** https://gilded-nasturtium-6b64dd.netlify.app/

## Contexto

Hoje o processo de Ordem de Produção (embalagem de fruta — Argo Fruta) é modelado via
Construtor de Telas, com dois cadastros (`AD_ORDEMPRODUCAO` / `AD_ORDEMPRODUCAOITEM`,
ver `Ordem de Producao/metadata.xml` e `Ordem de producao Item/metadata.xml`) e um
documento impresso (`Ordem de Produção.pdf`) que é a "receita" entregue ao operacional:
cabeçalho (cliente, mercado, pedido, semana) + tabela de itens (variedade, produto, marca,
calibre/classe, pallets, padrão, caixas, cumbuca, cinta, etiqueta, data de embalagem,
produtor, válvula) + totais.

Este projeto cria um **BI Component em React** (template `Design-System-BI`, componentes
`ez-*`/`snk-*`) que **substitui as duas telas do Construtor de Telas**: uma tela única,
operacional, com CRUD completo de OP + itens, fila filtrável e controle de status.

## Modelo de dados (Sankhya)

```
AD_ORDEMPRODUCAO (cabeçalho)          AD_ORDEMPRODUCAOITEM (itens)
├── CODOP          PK, auto           ├── CODOP + CODITEM   PK
├── NUMOP          nº exibido         ├── SEQITEM
├── CODPARC   → TGFPAR (cliente)      ├── CODVARIEDADE → TGFPRO (variedade)
├── NUNOTA    → TGFCAB (pedido)       ├── CODPROD      → TGFPRO (produto)
├── SEMANA                            ├── MARCACX
├── NUMPEDIDOSEMANA                   ├── CALIBRECLASSE
├── STATUS (enum, ver abaixo)         ├── QTDPALLETS
├── OBSERVACAO                        ├── PADRAO
├── DTCRIACAO       (expr: $ctx_dh_atual)   ├── QTDCAIXAS
├── CODUSUARIOCRIACAO (expr: $ctx_usuario_logado) ├── CUMBUCA
├── DTULTSTATUS     (expr: $ctx_d_atual)    ├── CINTA
└── CODUSUARIOULTSTATUS (expr: $ctx_usuario_logado) ├── SEQUENCIA → AD_CUSTCINTETIQ
                                       ├── CODPRODUTOR → TGFPAR
                                       ├── VALVULA
                                       └── DTEMBALAGEM
```

Relação 1:N com delete em cascata já habilitado no metadata (`remove="S"` na relação
`AD_ORDEMPRODUCAOITEM`) — excluir a OP remove os itens automaticamente via JAPE.

**Enum STATUS:** `PENDENTE → EM_SEPARACAO → EMBALADO → EXPEDIDO` (sequência fixa,
sem pular etapa nem voltar na v1).

## Arquitetura

Fork do template em `bi-ordem-producao/`, editando apenas `src/`:

```
src/
├── index.tsx                    # bootstrap + registro do custom element
├── types.ts                     # tipos TS espelhando o metadata.xml (OrdemProducao, ItemOrdemProducao)
├── statusFlow.ts                # STATUS_FLOW e função pura proximoStatus(atual)
├── api/
│   ├── sankhyaClient.ts         # wrappers finos: executeQuery, datasetSave, crudSave, crudRemove
│   ├── ordemProducaoRepository.ts   # queries/CRUD de AD_ORDEMPRODUCAO (join TGFPAR)
│   └── itemRepository.ts        # queries/CRUD de AD_ORDEMPRODUCAOITEM (join TGFPRO)
├── components/
│   ├── OrdensProducaoList.tsx   # fila de OPs + filtros (status/semana) + botão "Nova OP"
│   ├── StatusBadge.tsx          # ez-badge colorido por status
│   ├── OrdemForm.tsx            # form de criar/editar cabeçalho da OP
│   ├── ItensGrid.tsx            # grid editável de itens (add/edit/remove linha) + totais
│   └── OrdemDetalhe.tsx         # ez-modal: compõe OrdemForm + ItensGrid (create/edit/view)
└── sankhya.d.ts                 # tipos globais do Sankhya (já vem do template)
```

Cada peça tem responsabilidade única: `api/*` nunca conhece componentes React;
`components/*` nunca monta XML/payload de serviço na mão (sempre via `api/*`);
`statusFlow.ts` é lógica pura, testável sem rede.

Build: `npm run zip` → `build/bi.zip` (index.jsp autocontido) → upload no
Construtor de Componentes como gadget novo, substituindo o acesso às telas antigas.

## Fluxos

### 1. Listar / filtrar (`OrdensProducaoList`)
`ordemProducaoRepository.listar({ status?, semana? })` → `DbExplorerSP.executeQuery`
juntando `AD_ORDEMPRODUCAO` + `TGFPAR` (nome do cliente), filtros aplicados no `WHERE`
SQL (não client-side). Cada linha mostra `NUMOP`, cliente, semana/pedido, `StatusBadge`.

⚠️ **Aberto:** o PDF mostra "MERCADO" (ex.: Europa / Mercado Interno), campo que não
existe em `AD_ORDEMPRODUCAO`. Hipótese: vem de `NUNOTA → TGFCAB` (tipo de operação).
Confirmar contra o banco real antes de fechar a query — se não existir like isso,
cai como filtro futuro, não bloqueia a v1.

### 2. Criar OP (`OrdemForm` + `ItensGrid`, modo create)
- Cabeçalho: cliente (`CODPARC`, busca em `TGFPAR`), pedido vinculado (`NUNOTA`, busca em
  pedidos existentes — **não cria nota nova aqui**, só referencia), semana, nº pedido na
  semana, observação.
- Itens: linhas adicionadas no grid antes de salvar (estado local), cada uma com variedade,
  produto, marca, calibre/classe, pallets, padrão, caixas, cumbuca, cinta, produtor, válvula.
- Salvar: `DatasetSP.save` no cabeçalho (retorna `CODOP` gerado) → `DatasetSP.save` em lote
  para os itens com o `CODOP` retornado. Falha parcial (cabeçalho salvo, item falha) precisa
  de tratamento — ver "Erros" abaixo.

### 3. Editar OP existente
- Carrega cabeçalho + itens (`ordemProducaoRepository.buscarPorId` + `itemRepository.listarPorOp`).
- Cabeçalho editável via `CRUDServiceProvider.saveRecord` (PK `CODOP`).
- Itens: grid permite editar linha existente (`saveRecord`, PK `CODOP+CODITEM`), adicionar
  linha nova (`DatasetSP.save`), remover linha (`CRUDServiceProvider.removeRecord`).

### 4. Excluir OP
- `ez-dialog` de confirmação (ação destrutiva) → `CRUDServiceProvider.removeRecord` em
  `AD_ORDEMPRODUCAO` (PK `CODOP`) — cascata de itens é automática (JAPE).

### 5. Avançar status
- Botão exposto só quando existe próximo estado (`statusFlow.proximoStatus`).
- `ez-dialog` de confirmação → `CRUDServiceProvider.saveRecord` (PK `CODOP`, campo `STATUS`).
- ⚠️ **Aberto:** `DTULTSTATUS`/`CODUSUARIOULTSTATUS` têm `<expression>` no metadata
  (`$ctx_d_atual` / `$ctx_usuario_logado`). Preciso confirmar empiricamente se o JAPE
  recalcula isso em `saveRecord` de update, ou se a UI precisa mandar os valores.
- Sucesso: atualiza a linha na lista localmente (sem refetch completo) + `ez-toast`.

## Erros e estados

- Loading: skeleton no grid durante fetch.
- Vazio: mensagem quando filtro não retorna nada.
- Falha de rede/API: `ez-toast` de erro, **mantém o último dado bom na tela** (nunca
  esvazia a UI por causa de uma falha), botão de retry manual.
- Falha parcial no create (cabeçalho salvo, item falhou): reabre o form em modo edição
  já com o `CODOP` obtido, mostra quais itens falharam, deixa o usuário tentar salvar
  os itens de novo — não perde o trabalho já feito.
- Ações destrutivas (excluir OP/item) sempre passam por `ez-dialog` de confirmação.

## Testes / verificação

Sem backend Sankhya real disponível neste ambiente de desenvolvimento — confirmado pela
skill `dashboard-sankhya` que comportamento GWT/gadget só se valida dentro do shell real.
Estratégia:
- `statusFlow.ts` e funções de mapeamento/cálculo de totais em `types.ts`/`ItensGrid.tsx`
  são funções puras → testáveis com Vitest/Jest isoladamente, sem rede.
- `api/*` fica fino o bastante pra ser mockável nos testes de componente (injeção do
  cliente, não import direto de `fetch`).
- Integração real (queries, saves, comportamento das expressions) só se valida fazendo
  upload do gadget num ambiente de homologação Sankhya — não dá pra automatizar aqui.

## Riscos / perguntas em aberto (não bloqueiam início, mas precisam resposta antes do fluxo específico)

1. Origem do campo "Mercado" do PDF (provável `TGFCAB`) — afeta filtro de listagem.
2. Comportamento das `<expression>` de `DTULTSTATUS`/`CODUSUARIOULTSTATUS` em update via API.
3. Regras de obrigatoriedade de campos na criação (ex.: `NUNOTA` é sempre obrigatório?) —
   o PDF mostra "PEDIDO VINCULADO:" em branco num dos exemplos, sugerindo que pode ser opcional.

## Fora de escopo (v1)

- Criar/editar o `NUNOTA` (pedido) em si — só referencia um existente.
- Pular ou reverter etapas de status.
- Indicadores agregados entre múltiplas OPs (volume por semana/produtor etc.) — confirmado
  com o usuário que o foco é operacional, não gerencial.
