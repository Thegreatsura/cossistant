import React from "react";

import { useSupport } from "../../provider";
import {
supportTextDefinitions,
type SupportLocale,
type SupportTextContentOverrides,
type SupportTextContext,
type SupportTextDefinitions,
type SupportTextKey,
type SupportTextProviderValue,
type SupportTextResolvedFormatter,
type SupportTextVariables,
} from "./locales/keys";
import {
buildLocaleChain,
createTextUtils,
normalizeOverrides,
resolveMessage,
evaluateMessage,
} from "./runtime";

type SupportTextProviderProps<Locale extends string = SupportLocale> = {
children: React.ReactNode;
locale?: Locale;
content?: SupportTextContentOverrides<Locale>;
};

const SupportTextRuntimeContext = React.createContext<SupportTextProviderValue | null>(
null,
);

export function SupportTextProvider<Locale extends string = SupportLocale>({
children,
locale,
content,
}: SupportTextProviderProps<Locale>) {
const { website, availableHumanAgents, availableAIAgents, visitor } = useSupport();
const [browserLocale, setBrowserLocale] = React.useState<string | null>(null);

React.useEffect(() => {
if (typeof navigator !== "undefined" && navigator.language) {
setBrowserLocale(navigator.language);
}
}, []);

const localeChain = React.useMemo(
() => buildLocaleChain([locale, browserLocale]),
[locale, browserLocale],
);

const normalizedOverrides = React.useMemo(
() => normalizeOverrides(content),
[content],
);

const utils = React.useMemo(
() => createTextUtils(localeChain[0] ?? "en"),
[localeChain],
);

const textContext = React.useMemo<SupportTextContext>(
    () => ({
        website,
        visitor: visitor ?? null,
        humanAgents: availableHumanAgents,
        aiAgents: availableAIAgents,
    }),
    [website, visitor, availableHumanAgents, availableAIAgents],
);

const format = React.useCallback(
((key: SupportTextKey, variables?: unknown) => {
const definition = supportTextDefinitions[key];
const requiresVariables =
definition.variables !== undefined && definition.optional !== true;

if (requiresVariables && variables === undefined) {
throw new Error(`Missing variables for text key "${key}".`);
}

    const resolved = resolveMessage(key, localeChain, normalizedOverrides);
    return evaluateMessage(
        key,
        resolved,
        variables as SupportTextVariables<typeof key>,
        textContext,
        utils,
    );
}) as SupportTextResolvedFormatter,
[localeChain, normalizedOverrides, textContext, utils],
);

const value = React.useMemo<SupportTextProviderValue>(
() => ({
format,
locale: localeChain[0] ?? "en",
}),
[format, localeChain],
);

return (
<SupportTextRuntimeContext.Provider value={value}>
{children}
</SupportTextRuntimeContext.Provider>
);
}

export function useSupportText(): SupportTextResolvedFormatter {
const context = React.useContext(SupportTextRuntimeContext);
if (!context) {
throw new Error("useSupportText must be used within SupportTextProvider");
}

return context.format;
}

type OptionalVariablesProp<K extends SupportTextKey> = SupportTextDefinitions[K]["variables"] extends undefined
? { variables?: undefined }
: SupportTextDefinitions[K]["optional"] extends true
? { variables?: SupportTextVariables<K> }
: { variables: SupportTextVariables<K> };

type TextProps<
K extends SupportTextKey,
As extends keyof React.JSX.IntrinsicElements = "span",
> = OptionalVariablesProp<K> & {
textKey: K;
as?: As;
} & Omit<React.ComponentPropsWithoutRef<As>, "children">;

type TextComponent = <
K extends SupportTextKey,
As extends keyof React.JSX.IntrinsicElements = "span",
>(props: TextProps<K, As>) => React.ReactElement | null;

export const Text: TextComponent = React.forwardRef(function Text<
K extends SupportTextKey,
As extends keyof React.JSX.IntrinsicElements = "span",
>(props: TextProps<K, As>, ref: React.ComponentPropsWithRef<As>["ref"]) {
const { textKey, variables, as, ...rest } = props as TextProps<K, As>;
const format = useSupportText();
const Component = (as ?? "span") as As;
const content =
variables !== undefined
? format(textKey, variables as SupportTextVariables<K>)
: format(textKey);

return React.createElement(Component, {
...rest,
ref,
"data-key-name": textKey,
children: content,
});
});

Text.displayName = "SupportText";

export type {
SupportTextContentOverrides,
SupportTextKey,
SupportLocale,
SupportTextVariables,
} from "./locales/keys";

