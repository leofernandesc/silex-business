"""Real disposable Git repositories; prove that a clean checkout can still contain a bad PR."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

import pytest
from app.db import ROOT

spec = importlib.util.spec_from_file_location('diff_gate', ROOT/'scripts/check_pr_diff.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def git(repo, *args):
    r = subprocess.run(['git','-C',str(repo),'-c','core.hooksPath=/dev/null',
                        '-c','user.name=Synthetic CI','-c','user.email=ci@example.test',
                        '-c','commit.gpgsign=false',*args], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return r.stdout.strip()


@pytest.fixture
def repository(tmp_path):
    git(tmp_path,'init','-b','base')
    (tmp_path/'file.txt').write_text('Initial record\n')
    git(tmp_path,'add','.');git(tmp_path,'commit','-m','base')
    return tmp_path,git(tmp_path,'rev-parse','HEAD')


def proposed(repo, content):
    (repo/'file.txt').write_text(content)
    git(repo,'add','.');git(repo,'commit','-m','proposal')
    return git(repo,'rev-parse','HEAD')


@pytest.mark.parametrize('content',['Valid change\n','\u00c1rvore e CNPJ alfanum\u00e9rico\n'])
def test_accepts_complete_valid_diff(repository, content):
    repo,base=repository;head=proposed(repo,content)
    assert gate.check(repo,base,head)['ok']
    assert git(repo,'status','--porcelain') == ''


@pytest.mark.parametrize('content',['Invalid trailing whitespace \n','Good\n\n',
    '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> other\n'])
def test_clean_checkout_old_command_passes_but_complete_diff_gate_rejects(repository, content):
    repo,base=repository;head=proposed(repo,content)
    assert git(repo,'status','--porcelain') == ''
    assert git(repo,'diff','--check') == ''  # Original CI false-positive reproduced.
    with pytest.raises(ValueError,match='Diff inválido'):
        gate.check(repo,base,head)
    r=subprocess.run([sys.executable,str(ROOT/'scripts/check_pr_diff.py'),'--repo',str(repo),'--base',base,'--head',head],capture_output=True,text=True)
    assert r.returncode == 1 and not json.loads(r.stdout)['ok']
    assert 'ours' not in r.stdout  # Only locations, never offending source values.


def test_diverged_merge_conflict_is_rejected_without_touching_checkout(repository):
    repo,initial=repository
    git(repo,'checkout','-b','proposal');head=proposed(repo,'Proposed\n')
    git(repo,'checkout','base');base=proposed(repo,'Base changed\n')
    git(repo,'checkout','proposal')
    with pytest.raises(ValueError,match='conflita'):
        gate.check(repo,base,head)
    assert git(repo,'rev-parse','HEAD')==head and (repo/'file.txt').read_text()=='Proposed\n'


def test_missing_reference_and_wrong_checkout_fail_closed(repository):
    repo,base=repository;head=proposed(repo,'Valid\n')
    with pytest.raises(ValueError,match='ausente'):
        gate.check(repo,'missing-reference',head)
    with pytest.raises(ValueError,match='checkout'):
        gate.check(repo,base,base)
