// Botao customizado na barra de tarefas do SnkCrud.
//
// O caminho e o `taskbarManager` do proprio SnkCrud, nao um <SnkTaskbar> avulso: o CRUD ja
// monta suas barras internamente e o manager e o gancho para interferir nelas.
//
// Os tipos sao declarados aqui em vez de importados de sankhyablocks/dist/types/...:
// aquelas typings tem varios erros de resolucao (falta o pacote floating-ui/dom, caminhos
// para ezui/src/...). O TypeScript e estrutural, entao um objeto com o mesmo formato e
// aceito na prop normalmente.
//
// Comentarios de linha, e nao um bloco /* */, porque o ESLint do CRA le o primeiro bloco do
// arquivo como possivel anotacao Flow e a arroba de um nome de pacote ali dispara
// "Malformed Flow file annotation" (regra flowtype/require-valid-file-annotation).

/* Espelha CustomButton de snk-taskbar.d.ts. */
export interface BotaoCustomizado {
    name: string;
    hint: string;
    text?: string;
    iconName?: string;
}

/* Espelha TaskbarManager de snk-taskbar.d.ts. `dataState` fica como unknown: nao usamos e
   assim nao arrastamos as typings quebradas. */
export interface GerenciadorBarraTarefas {
    getButtons: (
        taskbarId: string,
        dataState: unknown,
        currentButtons: Array <string>
    ) => Array <string | BotaoCustomizado>;
}

/*
 * `iconName` tem que ser um icone do ez-design. Nomes em uso pelos proprios blocos:
 * acao, check, chevron-down, close, delete, dots-horizontal, dots-vertical,
 * drag-indicator, edit, file-download, hide-list, hierarchical-tree, launch, list,
 * minus, plus, print, search, settings-inverted, show-list, sync, table.
 *
 * ATENCAO: com iconName + text, `hint` e `text` chegam trocados no botao. O
 * buildCustomButton chama
 *
 *     iconTextButton (iconName, def.name, className, dataElementId, hint, text, ...)
 *
 * mas a assinatura da funcao e
 *
 *     iconTextButton (iconName, name, className, dataElementId, text, title, ...)
 *
 * (taskbar-elements.js:41 e :113), entao o 5o argumento vira o `label` — o texto visivel — e
 * o 6o vira o `title` — o tooltip. Confirmado no DOM da tela publicada, que saiu com
 * title="Alerta" e label="Dispara um alerta de teste": o botao exibia a frase longa.
 *
 * Os valores abaixo ja estao na ordem que a lib espera. Se um dia o `text` sair (botao so de
 * icone), o caminho passa a ser o iconButton, que usa o `hint` como title normalmente — e ai
 * o hint volta a ser a descricao longa.
 */
export const BOTAO_RELATORIO: BotaoCustomizado = {
    name: 'BOTAO_RELATORIO',
    hint: 'Gerar Relatório',                                  /* vira o label — texto visivel no botao */
    text: 'Imprime a Ordem de Produção selecionada (PDF)',    /* vira o title — tooltip                */
    iconName: 'print'
};

/*
 * Codigo do relatorio "ORDEM DE PRODUCAO" cadastrado em Relatorios Formatados (tela nativa
 * do Sankhya, nao neste projeto). Especifico deste banco/ambiente — se o relatorio for
 * reimportado ou o ambiente mudar (homologacao/producao), o Codigo pode vir diferente;
 * conferir em Relatorios Formatados antes de assumir que 295 continua certo.
 */
const CODIGO_RELATORIO_OP = 295;

/*
 * O TaskbarManager.getButtons recebe o dataState (com `selectedRecord`) a cada mudanca de
 * selecao/estado da grade — e a unica via documentada pra saber qual registro esta
 * selecionado a partir daqui. O evento actionClick, disparado no clique do botao, so traz o
 * nome do botao (CustomEvent<string>), sem o registro — por isso guardamos o ultimo aqui pra
 * o clique conseguir ler.
 */
let ultimoRegistroSelecionado: Record<string, any> | undefined;

