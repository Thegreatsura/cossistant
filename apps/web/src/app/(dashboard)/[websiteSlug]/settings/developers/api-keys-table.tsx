"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { APIKeyType } from "@cossistant/types";
import { useMemo } from "react";
import { toast } from "sonner";
import { copyToClipboardWithMeta } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import {
        Table,
        TableBody,
        TableCell,
        TableHead,
        TableHeader,
        TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type WebsiteApiKey = RouterOutputs["website"]["developerSettings"]["apiKeys"][number];

type ApiKeysTableProps = {
        apiKeys?: WebsiteApiKey[];
        isLoading: boolean;
        onRequestRevoke: (apiKey: WebsiteApiKey) => void;
        revokingKeyId: string | null;
};

const LOADING_ROWS = [0, 1, 2];

function formatType(keyType: WebsiteApiKey["keyType"]) {
        return keyType === APIKeyType.PRIVATE ? "Private" : "Public";
}

function formatEnvironment(isTest: boolean) {
        return isTest ? "Test" : "Live";
}

function formatKeyPreview(keyValue: string | null) {
        if (!keyValue) {
                return "Hidden";
        }

        if (keyValue.length <= 12) {
                return keyValue;
        }

        return `${keyValue.slice(0, 6)}…${keyValue.slice(-4)}`;
}

export function ApiKeysTable({
        apiKeys,
        isLoading,
        onRequestRevoke,
        revokingKeyId,
}: ApiKeysTableProps) {
        const sortedKeys = useMemo(
                () =>
                        (apiKeys ?? []).slice().sort((a, b) => {
                                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        }),
                [apiKeys]
        );

        if (isLoading) {
                return (
                        <Table>
                                <TableHeader>
                                        <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Environment</TableHead>
                                                <TableHead>Key</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                </TableHeader>
                                <TableBody>
                                        {LOADING_ROWS.map((row) => (
                                                <TableRow key={row}>
                                                        <TableCell colSpan={5}>
                                                                <Skeleton className="h-9 w-full" />
                                                        </TableCell>
                                                </TableRow>
                                        ))}
                                </TableBody>
                        </Table>
                );
        }

        if (!sortedKeys.length) {
                return (
                        <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                                No API keys have been created yet. Generate a key below to get started.
                        </div>
                );
        }

        return (
                <Table>
                        <TableHeader>
                                <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Environment</TableHead>
                                        <TableHead>Key</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                        </TableHeader>
                        <TableBody>
                                {sortedKeys.map((apiKey) => {
                                        const isRevoked = !apiKey.isActive;
                                        const canCopy = Boolean(apiKey.key);

                                        return (
                                                <TableRow
                                                        key={apiKey.id}
                                                        className={cn({ "opacity-60": isRevoked })}
                                                >
                                                        <TableCell>
                                                                <div className="flex flex-col gap-1">
                                                                        <span className="font-medium">{apiKey.name}</span>
                                                                        <span className="text-muted-foreground text-xs">
                                                                                Created {new Date(apiKey.createdAt).toLocaleString()}
                                                                        </span>
                                                                </div>
                                                        </TableCell>
                                                        <TableCell>
                                                                <Badge variant="outline">{formatType(apiKey.keyType)}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                                <Badge variant={apiKey.isTest ? "secondary" : "default"}>
                                                                        {formatEnvironment(apiKey.isTest)}
                                                                </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                                <span
                                                                        className={cn(
                                                                                "font-mono text-sm",
                                                                                !canCopy && "text-muted-foreground"
                                                                        )}
                                                                >
                                                                        {formatKeyPreview(apiKey.key)}
                                                                </span>
                                                        </TableCell>
                                                        <TableCell>
                                                                <div className="flex items-center justify-end gap-2">
                                                                        <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                disabled={!canCopy}
                                                                                onClick={() => {
                                                                                        if (!apiKey.key) {
                                                                                                toast.error("This key cannot be copied.");
                                                                                                return;
                                                                                        }

                                                                                        copyToClipboardWithMeta(apiKey.key);
                                                                                        toast.success("API key copied to clipboard");
                                                                                }}
                                                                        >
                                                                                <Icon className="size-4" name="clipboard" />
                                                                                <span className="sr-only sm:not-sr-only">Copy</span>
                                                                        </Button>
                                                                        <Button
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                disabled={
                                                                                        isRevoked ||
                                                                                        revokingKeyId === apiKey.id
                                                                                }
                                                                                onClick={() => onRequestRevoke(apiKey)}
                                                                        >
                                                                                {revokingKeyId === apiKey.id ? (
                                                                                        <span>Revoking…</span>
                                                                                ) : (
                                                                                        <span>Revoke</span>
                                                                                )}
                                                                        </Button>
                                                                </div>
                                                        </TableCell>
                                                </TableRow>
                                        );
                                })}
                        </TableBody>
                </Table>
        );
}
