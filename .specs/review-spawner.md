# Code Review: Cross-Platform Spawner Abstraction

## Verdict: Changes Requested

The core extraction of `AppSpawner` and the terminal strategy pattern are good steps, but the implementation leaks OS-specific details and breaks downstream consumers.

### Correctness & Tests
- **Build Broken**: The root `src/index.ts` fails to build. It still references `SpawnResult` from terminals and expects `innerSessionName`/`sessionId` to be public. Downstream consumers must be updated to match the new `TerminalBackend` interface.

### SOLID & Cross-Platform Issues
- **Dependency Inversion (DIP)**: `BackendFactory.ts` hardcodes `new MacOsOpenSpawner()` and `new MacOsNativeSpawner()`. To support Windows/Linux, inject spawners via an OS-aware factory (e.g., `SpawnerFactory.create('open')`) rather than hardcoding `MacOs` classes in the terminal factory.
- **Cross-Platform Leaks**: `GhosttyBackend` hardcodes `executable: 'Ghostty.app'` and `WezTermBackend` hardcodes `/Applications/WezTerm.app...`. These are macOS-specific paths. Backends should receive the executable path via configuration or an OS-agnostic resolver.

### Performance & Reliability
- **Race Conditions**: `MacOsOpenSpawner` uses `pgrep` and a hardcoded `setTimeout(1000)` to guess the new PID. This is fragile and prone to race conditions if multiple instances start concurrently. Consider using a more robust tracking mechanism or OS API if possible.

Please address the OS-specific coupling in the backends/factory and fix the root build errors.