"""Send native zoom keys only to the dedicated SB-06A virtual display."""
import ctypes as c
import os
import sys
import time
if os.environ.get('DISPLAY') != ':196':
    raise SystemExit('Dedicated Xvfb display :196 required')
x=c.CDLL('libX11.so.6'); xt=c.CDLL('libXtst.so.6')
x.XOpenDisplay.restype=c.c_void_p
x.XOpenDisplay.argtypes=[c.c_char_p]
d=x.XOpenDisplay(b':196')
if not d: raise SystemExit('No isolated display')
x.XDefaultRootWindow.argtypes=[c.c_void_p]; x.XDefaultRootWindow.restype=c.c_ulong
x.XQueryTree.argtypes=[c.c_void_p,c.c_ulong,c.POINTER(c.c_ulong),c.POINTER(c.c_ulong),c.POINTER(c.POINTER(c.c_ulong)),c.POINTER(c.c_uint)]
x.XFetchName.argtypes=[c.c_void_p,c.c_ulong,c.POINTER(c.c_char_p)]
x.XFree.argtypes=[c.c_void_p]
x.XSetInputFocus.argtypes=[c.c_void_p,c.c_ulong,c.c_int,c.c_ulong]
x.XRaiseWindow.argtypes=[c.c_void_p,c.c_ulong]
x.XStringToKeysym.argtypes=[c.c_char_p];x.XStringToKeysym.restype=c.c_ulong
x.XKeysymToKeycode.argtypes=[c.c_void_p,c.c_ulong];x.XKeysymToKeycode.restype=c.c_uint
x.XFlush.argtypes=[c.c_void_p]
xt.XTestFakeKeyEvent.argtypes=[c.c_void_p,c.c_uint,c.c_int,c.c_ulong]
r=c.c_ulong();p=c.c_ulong();children=c.POINTER(c.c_ulong)();n=c.c_uint()
x.XQueryTree(d,x.XDefaultRootWindow(d),c.byref(r),c.byref(p),c.byref(children),c.byref(n))
window=None
for i in range(n.value):
    name=c.c_char_p()
    if x.XFetchName(d,children[i],c.byref(name)) and name.value:
        title=name.value.decode(errors='replace')
        if 'Silex' in title:
            window=children[i]
        x.XFree(name)
x.XFree(children)
if window is None: raise SystemExit('Firefox window not found')
x.XRaiseWindow(d,window);x.XSetInputFocus(d,window,2,0);x.XFlush(d)
ctrl=x.XKeysymToKeycode(d,x.XStringToKeysym(b'Control_L'))
key=x.XKeysymToKeycode(d,x.XStringToKeysym(sys.argv[1].encode()))
shift=x.XKeysymToKeycode(d,x.XStringToKeysym(b'Shift_L'))
for _ in range(int(sys.argv[2]) if len(sys.argv)>2 else 1):
    if sys.argv[1]=='plus': xt.XTestFakeKeyEvent(d,shift,1,0)
    xt.XTestFakeKeyEvent(d,ctrl,1,0);xt.XTestFakeKeyEvent(d,key,1,0);xt.XTestFakeKeyEvent(d,key,0,0);xt.XTestFakeKeyEvent(d,ctrl,0,0);x.XFlush(d);
    if sys.argv[1]=='plus': xt.XTestFakeKeyEvent(d,shift,0,0)
    x.XFlush(d);time.sleep(.15)
