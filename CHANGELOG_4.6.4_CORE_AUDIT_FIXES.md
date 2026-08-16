# FinançasPRO 4.6.5 — Core Audit Fixes

- Corrigida dupla contagem da sobra do mês na projeção de caixa.
- Motor de caixa passou a ser a fonte única do saldo-base realizado.
- `isInvestmentAsset` exposto pelo FinancialEngine e reutilizado nos seletores.
- Corrigido aporte em investimento legado.
- Corrigido posicionamento do FIN para centro-direita.
- Corrigida identidade da versão e versão dos backups exportados.
- Sanitização reforçada em tabelas e selects que renderizam dados livres do usuário.
- Removidas duplicações de funções de policy e código morto do saldo-base.
- Adicionados testes específicos para estes regressions.

## QA

A suíte completa `tests/*.test.js` passou: 20/20 arquivos sem falhas após atualização dos testes de identidade para a release 4.6.5.
