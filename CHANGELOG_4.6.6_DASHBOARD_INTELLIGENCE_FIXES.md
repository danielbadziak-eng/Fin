# FinançasPRO 4.6.6 — Dashboard Intelligence Fixes

- Corrigido `ReferenceError` em `renderDashboardDecisionCenter()` causado por referência indefinida a `d`.
- O gasto seguro agora recebe explicitamente `at`, `year` e `month` do contexto do Dashboard.
- Cobertura de sanitização concluída para cartão e categoria de orçamento.
- Identidade de release alinhada em runtime, backup, manifesto, arquitetura e testes.
- Adicionado teste de execução real do `renderDashboardDecisionCenter()` para capturar regressões de referência indefinida.
