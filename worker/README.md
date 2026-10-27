# Auditor Worker

Worker en Python para el análisis en segundo plano de skills de agentes de programación.

## Instalación

El proyecto se gestiona con [uv](https://github.com/astral-sh/uv).
Para sincronizar el entorno y las dependencias fijadas:

```bash
uv sync
```

## Ejecución en local

Para arrancar el worker conectado a la base de datos local de desarrollo:

```bash
DATABASE_URL=postgresql://rapidauth:rapidauth@127.0.0.1:5433/rapidauth?sslmode=disable uv run auditor-worker
```

## Controles de calidad

### Linter y formato con Ruff

Revisar reglas de linter:

```bash
uv run ruff check
```

Comprobar formato:

```bash
uv run ruff format --check
```

### Pruebas con pytest

Pruebas unitarias (sin base de datos):

```bash
uv run pytest -m "not db"
```

Pruebas completas (incluyendo pruebas de integración con base de datos):

```bash
WORKER_TEST_DATABASE_URL=postgresql://rapidauth:rapidauth@127.0.0.1:5433/rapidauth?sslmode=disable uv run pytest
```
