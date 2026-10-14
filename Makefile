PY := $(CURDIR)/.venv/bin/python
export PYTHONPATH := $(CURDIR)/backend
.PHONY: setup migrate create-admin seed-demo dev test test-e2e check-clean build run backup backup-bundle

setup:
	python3 -m venv .venv
	.venv/bin/pip install -r backend/requirements.txt
	cd frontend && npm ci
	$(MAKE) migrate

migrate:
	$(PY) -m app.cli init

create-admin:
	$(PY) -m app.cli create-admin

seed-demo:
	$(PY) -m app.cli seed-demo

dev:
	$(PY) scripts/dev.py

test:
	$(PY) -m pytest backend/tests -q
	cd frontend && npm test

test-e2e: build
	cd frontend && npm run test:e2e

build:
	cd frontend && npm run build

run:
	$(PY) -m uvicorn app.main:app --host 127.0.0.1 --port 8000

backup:
	$(PY) -m app.cli backup $(if $(OUTPUT),--output "$(OUTPUT)",)

backup-bundle:
	$(PY) -m app.cli backup-bundle $(if $(OUTPUT),--output "$(OUTPUT)",)

check-clean:
	$(PY) scripts/check_clean_setup.py
