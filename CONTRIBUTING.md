# Contributing to Soundrate

🇧🇷 [Leia em português](CONTRIBUTING.pt-BR.md)

Thanks for your interest in contributing! Bug fixes, new features, tests, documentation, and UI improvements are all welcome. By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- For bugs, open an issue describing what happened, what you expected, and the steps to reproduce it.
- For new features or large changes, open an issue first so we can agree on the approach before you write code.
- Small fixes (typos, docs, obvious bugs) can go straight to a pull request.

## Setting up the project

Soundrate is a monorepo: `backend/` is a Spring Boot API and `frontend/` is an Angular app. You will need Java 21, Node.js 24 with npm 11, and Docker.

1. Fork the repository and clone your fork.
2. Create a `.env` file in the repository root, using the example in the [README](README.md#environment-variables). A free [Cloudinary](https://cloudinary.com) account is enough for `CLOUDINARY_URL`, which the backend needs to start. You can leave `MAIL_HOST` empty: emails are then printed in the backend log.
3. Run everything with Docker:

   ```bash
   docker compose up --build
   ```

   Or run each part locally, as described in the [README](README.md#running-locally):

   ```bash
   cd backend && sh mvnw spring-boot:run
   cd frontend && npm ci && npm start
   ```

The API runs on `http://localhost:8080` (Swagger at `/swagger-ui/index.html`) and the UI on `http://localhost:4200`.

## Making changes

1. Create a branch from `main` with a descriptive name, such as `feat/album-search-filters` or `fix/review-like-count`.
2. Keep each pull request focused on a single change.
3. Follow the existing code style and project structure:
   - **Backend**: controllers only handle HTTP, business rules live in services, data access goes through repositories, and entities are never exposed directly (use DTOs in `dtos/request` and `dtos/response`).
   - **Frontend**: the project uses Prettier (config in `frontend/package.json`); format your code before committing.
4. Database changes go in a **new** Flyway migration in `backend/src/main/resources/db/migration` (for example `V3__add_listening_date.sql`). Never edit a migration that has already been merged.
5. Add or update tests when you change behavior.

## Running the tests

```bash
cd backend && sh mvnw test
cd frontend && npm test
```

Make sure the tests pass before opening a pull request.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org):

```text
feat(frontend): add album search filters
fix(backend): count review likes only once per user
docs: explain how to run the backend locally
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `ci`, `chore`.

## Opening a pull request

1. Push your branch to your fork and open a pull request against `main`.
2. Explain what changed and why, and link the related issue (for example `Closes #12`).
3. Add screenshots for visual changes.
4. Be open to feedback: reviews are about the code, not about you.

## Security issues

Please do not report security vulnerabilities in public issues. Contact the maintainer privately using the contact listed on their GitHub profile ([viniciusmachak](https://github.com/viniciusmachak)).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
