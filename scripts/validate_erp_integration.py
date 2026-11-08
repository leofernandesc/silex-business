"""Reproduce integration checks locally, without provisioning or any persistent database.

Install the repository dependencies first. Browser mode needs a compatible, already installed
Playwright Chromium (or SILEX_CHROMIUM_PATH). No browser download or deployment is performed.
"""
import argparse
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CORE = [
    (ROOT, [sys.executable, '-m', 'pytest', 'backend/tests', '-q']),
    (ROOT / 'frontend', ['npm', 'test']),
    (ROOT / 'frontend', ['npm', 'run', 'build']),
    (ROOT, ['git', 'diff', '--check']),
]
BROWSER = [
    *[(ROOT / 'frontend', ['npx', '--no-install', 'playwright', 'test', '--config', config]) for config in (
        'playwright.integration.config.ts', 'playwright.integration-dates.config.ts',
        'playwright.integration-extra.config.ts', 'playwright.components-review.config.ts',
    )],
    (ROOT, [sys.executable, 'scripts/check_financial_stage1.py']),
    (ROOT, [sys.executable, 'scripts/check_transport_module.py']),
    (ROOT, [sys.executable, 'scripts/compare_integrated_finance.py']),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--suite', choices=('core', 'browser', 'all'), default='core')
    parser.add_argument('--list', action='store_true', help='Print the exact commands; execute nothing')
    args = parser.parse_args()
    commands = CORE if args.suite == 'core' else BROWSER if args.suite == 'browser' else CORE + BROWSER
    with tempfile.TemporaryDirectory(prefix='silex-integration-validation-') as folder:
        env = {**os.environ, 'PYTHONPATH': str(ROOT / 'backend'), 'GESTAO_ENV': 'local',
               'GESTAO_DATABASE_URL': f'sqlite:///{folder}/guard.sqlite3', 'SILEX_REVIEW_BROWSER': 'chromium',
               'SILEX_FINANCIAL_EVIDENCE_DIR': str(Path(folder) / 'financial-evidence')}
        for key in ('RAILWAY_PROJECT_ID', 'RAILWAY_ENVIRONMENT_ID', 'GESTAO_PUBLIC_HOST', 'GESTAO_PUBLIC_ORIGIN',
                    'SILEX_INTEGRATION_MANIFEST', 'SILEX_E2E_MANIFEST'):
            env.pop(key, None)
        for cwd, command in commands:
            print(f'[{cwd.relative_to(ROOT) or "."}] {shlex.join(command)}', flush=True)
            if not args.list:
                result = subprocess.run(command, cwd=cwd, env=env)
                if result.returncode:
                    return result.returncode
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
