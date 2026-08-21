// Barra de cabecalho: logo Argo + titulo da tela.
//
// Sobe como IRMAO do <SnkApplication> (ver src/OrdensProducao.tsx), nao como filho — o layout
// utilitario sai das classes ez-* do tema, igual ao src/Rodape.tsx. A altura fixa desta barra
// (.bi-cabecalho, definida em public/index.html) e descontada de --bi--altura-util, senao o
// modo formulario do SnkCrud (que usa essa variavel para saber ate onde rolar) mediria demais.

import React from 'react';
import logoArgoBranco from './assets/logoArgoBranco';

const Cabecalho = () => (
    <div className="bi-cabecalho ez-row ez-align--middle ez-padding-horizontal--medium">
        <img src={logoArgoBranco} alt="Argo" className="bi-cabecalho__logo" />
        <span className="ez-text ez-text--large ez-text--bold ez-margin-left--small">
            Ordem de Produção
        </span>
    </div>
);

export default Cabecalho;
