import type { CossistantClient } from "@cossistant/core";
import { normalizeLocale } from "@cossistant/core";
import type { DefaultMessage, PublicWebsiteResponse } from "@cossistant/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { useWebsiteStore } from "./hooks/private/store/use-website-store";
import { useClient } from "./hooks/private/use-rest-client";
import { WebSocketProvider } from "./support";

export type SupportProviderProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
  apiUrl?: string;
  wsUrl?: string;
  publicKey?: string;
  defaultMessages?: DefaultMessage[];
  quickOptions?: string[];
  autoConnect?: boolean;
  onWsConnect?: () => void;
  onWsDisconnect?: () => void;
  onWsError?: (error: Error) => void;
  queryClient?: QueryClient;
};

export type CossistantProviderProps = SupportProviderProps;

export type CossistantContextValue = {
  website: PublicWebsiteResponse | null;
  defaultMessages: DefaultMessage[];
  quickOptions: string[];
  setDefaultMessages: (messages: DefaultMessage[]) => void;
  setQuickOptions: (options: string[]) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  isLoading: boolean;
  error: Error | null;
  client: CossistantClient;
};

const SupportContext = React.createContext<CossistantContextValue | undefined>(
  undefined,
);

/**
 * Internal implementation that wires the React Query cache, REST client and
 * websocket provider together before exposing the combined context.
 */
function SupportProviderInner({
  children,
  apiUrl,
  wsUrl,
  publicKey,
  defaultMessages,
  quickOptions,
  autoConnect,
  onWsConnect,
  onWsDisconnect,
  onWsError,
}: SupportProviderProps) {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [_defaultMessages, _setDefaultMessages] = React.useState<
    DefaultMessage[]
  >(defaultMessages || []);
  const [_quickOptions, _setQuickOptions] = React.useState<string[]>(
    quickOptions || [],
  );
  // Update state when props change (for initial values from provider)
  React.useEffect(() => {
    if (defaultMessages && defaultMessages.length > 0) {
      _setDefaultMessages(defaultMessages);
    }
  }, [defaultMessages]);

  React.useEffect(() => {
    if (quickOptions && quickOptions.length > 0) {
      _setQuickOptions(quickOptions);
    }
  }, [quickOptions]);

  const { client } = useClient(publicKey, apiUrl, wsUrl);
  const { website, isLoading, error: websiteError } = useWebsiteStore(client);

  // Prefetch conversations
  // useConversations(client, {
  //   enabled: !!website && !!website.visitor && isClientPrimed,
  // });

  const error = websiteError;

  // Prime REST client with website/visitor context so headers are sent reliably
  React.useEffect(() => {
    if (website) {
      // @ts-expect-error internal priming: safe in our library context
      client.restClient?.setWebsiteContext?.(website.id, website.visitor?.id);
    }
  }, [client, website]);

  const setDefaultMessages = React.useCallback(
    (messages: DefaultMessage[]) => _setDefaultMessages(messages),
    [],
  );

  const setQuickOptions = React.useCallback(
    (options: string[]) => _setQuickOptions(options),
    [],
  );

  const setUnreadCountStable = React.useCallback(
    (count: number) => setUnreadCount(count),
    [],
  );

  const value = React.useMemo<CossistantContextValue>(
    () => ({
      website,
      unreadCount,
      setUnreadCount: setUnreadCountStable,
      isLoading,
      error,
      client,
      defaultMessages: _defaultMessages,
      setDefaultMessages,
      quickOptions: _quickOptions,
      setQuickOptions,
    }),
    [
      website,
      unreadCount,
      isLoading,
      error,
      client,
      _defaultMessages,
      _quickOptions,
      setDefaultMessages,
      setQuickOptions,
      setUnreadCountStable,
    ],
  );

  return (
    <SupportContext.Provider value={value}>
      <WebSocketProvider
        autoConnect={autoConnect}
        onConnect={onWsConnect}
        onDisconnect={onWsDisconnect}
        onError={onWsError}
        publicKey={publicKey}
        visitorId={website?.visitor?.id}
        websiteId={website?.id}
        wsUrl={wsUrl}
      >
        {children}
      </WebSocketProvider>
    </SupportContext.Provider>
  );
}

/**
 * Hosts the entire customer support widget ecosystem by handing out context
 * about the current website, visitor, unread counts, realtime subscriptions
 * and the REST client. Provide your Cossistant public key plus optional
 * defaults to configure the widget behaviour.
 */
export function SupportProvider({
  children,
  apiUrl = "https://api.cossistant.com/v1",
  wsUrl = "wss://api.cossistant.com/ws",
  publicKey,
  defaultMessages,
  quickOptions,
  autoConnect = true,
  onWsConnect,
  onWsDisconnect,
  onWsError,
  queryClient,
}: SupportProviderProps) {
  // Create a default QueryClient if none provided
  const [defaultQueryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
          },
        },
      }),
  );

  const activeQueryClient = queryClient || defaultQueryClient;

  return (
    <QueryClientProvider client={activeQueryClient}>
      <SupportProviderInner
        apiUrl={apiUrl}
        autoConnect={autoConnect}
        defaultMessages={defaultMessages}
        onWsConnect={onWsConnect}
        onWsDisconnect={onWsDisconnect}
        onWsError={onWsError}
        publicKey={publicKey}
        quickOptions={quickOptions}
        wsUrl={wsUrl}
      >
        {children}
      </SupportProviderInner>
    </QueryClientProvider>
  );
}

/**
 * Convenience hook that exposes the aggregated support context. Throws when it
 * is consumed outside of `SupportProvider` to catch integration mistakes.
 */
export function useSupport() {
  const context = React.useContext(SupportContext);
  if (!context) {
    throw new Error(
      "useSupport must be used within a cossistant SupportProvider",
    );
  }

  const availableHumanAgents = context.website?.availableHumanAgents || [];
  const availableAIAgents = context.website?.availableAIAgents || [];
  const visitorLanguage = context.website?.visitor?.language || null;

  // Create visitor object with normalized locale
  const visitor = context.website?.visitor
    ? {
        ...context.website.visitor,
        locale: normalizeLocale(visitorLanguage),
      }
    : undefined;

  return {
    ...context,
    availableHumanAgents,
    availableAIAgents,
    visitor,
  };
}
