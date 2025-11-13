// Using dynamic import to avoid circular dependency issues with folder name matching package name
// @ts-expect-error - Resend is properly exported from the package
import { Resend as ResendClient } from "resend";

// Create resend client instance or null if no API key
export const resend = process.env.RESEND_API_KEY
	? new ResendClient(process.env.RESEND_API_KEY)
	: null;
