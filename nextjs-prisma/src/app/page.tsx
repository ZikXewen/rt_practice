"use client";

import QuoteForm from "@/components/QuoteForm";
import QuotesList from "@/components/QuotesList";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-3">
      <QuoteForm />
      <QuotesList />
    </div>
  );
}
