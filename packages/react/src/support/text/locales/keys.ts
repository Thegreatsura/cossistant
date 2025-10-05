import type {
  AvailableAIAgent,
  AvailableHumanAgent,
  PublicWebsiteResponse,
} from "@cossistant/types";

export type SupportLocale = "en" | "fr" | "es";

export type SupportTimeOfDayToken = "morning" | "afternoon" | "evening";

export type SupportTimeOfDayValue = {
  token: SupportTimeOfDayToken;
  label: string;
};

export type SupportTextUtils = {
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  pluralize: (count: number, options: { one: string; other: string }) => string;
  titleCase: (value: string) => string;
  timeOfDay: () => SupportTimeOfDayValue;
};

export type SupportTextContext = {
  website: PublicWebsiteResponse | null;
  visitor: PublicWebsiteResponse["visitor"] | null;
  humanAgents: AvailableHumanAgent[];
  aiAgents: AvailableAIAgent[];
};

type SupportTextDefinition<Vars> =
  | {
      variables: Vars;
      optional?: false;
    }
  | {
      variables: Vars;
      optional: true;
    };

export const supportTextDefinitions = {
  "common.actions.askQuestion": { variables: undefined },
  "common.actions.attachFiles": { variables: undefined },
  "common.actions.removeFile": { variables: { fileName: "" } },
  "common.brand.watermark": { variables: undefined },
  "common.fallbacks.aiAssistant": { variables: undefined },
  "common.fallbacks.cossistant": { variables: undefined },
  "common.fallbacks.someone": { variables: undefined },
  "common.fallbacks.supportTeam": { variables: undefined },
  "common.fallbacks.unknown": { variables: undefined },
  "common.fallbacks.you": { variables: undefined },
  "common.labels.aiAgentIndicator": { variables: undefined },
  "common.labels.supportOnline": { variables: undefined },
  "page.conversationHistory.showMore": { variables: { count: 0 } },
  "page.conversationHistory.title": { variables: undefined },
  "page.home.greeting": {
    variables: { visitorName: "" },
    optional: true,
  },
  "page.home.history.more": { variables: { count: 0 } },
  "page.home.tagline": {
    variables: { websiteName: "" },
    optional: true,
  },
  "component.conversationButtonLink.fallbackTitle": {
    variables: undefined,
  },
  "component.conversationButtonLink.lastMessage.agent": {
    variables: { name: "", time: "" },
  },
  "component.conversationButtonLink.lastMessage.visitor": {
    variables: { time: "" },
  },
  "component.conversationButtonLink.typing": {
    variables: { name: "" },
  },
  "component.conversationEvent.assigned": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.unassigned": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.default": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.participantJoined": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.participantLeft": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.participantRequested": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.priorityChanged": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.reopened": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.resolved": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.statusChanged": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.tagAdded": {
    variables: { actorName: "" },
  },
  "component.conversationEvent.tagRemoved": {
    variables: { actorName: "" },
  },
  "component.multimodalInput.placeholder": {
    variables: undefined,
  },
  "component.multimodalInput.remove": {
    variables: { fileName: "" },
  },
  "component.navigation.articles": {
    variables: undefined,
  },
  "component.navigation.home": {
    variables: undefined,
  },
  "component.message.timestamp.aiIndicator": {
    variables: undefined,
  },
} as const satisfies Record<string, SupportTextDefinition<unknown>>;

export type SupportTextDefinitions = typeof supportTextDefinitions;
export type SupportTextKey = keyof SupportTextDefinitions;

export type SupportTextVariables<K extends SupportTextKey> =
  SupportTextDefinitions[K]["variables"];

type OptionalFlag<K extends SupportTextKey> =
  SupportTextDefinitions[K] extends { optional: true } ? true : false;

type MessageVariables<
  K extends SupportTextKey,
  Vars = SupportTextVariables<K>,
> = Vars extends undefined
  ? undefined
  : OptionalFlag<K> extends true
    ? Vars | undefined
    : Vars;

export type SupportTextMessage<
  K extends SupportTextKey,
  Vars = SupportTextVariables<K>,
> =
  | string
  | ((args: {
      variables: MessageVariables<K, Vars>;
      context: SupportTextContext;
      utils: SupportTextUtils;
    }) => string);

export type SupportLocaleMessages = {
  [K in SupportTextKey]: SupportTextMessage<K>;
};

export type SupportTextContentOverrides<Locale extends string = SupportLocale> =
  Partial<{
    [K in SupportTextKey]:
      | SupportTextMessage<K>
      | Partial<Record<SupportLocale | Locale, SupportTextMessage<K>>>;
  }>;

export type SupportTextFormatter = {
  <K extends SupportTextKey>(
    key: K,
    variables: SupportTextVariables<K>
  ): string;
  // biome-ignore lint/style/useUnifiedTypeSignatures: overload needed for strict variable checking
  <K extends SupportTextKey>(key: K): string;
};

type KeysWithVariables = {
  [K in SupportTextKey]: SupportTextVariables<K> extends undefined
    ? never
    : OptionalFlag<K> extends true
      ? never
      : K;
}[SupportTextKey];

export type StrictSupportTextFormatter = {
  <K extends KeysWithVariables>(
    key: K,
    variables: SupportTextVariables<K>
  ): string;
  <K extends Exclude<SupportTextKey, KeysWithVariables>>(
    key: K,
    variables?: SupportTextVariables<K>
  ): string;
};

export type SupportTextResolvedFormatter = StrictSupportTextFormatter &
  SupportTextFormatter;

export type SupportTextProviderValue = {
  format: SupportTextResolvedFormatter;
  locale: string;
};
