"""Deliver actual X11 keyboard shortcuts ONLY to the isolated validation display."""
import ctypes as C
import ctypes.util
import sys,subprocess,re
assert sys.argv[1] == ':1068', 'Never target the user desktop'
x=C.CDLL(ctypes.util.find_library('X11')); t=C.CDLL(ctypes.util.find_library('Xtst'))
x.XOpenDisplay.argtypes=[C.c_char_p];x.XOpenDisplay.restype=C.c_void_p
d=x.XOpenDisplay(b':1068');assert d
x.XDefaultRootWindow.argtypes=[C.c_void_p];x.XDefaultRootWindow.restype=C.c_ulong
x.XQueryTree.argtypes=[C.c_void_p,C.c_ulong,C.POINTER(C.c_ulong),C.POINTER(C.c_ulong),C.POINTER(C.POINTER(C.c_ulong)),C.POINTER(C.c_uint)]
x.XFetchName.argtypes=[C.c_void_p,C.c_ulong,C.POINTER(C.c_char_p)]
x.XSetInputFocus.argtypes=[C.c_void_p,C.c_ulong,C.c_int,C.c_ulong]
x.XStringToKeysym.argtypes=[C.c_char_p];x.XStringToKeysym.restype=C.c_ulong
x.XKeysymToKeycode.argtypes=[C.c_void_p,C.c_ulong];x.XKeysymToKeycode.restype=C.c_uint
x.XFlush.argtypes=[C.c_void_p];x.XFree.argtypes=[C.c_void_p]
t.XTestFakeKeyEvent.argtypes=[C.c_void_p,C.c_uint,C.c_int,C.c_ulong]
root=x.XDefaultRootWindow(d);a=C.c_ulong();b=C.c_ulong();children=C.POINTER(C.c_ulong)();n=C.c_uint()
x.XQueryTree(d,root,C.byref(a),C.byref(b),C.byref(children),C.byref(n));window=None
for i in range(n.value):
 name=C.c_char_p()
 if x.XFetchName(d,children[i],C.byref(name)) and name.value:
  title=name.value.decode(errors='replace')
  if 'Mozilla Firefox' in title or 'Silex' in title:window=children[i]
  x.XFree(name)
x.XFree(children)
if window is None:
 tree=subprocess.check_output(['xwininfo','-display',':1068','-root','-tree'],text=True)
 candidates=[]
 for line in tree.splitlines():
  match=re.match(r'\s*(0x[0-9a-f]+).*?\s(\d+)x(\d+)[+-]',line)
  if match and '("Navigator"' in line and int(match[2])>200 and int(match[3])>200:candidates.append(int(match[1],16))
 assert len(candidates)==1, 'Expected exactly one private browser window: '+tree
 window=candidates[0]
x.XSetInputFocus(d,window,2,0)
if sys.argv[2]=='resize':
 x.XResizeWindow.argtypes=[C.c_void_p,C.c_ulong,C.c_uint,C.c_uint]
 width,height=map(int,sys.argv[3:5]);assert 500<=width<=1550 and 500<=height<=1150
 x.XResizeWindow(d,window,width,height);x.XFlush(d);sys.exit(0)
keys=['Control_L',sys.argv[2]]
codes=[x.XKeysymToKeycode(d,x.XStringToKeysym(k.encode())) for k in keys];assert all(codes)
for code in codes:t.XTestFakeKeyEvent(d,code,1,0)
for code in reversed(codes):t.XTestFakeKeyEvent(d,code,0,0)
x.XFlush(d)
print('Native XTest shortcut delivered to private display')
