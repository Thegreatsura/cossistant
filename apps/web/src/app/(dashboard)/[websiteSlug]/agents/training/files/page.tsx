"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Icon from "@/components/ui/icons";
import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
} from "@/components/ui/layout/settings-layout";

export default function FilesPage() {
	return (
		<SettingsPage>
			<SettingsHeader>Files</SettingsHeader>
			<PageContent className="py-6">
				<Card className="border-dashed">
					<CardHeader>
						<div className="flex items-center gap-2">
							<CardTitle>File Upload</CardTitle>
							<Badge variant="secondary">Coming Soon</Badge>
						</div>
						<CardDescription>
							Upload documents to train your AI agent on your internal
							documentation and knowledge base.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Icon
							className="mb-4 size-12 text-muted-foreground/50"
							name="file"
						/>
						<p className="mb-2 text-center font-medium">
							File upload is coming soon
						</p>
						<p className="max-w-md text-center text-muted-foreground text-sm">
							You'll be able to upload PDF documents, Word files, and text files
							to train your AI agent on your internal documentation.
						</p>
						<div className="mt-4 flex flex-wrap justify-center gap-2">
							<Badge variant="outline">PDF</Badge>
							<Badge variant="outline">DOCX</Badge>
							<Badge variant="outline">TXT</Badge>
							<Badge variant="outline">MD</Badge>
						</div>
					</CardContent>
				</Card>
			</PageContent>
		</SettingsPage>
	);
}
