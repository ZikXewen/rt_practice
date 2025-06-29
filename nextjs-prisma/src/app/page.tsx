"use client";

import QuoteForm from "@/components/QuoteForm";
import QuotesList from "@/components/QuotesList";

export default function Home() {
  return (
    <div>
      <QuoteForm />
      <QuotesList />
    </div>
  );
}
