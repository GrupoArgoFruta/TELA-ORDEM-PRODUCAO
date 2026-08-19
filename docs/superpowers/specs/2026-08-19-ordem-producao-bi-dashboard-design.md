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

## Como o template realmente funciona (confirmado lendo o repo clonado + README)

O design original desta spec assumia que eu escreveria chamadas manuais
(`DbExplorerSP.executeQuery` / `DatasetSP.save` / `CRUDServiceProvider.*`) igual à seção 1
da skill `dashboard-sankhya` (telas JSP+JS soltas). **Não é assim que este template
funciona.** Ele empacota os blocos `@sankhyalabs/sankhyablocks`
(`SnkApplication` → `SnkDataUnit` → `SnkCrud`), que já implementam grade + formulário +
paginação + CRUD completo conversando com o BFF do módulo via GraphQL, a partir de um
`entityName`. Eu não escrevo XML de serviço à mão para o CRUD básico do cabeçalho da OP —
só componho esses blocos e customizo os pontos de extensão que eles expõem
(`taskbarManager` para botões, slot `SnkGridFooter` para rodapé).

Pontos confirmados no `README.md` e nos exemplos (`src/Dados.tsx`, `src/BarraTarefas.tsx`,
`src/Rodape.tsx`) do repo real:

- **`entityName`** identifica a entidade no BFF (ex.: `"Parceiro"` no exemplo, ligado a
  `TGFPAR`). Hipótese de trabalho: para tabelas `AD_*` a entidade é o próprio `name` do
  `<instance>` do metadata.xml (`AD_ORDEMPRODUCAO`, `AD_ORDEMPRODUCAOITEM`) — é o mesmo
  registro que o Construtor de Telas já criou para viabilizar `DatasetSP`/`CRUDServiceProvider`
  nessas tabelas. **Não verificado ainda** — é o risco #1 da lista abaixo.
- **`resourceID`** é obrigatório, senão a tela abre só-leitura ("Sem permissão"). Nas telas
  nativas quem preenche isso é o shell do Sankhya; aqui é manual. O exemplo reaproveita o
  resourceID de uma tela nativa existente. **Para `AD_ORDEMPRODUCAO` não há tela nativa
  equivalente** — precisamos descobrir/criar o resourceID certo (provavelmente o Construtor
  de Telas já registra um; ou cadastra-se um recurso novo em Segurança/Recursos).
- **Filtros não são código.** A barra de filtros do `SnkCrud` vem do que estiver cadastrado
  no `resourceID` no ERP + filtros personalizados que o usuário salvar. Um recurso novo, sem
  nenhum filtro cadastrado, **fica sem a barra inteira** (o botão "+ Filtros" some junto) —
  é preciso cadastrar pelo menos um filtro no recurso depois do primeiro deploy.
- **Totais agregados têm um limite real.** O `DataUnit` só entrega de graça o total de
  registros do filtro atual (`paginationInfo`), quantos estão carregados na página e a
  seleção — nunca um `SUM(QTDPALLETS)` de tudo que bate o filtro. A tela nativa que soma
  valores (Movimentação Financeira) usa um recurso `totals://` cadastrado no ERP, não
  exposto genericamente. Pra replicar a linha de totais do PDF (22 pallets / 2530 caixas)
  meu rodapé precisa de uma **query manual separada** (`/mge/service.sbr`,
  `DbExplorerSP.executeQuery`, mesma sessão/cookie), não do `DataUnit`.
- **Botão customizado** (nosso "Avançar status") entra via `taskbarManager` do `SnkCrud`
  (padrão em `BarraTarefas.tsx`), filtrando o evento `onActionClick` pelo `name` do botão —
  o evento dispara para qualquer botão da barra, inclusive os nativos.
- **Sem dev server e sem testes automatizados de integração.** O `SnkCrud` depende da
  sessão real do ERP e do BFF; não há como rodar isso fora do Sankhya. A única forma de
  validar qualquer hipótese acima é gerar o zip e subir num Componente BI de teste.
