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

## v12 — IA configurável e documentos profissionais

- Corrige a dependência rígida do AI Gateway: o backend pode usar Ollama remoto autenticado (`gpt-oss:20b`), OpenAI API própria e, somente quando explicitamente habilitado, o Gateway da Vercel.
- Ollama remoto precisa estar em endpoint HTTPS autenticado. O sistema bloqueia configuração insegura em produção e não presume que `localhost:11434` seja acessível a partir da Vercel.
- O status da API diferencia credencial detectada de provedor realmente testado. Erros 401/403/429 retornam mensagens específicas.
- Os PDFs foram reorganizados como proposta global, memória financeira, fundamentação por credor, checklist e fontes. Não imprimem a agenda de 60 meses como texto bruto.
- O Excel profissional separa Resumo Executivo, Proposta por Credor, Orçamento, Itaú Consignado, Santander, Demais Credores, Cronograma, Checklist e Fontes, com fórmulas e formatação financeira.
- A análise de IA gera PDF tabular com síntese, prioridades, revisão por especialidade, estratégia por credor, atos processuais, contrapontos, providências e fontes.
- Não há fallback silencioso entre provedores salvo `AI_ALLOW_FALLBACK=true`, para evitar o envio inesperado de dados financeiros a outro fornecedor.


## v13 — Groq GPT-OSS, sem dependência do AI Gateway

O frontend e backend permanecem autenticados pelo Supabase. Configurar **somente na Vercel / Settings / Environment Variables** do projeto `motorderegras2`, nos ambientes Production e Preview conforme necessário:

- `GROQ_API_KEY`: chave secreta Groq. Não é legível pelo repositório ou browser. O segredo do EnglishOS não passa automaticamente para outro projeto.
- `AI_PROVIDER=groq` para restringir toda análise financeira à Groq.
- `GROQ_MODEL=openai/gpt-oss-120b`; fallback no mesmo fornecedor para `openai/gpt-oss-20b` quando o modelo não está disponível.
- `GROQ_REASONING_EFFORT=high`; `AI_ALLOW_FALLBACK=false` por privacidade.

Efetue um novo deployment após configurar as variáveis. Em **Assistente IA → Testar conexão**, o endpoint POST `/api/ai-probe` exige sessão válida e gera um JSON simples *sem dados financeiros*. `/api/health` indica apenas configuração, **não sucesso de inferência**. Retornos do modelo para chat/dossiê continuam condicionados ao caso do usuário autenticado e consentimento da análise. O aplicativo nunca copia uma chave do EnglishOS, e o teste não deve usar dados do caso. Se não houver chave, mostre a ausência de configuração, sem prometer IA ativa.


## v14 — Diagnóstico de conversação Groq sem exposição de dados
- `/api/ai-probe` autenticado executa primeiro JSON mínimo e depois o mesmo contrato JSON da conversa com um caso *inteiramente fictício*. O primeiro teste sozinho não aprova mais a integração.
- 403 preserva `error.code` e `error.type` sanitizados e o modelo tentado, nunca o corpo original da resposta nem dados do processo.
- Fallback 120b→20b somente para código explícito de bloqueio/inexistência de modelo (403 genérico não troca modelo nem mascara a causa).
- Histórico e dossiês do chat são resumidos com números essenciais primeiro e atos processuais selecionados; não altera valores salvos.
- O resultado da análise autenticada deve ser conferido no próprio app; CI não conhece credenciais de usuários.