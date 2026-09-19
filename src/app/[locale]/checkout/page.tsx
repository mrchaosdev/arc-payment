import { PaymentStudio } from "@/components/payments/PaymentStudio";
import { TopBar } from "@/components/layout/TopBar";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const first = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] ?? "" : v ?? "";
  const request = { to: first(query.to), amount: first(query.amount), memo: first(query.memo).slice(0, 120), reference: first(query.ref).slice(0, 48) };
  return <div className="checkout-page min-h-dvh"><TopBar workspace /><main className="checkout-main px-4 py-8 sm:px-8 sm:py-12"><PaymentStudio key={JSON.stringify(request)} checkout initialMode="pay" initialRequest={request} /></main></div>;
}
