# Plano Justo — Full Stack v5

Frontend React/Vite (`web/`), backend serverless isolado (`api/`), motor determinístico (`shared/`), banco PostgreSQL/Supabase (`supabase/migrations/`), testes (`tests/`). Dados financeiros pessoais **não integram o código**. Este repositório contém somente código e pode ser público; dados e credenciais privados não devem ser versionados.

## Recursos
- Login Supabase Auth; dados persistidos em `cases` com RLS por usuário.
- Histórico imutável de revisões do caso e conversa em `chat_messages`.
- Motor de regras testado: prazo de no máximo 60 meses; primeira competência solicitada março/2027; não duplicação de alimentação; consignado por fluxo nominal das parcelas, não saldo de quitação; suspensão do desconto nunca presumida.
- Comparação de bases, rateio por credor e memória mês a mês.
- PDF e Excel gerados com o mesmo motor e dados da tela.
- Assistente OpenAI via `api/chat.js` no servidor. Usa o caso salvo, `store:false`, autenticação JWT, limites de mensagens, propostas apenas em lista permitida e confirmação humana.
- Chat registra solicitação de funcionalidades para avaliação; **não modifica código nem faz deploy sozinho**.

## Estado de implantação
Código-fonte publicado; banco Supabase dedicado, credenciais do servidor e IA generativa dependem de configuração. Não considere este repositório um sistema de produção pronto sem executar build, teste de autenticação/RLS e avaliação de segurança.

## Implantar
1. Código publicado em `gustavolmarquesg4f-dotcom/motorderegras2`. Não publique backup de dados reais, `.env`, tokens ou senhas. Verifique a visibilidade do repositório antes de qualquer alteração.
2. Crie um projeto Supabase dedicado à aplicação, configure autenticação por e-mail/senha. Execute `supabase/migrations/20260924000100_plano_justo.sql` no projeto com revisão da segurança. Esta migração só cria tabelas novas com políticas RLS.
3. No projeto Vercel vinculado ao repositório, configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`. Todas são variáveis do servidor, sem prefixo `VITE_`; somente `/api/config` expõe URL e chave publicável do banco. Nunca exponha secret/service_role.
4. Faça deploy. Abra a URL, crie/entre na sua conta e importe o JSON pessoal gerado em conversa anterior; confira e clique em Salvar.
5. Teste com outra conta que ela não consegue consultar o caso; configure as opções de confirmação de e-mail adequadamente.

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