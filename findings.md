# Findings: Avatar Stack Race Condition

## Data Flow (Known)
1. `SupportProvider` mounts → `useClient()` creates `CossistantClient` (memoized)
2. `useWebsiteStore(client)` subscribes to `client.websiteStore` and triggers fetch via `useClientQuery`
3. `fetchWebsite()` calls API → `websiteStore.setWebsite(response)` → store notifies listeners
4. `SupportProviderInner` re-renders → context value updates → consumers re-render
5. `SupportComponentInner` checks `if (!website) return null` → only renders when data available
6. `HomePage` mounts → `useSupport()` → `availableHumanAgents` from context

## Key Insight
The widget (`SupportComponentInner`) returns `null` until `website` is truthy.
So when `HomePage` first renders, `website` should already be available.
This means the issue is NOT about initial data loading timing.

## Open Questions
- Is there something that re-fetches website data and returns partial/different data?
- Does the identification flow trigger a second fetch that overwrites the first?
- Is there a websocket event that clears or replaces the website store?
- Does the Content component unmount children when widget closes?
