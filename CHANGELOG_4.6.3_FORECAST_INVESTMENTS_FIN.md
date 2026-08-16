# FinançasPRO 4.6.3 — Forecast, investimentos e FIN

## Correções
- Projeção de 30/60/90 dias passa a incorporar a sobra (positiva ou negativa) do mês de referência.
- Saldos projetados positivos são exibidos em verde; negativos em vermelho; zero fica neutro.
- Rendimentos estimados voltam a considerar investimentos legados mesmo quando `investivel` estava salvo como falso, desde que a categoria/nome identifique um investimento.
- O resgate volta a listar investimentos já cadastrados e reconhecidos pelo motor.
- A validação do resgate usa a mesma regra de classificação do patrimônio, evitando divergência entre cadastro e seleção.
- FIN foi reposicionado para a região central direita da tela, facilitando acesso durante a navegação pelo Dashboard.

## Observação
A estimativa de rendimento usa a `rentabilidadeAnual` cadastrada no investimento. Nenhuma taxa de mercado é inventada quando o produto não possui taxa informada.
