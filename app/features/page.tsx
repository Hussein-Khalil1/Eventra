import { Metadata } from "next";
import {
  BadgeDollarSign,
  HandCoins,
  QrCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Eventra Features | Modern Ticketing Platform",
  description:
    "Discover Eventra's modern ticketing features: low fees, Stripe-powered payments, QR tickets, and easy attendee check-in.",
};

const features = [
  {
    title: "Fast attendee scanning",
    description:
      "Scan guests in seconds with streamlined check-in tools built for busy doors.",
    icon: ScanLine,
  },
  {
    title: "Low fees, clear pricing",
    description:
      "Keep more revenue with transparent pricing built to outperform legacy ticketing brands.",
    icon: BadgeDollarSign,
  },
  {
    title: "Stripe partner payments",
    description:
      "Trusted Stripe infrastructure means reliable, secure payments from every buyer.",
    icon: ShieldCheck,
  },
  {
    title: "Full payout control",
    description:
      "Manage payout timing and visibility so organizers always know where funds stand.",
    icon: HandCoins,
  },
  {
    title: "QR tickets on every order",
    description:
      "Each ticket includes a scannable QR code, generated and managed end-to-end by Eventra.",
    icon: QrCode,
  },
];

export default function FeaturesPage() {
  return (
    <div className="relative overflow-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#fef3c7_0%,_transparent_55%)]" />
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-yellow-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 left-0 h-72 w-72 rounded-full bg-amber-100/80 blur-3xl" />
      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pt-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-sm uppercase tracking-[0.2em] text-slate-600 shadow-sm">
            Features
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
            Everything you need to run a modern event.
          </h1>
          <p className="mt-6 text-lg text-slate-600 sm:text-xl">
            Eventra keeps ticketing simple while giving you pro-grade tools for
            check-in, payouts, and purchase confidence.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur"
            >
              <feature.icon className="h-8 w-8 text-yellow-500" />
              <h2 className="mt-4 text-xl font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
