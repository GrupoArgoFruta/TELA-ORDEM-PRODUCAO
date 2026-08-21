// Injeta o rodape de totais (pallets/caixas) na guia de itens (AD_ORDEMPRODUCAOITEM) dentro do
// formulario da OP — a soma que aparece no rodape do "Ordem de Producao.pdf" impresso.
//
// POR QUE ISTO NAO E SO <Rodape slot="SnkGridFooter"> COMO O Rodape.tsx JA FAZ NO GRID DO TOPO:
// aquele funciona porque snk-crud.js REENCAMINHA o slot "SnkGridFooter" recebido de fora para
// dentro do proprio <snk-grid> que ele monta (um <slot name="SnkGridFooter"> como filho
// light-dom desse snk-grid, dentro do render() do snk-crud). A guia de itens nao passa pelo
// <SnkCrud> que compomos em OrdensProducao.tsx: quem monta ela e o snk-guides-viewer, por conta
// propria, a partir do relacionamento AD_ORDEMPRODUCAOITEM -> AD_ORDEMPRODUCAO do metadata.xml
// (isso resolve, alias, a pergunta em aberto do spec sobre a guia aparecer sozinha: aparece —
// confirmado lendo GuideBuilder.d.ts/SnkDetailView.d.ts, guiado pela config, sem componente
// separado). E o snk-detail-view.js que essa guia usa NAO reencaminha slot nenhum para o
// <snk-grid> que ELE cria por dentro (visto no render() dele: nenhum <slot> entre os filhos
// passados ao snk-grid ali). Nao ha prop nem slot documentado pra alcancar aquele rodape de
// fora — SnkDetailView.d.ts nao expoe nada do tipo.
//
// O QUE FUNCIONA MESMO ASSIM: aquele <snk-grid> interno tem, no PROPRIO shadow dom dele (mesmo
// componente snk-grid.js do grid do topo), um <slot name="SnkGridFooter">. Atribuicao de slot no
// Shadow DOM olha pro shadow host mais proximo — nao importa se alguem no meio do caminho fez
// reencaminhamento. Um elemento que e filho light-dom DIRETO desse <snk-grid> especifico, com
// slot="SnkGridFooter", cai naquele slot de qualquer jeito. Por isso a estrategia aqui e achar
// o <snk-grid> de DENTRO do <snk-detail-view entityName="AD_ORDEMPRODUCAOITEM"> e anexar o
// rodape como filho direto dele — nao do snk-detail-view.
//
// NAO VERIFICADO CONTRA DADOS REAIS: o ambiente onde isto foi escrito tinha zero registros de
// AD_ORDEMPRODUCAO, entao nunca foi possivel abrir uma OP de verdade e ver a guia de itens
// montar. Tudo acima vem de ler o codigo-fonte da lib (snk-crud.js, snk-detail-view.js,
// snk-guides-viewer.js, snk-grid.js dentro de node_modules), nao de inspecao ao vivo no
// DevTools. Na primeira OP aberta depois do deploy, confirme visualmente que o rodape aparece
// embaixo da grade de itens — se a lib mantiver os <snk-detail-view> de guias ja visitadas
// escondidos no DOM em vez de destrui-los (padrao que o restante da lib usa via ez-view-stack,
// visibility/display), o rodape so e montado uma vez por guia e continua atualizando sozinho
// nas trocas seguintes; se a lib destruir e recriar o elemento a cada troca de guia, o
// MutationObserver abaixo reprocessa do zero — os dois casos estao cobertos.
//
// Comentarios de linha, e nao um bloco /* */, pelo mesmo motivo dos outros arquivos deste
// projeto: o ESLint do CRA le o primeiro bloco do arquivo como possivel anotacao Flow.

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { DataUnit } from '@sankhyalabs/core';
import Rodape, { TotalDoRodape } from './Rodape';

const ENTIDADE_ITENS = 'AD_ORDEMPRODUCAOITEM';
const MARCADOR_ANEXADO = 'rodapeItensAnexado';

/* O snk-detail-view expoe `entityName` e `dataUnit` como propriedades JS (Props do Stencil),
   nao como atributos HTML — dai o acesso via propriedade, nao getAttribute. */
interface ElementoSnkDetailView extends HTMLElement {
    entityName?: string;
    dataUnit?: DataUnit;
    __rodapeItensCleanup__?: () => void;
}

/*
 * Soma os campos do PDF impresso: pallets e caixas de TODOS os itens carregados nesta guia.
 * Diferente do rodape do grid do topo (ver o historico de Dados.tsx no git), aqui
 * dataUnit.records e confiavel como "tudo": uma OP tem poucos itens, entao a pagina unica do
 * DataUnit detail ja cobre o total real — sem precisar da query manual que o topo exigiria
 * pra somar atraves de todo o filtro (DataUnit nao entrega SUM agregado de servidor).
 */
const somarTotaisItens = (dataUnit: DataUnit): Array<TotalDoRodape> => {

    let pallets = 0;
    let caixas  = 0;

    for (const registro of dataUnit.records) {
        pallets += Number (registro['QTDPALLETS']) || 0;
        caixas  += Number (registro['QTDCAIXAS'])  || 0;
    }

    return [
        { rotulo: 'Pallets', valor: pallets, icone: 'layers',  tom: 'pallets' },
        { rotulo: 'Caixas',  valor: caixas,  icone: 'package', tom: 'caixas'  },
    ];

};

/*
 * Espera por uma condicao que depende de timing fora do nosso controle: o `.dataUnit` do
 * snk-detail-view so e preenchido quando o snk-data-unit interno dele dispara
 * dataUnitReadyHandler (snk-detail-view.js), que nao expoe evento publico pra ouvir de fora do
 * elemento. Mesmo espirito do retry-com-espera que o public/index.html ja usa pra falha de
 * rede — aqui e pra uma condicao de montagem.
 */
