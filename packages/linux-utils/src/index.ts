import koffi from 'koffi';

let x11DisplayServerCache: boolean | null = null;

export async function isX11DisplayServer(): Promise<boolean> {
  if (x11DisplayServerCache !== null) {
    return x11DisplayServerCache;
  }

  // Fast path: environment variables
  if (process.env.WAYLAND_DISPLAY) {
    x11DisplayServerCache = false;
    return false;
  }
  if (process.env.XDG_SESSION_TYPE === 'wayland') {
    x11DisplayServerCache = false;
    return false;
  }

  // Slow path: probe system libraries with koffi
  try {
    const libX11 = koffi.load('libX11.so.6');
    const XOpenDisplay = libX11.func('void* XOpenDisplay(const char* display_name)');
    const XCloseDisplay = libX11.func('int XCloseDisplay(void* display)');

    // Attempt to open the default display
    const display = XOpenDisplay(null);
    if (display) {
      XCloseDisplay(display);
      x11DisplayServerCache = true;
      return true;
    }
  } catch {
    // libX11 is missing or failed to open display
  }

  x11DisplayServerCache = false;
  return false;
}
