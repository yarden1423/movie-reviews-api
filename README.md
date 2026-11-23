# Movie Reviews API

![CI](https://github.com/yarden1423/movie-reviews-api/actions/workflows/ci.yml/badge.svg)

REST API for a movie database with user reviews and ratings.
Built with **Node.js, Express 5, TypeScript, MongoDB (Mongoose), JWT, Zod and Swagger**, developed with **TDD** (unit, integration and API tests).

**Authors:** Yarden Nazaretsky ([@yarden1423](https://github.com/yarden1423)) & Amit Ben Izhak ([@amit-ben-izhak](https://github.com/amit-ben-izhak))

---

## Quick start

Requirements: Node.js 20+, Docker (for MongoDB).

```bash
npm install
cp .env.example .env          # then set a strong JWT_SECRET
docker compose up -d          # MongoDB on localhost:27017
npm run seed:admin            # creates the admin user from ADMIN_* in .env
npm run dev                   # http://localhost:3000
```

- Swagger UI: <http://localhost:3000/api-docs>
- OpenAPI JSON: <http://localhost:3000/api-docs.json>
- Health check: <http://localhost:3000/health>

In Swagger: call `POST /api/auth/login`, copy the `token`, click **Authorize** and paste it.

## Scripts

| Command                                                 | Description                                         |
| ------------------------------------------------------- | --------------------------------------------------- |
| `npm run dev`                                           | Start in watch mode                                 |
| `npm run build` / `npm start`                           | Compile to `dist/` and run                          |
| `npm test`                                              | Run all tests (in-memory MongoDB, no Docker needed) |
| `npm run test:unit` / `test:integration` / `test:api`   | Run one test layer                                  |
| `npm run test:coverage`                                 | Tests with coverage report                          |
| `npm run lint` / `npm run format` / `npm run typecheck` | Code quality                                        |
| `npm run seed:admin`                                    | Create or promote the admin user                    |

## Endpoints

🔓 public · 🔐 requires `Authorization: Bearer <token>`

| Method | Path                      | Access             | Description                                            |
| ------ | ------------------------- | ------------------ | ------------------------------------------------------ |
| POST   | `/api/auth/register`      | 🔓                 | Register (role is always `user`)                       |
| POST   | `/api/auth/login`         | 🔓                 | Log in, returns JWT                                    |
| GET    | `/api/users/me`           | 🔐                 | Current user                                           |
| GET    | `/api/users/me/reviews`   | 🔐                 | My reviews (with movie title)                          |
| GET    | `/api/movies`             | 🔓                 | List / search / filter / sort, paginated               |
| POST   | `/api/movies`             | 🔐                 | Create a movie                                         |
| GET    | `/api/movies/:id`         | 🔓                 | Movie details incl. `averageRating` and `reviewsCount` |
| PATCH  | `/api/movies/:id`         | 🔐 creator / admin | Update a movie                                         |
| DELETE | `/api/movies/:id`         | 🔐 creator / admin | Delete a movie and its reviews                         |
| GET    | `/api/movies/:id/reviews` | 🔓                 | Reviews of a movie, newest first, paginated            |
| POST   | `/api/movies/:id/reviews` | 🔐                 | Review a movie                                         |
| GET    | `/api/reviews/:id`        | 🔓                 | Get a review                                           |
| PATCH  | `/api/reviews/:id`        | 🔐 author          | Edit a review                                          |
| DELETE | `/api/reviews/:id`        | 🔐 author / admin  | Delete a review                                        |

### Movie list query parameters

`page` (default 1) · `limit` (default 20, max 100) · `q` (partial title, case-insensitive) · `genre` · `year` · `director` · `actor` · `minRating` (1–8) · `sort` — one of `title`, `releaseYear`, `averageRating`, `reviewsCount`, `createdAt`, prefixed with `-` for descending (default `-createdAt`).

Example: `GET /api/movies?q=star&genre=Sci-Fi&minRating=6&sort=-averageRating&page=1&limit=10`

### Response format

Success responses return the resource itself. Lists are paginated:

```json
{ "items": [], "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
```

Every error has the same shape; validation errors list **all** invalid fields:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "field": "releaseYear", "message": "Release year must be 1888 or later" }]
  }
}
```

| Status | Code                               | When                                                 |
| ------ | ---------------------------------- | ---------------------------------------------------- |
| 400    | `VALIDATION_ERROR` / `BAD_REQUEST` | Invalid body, query, id or JSON                      |
| 401    | `UNAUTHORIZED`                     | Missing / invalid / expired token, wrong credentials |
| 403    | `FORBIDDEN`                        | Not the owner (or admin)                             |
| 404    | `NOT_FOUND` / `ROUTE_NOT_FOUND`    | Resource or route does not exist                     |
| 409    | `CONFLICT`                         | Duplicate email/username, movie, or second review    |
| 429    | `TOO_MANY_REQUESTS`                | Too many login/register attempts                     |

## Design decisions

The assignment intentionally leaves details open. These are the choices we made and why:

**Permissions**

- Reading movies and reviews is public; every write requires a JWT.
- Two roles: `user` and `admin`. Anyone can register, but only as `user`. Admins are created by `npm run seed:admin` — never through the API.
- The user who created a movie is stored on it (`createdBy`). Only the creator or an admin can edit or delete it.
- Only the author can edit a review (an admin cannot rewrite someone else's words); the author or an admin can delete it.

**Movies**

- `title` and `releaseYear` are required; `releaseYear` is between 1888 (first film) and next year.
- `genres` come from a fixed list so filtering is reliable; at least one is required.
- A movie is unique by title + year, case-insensitive (`Dune` 1984 and `Dune` 2021 can both exist).
- Deleting a movie deletes its reviews.

**Reviews & ratings**

- Rating is an integer from **1 to 8**, with required free text (up to 2000 chars).
- One review per user per movie (enforced by a unique index); to change your opinion, edit your review.
- `averageRating` (rounded to one decimal) and `reviewsCount` are stored on the movie and recalculated with an aggregation after every create, rating edit and delete. This makes reading, sorting and filtering by rating fast. Clients cannot set these fields.

**Security**

- Passwords are hashed with bcrypt and never returned. Login returns the same error for unknown email and wrong password.
- The JWT is re-checked against the database on each request, so a deleted user's token stops working.
- `helmet`, CORS, a 100kb body limit, rate limiting on auth endpoints, and regex-escaping of search input.

## Architecture

```
src/
  config/        environment (validated with Zod) and DB connection
  models/        Mongoose schemas (User, Movie, Review)
  schemas/       Zod request schemas — used for validation AND Swagger
  middlewares/   authenticate / authorize, validate, error handler, rate limit
  services/      business logic (auth, movies, reviews, rating calculation)
  controllers/   HTTP layer: read request, call service, send response
  routes/        Express routers
  docs/          OpenAPI document generated from the Zod schemas
  utils/         AppError, JWT, password hashing, rating math
tests/
  unit/          pure functions and schemas
  integration/   services against an in-memory MongoDB
  api/           full HTTP requests with Supertest
```

Request flow: `route → validate (Zod) → authenticate/authorize → controller → service → model`, with all errors handled centrally and returned in one format.

## Testing (TDD)

Tests use Jest + Supertest + `mongodb-memory-server`, so they run without a real database. Each feature was built test-first: a commit with failing tests, followed by the implementation (see the commit history and pull requests).

```bash
npm test
```