function esperarPor<T> (obter: () => T | undefined | null, tentativas = 50, intervaloMs = 100): Promise<T | undefined> {
    return new Promise (resolver => {
        const tentar = (restantes: number) => {
            const valor = obter ();
            if (valor) { resolver (valor); return; }
            if (restantes <= 0) { resolver (undefined); return; }
            setTimeout (() => tentar (restantes - 1), intervaloMs);
        };
        tentar (tentativas);
    });
}

/*
 * Anexa o rodape a UM <snk-detail-view> da guia de itens que acabou de aparecer no DOM.
 * Marca o elemento IMEDIATAMENTE (antes de qualquer await) para uma segunda mutacao do mesmo
 * MutationObserver, disparada enquanto isto ainda esta em andamento, nao processar de novo.
 */
async function anexarRodape (detailView: ElementoSnkDetailView) {

    detailView.dataset[MARCADOR_ANEXADO] = 'true';

    const [dataUnit, snkGrid] = await Promise.all ([
        esperarPor (() => detailView.dataUnit),
        esperarPor (() => detailView.querySelector ('snk-grid')),
    ]);

    if (!dataUnit || !snkGrid) {
        console.warn (
            '[bi] rodape de itens: dataUnit ou snk-grid da guia de ' + ENTIDADE_ITENS
            + ' nao apareceram a tempo — rodape nao anexado.'
        );
        return;
    }

    /*
     * O elemento com slot="SnkGridFooter" cai como item flex direto de
     * .snk-grid-container__footer (display:flex, sem align-items:stretch no eixo principal) —
     * sem largura propria ele encolhe pro conteudo (confirmado ao vivo: 176px, contra os
     * ~1686px disponiveis) e os dois cartoes do Rodape, que dividem essa largura em 50/50 via
     * ez-col--sd-6, colapsam um em cima do outro. O Rodape.tsx do grid do topo nao sofre disso
     * porque LA a propria .footer-totals (com a classe ez-row, que a folha do tema provavelmente
     * já estica pra 100%) e quem carrega o slot; aqui o slot fica neste wrapper sem classe
     * nenhuma, um nivel acima do que o Rodape renderiza — por isso o 100% precisa ser explicito.
     */
    const container = document.createElement ('div');
    container.setAttribute ('slot', 'SnkGridFooter');
    container.style.width = '100%';

    /*
     * `!important` aqui nao e capricho — e a unica forma de vencer o que o proprio snk-grid faz
     * com este elemento. Confirmado ao vivo: um <div slot="SnkGridFooter"> anexado DEPOIS da
     * primeira renderizacao do host chega com display:none aplicado por FORA (nao por nenhuma
     * folha global — o elemento nao tem classe nenhuma que explicasse isso). A leitura mais
     * plausivel, batendo com o comentario de Rodape.tsx sobre o realoc de slot do Stencil
     * acontecer so no primeiro render do host: quando o host decide, naquele primeiro render,
     * que o slot "SnkGridFooter" nao tinha filho nenhum (porque o nosso ainda nem existia — so
     * chega depois do dataUnit/snk-grid resolverem, ver esperarPor acima), ele marca o proprio
     * wrapper como escondido e nunca reavalia isso de novo — nossa insercao tardia nunca dispara
     * um re-render que revisite essa decisao. Uma regra de instancia comum perderia de
     * especificidade/ordem para o que quer que tenha aplicado aquele display:none; setProperty
     * com 'important' e o unico jeito de garantir que ISTO, especificamente, fique visivel.
     */
    container.style.setProperty ('display', 'flex', 'important');

    snkGrid.appendChild (container);

    const root: Root = createRoot (container);
    const atualizar  = () => root.render (<Rodape totais={somarTotaisItens (dataUnit)} />);

    const uuid = dataUnit.subscribe (atualizar);
    atualizar ();

    /* Chamado pelo MutationObserver abaixo se este <snk-detail-view> for removido do DOM —
       fecha a subscription e desmonta o React root pra nao vazar entre trocas de guia. */
    detailView.__rodapeItensCleanup__ = () => {
        dataUnit.unsubscribe (atualizar, uuid);
        root.unmount ();
    };

}

function processarNo (no: Node, adicionado: boolean) {

    if (!(no instanceof Element)) return;

    const candidatos = no.tagName?.toLowerCase () === 'snk-detail-view'
        ? [no as ElementoSnkDetailView]
        : Array.from (no.querySelectorAll ('snk-detail-view')) as Array<ElementoSnkDetailView>;

    for (const elemento of candidatos) {

        if (elemento.entityName !== ENTIDADE_ITENS) continue;

        if (adicionado) {
            if (elemento.dataset[MARCADOR_ANEXADO]) continue;
            anexarRodape (elemento);
        } else {
            elemento.__rodapeItensCleanup__?.();
        }

    }

}

/*
 * Observa a tela inteira por <snk-detail-view entityName="AD_ORDEMPRODUCAOITEM"> — a guia de
 * itens da OP atualmente aberta. So existe uma instancia relevante por vez, mas a tela inteira
 * so monta uma vez por abertura (ver o comentario sobre montagem unica em src/index.tsx), entao
 * chamar isto uma vez no bootstrap basta: o observer fica ativo pelo resto da vida da pagina.
 */
export function observarRodapeItensOrdem () {

    const raiz = document.getElementById ('root') || document.body;

    const observer = new MutationObserver (mutacoes => {
        for (const mutacao of mutacoes) {
            mutacao.addedNodes.forEach (no => processarNo (no, true));
            mutacao.removedNodes.forEach (no => processarNo (no, false));
        }
    });

    observer.observe (raiz, { childList: true, subtree: true });

}
