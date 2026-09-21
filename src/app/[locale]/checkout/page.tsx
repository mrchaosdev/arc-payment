import { PaymentStudio } from "@/components/payments/PaymentStudio";
import { TopBar } from "@/components/layout/TopBar";
import { isRequestId } from "@/lib/payments";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const first = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] ?? "" : v ?? "";
  const request = { to: first(query.to), amount: first(query.amount), memo: first(query.memo).slice(0, 120), reference: first(query.ref).slice(0, 48) };
  const id = first(query.id);
  const requestId = isRequestId(id) ? id.toLowerCase() : undefined;
  return <div className="checkout-page min-h-dvh"><TopBar workspace /><main className="checkout-main px-4 py-8 sm:px-8 sm:py-12"><PaymentStudio key={JSON.stringify({ request, requestId })} checkout requestId={requestId} initialMode="pay" initialRequest={request} /></main></div>;
}
