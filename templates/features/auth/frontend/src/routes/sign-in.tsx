import { SignIn } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";

function SignInPage() {
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
