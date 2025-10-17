import { LoginForm } from "@/app/(lander-docs)/components/login-form";
import { generateSiteMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = generateSiteMetadata({
  title: "Sign in",
});

export default function LoginPage() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center border-primary/10 border-b border-dashed">
      <div className="flex w-1/2 items-center justify-center">
        <LoginForm />
      </div>
      <div className="flex h-full w-1/2 items-center justify-center border-primary/10 border-l border-dashed" />
    </div>
  );
}
