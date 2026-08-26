import React, { useEffect, useRef } from 'react';
import { SnkApplication, SnkDataUnit, SnkCrud } from "@sankhyalabs/sankhyablocks/react/components";
import { ConfigStorage } from "@sankhyalabs/sankhyablocks/dist/collection/lib/configs/ConfigStorage";
import Cabecalho from './Cabecalho';
import { gerenciadorBarraTarefas, aoClicarNaBarra } from './BarraTarefas';

/*
 * SPIKE — versao minima so pra validar se `entityName` resolve contra o BFF.
 *
 * AD_ORDEMPRODUCAO so existe hoje como <instance> no metadata.xml do Construtor de Telas
 * (ver "Ordem de Producao/metadata.xml" na raiz do projeto), que registra a entidade para
 * DatasetSP/CRUDServiceProvider. Se o sistema de entidades novo (o que o SnkDataUnit/BFF
 * consulta) le esse mesmo registro, a grade abaixo carrega os dados reais. Se nao ler, o
 * console vai reclamar (prefixo [bi] ou erro do BFF) e a grade fica vazia/quebrada.
 *
 * RESOURCE_ID: confirmado em 2026-08-24 inspecionando a tela ao vivo (ver README.md,
 * secao "resourceID — obrigatorio, senao a tela abre somente leitura"). Com ele undefined
 * o snk-application caia em 'unknown.resource.id', a checagem de permissao nunca resolvia
 * e todo usuario nao-supervisor via "Sem permissao / Nao e possivel fazer alteracoes" —
 * so o usuario sup passava, porque `isAllowed` curto-circuita em `_permissions.isSup`.
 * O valor abaixo e o identificador que o proprio Sankhya usa pra abrir este menu (decodificado
 * do fragmento base64 em #app/... da URL do menu "Ordem de Producao").
 *
 * BarraTarefas.tsx ja esta plugada (botao "Gerar Relatório", ver src/BarraTarefas.tsx).
 * Ainda faltam: confirmar se a guia de itens (AD_ORDEMPRODUCAOITEM) aparece sozinha dentro
 * do SnkCrud, e Rodape.tsx (totais).
 */
export const RESOURCE_ID: string | undefined = 'br.com.sankhya.menu.adicional.nuDsb.286.1';
const entidade = "AD_ORDEMPRODUCAO";

