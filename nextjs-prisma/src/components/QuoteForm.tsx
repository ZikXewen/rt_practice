"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { mutate } from "swr";

export default function QuoteForm() {
  const quoteRef = useRef<HTMLInputElement | null>(null);
  const authorRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const quote = quoteRef.current?.value || "";
    const author = authorRef.current?.value || "";

    if (!quote.length || !author.length) {
      alert("Please fill in both fields.");
      return;
    }

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
    <form
      onSubmit={onSubmit}
      className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700"
    >
      <h2 className="text-xl font-semibold text-gray-100 mb-4">
        Add a New Quote
      </h2>
      <div className="mb-4">
        <label htmlFor="quote-text" className="text-sm text-gray-300">
          Quote Text
        </label>
        <input
          id="quote-text"
          type="text"
          ref={quoteRef}
          placeholder="Enter the quote here"
          className="mt-2 w-full bg-gray-700 p-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 ring-blue-400 text-white"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="author" className="text-sm text-gray-300">
          Author
        </label>
        <input
          id="author"
          type="text"
          ref={authorRef}
          placeholder="Enter the author's name"
          className="mt-2 w-full bg-gray-700 p-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 ring-blue-400 text-white"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full p-2 mt-4 bg-blue-600 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer disabled:cursor-progress"
      >
        Submit
      </button>
    </form>
  );
}
