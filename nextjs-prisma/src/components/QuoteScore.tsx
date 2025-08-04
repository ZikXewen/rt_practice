"use client";

import fetcher from "@/lib/fetcher";
import type { Quote } from "@prisma/client";
import { useEffect } from "react";
import useSWR from "swr";
import QuoteCard from "./QuoteCard";

export default function QuoteScore({ id }: { id: number }) {
  const { data, error, mutate } = useSWR<Quote>(`/api/quotes/${id}`, fetcher);

  useEffect(() => {
    const sse = new EventSource(`${process.env.NEXT_PUBLIC_RT_URL}/${id}`);
    sse.onmessage = (ev) => {
      console.log(ev.data)
      const data = JSON.parse(ev.data);
      console.log(data)
      mutate((old) => ({ ...old, ...data }), { revalidate: false });
      sse.close();
    };

    return () => sse.close();
  }, [id, mutate]);

  if (error) {
    console.error(error);
    return "Errored!";
  }

  if (!data) return "Loading...";

  return (
    <QuoteCard
      id={data.id}
      text={data.text}
      author={data.author}
      status={data.status}
      rating={data.rating}
      submittedAt={data.submittedAt}
    />
  );
}