/*
 * Filtros por codigo no SnkCrud — confirmado em 2026-08-24 (ver skill-observations,
 * Observation 7). `filterCustomConfig`/`customFilterBarConfig` sao props exclusivas do
 * `snk-filter-bar` avulso (snk-filter-bar.d.ts) — o SnkCrud NAO os declara nem repassa
 * (grep vazio em snk-crud.d.ts), e colocar um <SnkFilterBar> do lado do SnkCrud colide no
 * registro de filter providers do DataUnit (README.md, secao resourceID/filtros).
 *
 * O caminho suportado sem duplicar componente: o SnkCrud ja monta a propria barra por
 * dentro e expoe dois metodos publicos pra isso (snk-crud.d.ts) — getFilterBar(), que
 * devolve o HTMLSnkFilterBarElement real que ele mesmo criou, e reloadFilterBar(), que forca
 * a barra a reavaliar sua config (customFilterBarConfig, se setado, tem prioridade sobre o
 * ConfigStorage — ver snk-filter-bar.js). Sem isso, o resourceID novo nasce sem nenhum
 * filtro salvo no ConfigStorage e o snk-grid nem renderiza a barra (handleFilterConfigUpdated
 * esconde tudo quando o config vem vazio) — nao ha botao "+ Filtros" pra criar o primeiro
 * filtro nem pelo usuario sup, entao herdar de outro recurso ou usar essa API imperativa sao
 * as unicas saidas reais pra um resourceID totalmente novo.
 *
 * getFilterBar() NAO enfileira a chamada como o getDataUnit() faz — testado ao vivo em
 * 2026-08-24 e confirmado via console: chamar cedo demais estoura
 * "TypeError: Cannot read properties of undefined (reading 'getFilterBar')" de dentro do
 * proprio snk-crud (o _snkGrid interno dele ainda nao montou), e essa excecao trava o gadget
 * inteiro em "Aguarde...". Por isso o retry com backoff em vez de chamar direto no useEffect.
 *
 * `props.expression` e obrigatorio (data-unit-filter-builder.js:buildNumber le `props.variation`
 * sem optional chaining — sem `props` o clique em "Aplicar" quebra em silencio, sem erro visivel
 * pro usuario e sem nenhuma requisicao sair). O exemplo da documentacao oficial nao mostra isso.
 * Formato confirmado no proprio pacote instalado, nao inventado: ver
 * node_modules/@sankhyalabs/sankhyablocks/dist/collection/components/snk-filter-bar/utils/filters-mock.js,
 * que usa exatamente esse formato `this.<CAMPO> = :<CAMPO>` pros filtros QUICK_FILTERS tipo
 * NUMBER. Nomes de campo conferidos contra docs/Cabeçalho/metadata.xml (todos dataType="I").
 *
 * `customFilterBarConfig` roda de novo TODA vez que a barra recarrega — nao so na primeira
 * carga. Confirmado em snk-filter-bar.js: criar um filtro personalizado pelo "+ Filtros" chama
 * handleHidePersonalizedFilter(true) -> loadConfigFromStorage(), que reexecuta
 * customFilterBarConfig em vez de cair no ConfigStorage.loadFilterBarConfig (a funcao so troca
 * de braco se customFilterBarConfig estiver setado — nao existe um "so na primeira vez"). Um
 * loader que sempre devolve so os 4 campos fixos apaga silenciosamente qualquer filtro
 * personalizado que o usuario acabou de criar e salvar — ele "some" na hora, como se nunca
 * tivesse sido criado. Por isso o loader busca o ConfigStorage de verdade (mesma chamada que o
 * branch padrao faria) e so acrescenta os 4 campos fixos que ainda nao estiverem la, em vez de
 * substituir o resultado inteiro.
 *
 * CODPARC/CODUSUARIOCRIACAO viraram tipo SEARCH (pesquisa com popup, em vez de digitar o
 * codigo cru) a pedido do usuario em 2026-08-24. O formato de `props.searchContext` NAO estava
 * em nenhum exemplo NUMBER — copiado do proprio filters-mock.js do pacote, que traz um SEARCH
 * de Parceiro pronto (linhas ~237-257: entity "Parceiro", codeFieldName/descriptionFieldName
 * CODPARC/NOMEPARC). Pra Usuario nao havia exemplo direto, mas o entityName/tableName/campo de
 * join corretos (Usuario / TSIUSU / CODUSU) estao no metadata.xml real deste projeto
 * (docs/Cabeçalho/metadata.xml, tag <relation entityName="Usuario" ...>); NOMEUSU como
 * descriptionFieldName e o nome padrao do campo em TSIUSU (nao verificado num mock real como o
 * de Parceiro — se a pesquisa de usuario nao abrir/nao mostrar nome, e o primeiro lugar pra
 * checar). `rootEntity` no searchOptions e sempre a entidade da TELA (AD_ORDEMPRODUCAO), nao a
 * entidade pesquisada — no mock original (contexto Financeiro) valia "Financeiro" mesmo pra
 * campos de outra entidade.
 *
 * MERCADO e texto puro (dataType="S" no metadata.xml, sem relacao com outra entidade) — sem
 * exemplo TEXT no filters-mock.js, mas buildText() em data-unit-filter-builder.js so exige
 * `props.expression`; sem `props.likeAs` fica comparacao exata (=), como os demais campos.
 */
