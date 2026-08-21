import React from 'react';
import { SnkApplication, SnkDataUnit, SnkCrud } from "@sankhyalabs/sankhyablocks/react/components";
import Cabecalho from './Cabecalho';

/*
 * SPIKE — versao minima so pra validar se `entityName` resolve contra o BFF.
 *
 * AD_ORDEMPRODUCAO so existe hoje como <instance> no metadata.xml do Construtor de Telas
 * (ver "Ordem de Producao/metadata.xml" na raiz do projeto), que registra a entidade para
 * DatasetSP/CRUDServiceProvider. Se o sistema de entidades novo (o que o SnkDataUnit/BFF
 * consulta) le esse mesmo registro, a grade abaixo carrega os dados reais. Se nao ler, o
 * console vai reclamar (prefixo [bi] ou erro do BFF) e a grade fica vazia/quebrada.
 *
 * RESOURCE_ID fica undefined de proposito nesta primeira rodada: sem ele a tela abre
 * SOMENTE LEITURA ("Sem permissao"), mas isso nao impede a grade de carregar registros —
 * e o sinal mais barato de que `entityName` resolveu. Ver a secao "Plano de validacao" da
 * spec (docs/superpowers/specs/2026-08-19-ordem-producao-bi-dashboard-design.md).
 *
 * Depois que isso for confirmado, os proximos passos (nesta ordem) sao:
 *   1. Descobrir/registrar o RESOURCE_ID certo (ver comentario original em Dados.tsx, que
 *      ficou como referencia no historico do git) e tirar o modo somente-leitura.
 *   2. Confirmar se a guia de itens (AD_ORDEMPRODUCAOITEM) aparece sozinha dentro do SnkCrud.
 *   3. Reintroduzir BarraTarefas.tsx (botao "Avancar status") e Rodape.tsx (totais).
 */
export const RESOURCE_ID: string | undefined = undefined;
const entidade = "AD_ORDEMPRODUCAO";

const OrdensProducao = () => {
    return (
        <>
            <Cabecalho />
            <SnkApplication configName={entidade}>
                <SnkDataUnit
                    entityName = {entidade}
                    resourceID = {RESOURCE_ID || undefined}
                >
                    <SnkCrud configName={entidade} />
                </SnkDataUnit>
            </SnkApplication>
        </>
    );
};

export default OrdensProducao;
