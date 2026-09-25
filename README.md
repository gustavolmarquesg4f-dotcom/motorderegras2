# Plano Justo v10 - Dossiê documental e repactuação

Frontend React, APIs Vercel, motor determinístico e autenticação Supabase com RLS. Este repositório contém **somente código e exemplos fictícios**. Arquivos de importação com dados pessoais, faturas e credenciais não pertencem ao repositório público.

## Novidades v8
- Central de documentos com PDF completo (justificativas individualizadas, memória de cálculo, cronograma), PDF específico de cada credor, pedido de documentos e Excel de conciliação.
- Histórico editável do consignado (valor original, refinanciamento, principal amortizado, juros efetivamente pagos, referência de quitação **datada**) e faturas (compras, juros, IOF, mora, multa, pagamentos, diferenças não explicadas, propostas).
- Importação local de XLSX/XLS/CSV também para lançamentos, com seleção de credor, mapeamento de colunas e prévia. Nunca atualiza a cobrança do banco automaticamente.
- Separação de pagamentos apropriados e transferências pendentes; não subtrai juros já pagos uma segunda vez.
- Registro de providências e resultados, com fonte e status.

## Rodar
`npm install && npm test && npm run build` (Node >=22). Variáveis do servidor e políticas RLS são documentadas em `.env.example` e `supabase/migrations`. Vercel OIDC/AI Gateway e Supabase devem ser configurados na implantação.

## Limites
A aplicação não faz perícia bancária automática, não atesta que uma cobrança é ilegal e não calcula quitação atual a partir de uma referência antiga. Necessita DDC, extratos e faturas originais. O art. 104-A do CDC disciplina conciliação em até cinco anos; o art. 104-B, §4º, exige mínimo do principal corrigido no plano judicial compulsório. A situação das garantias e do consignado requer análise específica. Não presuma suspensão de desconto antes de sua efetivação.

Os valores publicados são apenas de demonstração. O backup privado v8 é fornecido separadamente ao titular para importação autenticada.


## Versão 9 — Inteligência de dossiê e navegação lateral

- `api/dossier-ai.js`: endpoint autenticado, RLS, consentimento, limite compartilhado de 20 mensagens/h, diagnóstico do caso salvo e pesquisa de URLs oficiais pré-definidas sem dados pessoais.
- `shared/strategy.mjs`: triagem auditável dos déficits, saldo residual, cotação histórica do consignado, faturas não discriminadas e pagamentos não conciliados.
- `web/src/DossierIntelligence.jsx`: painel com escopo por credor, fontes consultadas, análise com IA e PDF de trabalho. Nenhum valor do caso é alterado pela geração.
- Menu lateral com rolagem interna, rodapé acessível e navegação móvel horizontal.
- Fontes online podem falhar; links não lidos são marcados como não verificados e NÃO usados como prova.
- A análise não é petição, garantia de homologação, perícia ou parecer jurídico.

## v10 — Memória jurídica fundamentada (sem perfilamento de pessoas)
- Cadastro privado de atos do processo com ID documental, página, data, ator e estado de conferência. A importação de um complemento JSON mescla referências sem destruir o caso existente.
- Catálogo público de normas e orientações oficiais (CDC, BC, TJDFT), separado dos documentos privados. Link presente não significa que o servidor conseguiu ler o conteúdo.
- Análise de IA usa trechos selecionados da memória privada, o histórico financeiro e fontes oficiais efetivamente lidas. A resposta estruturada apresenta IDs de atos e descarta referências inexistentes.
- O juiz e advogados são descritos por atos, assinatura, representação documentada; não há suposições sobre psicologia ou predição de homologação.
- Sete campos exigidos pela decisão são conferidos por contrato. O sistema não monitora PJe sozinho; intimações e atas devem ser acrescentadas.
- O backup pessoal é entregue separadamente: NÃO incluir cadastro real, processo integral ou CPF no GitHub público.

## v11 — Representantes, auditoria e análise aprofundada

- Cadastro de **partes, procuradores e magistrado**, exclusivo da conta autenticada; origem documental, data, OAB e vinculação indicada. Não armazenar CPF de terceiros neste cadastro. **Uma captura do polo passivo não comprova procuração atualizada nem atuação processual**.
- Importação de complemento JSON preserva os registros já existentes; o arquivo privado é entregue separadamente e **não integra este repositório ou o deploy**.
- Uma ação do usuário executa a rotina de análise: triagem financeira e documental, leitura das fontes oficiais disponíveis, exame de representações e atos documentados, contraditório hipotético sem atribuição a pessoa real, revisão de citações e lista de providências. Os resumos são enviados ao AI Gateway **somente com consentimento explícito**.
- Pesquisa PJe externa, juntadas, intimações, petições, notificações e mudanças de saldos **não são automáticas**. A IA não envia mensagens a terceiros nem edita dados sem confirmação. Não existem previsão de decisão, nota de qualidade do juiz/advogados, diagnóstico de personalidade ou consulta a estratégias internas bancárias.
- O modelo indicado em `AI_GATEWAY_MODEL` pode ser selecionado pelo operador conforme disponibilidade e custo. Nenhum nome de modelo constitui garantia de desempenho jurídico. O sistema é apoio técnico a revisão profissional.