/*
 * O snk-grid monta varias barras e chama getButtons uma vez para cada, variando o id
 * conforme o estado. Os ids observados no snk-grid.js:
 *
 *   snkGridHeaderTaskbar.unselected | .selected   (barra principal da grade)
 *   snkGridHeaderTaskbar.singleTaskbar[...]        (conforme presentationMode)
 *   snkGridTopTaskbar[...]                         (barra superior)
 *
 * Casamos pelo prefixo da barra principal para o botao nao aparecer repetido nas outras
 * nem no modo formulario.
 */
const BARRA_ALVO = 'snkGridHeaderTaskbar';

export const gerenciadorBarraTarefas: GerenciadorBarraTarefas = {

    getButtons (taskbarId, dataState, currentButtons) {

        /* Cache defensivo: so atualiza se o formato bater com o DataState real
           (ver comentario acima de `ultimoRegistroSelecionado`). Cast em vez de importar o
           tipo DataState de sankhyablocks — mesmo motivo do `dataState: unknown` na
           interface: aquelas typings tem erros de resolucao. */
        const estado = dataState as { selectedRecord?: Record<string, any> } | undefined;
        if (estado?.selectedRecord) ultimoRegistroSelecionado = estado.selectedRecord;

        if (!taskbarId.startsWith (BARRA_ALVO)) return currentButtons;

        return [...currentButtons, BOTAO_RELATORIO];

    }

};

/*
 * Monta a URL de hash que o Sankhya usa pra abrir o "Report Launcher" de um relatorio
 * formatado — o mesmo mecanismo do botao nativo "Visualizar Relatorio" (confirmado
 * decodificando a URL real gerada por ele: dois segmentos em base64 separados por "/",
 * `app/<base64 do nome da classe>/<base64 do JSON de parametros>`).
 *
 * Primeiro segmento decodificado: "br.com.sankhya.controls.ReportLauncher_295".
 * Segundo segmento decodificado: {"PK_CODOP":{"type":"I","value":"1"},"pks":{"0":{"fields":
 * {"0":{"nome":"PK_CODOP","tipo":"I","valor":1}}}}} — "PK_CODOP" e o nome do parametro
 * declarado no OrdemProducao.jrxml (ver relatorios/OrdemProducao.jrxml).
 */
function montarHashRelatorio (codop: number | string): string {

    const nomeClasseLancador = `br.com.sankhya.controls.ReportLauncher_${CODIGO_RELATORIO_OP}`;

    const parametros = {
        PK_CODOP: { type: 'I', value: String (codop) },
        pks: {
            '0': {
                fields: {
                    '0': { nome: 'PK_CODOP', tipo: 'I', valor: Number (codop) }
                }
            }
        }
    };

    return `app/${btoa (nomeClasseLancador)}/${btoa (JSON.stringify (parametros))}`
        + `&pk-refresh=${Date.now ()}`;

}

/*
 * A tela roda dentro do iframe que o `removerFrame` monta (ver src/index.tsx) — o shell do
 * Sankhya (com a barra de abas onde o relatorio abre) fica em `window.top`, nao em
 * `window.self`. Mudar o hash la e o que o botao nativo faz.
 */
function abrirRelatorioOrdemProducao (codop: number | string): void {
    (window.top ?? window).location.hash = montarHashRelatorio (codop);
}

/*
 * O evento actionClick do SnkCrud dispara para QUALQUER botao ou acao da barra — os padrao
 * inclusive. O detail traz o nome, entao filtrar pelo nosso e obrigatorio, senao o relatorio
 * abriria ao clicar em atualizar, exportar, inserir e afins.
 */
export function aoClicarNaBarra (evento: CustomEvent<string>) {

    if (evento.detail !== BOTAO_RELATORIO.name) return;

    const codop = ultimoRegistroSelecionado?.['CODOP'];

    if (codop == null) {
        window.alert ('Selecione uma Ordem de Produção antes de gerar o relatório.');
        return;
    }

    abrirRelatorioOrdemProducao (codop);

}
