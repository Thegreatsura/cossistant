# Cossistant React SDK

Build fully featured customer support surfaces in React with the official `@cossistant/react` package. The SDK wraps the REST and WebSocket APIs, prebuilt widget, hooks, and UI primitives behind ergonomic React APIs so you can ship quickly and customize later.

> 📚 **New to Cossistant?** Follow the hosted [Quickstart guide](https://cossistant/docs/quickstart) before wiring the SDK into production.

## Installation

Pick the command that matches your package manager:

```bash
bun add @cossistant/react
# or
npm install @cossistant/react
# or
yarn add @cossistant/react
```

## 5-minute setup: render the widget

```tsx
import { SupportProvider, Support } from "@cossistant/react";

export function App() {
        return (
                <SupportProvider publicKey={process.env.NEXT_PUBLIC_COSSISTANT_KEY}>
                        <Support />
                </SupportProvider>
        );
}
```

1. Wrap the subtree that should access support data with `SupportProvider` and supply your public key.
2. Drop the `Support` component anywhere inside that provider to mount the floating widget.
3. Optionally pass `defaultOpen`, `quickOptions`, `defaultMessages`, or locale overrides straight into `Support` for instant personalization.

### Identify visitors and seed defaults

Use the helper components to keep visitor metadata and canned responses in sync with your backend.

```tsx
import {
        IdentifySupportVisitor,
        Support,
        SupportConfig,
        SupportProvider,
} from "@cossistant/react";

export function AuthenticatedSupport({ visitor }: { visitor: { id: string; email: string } }) {
        return (
                <SupportProvider publicKey={process.env.NEXT_PUBLIC_COSSISTANT_KEY}>
                        <IdentifySupportVisitor externalId={visitor.id} email={visitor.email} />
                        <SupportConfig
                                defaultMessages={[
                                        { role: "system", content: "Thanks for reaching out!" },
                                ]}
                                quickOptions={["Shipping status", "Report a bug"]}
                        />
                        <Support />
                </SupportProvider>
        );
}
```

The provider automatically tracks unread counts, default prompts, and visitor metadata. You can adjust these at runtime through `useSupport()` if you need imperative control.

## Compose a bespoke support experience

All widget data flows remain available when you build your own UI. Start from the exported hooks and primitives.

### List conversations with store-backed hooks

```tsx
import { useConversations } from "@cossistant/react";

export function Inbox() {
        const { conversations, isLoading, pagination, refetch } = useConversations({
                status: "open",
                order: "desc",
        });

        if (isLoading) {
                return <p>Loading…</p>;
        }

        return (
                <section>
                        <header>
                                <h2>Inbox</h2>
                                <button onClick={() => void refetch()}>Refresh</button>
                        </header>
                        <ul>
                                {conversations.map((conversation) => (
                                        <li key={conversation.id}>{conversation.title ?? conversation.id}</li>
                                ))}
                        </ul>
                        {pagination?.hasMore ? <button onClick={() => void refetch({ page: (pagination.page ?? 1) + 1 })}>Load more</button> : null}
                </section>
        );
}
```

Pair `useConversations` with `useConversation`, `useConversationTimelineItems`, and `useConversationPreview` to hydrate list and detail screens from the cached store without reimplementing data-fetching logic.

### Build a custom composer

```tsx
import { useMessageComposer, useSendMessage } from "@cossistant/react";

export function CustomComposer({ conversationId }: { conversationId?: string }) {
        const composer = useMessageComposer({ conversationId });
        const sendMessage = useSendMessage();

        async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
                event.preventDefault();
                const payload = composer.buildMessage();
                if (!payload) return;

                await sendMessage.mutateAsync(payload);
                composer.reset();
        }

        return (
                <form onSubmit={handleSubmit}>
                        <textarea
                                value={composer.value}
                                placeholder="How can we help?"
                                onChange={(event) => composer.setValue(event.target.value)}
                                onFocus={composer.startTyping}
                                onBlur={composer.stopTyping}
                        />
                        <button type="submit" disabled={sendMessage.isPending || !composer.canSend}>
                                Send
                        </button>
                </form>
        );
}
```

The composer hook handles optimistic defaults, attachments, and typing indicators so your UI only wires up DOM events.

### React to realtime events anywhere

```tsx
import { useRealtimeSupport } from "@cossistant/react";

export function NotificationBridge() {
        useRealtimeSupport({
                onEvent: (event) => {
                        if (event.type === "conversation.newMessage") {
                                console.info("New message", event.data);
                        }
                },
        });

        return null;
}
```

For firewalled environments where WebSockets are blocked, disable the automatic connection and poll with the provided queries:

```tsx
<SupportProvider publicKey={key} autoConnect={false}>
        {/* Use useConversations/useConversationTimelineItems with refetch intervals */}
</SupportProvider>
```

## Hooks overview

| Category | Hook | What it does |
| --- | --- | --- |
| Conversations | `useConversations`, `useConversation`, `useConversationTimeline`, `useConversationTimelineItems`, `useConversationPreview`, `useConversationSeen`, `useConversationAutoSeen` | Read and manage visitor conversations with pagination, seen state, and grouped timelines. |
| Messaging | `useMessageComposer`, `useSendMessage`, `useCreateConversation`, `useVisitorTypingReporter`, `useConversationTyping` | Power multimodal composers, send messages, and broadcast typing events. |
| Navigation | `useHomePage`, `useConversationHistoryPage`, `useConversationPage`, `useSupportNavigation` | Drive widget navigation when embedding custom layouts. |
| Environment | `useVisitor`, `useSupport`, `useWindowVisibilityFocus`, `useRealtimeSupport` | Access visitor metadata, provider state, focus/visibility, and realtime streams. |

Each hook ships with comprehensive TypeScript types and sensible defaults. All exports are available from `@cossistant/react`.

## Primitives and helper components

- **`SupportProvider` / `Support`** – Host the widget and expose the support context.
- **Layout & navigation** – `Window`, `Bubble`, `NavigationTab`, `ConversationButton`, and `ConversationButtonLink` mirror the default widget structure.
- **Feedback** – `TypingIndicator`, `TimelineItem`, `TimelineItemGroup`, and timestamp helpers keep visitors informed about agent activity.
- **Branding** – `Avatar`, `AvatarStack`, `CossistantBranding`, and related primitives give you consistent visuals out of the box.
- **Text system** – `SupportTextProvider`, `Text`, and `useSupportText` localize and interpolate copy without manual plumbing.

## Utilities worth knowing

- `useSupportStore` / `SupportConfigProvider` – Imperative access to the underlying Zustand stores for advanced mode toggles or controlled open state.
- `cn` – Tiny class name helper that works with Tailwind-style merges.
- `formatTimeAgo` – Human readable timestamps for transcripts and notifications.
- `generateShortPrimaryId` – Stable, short-lived IDs for optimistic UI placeholders.
- `useRenderElement` – Render-prop helper for slots that can accept JSX, strings, or component factories.

## Troubleshooting

- **Widget never appears:** `Support` renders `null` until the website and visitor are fetched. Use `const { isLoading, error } = useSupport();` to show skeletons or surface configuration issues.
- **Corporate network blocks WebSockets:** Set `autoConnect={false}` on `SupportProvider` and schedule `refetch` calls from `useConversations` / `useConversationTimelineItems` as a fallback polling strategy.
- **Need to clear quick replies dynamically:** Call `const { setQuickOptions } = useSupport();` whenever product context changes.

## Keep the docs healthy

Broken links are checked automatically on each push via `bun run docs:links`. Run it locally whenever you edit this README to catch mistakes early.

## Need help or spot a typo?

Open an issue in the main repository or start a discussion so we can improve the docs together. Screenshots, reproduction steps, and suggestions are welcome.
