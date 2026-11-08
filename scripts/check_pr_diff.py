"""Validate the complete proposed Git change, including on an otherwise clean checkout."""
import argparse
import json
from pathlib import Path
import subprocess


def git(repo, *args):
    return subprocess.run(['git', '-C', str(repo), *args], capture_output=True, text=True)


def resolve(repo, reference):
    result = git(repo, 'rev-parse', '--verify', '--end-of-options', reference + '^{commit}')
    if result.returncode:
        raise ValueError('Base/HEAD ausente ou inválido; obtenha o histórico necessário antes da verificação')
    return result.stdout.strip()


def check(repo, base_ref, head_ref):
    base, head = resolve(repo, base_ref), resolve(repo, head_ref)
    if resolve(repo, 'HEAD') != head:
        raise ValueError('O checkout não corresponde ao HEAD proposto')
    if git(repo, 'ls-files', '--unmerged').stdout:
        raise ValueError('O índice contém conflitos não resolvidos')
    ancestor = git(repo, 'merge-base', base, head)
    if ancestor.returncode:
        raise ValueError('Base e HEAD não têm ancestral comum')
    diff = git(repo, 'diff', '--check', base + '...' + head)
    if diff.returncode:
        # Never echo the offending source line: it might contain an accidental secret.
        locations = [line for line in diff.stdout.splitlines() if line and not line.startswith('+')]
        raise ValueError('Diff inválido: ' + '; '.join(locations))
    # This writes only unreachable Git objects; no checkout, index, branch or file is changed.
    merge = git(repo, 'merge-tree', '--write-tree', base, head)
    if merge.returncode:
        raise ValueError('O HEAD conflita com a base; nenhuma integração foi executada')
    changed = git(repo, 'diff', '--name-only', ancestor.stdout.strip(), head)
    return {'ok': True, 'base': base, 'head': head, 'merge_base': ancestor.stdout.strip(),
            'changed_files': len(changed.stdout.splitlines()), 'working_tree_only_check': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', required=True)
    parser.add_argument('--head', required=True)
    parser.add_argument('--repo', type=Path, default=Path.cwd())
    args = parser.parse_args()
    try:
        result = check(args.repo, args.base, args.head)
    except ValueError as error:
        print(json.dumps({'ok': False, 'error': str(error)}, ensure_ascii=False))
        return 1
    print(json.dumps(result))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
