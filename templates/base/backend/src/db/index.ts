import postgres from "postgres";

export async function getDatabaseHealth(connectionString: string) {
  try {
    const sql = postgres(connectionString, {
      max: 1,
      prepare: false
    });
    await sql`select 1`;
    await sql.end({ timeout: 1 });
    return {
      configured: true,
      connected: true
    };
  } catch {
    return {
      configured: true,
      connected: false
    };
  }
}
