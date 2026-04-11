import type { ExampleStatus } from "shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StarterCardProps = {
  status?: ExampleStatus;
  isLoading: boolean;
  error: string | null;
};

export function StarterCard({ status, isLoading, error }: StarterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Starter Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <p>Loading backend status...</p> : null}
        {error ? <p>{error}</p> : null}
        {status ? (
          <>
            <p>{status.message}</p>
            <p>Database configured: {status.database.configured ? "Yes" : "No"}</p>
            <p>Database connected: {status.database.connected ? "Yes" : "No"}</p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
