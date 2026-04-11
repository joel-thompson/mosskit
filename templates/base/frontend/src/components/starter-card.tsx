import type { ExampleStatus } from "shared";

type StarterCardProps = {
  status?: ExampleStatus;
  isLoading: boolean;
  error: string | null;
};

export function StarterCard({ status, isLoading, error }: StarterCardProps) {
  return (
    <section className="starter-card">
      <h2>Starter Status</h2>
      {isLoading ? <p>Loading backend status...</p> : null}
      {error ? <p>{error}</p> : null}
      {status ? (
        <dl>
          <div>
            <dt>Message</dt>
            <dd>{status.message}</dd>
          </div>
          <div>
            <dt>Database configured</dt>
            <dd>{status.database.configured ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Database connected</dt>
            <dd>{status.database.connected ? "Yes" : "No"}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
