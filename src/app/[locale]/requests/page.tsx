import { AppShell } from "@/components/layout/AppShell";
import { PaymentStudio } from "@/components/payments/PaymentStudio";
import { SavedRequests } from "@/components/payments/SavedRequests";
export default function RequestsPage() { return <AppShell><PaymentStudio initialMode="request" initialRequest={{ to: "", amount: "", memo: "", reference: "" }} /><SavedRequests /></AppShell>; }
