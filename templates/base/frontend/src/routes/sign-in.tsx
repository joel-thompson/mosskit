import { createFileRoute, Link } from "@tanstack/react-router";

function SignInFallback() {
  return (
    <main className="page-shell">
      <div className="starter-card">
        <h1>Authentication is not enabled</h1>
        <p>Recreate this project with the auth option to install Clerk.</p>
        <Link to="/">Back home</Link>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/sign-in")({
  component: SignInFallback
});
