import React, { useEffect, useRef } from 'react';
import { SnkApplication, SnkDataUnit, SnkCrud } from "@sankhyalabs/sankhyablocks/react/components";
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
 * RESOURCE_ID fica undefined de proposito nesta primeira rodada: sem ele a tela abre
 * SOMENTE LEITURA ("Sem permissao"), mas isso nao impede a grade de carregar registros —
 * e o sinal mais barato de que `entityName` resolveu. Ver a secao "Plano de validacao" da
 * spec (docs/superpowers/specs/2026-08-19-ordem-producao-bi-dashboard-design.md).
 *
 * BarraTarefas.tsx ja esta plugada (botao "Gerar Relatório", ver src/BarraTarefas.tsx).
 * Ainda faltam: descobrir/registrar o RESOURCE_ID certo pra tirar o modo somente-leitura,
 * confirmar se a guia de itens (AD_ORDEMPRODUCAOITEM) aparece sozinha dentro do SnkCrud, e
 * Rodape.tsx (totais).
 */
export const RESOURCE_ID: string | undefined = undefined;
const entidade = "AD_ORDEMPRODUCAO";

const OrdensProducao = () => {

    /*
     * SnkDataUnit so instancia o DataUnit no mount (componentDidLoad -> loadDataUnit()); ele
     * nunca chama dataUnit.loadData() sozinho. Sem isso a grade abre vazia e so carrega quando
     * o usuario clica em "Atualizar" na barra de tarefas (ou aperta F5) — os unicos gatilhos de
     * loadData() no pacote @sankhyalabs/sankhyablocks. getDataUnit() enfileira a resolucao,
     * entao funciona mesmo chamado antes do componentDidLoad do snk-data-unit terminar.
     */
    const dataUnitRef = useRef<HTMLSnkDataUnitElement>(null);

    useEffect(() => {
        dataUnitRef.current
            ?.getDataUnit ()
            .then (dataUnit => dataUnit.loadData ());
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
