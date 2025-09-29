import type {
	UseWebsiteStoreOptions,
	UseWebsiteStoreResult,
} from "../../hooks/private/store/use-website-store";
import { useWebsiteStore } from "../../hooks/private/store/use-website-store";
import { useSupport } from "../../provider";

export type UseWebsiteOptions = UseWebsiteStoreOptions;

export type UseWebsiteResult = UseWebsiteStoreResult;

export function useWebsite(options: UseWebsiteOptions = {}): UseWebsiteResult {
	const { client } = useSupport();
	return useWebsiteStore(client, options);
}
