import { SignIn } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";
import { isClerkPublishableKeyConfigured } from "@/app/providers";

function SignInPage() {
  if (!isClerkPublishableKeyConfigured()) {
    return (
      <main className="page-shell">
        <div className="starter-card">
          <h1>Sign in</h1>
          <p>Set your Clerk keys in the frontend and backend env files before using auth routes.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="starter-card">
        <h1>Sign in</h1>
        <SignIn />
      </div>
    </main>
  );
}

export const Route = createFileRoute("/sign-in")({
  component: SignInPage
});
