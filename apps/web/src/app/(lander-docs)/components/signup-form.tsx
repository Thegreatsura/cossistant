"use client";

import Link from "next/link";
import { useState } from "react";
import { BaseSubmitButton } from "@/components/ui/base-submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth/client";
import { GoogleIcon, GithubIcon } from "./login-form";

export function SignupForm() {
        const [displayEmailSignup, setDisplayEmailSignup] = useState(false);
        const [name, setName] = useState("");
        const [email, setEmail] = useState("");
        const [password, setPassword] = useState("");
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState("");

        const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

        const handleEmailSignUp = async (e: React.FormEvent) => {
                e.preventDefault();
                setError("");

                if (!(email.trim() && password.trim())) {
                        setError("Please enter your email and a password");
                        return;
                }

                setIsLoading(true);

                try {
                        const result = await signUp.email({
                                email: email.trim(),
                                password,
                                name: name.trim() || undefined,
                                callbackURL: `${baseURL}/select`,
                        });

                        if (result.error) {
                                setError("Unable to sign up with those credentials");
                        }
                } catch (_error) {
                        console.error("Email sign-up error:", _error);
                        setError("An error occurred during sign-up. Please try again.");
                } finally {
                        setIsLoading(false);
                }
        };

        const handleSocialSignUp = async (provider: "google" | "github") => {
                await signUp.social(
                        {
                                provider,
                                callbackURL: `${baseURL}/select`,
                        },
                        {
                                credentials: "include",
                        },
                );
        };

        return (
                <div className="flex w-md flex-col items-center justify-between gap-6">
                        <h1 className="font-f37-stout text-5xl">Create your account</h1>
                        {displayEmailSignup ? (
                                <div className="flex w-full max-w-md flex-col items-center justify-center space-y-4">
                                        <form
                                                className="mt-10 flex w-full flex-col items-center gap-2"
                                                onSubmit={handleEmailSignUp}
                                        >
                                                <p className="text-md text-primary/60">
                                                        Use your work email to get started
                                                </p>
                                                <Input
                                                        autoComplete="name"
                                                        disabled={isLoading}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder="Name (optional)"
                                                        type="text"
                                                        value={name}
                                                        variant="lg"
                                                />
                                                <Input
                                                        autoComplete="email"
                                                        disabled={isLoading}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        placeholder="Work email"
                                                        required
                                                        type="email"
                                                        value={email}
                                                        variant="lg"
                                                />
                                                <Input
                                                        autoComplete="new-password"
                                                        disabled={isLoading}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder="Password"
                                                        required
                                                        type="password"
                                                        value={password}
                                                        variant="lg"
                                                />
                                                {error && <p className="text-destructive text-sm">{error}</p>}
                                                <div className="flex w-full flex-col gap-2">
                                                        <BaseSubmitButton
                                                                className="mt-10 w-full"
                                                                disabled={
                                                                        isLoading ||
                                                                        !email.trim() ||
                                                                        !password.trim()
                                                                }
                                                                isSubmitting={isLoading}
                                                                size="lg"
                                                        >
                                                                Create account
                                                        </BaseSubmitButton>
                                                        <Button
                                                                className="w-full"
                                                                onClick={() => setDisplayEmailSignup(false)}
                                                                size="lg"
                                                                variant="outline"
                                                        >
                                                                Back
                                                        </Button>
                                                </div>
                                        </form>

                                        <div className="flex flex-col text-center">
                                                <p className="text-primary/60 text-sm">Already have an account?</p>
                                                <Link className="text-primary/60 text-sm underline" href="/login">
                                                        Log in
                                                </Link>
                                        </div>
                                </div>
                        ) : (
                                <div className="flex w-full max-w-md flex-col items-center justify-center space-y-4">
                                        <div className="mt-10 flex w-full max-w-md flex-col gap-2">
                                                <Button
                                                        className="w-full"
                                                        onClick={() => handleSocialSignUp("google")}
                                                        size="lg"
                                                        variant="outline"
                                                >
                                                        <GoogleIcon className="size-4" />
                                                        Continue with Google
                                                </Button>
                                                <Button
                                                        className="w-full"
                                                        onClick={() => handleSocialSignUp("github")}
                                                        size="lg"
                                                        variant="outline"
                                                >
                                                        <GithubIcon className="size-4" />
                                                        Continue with GitHub
                                                </Button>
                                        </div>

                                        <Button
                                                className="text-primary/60 text-sm underline"
                                                onClick={() => setDisplayEmailSignup(true)}
                                                size="sm"
                                                variant="ghost"
                                        >
                                                Use email instead
                                        </Button>

                                        <div className="flex flex-col text-center">
                                                <p className="text-primary/60 text-sm">Already have an account?</p>
                                                <Link className="text-primary/60 text-sm underline" href="/login">
                                                        Log in
                                                </Link>
                                        </div>
                                </div>
                        )}
                </div>
        );
}
