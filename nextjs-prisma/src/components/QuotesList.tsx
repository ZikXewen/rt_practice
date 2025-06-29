import fetcher from "@/lib/fetcher";
import { Quote } from "@prisma/client";
import useSWRInfinite from "swr/infinite";
import QuoteCard from "./QuoteCard";

const PAGE_SIZE = 10;

const getKey = (id: number, prev: { data: Quote[]; nextCursor?: number }) => {
  if (prev && !prev.data) return null;
  if (!id) return `/api/quotes?limit=${PAGE_SIZE}`;
  return `/api/quotes?limit=${PAGE_SIZE}&cursor=${prev.nextCursor}`;
};

export default function QuotesList() {
  const {
    data: rawData,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<{ data: Quote[] }>(getKey, fetcher);
  const data = rawData?.map(({ data }) => data);
  const quotes = data?.flat() || [];
  const isEnd = !quotes.length || (data?.at(-1)?.length || 0) < PAGE_SIZE;
  const isLoading = isValidating && data?.length === size;

  return (
    <div>
      <div className="flex flex-col gap-3">
        {quotes.map((q) => (
          <QuoteCard {...q} key={q.id}/>
        ))}
      </div>
      <button
        hidden={isEnd}
        disabled={isLoading}
        onClick={() => setSize(size + 1)}
        className="mt-3 w-full p-2 bg-gray-800 shadow-md rounded-lg border border-gray-700 hover:bg-gray-700 cursor-pointer disabled:cursor-progress transition-colors duration-200"
      >
        Show More
      </button>
    </div>
  );
}