- **Grid de itens (`AD_ORDEMPRODUCAOITEM`) dentro da OP: provavelmente automático.**
  Inspecionando o pacote (`node_modules/@sankhyalabs/sankhyablocks`), o `SnkCrud` usa
  internamente um subcomponente `SnkDetailView` que renderiza entidades-detalhe como guias
  (abas) dentro do formulário — mas não expõe nenhuma prop pública pra configurar isso
  (`snk-crud.d.ts` não tem `guide`/`detail`/`child` na API pública). Ou seja, **é
  dirigido por metadado do servidor, não por código React** — mesmo padrão dos filtros.
  Hipótese: se a relação `AD_ORDEMPRODUCAO → AD_ORDEMPRODUCAOITEM` já registrada no
  metadata.xml (Construtor de Telas) for lida pelo sistema de entidades novo, a guia de
  itens **aparece sozinha** dentro do `SnkCrud`, sem eu escrever grid nenhum. Só o spike
  (abaixo) confirma isso.

## Plano de validação (spike — antes de qualquer outra coisa)

Given que **tudo** (grid, form, CRUD do cabeçalho, filtros, e possivelmente os itens) depende
de uma única incógnita — `entityName="AD_ORDEMPRODUCAO"` resolvendo contra o BFF —, o primeiro
passo não é implementar o fluxo completo desta spec: é um build mínimo que só isola essa
pergunta.

1. `OrdensProducao.tsx` mínimo: `SnkApplication` → `SnkDataUnit(entityName="AD_ORDEMPRODUCAO")`
   → `SnkCrud` puro, sem `taskbarManager`, sem `Rodape`. `RESOURCE_ID` inicial: tentar vazio
   primeiro (undefined) pra ver o comportamento sem resource, depois testar com um valor
   plausível se necessário.
2. `index.tsx`: `instancia` do `removerFrame` ajustada pro nome real que será dado ao
   Componente BI de teste.
3. `npm run zip` → `build/bi.zip`.
4. Você sobe esse zip como Componente BI (HTML5) de teste no Sankhya, registra o nome exato,
   libera acesso e abre.
5. Resultado esperado a observar: a grade carrega registros reais de `AD_ORDEMPRODUCAO`?
   Aparece "Sem permissão"? A guia de itens aparece sozinha ao abrir uma OP? Existe barra de
   filtros (mesmo vazia)?

O resultado desse spike decide o resto do plano: se `entityName` resolver, o trabalho que
falta é sobretudo customização (botão de status, rodapé de totais, ajuste de campos/labels).
Se não resolver, precisamos investigar como registrar a entidade pro sistema novo antes de
continuar — isso está fora do que dá pra resolver só editando `src/`.

## Arquitetura

Fork do template em `bi-ordem-producao/` (já clonado e com `npm install` feito), editando
apenas `src/`:

```
src/
├── index.tsx           # bootstrap do template — só troco a `instancia` do removerFrame
├── OrdensProducao.tsx   # SnkApplication > SnkDataUnit(entityName="AD_ORDEMPRODUCAO") > SnkCrud
│                         # (renomeado de Dados.tsx; cobre list+create+edit+delete do cabeçalho "de graça")
├── BarraTarefas.tsx     # botão "Avançar status" via taskbarManager (molde do exemplo)
├── Rodape.tsx           # cards de totais no slot SnkGridFooter (molde do exemplo)
├── statusFlow.ts        # STATUS_FLOW e função pura proximoStatus(atual) — testável sem rede
├── totaisQuery.ts       # query manual (service.sbr) pro SUM real de pallets/caixas do filtro atual
├── ItensOrdem.tsx        # TBD — grid de AD_ORDEMPRODUCAOITEM; forma depende da pesquisa de master-detail
└── sankhya.d.ts          # tipos globais (já vem do template)
```

Eu não recrio a camada `api/*` de chamadas manuais da spec anterior para o cabeçalho da OP
— isso já vem do `SnkCrud`/`SnkDataUnit`. Só escrevo chamada manual onde a lib comprovadamente
não cobre: o agregado de totais (`totaisQuery.ts`) e, possivelmente, os itens (`ItensOrdem.tsx`,
dependendo do que a pesquisa de master-detail encontrar).

Build: `npm run zip` → `build/bi.zip` (index.jsp autocontido) → upload no
**Componente BI (HTML5)** do Sankhya — não é o Construtor de Componentes genérico, é o
cadastro específico de Componente BI que o README descreve.

## Fluxos

### 1. Listar / filtrar / criar / editar / excluir cabeçalho da OP
Tudo isso é **o comportamento padrão do `SnkCrud`** dado `entityName="AD_ORDEMPRODUCAO"` —
não escrevo grid, form nem chamadas de save/remove manuais para o cabeçalho. A grade mostra
`NUMOP`, cliente, semana/pedido, status (conforme os metadados de campo que o BFF devolver);
duplo clique abre o formulário de edição; a barra de tarefas já traz inserir/excluir/salvar.

