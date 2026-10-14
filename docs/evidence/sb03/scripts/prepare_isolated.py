"""Create a NEW reproduction workspace/evidence directory; never mutate original reports/data."""
from pathlib import Path
import argparse, json, shutil, tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--backup', type=Path, required=True)
parser.add_argument('--evidence', type=Path, required=True)
args = parser.parse_args()
root, backup, output = args.root.resolve(), args.backup.resolve(), args.evidence.resolve()
if output.exists(): raise SystemExit('Evidence directory must not already exist')
if not (backup/'original/frontend/src/App.tsx').is_file(): raise SystemExit('Verified pre-SB03 backup required')
if not (root/'frontend/node_modules').is_dir() or not (root/'.venv/bin/python').is_file(): raise SystemExit('Existing local dependencies required; this script installs nothing')
work = Path(tempfile.mkdtemp(prefix='silex-sb03-'))
ignore = shutil.ignore_patterns('node_modules','.venv','__pycache__','.pytest_cache','.vite','test-results','playwright-report')
for variant in ('baseline','candidate'):
 dst = work/variant; dst.mkdir()
 for sub in ('backend','scripts'):
  shutil.copytree(root/sub,dst/sub,ignore=ignore)
 shutil.copytree(backup/'original/frontend' if variant=='baseline' else root/'frontend',dst/'frontend',ignore=ignore)
 (dst/'.venv').symlink_to(root/'.venv',target_is_directory=True)
 (dst/'frontend/node_modules').symlink_to(root/'frontend/node_modules',target_is_directory=True)
output.mkdir(parents=True)
shutil.copytree(Path(__file__).resolve().parent,output/'scripts')
shutil.copytree(Path(__file__).resolve().parent.parent/'configs',output/'configs')
(output/'screenshots').mkdir()
for config in (output/'configs').glob('sb03*.config.ts'):
 text=config.read_text().replace('/home/leofernandesc/controlmax-inspired/docs/evidence/sb03',str(output))
 (work/'candidate/frontend'/config.name).write_text(text)
(output/'environment.json').write_text(json.dumps({'work_dir':str(work),'backup':str(backup),'ports':{'baseline':18024,'candidate':18023,'functional':8011},'persistent_database_used':False,'new_dependencies':False},indent=2))
print(json.dumps({'work_dir':str(work),'evidence':str(output)},indent=2))
