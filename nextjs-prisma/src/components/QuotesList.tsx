import fetcher from "@/lib/fetcher";
import { Quote } from "@prisma/client";
import useSWRInfinite from "swr/infinite";

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
  const isEnd =
    !quotes.length || ((data && data?.at(-1)?.length) || 0) < PAGE_SIZE;
  const isLoading = isValidating && data?.length === size;

  return (
    <div>
      <div>
        {quotes.map((q) => (
          <div>
            <p>{q.text}</p>
            <p>{q.author}</p>
            <p>{q.status}</p>
            <p>{q.rating}</p>
            <p>{new Date(q.submittedAt).toTimeString()}</p>
          </div>
        ))}
      </div>
      <button disabled={isLoading || isEnd} onClick={() => setSize(size + 1)}>
        Show More
      </button>
    </div>
  );
}
