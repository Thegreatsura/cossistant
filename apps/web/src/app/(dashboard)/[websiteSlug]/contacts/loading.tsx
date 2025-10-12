import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
        return (
                <Page className="relative flex flex-col gap-6">
                        <PageHeader className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                                <PageHeaderTitle>Contacts</PageHeaderTitle>
                        </PageHeader>
                        <div className="mt-2 flex flex-col gap-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="w-full max-w-md space-y-2">
                                                <Skeleton className="h-10 w-full" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground text-sm">Rows per page</span>
                                                <Skeleton className="h-10 w-[90px]" />
                                        </div>
                                </div>
                                <div className="overflow-hidden rounded-md border border-primary/10">
                                        <div className="bg-muted/40 p-4">
                                                <Skeleton className="h-5 w-1/4" />
                                        </div>
                                        <div className="divide-y divide-border">
                                                {Array.from({ length: 5 }).map((_, index) => (
                                                        <div key={index} className="px-4 py-4">
                                                                <Skeleton className="h-5 w-full" />
                                                        </div>
                                                ))}
                                        </div>
                                </div>
                                <div className="flex flex-col items-center justify-between gap-3 rounded-md border border-primary/10 bg-background/60 px-4 py-3 sm:flex-row">
                                        <Skeleton className="h-4 w-48" />
                                        <div className="flex items-center gap-2">
                                                <Skeleton className="h-9 w-20" />
                                                <Skeleton className="h-4 w-10" />
                                                <Skeleton className="h-9 w-20" />
                                        </div>
                                </div>
                        </div>
                </Page>
        );
}
