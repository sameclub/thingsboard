# ThingsBoard Server (Backend)

Multi‑module Maven project for the ThingsBoard backend. The Spring Boot app entrypoint and packaging live in `thingsboard/application`. The Angular UI resides under `thingsboard/ui-ngx`.

## Modules
- `application` – Spring Boot application, packaging, runtime config
- `common` – shared DTOs, utils, constants
- `dao` – persistence layer and repositories
- `rule-engine` – rule nodes and processing pipeline
- `transport` – MQTT/CoAP/HTTP transports; `netty-mqtt` low‑level MQTT
- `ui-ngx` – Angular web UI (built and served separately in dev)
- `tools`, `rest-client`, `monitoring`, `edqs` – auxiliary modules

## Prerequisites
- JDK 17
- Maven 3.9+
- Node.js 18+ and Yarn (only if working on the UI)

## Build and Test
- Build (skip tests):
  - `cd thingsboard && mvn clean install -DskipTests`
- Run tests:
  - `cd thingsboard && mvn test`

## Run the Backend Locally
1) Build the project (see above).
2) Start the server:
   - `java -jar thingsboard/application/target/thingsboard-*.jar`
3) Default HTTP port is `8080`. Change via env var `HTTP_BIND_PORT`.

### Configuration
Primary config file: `thingsboard/application/src/main/resources/thingsboard.yml`.
Most settings can be overridden with environment variables. Common overrides:
- HTTP server: `HTTP_BIND_ADDRESS`, `HTTP_BIND_PORT`, `SSL_ENABLED`, `SSL_*`
- SQL database: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
- Cache: `CACHE_TYPE` (`caffeine` or `redis`), `REDIS_HOST`, `REDIS_PORT`
- Queue: `TB_QUEUE_TYPE` (`in-memory` or `kafka`), `TB_KAFKA_SERVERS`
- Time series DB: `DATABASE_TS_TYPE`, `DATABASE_TS_LATEST_TYPE`, `CASSANDRA_URL`

### Using Docker Compose Services from this repo
If you run dependencies via `tb/docker-compose.yml` but run the backend JAR on your host, export these env vars to match published ports:

```
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/thingsboard
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=postgres

export CACHE_TYPE=redis
export REDIS_HOST=localhost
export REDIS_PORT=6380

export TB_QUEUE_TYPE=kafka
export TB_KAFKA_SERVERS=localhost:9092

export DATABASE_TS_TYPE=cassandra
export DATABASE_TS_LATEST_TYPE=cassandra
export CASSANDRA_URL=localhost:9042

java -jar thingsboard/application/target/thingsboard-*.jar
```

## UI Development (Angular)
- Install deps: `cd thingsboard/ui-ngx && yarn install --frozen-lockfile`
- Start dev server: `cd thingsboard/ui-ngx && yarn start`
  - Serves the UI on `http://localhost:4200` and proxies API to the backend on `http://localhost:8080` (see `thingsboard/ui-ngx/proxy.conf.js`).
- Build UI: `cd thingsboard/ui-ngx && yarn build` or `yarn build:prod`

## Docker Compose (Local Stack)
This repo includes a compose file for Postgres, Cassandra, Kafka, Valkey/Redis, and a ThingsBoard node container.

- Start the stack (dependencies + node):
  - `cd tb && docker compose up -d`
- Initialize DB schema and load demo data (first run):
  - `cd tb && docker compose run --rm -e INSTALL_TB=true -e LOAD_DEMO=true node`
- Follow logs:
  - `cd tb && docker compose logs -f node`
- Stop:
  - `cd tb && docker compose stop`

Notes:
- The node container image is built from `tb/Dockerfile` and expects `tb/thingsboard.deb` (already present in this repo). Logging is configured via `tb/logback.xml`.

## Logs & Config
- Backend log config: `thingsboard/application/src/main/resources/logback.xml`
- App config: `thingsboard/application/src/main/resources/thingsboard.yml`

## Troubleshooting
- Port in use (8080): set `HTTP_BIND_PORT` to a free port.
- Kafka/Redis/Cassandra connection errors: verify `TB_KAFKA_SERVERS`, `REDIS_*`, `CASSANDRA_URL`, and that services are running (`docker compose ps`).
- Postgres connectivity: confirm `SPRING_DATASOURCE_URL` points to `localhost:5433` when using compose, or `5432` for a local install.

## Conventions
- Java code style: 4 spaces; packages `org.thingsboard...`; classes `PascalCase`; methods/fields `camelCase`.
- Follow Conventional Commits (e.g., `feat:`, `fix:`, `docs:`) and keep changes focused.

## Handy Commands
- Backend build (skip tests): `cd thingsboard && mvn clean install -DskipTests`
- Backend tests: `cd thingsboard && mvn test`
- Run backend JAR: `java -jar thingsboard/application/target/thingsboard-*.jar`
- Frontend dev: `cd thingsboard/ui-ngx && yarn start`
- Frontend lint: `cd thingsboard/ui-ngx && yarn lint`
- Docker compose: `cd tb && docker compose up -d`

For deeper design notes and feature plans, see `docs/`.