const MEUS_FILTROS: any[] = [
    { id: 'CODOP', label: 'Código', detailTitle: 'Informe o código da OP', type: 'NUMBER', props: { expression: 'this.CODOP = :CODOP' }, visible: true, filterType: 'QUICK_FILTERS' },
    {
        id: 'CODPARC', label: 'Parceiro', detailTitle: 'Informe o parceiro', type: 'SEARCH',
        props: {
            expression: 'this.CODPARC = :CODPARC',
            searchContext: {
                entity: 'Parceiro',
                entityDescription: 'Parceiro',
                searchOptions: { rootEntity: entidade, descriptionFieldName: 'NOMEPARC', codeFieldName: 'CODPARC', showInactives: false },
            },
        },
        visible: true, filterType: 'QUICK_FILTERS',
    },
    { id: 'NUNOTA', label: 'Nro. Único', detailTitle: 'Informe o número único', type: 'NUMBER', props: { expression: 'this.NUNOTA = :NUNOTA' }, visible: true, filterType: 'QUICK_FILTERS' },
    {
        id: 'CODUSUARIOCRIACAO', label: 'Usuário', detailTitle: 'Informe o usuário', type: 'SEARCH',
        props: {
            expression: 'this.CODUSUARIOCRIACAO = :CODUSUARIOCRIACAO',
            searchContext: {
                entity: 'Usuario',
                entityDescription: 'Usuário',
                searchOptions: { rootEntity: entidade, descriptionFieldName: 'NOMEUSU', codeFieldName: 'CODUSU', showInactives: false },
            },
        },
        visible: true, filterType: 'QUICK_FILTERS',
    },
    { id: 'MERCADO', label: 'Mercado', detailTitle: 'Informe o mercado', type: 'TEXT', props: { expression: 'this.MERCADO = :MERCADO' }, visible: true, filterType: 'QUICK_FILTERS' },
];

const carregarFiltrosOP = async (configName: string, resourceId: string, options: any): Promise<any[]> => {
    const configAtual = await ConfigStorage.loadFilterBarConfig (configName, resourceId, options) || [];
    const idsExistentes = new Set (configAtual.map ((item: any) => item.id));
    const filtrosFaltando = MEUS_FILTROS.filter (item => !idsExistentes.has (item.id));
    return [...filtrosFaltando, ...configAtual];
};

const OrdensProducao = () => {

    /*
     * SnkDataUnit so instancia o DataUnit no mount (componentDidLoad -> loadDataUnit()); ele
     * nunca chama dataUnit.loadData() sozinho. Sem isso a grade abre vazia e so carrega quando
     * o usuario clica em "Atualizar" na barra de tarefas (ou aperta F5) — os unicos gatilhos de
     * loadData() no pacote @sankhyalabs/sankhyablocks. getDataUnit() enfileira a resolucao,
     * entao funciona mesmo chamado antes do componentDidLoad do snk-data-unit terminar.
     */
    const dataUnitRef = useRef<HTMLSnkDataUnitElement>(null);
    const crudRef = useRef<HTMLSnkCrudElement>(null);

    useEffect(() => {
        dataUnitRef.current
            ?.getDataUnit ()
            .then (dataUnit => dataUnit.loadData ());
    }, []);

    useEffect(() => {
        let cancelado = false;

        const configurarFiltros = async (tentativasRestantes = 15): Promise<void> => {
            if (cancelado || !crudRef.current) return;
            try {
                const filterBar = await crudRef.current.getFilterBar ();
                if (!filterBar || cancelado) return;
                filterBar.customFilterBarConfig = carregarFiltrosOP;
                await crudRef.current.reloadFilterBar ();
            } catch (erro) {
                if (tentativasRestantes <= 0) {
                    console.error ('[bi] getFilterBar nao ficou pronto a tempo', erro);
                    return;
                }
                setTimeout (() => configurarFiltros (tentativasRestantes - 1), 300);
            }
        };

        configurarFiltros ();
        return () => { cancelado = true; };
    }, []);

    return (
        <>
            <Cabecalho />
            <SnkApplication configName={entidade}>
                <SnkDataUnit
                    ref = {dataUnitRef}
                    entityName = {entidade}
                    resourceID = {RESOURCE_ID || undefined}
                >
                    <SnkCrud
                        ref={crudRef}
                        configName={entidade}
                        taskbarManager={gerenciadorBarraTarefas}
                        onActionClick={aoClicarNaBarra}
                    />
                </SnkDataUnit>
            </SnkApplication>
        </>
    );
};

export default OrdensProducao;
