# Contribuindo com o Soundrate

🇺🇸 [Read in English](CONTRIBUTING.md)

Obrigado pelo interesse em contribuir! Correções de bugs, novas funcionalidades, testes, documentação e melhorias de interface são todos bem-vindos. Ao participar, você concorda em seguir o nosso [Código de Conduta](CODE_OF_CONDUCT.pt-BR.md).

## Antes de começar

- Para bugs, abra uma issue descrevendo o que aconteceu, o que você esperava e os passos para reproduzir.
- Para novas funcionalidades ou mudanças grandes, abra uma issue antes, para combinarmos a abordagem antes de você escrever código.
- Correções pequenas (erros de digitação, documentação, bugs óbvios) podem ir direto para um pull request.

## Configurando o projeto

O Soundrate é um monorepo: `backend/` é uma API em Spring Boot e `frontend/` é uma aplicação Angular. Você vai precisar de Java 21, Node.js 24 com npm 11 e Docker.

1. Faça um fork do repositório e clone o seu fork.
2. Crie um arquivo `.env` na raiz do repositório, usando o exemplo do [README](README.md#environment-variables). Uma conta gratuita no [Cloudinary](https://cloudinary.com) basta para o `CLOUDINARY_URL`, que o backend precisa para subir. Você pode deixar o `MAIL_HOST` vazio: nesse caso os e-mails aparecem no log do backend.
3. Rode tudo com Docker:

   ```bash
   docker compose up --build
   ```

   Ou rode cada parte localmente, como descrito no [README](README.md#running-locally):

   ```bash
   cd backend && sh mvnw spring-boot:run
   cd frontend && npm ci && npm start
   ```

A API roda em `http://localhost:8080` (Swagger em `/swagger-ui/index.html`) e a interface em `http://localhost:4200`.

## Fazendo alterações

1. Crie uma branch a partir da `main` com um nome descritivo, como `feat/album-search-filters` ou `fix/review-like-count`.
2. Mantenha cada pull request focado em uma única mudança.
3. Siga o estilo de código e a estrutura que o projeto já usa:
   - **Backend**: controllers só lidam com HTTP, a regra de negócio fica nos services, o acesso a dados passa pelos repositories e as entidades nunca são expostas diretamente (use os DTOs em `dtos/request` e `dtos/response`).
   - **Frontend**: o projeto usa Prettier (configuração no `frontend/package.json`); formate o código antes de commitar.
4. Mudanças no banco vão em uma **nova** migration do Flyway em `backend/src/main/resources/db/migration` (por exemplo `V3__add_listening_date.sql`). Nunca edite uma migration que já foi mergeada.
5. Adicione ou atualize testes quando mudar algum comportamento.

## Rodando os testes

```bash
cd backend && sh mvnw test
cd frontend && npm test
```

Garanta que os testes passam antes de abrir o pull request.

## Mensagens de commit

Usamos [Conventional Commits](https://www.conventionalcommits.org):

```text
feat(frontend): add album search filters
fix(backend): count review likes only once per user
docs: explain how to run the backend locally
```

Tipos mais comuns: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `ci`, `chore`.

## Abrindo um pull request

1. Envie a sua branch para o seu fork e abra um pull request para a `main`.
2. Explique o que mudou e por quê, e relacione a issue (por exemplo `Closes #12`).
3. Adicione prints para mudanças visuais.
4. Esteja aberto a feedback: a revisão é sobre o código, não sobre você.

## Problemas de segurança

Não reporte vulnerabilidades de segurança em issues públicas. Fale com o mantenedor em particular pelo contato informado no perfil do GitHub ([viniciusmachak](https://github.com/viniciusmachak)).

## Licença

Ao contribuir, você concorda que as suas contribuições serão licenciadas sob a [Licença MIT](LICENSE).