⚠️ Filtros (status/semana) só existem depois de cadastrar pelo menos um no `resourceID`, ou
o usuário criar um personalizado — não são declarados aqui em código.

⚠️ O PDF mostra "MERCADO" (ex.: Europa / Mercado Interno), campo que não existe em
`AD_ORDEMPRODUCAO`. Hipótese: vem de `NUNOTA → TGFCAB`. Não bloqueia a v1 — vira filtro depois
que confirmar a origem.

### 2. Itens da OP (`AD_ORDEMPRODUCAOITEM`)
Hipótese a confirmar no spike: aparece como guia/aba dentro do próprio `SnkCrud` (via
`SnkDetailView`, dirigido por metadado de relação no servidor — ver seção anterior), sem
código adicional. Se o spike mostrar que isso **não** acontece automaticamente, a alternativa
é um `entityName="AD_ORDEMPRODUCAOITEM"` num `SnkGrid`/`SnkCrud` próprio, filtrado por
`CODOP` — decisão adiada até ter o resultado real.

### 3. Avançar status (única customização de fato)
- Botão "Avançar" no `taskbarManager` (molde `BarraTarefas.tsx`), visível só quando existe
  próximo estado (`statusFlow.proximoStatus(statusAtual)`), com `hint`/`text` na ordem trocada
  documentada no template (armadilha confirmada no README).
- Ao clicar (`onActionClick`, filtrando pelo `name` do botão): `ez-dialog` de confirmação →
  `dataUnit.setFieldValue('STATUS', novoStatus, [idDoRegistroSelecionado])` →
  `dataUnit.saveData()` — API real do `DataUnit` (`@sankhyalabs/core`), não XML manual de
  `CRUDServiceProvider` como a spec anterior assumia.
- ⚠️ `DTULTSTATUS`/`CODUSUARIOULTSTATUS` têm `<expression>` no metadata
  (`$ctx_d_atual`/`$ctx_usuario_logado`) — confirmar empiricamente se o JAPE recalcula isso
  em save via BFF, ou se preciso setar esses campos também antes do `saveData()`.
- Sucesso/erro: feedback via `ez-toast`; `saveData()` já atualiza o `DataUnit` (e portanto a
  grade) sozinho — não preciso reimplementar isso.

### 4. Totais do rodapé (pallets/caixas somados)
- "Carregados"/"Selecionados" vêm de graça do `DataUnit` (molde `Dados.tsx`/`calcularTotais`).
- Soma real de `QTDPALLETS`/`QTDCAIXAS` de **todos** os registros do filtro atual (não só a
  página carregada) exige `totaisQuery.ts`: uma query manual (`DbExplorerSP.executeQuery` via
  `/mge/service.sbr`, mesma sessão) — o `DataUnit` não oferece agregado servidor.

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

## Riscos / perguntas em aberto

0. **(Crítico, resolve no spike)** `entityName="AD_ORDEMPRODUCAO"` resolve contra o BFF do
   sistema novo? Determina se o resto da spec é viável como está.
1. `resourceID` — não há tela nativa equivalente pra reaproveitar; precisa descobrir se o
   Construtor de Telas já registra um recurso usável ou se é preciso cadastrar um novo.
2. Se a guia de itens (`AD_ORDEMPRODUCAOITEM`) aparece automaticamente no `SnkCrud` ou exige
   um componente separado.
3. Origem do campo "Mercado" do PDF (provável `TGFCAB`) — afeta filtro de listagem.
4. Comportamento das `<expression>` de `DTULTSTATUS`/`CODUSUARIOULTSTATUS` em save via BFF.
5. Regras de obrigatoriedade de campos na criação (ex.: `NUNOTA` é sempre obrigatório?) —
   o PDF mostra "PEDIDO VINCULADO:" em branco num dos exemplos, sugerindo que pode ser opcional.

## Fora de escopo (v1)

- Criar/editar o `NUNOTA` (pedido) em si — só referencia um existente.
- Pular ou reverter etapas de status.
- Indicadores agregados entre múltiplas OPs (volume por semana/produtor etc.) — confirmado
  com o usuário que o foco é operacional, não gerencial.
