import { SignupForm } from "@/app/(lander-docs)/components/signup-form";
import { generateSiteMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = generateSiteMetadata({
        title: "Sign up",
});

export default function SignupPage() {
        return (
                <div className="flex h-[80vh] w-full items-center justify-center border-primary/10 border-b border-dashed">
                        <div className="flex w-1/2 items-center justify-center">
                                <SignupForm />
                        </div>
                        <div className="flex h-full w-1/2 items-center justify-center border-primary/10 border-l border-dashed" />
                </div>
        );
}
