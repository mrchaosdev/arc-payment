import { AppShell } from "@/components/layout/AppShell";
import { PaymentStudio } from "@/components/payments/PaymentStudio";

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PayPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const request = { to: first(query.to), amount: first(query.amount), memo: first(query.memo).slice(0, 120), reference: first(query.ref).slice(0, 48) };

  return (
    <AppShell>
      <PaymentStudio
        key={JSON.stringify([query.mode, request])}
        initialMode={first(query.mode) === "request" ? "request" : "pay"}
        initialRequest={request}
      />
    </AppShell>
  );
}
