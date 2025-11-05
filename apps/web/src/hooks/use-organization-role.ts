"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/client";

type OrganizationRole = {
	role: string | null;
	isAdmin: boolean;
	isOwner: boolean;
	canCreateWebsite: boolean;
	isLoading: boolean;
};

export function useOrganizationRole(): OrganizationRole {
	const { data, isLoading } = useQuery({
		queryKey: ["organization", "active-member-role"],
		queryFn: async () => {
			const result = await authClient.organization.getActiveMemberRole();
			return result.data?.role ?? null;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false,
	});

	const role = data ?? null;
	const isOwner = role === "owner";
	const isAdmin = role === "admin";
	const canCreateWebsite = isOwner || isAdmin;

	return {
		role,
		isAdmin,
		isOwner,
		canCreateWebsite,
		isLoading,
	};
}
