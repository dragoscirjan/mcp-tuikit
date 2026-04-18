export async function isX11DisplayServer(): Promise<boolean> {
  try {
    // @ts-ignore
    const native = await import('@mcp-tuikit/native-linux');
    if (native.getDisplayServerProtocol && native.getDisplayServerProtocol() === 'x11') {
      return true;
    }
    return false;
  } catch {
    if (process.env.WAYLAND_DISPLAY) {
      return false;
    } else if (process.env.DISPLAY) {
      return true;
    }
  }
  return false;
}
