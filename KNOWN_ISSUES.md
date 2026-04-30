# Known Issues

This document tracks known issues, edge cases, and environment-specific quirks in the `mcp-tuikit` project.

## Headless Environments & Rendering

### 1. WezTerm produces black screen snapshots under headless Sway

- **Description**: When running integration tests inside a headless Sway (Wayland) environment, WezTerm starts successfully but its visual output (captured as PNG snapshots) is completely black. The textual output works, but the visual rendering fails.
- **Root Cause**: WezTerm strongly prefers a hardware-accelerated GPU context (e.g., Vulkan, OpenGL, or EGL). In headless continuous integration environments utilizing Sway with software rendering (`WLR_RENDERER=pixman`), the expected hardware acceleration is absent, causing the compositor to capture an empty or black window buffer.
- **Workarounds / Fixes**:
  - Skip WezTerm visual snapshot tests when running in headless Sway environments.
  - Attempt to force WezTerm into software rendering mode via its configuration file (`front_end = "Software"`), though this is not always sufficient depending on the host environment's Mesa/EGL driver support.
