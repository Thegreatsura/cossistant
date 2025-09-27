import type {
	UseWebsiteStoreOptions,
	UseWebsiteStoreResult,
} from "../../hooks/use-website-store";
import { useWebsiteStore } from "../../hooks/use-website-store";
import { useSupport } from "../../provider";

export type UseWebsiteOptions = UseWebsiteStoreOptions;

export type UseWebsiteResult = UseWebsiteStoreResult;

export function useWebsite(options: UseWebsiteOptions = {}): UseWebsiteResult {
	const { client } = useSupport();
	return useWebsiteStore(client, options);
}
