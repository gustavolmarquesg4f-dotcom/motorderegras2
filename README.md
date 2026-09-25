# Plano Justo — Full Stack v6

Frontend React/Vite (`web/`), backend serverless isolado (`api/`), motor determinístico (`shared/`), banco PostgreSQL/Supabase (`supabase/migrations/`), testes (`tests/`). Dados financeiros pessoais **não integram o código**. Este repositório pode ser público somente porque os dados pessoais e credenciais secretas não estão versionados.

## Recursos
- Login Supabase Auth; dados persistidos em `cases` com RLS por usuário.
- Histórico imutável de revisões do caso e conversa em `chat_messages`.
- Motor de regras testado: prazo de no máximo 60 meses; primeira competência solicitada março/2027; não duplicação de alimentação; consignado por fluxo nominal das parcelas, não saldo de quitação; suspensão do desconto nunca presumida.
- Comparação de bases, rateio por credor e memória mês a mês.
- PDF e Excel gerados com o mesmo motor e dados da tela.
- Assistente OpenAI / Vercel AI Gateway via `api/chat.js` no servidor. Usa o caso salvo, API direta com `store:false`, autenticação JWT, limites de mensagens, propostas apenas em lista permitida e confirmação humana.
- Chat registra solicitação de funcionalidades para avaliação; **não modifica código nem faz deploy sozinho**.

## Implantação atual
- Banco dedicado: Supabase em São Paulo, migração e RLS habilitadas. URL e chave **publicável** estão em `shared/public-config.mjs`; não são segredo. A chave `service_role` nunca foi usada.
- IA: por padrão usa o Vercel AI Gateway com OIDC fornecido pela plataforma no cabeçalho `x-vercel-oidc-token` das funções (ou `VERCEL_OIDC_TOKEN` em build/local), se créditos e permissões permitirem; alternativa `OPENAI_API_KEY` só no servidor. Nenhuma credencial privada deve ser comitada.
- Os dados privados são adicionados pelo próprio usuário **depois de entrar**, usando Importar JSON. Não colocar o arquivo pessoal no GitHub.
- Configure, no painel Supabase Auth, Site URL e Redirect URLs para o domínio efetivo da aplicação. A confirmação de e-mail depende do provedor de e-mail da sua conta Supabase.
- Verifique o build, endpoint `/api/health`, cadastro/login, políticas RLS com duas contas e ao menos uma mensagem real antes de tratar como produção operacional.

## Segurança
Acesso/armazenamento dependem das políticas de autenticação e RLS; a aplicação não é auditada para uso público com terceiros. O backend lê apenas o caso do usuário autenticado e não usa service_role. Dados da conversa vão à API de IA só quando você enviar mensagem. O OpenAI API é faturado separadamente da assinatura ChatGPT. Não há sincronização automática de memórias privadas do ChatGPT. O chat não altera casos sem confirmação; código/evolução do app depende de desenvolvimento e revisão.

## Rodar local

```bash
npm install
npm test
npm run dev
```

Configure as variáveis de `.env.example` na Vercel; `/api` necessita de runtime serverless (Vercel Dev) ou implantação Vercel, não do Vite puro. `npm run dev` permite trabalhar na interface, mas `/api/config` não estará presente no servidor Vite isolado.

## Diretriz jurídica
Lei 14.181/2021/CDC arts. 54-A e 104-A/104-B. Março/2027 é um **pedido** sujeito à homologação; até 180 dias após homologação aplica-se à primeira parcela no plano judicial compulsório. Não equiparar saldo residual simulado a desconto obrigatoriamente concedido.

## Novidades v7 — planilha + explicações contextuais
- Aba **Importar planilha**: lê `.xlsx`, `.xls`, `.csv` no navegador (máx. 10 MB, 24 abas, 45 colunas e até 2.000 linhas úteis). Arquivo completo não é enviado ao backend nem armazenado.
- Seleção de aba, classificação (orçamento, credores ou renda), escolha de cabeçalho, mapeamento automático ajustável, prévia e seleção de linhas. Apenas após confirmação os números passam para a tela; salvar no banco é uma ação separada.
- Importação com mesclagem por despesa/categoria ou credor, evitando somas repetidas. Opção explícita para substituir a seção; rendimentos reconhecidos por rubrica. Planilhas mensais devem ser importadas uma competência de cada vez.
- Valores inválidos, subtotais, duplicatas e estimativas indevidas são sinalizados/ignorados. Dívida nova começa pendente, e alterar valores retira a marcação de saldo conferido. Valor do consignado não é substituído por planilha sem verificação documental.
- Cada despesa importada registra arquivo, aba e linha; origem é exibida na tabela e incluída na exportação Excel. O arquivo original não fica salvo.
- Ícones **?** acessíveis por mouse, teclado e toque nos conceitos importantes; aba de glossário pesquisável; painel de qualidade alerta sobre fontes, duplicidade, benefício e dados desatualizados.
- A dependência SheetJS foi atualizada para pacote oficial com correções de leitura (0.20.3), evitando o npm legado 0.18.5; processamento com fórmulas/macros desabilitadas. Verifique o resultado de fórmulas armazenado pela própria planilha.