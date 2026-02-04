# Cossistant React SDK

Build fully featured customer support experiences in React with the official `@cossistant/react` package. The SDK wraps the REST and WebSocket APIs, comes with a prebuilt widget, hooks, and UI primitives so you can ship your support quickly and customize later.

> 📚 **New to Cossistant?** Follow the [Quickstart guide](https://cossistant.com/docs/quickstart) in our official documentation.

## Installation

Pick the command that matches your package manager:

```bash
bun add @cossistant/react
# or
npm install @cossistant/react
# or
yarn add @cossistant/react
```

## CSS Imports

The SDK provides two CSS entrypoints to fit your setup:

### Option 1: Tailwind v4 Source

If you're using Tailwind CSS v4, import the source file to enable full theme customization:

```tsx
import "@cossistant/react/tailwind.css";
```

### Option 2: Plain CSS

Import the pre-compiled CSS with no Tailwind dependency:

```tsx
import "@cossistant/react/support.css";
```

This file contains all the compiled styles and works in any React application without requiring Tailwind CSS.

> **Note:** Tailwind v3 is not supported. Use the plain CSS import if you're on Tailwind v3.

## Render the widget

```tsx
import { SupportProvider, Support } from "@cossistant/react";
import "@cossistant/react/support.css";

export function App() {
  return (
    <SupportProvider publicKey={process.env.NEXT_PUBLIC_COSSISTANT_API_KEY}>
      <Support />
    </SupportProvider>
  );
}
```

1. Wrap the subtree that should access support data with `SupportProvider` and supply your public key (A Cossistant account is mandatory)
2. Drop the `Support` component anywhere inside that provider to mount the floating widget.
3. Optionally pass `defaultOpen`, `quickOptions`, `defaultMessages`, or locale overrides straight into `Support` for instant personalization.

### Identify visitors and seed defaults

Use the helper components to identify a visitor, attach metadata or display different default messages or quick options.

```tsx
import {
  IdentifySupportVisitor,
  Support,
  SupportConfig,
  SupportProvider,
  SenderType,
} from "@cossistant/react";

export function Dashboard({
  visitor,
}: {
  visitor: { id: string; email: string };
}) {
  return (
    <>
      <IdentifySupportVisitor externalId={visitor.id} email={visitor.email} />
      <SupportConfig
        defaultMessages={[
          {
            content:
              "Welcome to your dashboard. If you need any help, I'm here!",
            senderType: SenderType.TeamMember,
          },
        ]}
      />
    </>
  );
}
```

Make sure `IdentifySupportVisitor` and `SupportConfig` are rendered inside `SupportProvider`, and keep `<Support />` mounted somewhere in that tree.

## Need help or spot a typo?

Open an issue in the main repository or start a discussion so we can improve the docs together. Screenshots, reproduction steps, and suggestions are welcome.
