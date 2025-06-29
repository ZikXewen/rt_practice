import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { mutate } from "swr";

export default function QuoteForm() {
  `use client`;
  const quoteRef = useRef<HTMLInputElement | null>(null);
  const authorRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const onSubmit = async () => {
    const quote = quoteRef.current?.value || "";
    const author = authorRef.current?.value || "";

    if (!quote.length || !author.length) return;

    setSubmitting(true);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quote,
        author,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      mutate(`/api/quotes/${data.id}`, data);
      router.push(`/quote/${data.id}`);
    } else {
      setSubmitting(false);
      console.error(res);
    }
  };

  return (
    <div>
      <input type="text" ref={quoteRef} />
      <input type="text" ref={authorRef} />
      <button onClick={onSubmit} disabled={submitting}>
        Submit
      </button>
    </div>
  );
}
