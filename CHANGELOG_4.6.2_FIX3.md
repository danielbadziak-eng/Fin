# FinançasPRO 4.6.2 — FIX3

## Correção do erro de renderização do Dashboard

### Erro identificado
A versão 4.6.2 havia removido do HTML alguns componentes antigos do módulo de gasto seguro, mas `calcularGastoSeguro()` ainda escrevia diretamente nesses elementos (`gasto-seguro`, `gasto-status`, `gasto-excesso-box` etc.).

Quando esses elementos não existiam, a função lançava uma exceção no final de `atualizarDashboard()`. O `refreshAll()` capturava a exceção e mostrava o aviso **“Não foi possível atualizar Dashboard”**, embora o restante do painel já tivesse sido renderizado.

### Correção
Os elementos legados passaram a ser opcionais. O cálculo continua sendo executado normalmente e somente atualiza os componentes antigos quando eles realmente existem. O Decision Center 4.6.2 continua responsável pela apresentação atual de **“Quanto posso gastar”**.

### Validação
- Sintaxe JavaScript: OK
- Regressões existentes: 18/18 OK
- Novo teste de proteção do widget legado: 8/8 OK
- Smoke do `atualizarDashboard()` com DOM equivalente ao HTML atual: OK

Nenhum cálculo financeiro foi alterado.
