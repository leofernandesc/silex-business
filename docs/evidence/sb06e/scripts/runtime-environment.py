"""Read-only environment inventory; no enabling readers or touching user browsers."""
import json,os,shutil,subprocess,platform
from pathlib import Path
result={'os':platform.platform(),'session':{k:os.environ.get(k) for k in ['XDG_SESSION_TYPE','DISPLAY','WAYLAND_DISPLAY']},'binaries':{k:shutil.which(k) for k in ['orca','firefox','brave-browser','Xvfb','xdotool']}}
result['screen_reader_enabled']=subprocess.check_output(['gsettings','get','org.gnome.desktop.a11y.applications','screen-reader-enabled'],text=True).strip()
processes=subprocess.check_output(['ps','-eo','comm='],text=True).splitlines()
result['orca_running']=any(p.strip()=='orca' for p in processes)
result['reader_homologation_executed']=False
result['reason']='Orca installed but not enabled/running; no audio/assistive user session observed. No reader signoff inferred from DOM or binary presence.'
Path(os.environ['SILEX_EVIDENCE'],'runtime-environment.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
