// Simplified email options - follows Dub.co pattern
// Based on Resend's CreateEmailOptions but simplified for our use case
export type ResendEmailOptions = {
	to: string | string[];
	from?: string;
	subject: string;
	variant?: "notifications" | "marketing";
	react?: React.ReactElement;
	text?: string;
	bcc?: string | string[];
	cc?: string | string[];
	replyTo?: string | string[];
	headers?: Record<string, string>;
	scheduledAt?: string;
	tags?: Array<{ name: string; value: string }>;
	attachments?: Array<{
		filename?: string;
		content?: Buffer | string;
	}>;
};

export type ResendBulkEmailOptions = ResendEmailOptions[];
