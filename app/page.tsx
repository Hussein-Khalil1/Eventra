import Link from "next/link";
import { BadgeCheck, CircleDollarSign, Sparkles } from "lucide-react";
import EventList from "@/components/EventList";

export default function Home() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-slate-50 text-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#fef3c7_0%,_transparent_55%)]" />
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-yellow-200/60 blur-3xl" />
        <div className="absolute -bottom-36 left-0 h-72 w-72 rounded-full bg-amber-100/80 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 sm:pt-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-sm uppercase tracking-[0.2em] text-slate-600 shadow-sm">
              Modern ticketing, minus the high fees
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Eventra gives organizers a low-fee, high-impact ticketing home.
            </h1>
            <p className="mt-6 text-lg text-slate-600 sm:text-xl">
              Eventra is a modern ticketing platform built for fast launches,
              clear payouts, and attendee-first checkout. Keep more revenue,
              move faster, and deliver the experience fans expect.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="mailto:h.khalilh7@gmail.com?subject=Eventra%20Demo"
                className="inline-flex items-center justify-center rounded-full bg-yellow-300 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 shadow-lg shadow-yellow-200/70 transition hover:bg-yellow-400"
              >
                Book a demo
              </a>
              <Link
                href="/features"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Our features
              </Link>
              <Link
                href="#events"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                See events
              </Link>
            </div>
          </div>
          <div id="features" className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Low platform fees",
                description:
                  "Transparent pricing that keeps more of each ticket in your pocket.",
                icon: CircleDollarSign,
              },
              {
                title: "Instantly ready",
                description:
                  "Launch events in minutes with real-time listings and updates.",
                icon: Sparkles,
              },
              {
                title: "Trusted checkout",
                description:
                  "Secure payments and instant ticket delivery for every attendee.",
                icon: BadgeCheck,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <item.icon className="h-8 w-8 text-yellow-500" />
                <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="events" className="bg-white">
        <EventList />
      </section>
    </div>
  );
}
