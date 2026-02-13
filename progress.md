# Progress: Avatar Stack Race Condition

## Session 1 — 2026-02-12

### Attempt 1: isMountedRef fix — FAILED
- Fixed useClientQuery's isMountedRef not resetting on remount
- Issue: didn't affect the store-based data path

### Attempt 2: Stable subscribe — FAILED
- Stabilized subscribe/getSnapshot in useStoreSelector and support-store
- Issue: useSyncExternalStore handles unstable refs correctly

### Starting Phase 1: Deep investigation
- Searching for all websiteStore mutations
- Checking realtime/identification flows
- Looking for secondary fetch paths
