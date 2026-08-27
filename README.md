<div align="center">
  <img src="https://argofruta.com/wp-content/uploads/2021/05/Logo-text-white-1.png" alt="Logo Argo Fruta" width="400"/>
</div>

# 📦 TELA-ORDEM-PRODUCAO — Ordem de Produção (Componente BI em React)

> Tela única e operacional para a **Ordem de Produção** da embalagem de fruta: CRUD completo
> do cabeçalho e dos itens da OP, fila filtrável e impressão da "receita" (Relatório
> Formatado). Roda como **Componente BI (HTML5)** do Sankhya.

![Versão](https://img.shields.io/badge/Vers%C3%A3o-1.0.0-1a5632)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Sankhya](https://img.shields.io/badge/Sankhya-Componente%20BI%20(HTML5)-blue)
![Status](https://img.shields.io/badge/Status-Produ%C3%A7%C3%A3o-brightgreen)

---

## 📖 Documentação

**A documentação completa está em [`docs/README.md`](docs/README.md)** — sobre o projeto,
estrutura, referência de módulos, objetos de banco, guia de implantação, fluxo de execução
e observações.

## ⚡ Build rápido

```bash
cd bi-ordem-producao
npm ci
npm run zip          # → build/bi.zip (index.jsp auto-contido, para o Componente BI)
```

## 📁 Onde está o quê

| Caminho | Conteúdo |
|---------|----------|
| `bi-ordem-producao/` | Aplicação React (fork do template Design-System-BI) |
| `bi-ordem-producao/src/` | Código da tela — ver `docs/README.md` § Referência de Módulos |
| `relatorios/OrdemProducao.jrxml` | Relatório Formatado "ORDEM DE PRODUÇÃO" (código 295) |
| `docs/Cabeçalho/`, `docs/Item/` | Exports de metadata do Construtor de Telas |
| `docs/superpowers/specs/` | Design spec original |

---

**Autor:** Francisco Natanael Lopes Vasconcelos (Natan) · Grupo Argo (Argo Fruta) ·
natanael.lopes@argofruta.com
