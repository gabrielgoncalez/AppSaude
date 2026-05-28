# Regras para cadastrar exercícios no Gigante Ágil

Use este formato quando quiser me mandar um cronograma novo ou ajustes nos treinos.

## Formato ideal

```txt
Dia:
Nome do treino:

Exercício:
Tipo:
Séries:
Descanso:
Incremento:
Equipamento:
Observações técnicas:
```

## Campos

- `Dia`: segunda, terça, quarta, quinta, sexta ou sábado.
- `Nome do treino`: exemplo `Treino A - Base + Empurrar`.
- `Exercício`: nome exato que deve aparecer no app.
- `Tipo`: força, hipertrofia, força técnica, core, prehab, opcional, cardio ou técnico.
- `Séries`: número de séries alvo.
- `Descanso`: segundos de descanso entre séries.
- `Incremento`: quanto a carga muda quando progride, como `+2,5 kg`, `+5 kg` ou `-2,5 kg` no Graviton.
- `Equipamento`: máquina, halter, barra, cabo, peso corporal ou outro.
- `Observações técnicas`: qualquer cuidado importante de postura, amplitude ou execução.

## Regra automática da Onda

- Para musculação com carga e repetições, o app usa `8 a 15 reps`.
- Se você domina todas as séries em `15 reps`, o app sugere subir carga.
- Quando a carga sobe, é normal as reps caírem para perto de `8`.
- O app não trata essa queda como piora; ele entra em modo `Nova carga`.
- A meta passa a ser subir as reps aos poucos: 8, 9, 10... até 15.
- O ciclo não tem teto fixo. Se você chegar em 60 kg, o app continua calculando a próxima onda.

## Meta mensal

- O app usa a maior carga real registrada como referência.
- A meta conservadora do mês fica entre `+10%` e `+15%`.
- A meta é arredondada para o incremento real do exercício.
- Exemplo: se o primeiro máximo foi `20 kg` e o incremento é `5 kg`, a meta prática vira `25 kg`.

## Exemplo pronto

```txt
Dia: Segunda
Nome do treino: Treino A - Base + Empurrar

Exercício: Supino Reto Máquina
Tipo: força
Séries: 3
Descanso: 150s
Incremento: +2,5 kg
Equipamento: máquina
Observações técnicas: escápulas firmes, controlar descida, não buscar falha.
```

## Observações especiais

- No Graviton, progresso significa reduzir assistência, então o incremento deve vir negativo.
- Exercícios por tempo, como prancha, podem usar `Duração` em vez de reps.
- Exercícios com pausa, como Pallof Press, podem manter observação de segundos de isometria.
- Se você não souber o incremento da máquina, envie a carga das placas e eu ajusto o cadastro.
