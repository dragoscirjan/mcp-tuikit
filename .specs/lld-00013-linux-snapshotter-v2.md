---
id: "00014"
type: lld
title: "Linux Wayland D-Bus Snapshotter"
version: 1
status: deprecated
opencode-agent: lead-engineer
---

---
id: "00013"
type: lld
title: "Linux Snapshotter"
version: 2
status: deprecated
author: lead-engineer
---

# LLD: Linux Wayland D-Bus Snapshotter

## Objective

Implement Phase 2 of Linux Wayland screenshots using pure Node.js via D-Bus, bypassing external tools like grim and scrot. This ensures native compatibility with GNOME and KDE compositors on Wayland.

## Approach

The Linux snapshotter will detect Wayland sessions and execute D-Bus method calls to compositor-specific or standard Freedesktop screenshot APIs. We will use execa with busctl or dbus-send to avoid heavy native D-Bus module dependencies, ensuring cross-platform stability.

The implementation will sequentially attempt:

1. GNOME Shell API (org.gnome.Shell.Screenshot)
2. KDE KWin API (org.kde.kwin.Screenshot)
3. XDG Desktop Portal (org.freedesktop.portal.Screenshot)

## Interfaces

The LinuxSnapshotter class will be extended with private methods for Wayland capture.
A new method captureWayland will orchestrate the D-Bus calls.
A utility function will execute the D-Bus commands via execa and parse the output to retrieve the saved image path.

## Edge Cases & Risks

- Wayland Detection: Rely on WAYLAND_DISPLAY or XDG_SESSION_TYPE environment variables. If missing, fallback to X11 tools.
- D-Bus Availability: Handle failures gracefully if the D-Bus session bus is unreachable.
- Permission Prompts: The XDG Portal API may trigger interactive user prompts. Implement timeouts to prevent hanging the Node.js process.
- File Cleanup: D-Bus APIs typically save to a temporary location. Ensure the snapshotter reads and cleans up these temporary files properly.

## Tasks for Worker Backend Dev

Task 1: Wayland Detection
Modify packages/terminals/src/snapshotters/linux.ts.
Add logic to check environment variables for Wayland sessions before falling back to X11 tools.

Task 2: GNOME and KDE D-Bus Integration
Modify packages/terminals/src/snapshotters/linux.ts.
Implement capture routines using execa to call busctl or dbus-send for org.gnome.Shell.Screenshot and org.kde.kwin.Screenshot interfaces. Ensure proper argument formatting for saving to a temporary path.

Task 3: XDG Portal Fallback
Modify packages/terminals/src/snapshotters/linux.ts.
Implement a fallback using org.freedesktop.portal.Screenshot for unsupported compositors. Handle potential timeout scenarios if the portal requests user interaction.
