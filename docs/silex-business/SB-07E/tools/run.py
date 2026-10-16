"""Inject synthetic fixture credential privately; never print environment or login body."""
from pathlib import Path
import os,re,sys
R=Path(__file__).resolve().parents[4]
match=re.search(r'DemoLocal#[0-9]+',(R/'README.md').read_text()); assert match
os.environ['SILEX_TEST_PASSWORD']=match.group()
os.environ.update(SILEX_ROOT=str(R),SILEX_EVIDENCE=str(R/'docs/evidence/sb07e'),SILEX_BASELINE='http://127.0.0.1:18094',SILEX_CANDIDATE='http://127.0.0.1:18095')
os.execvp(sys.argv[1],sys.argv[1:])
