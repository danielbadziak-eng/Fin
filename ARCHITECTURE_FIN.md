> Current release: FinançasPRO 5.2.1

# FinançasPRO — Architecture 5.2.1

`Financial Engine → FIN Rules → FIN Decision → FIN Journey → FIN Outcome → UI`

## FIN real modules
- `js/fin/fin-rules.js` — regras e mensagens.
- `js/fin/fin-decision.js` — score e prioridade.
- `js/fin/fin-journey.js` — ciclo e snapshots.
- `js/fin/fin-outcome.js` — avaliação e memória.
- `js/fin/fin-ui.js` — adaptação visual.

`script.js` contém adaptadores e telas não extraídas; as funções críticas do FIN delegam para os módulos acima.

## Schema
5.2.1 / 22, com migração aditiva e idempotente.

## Integrity
Arredondamento monetário, validação, invariantes, edge cases e operações potencialmente repetidas são tratados no Financial Engine.

## Outcome
`FIN_OUTCOME_POLICY.minDaysBeforeVerdict` é explícito. Menos que a janela mínima permanece em `observing`.
