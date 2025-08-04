import type { Quote } from "@prisma/client";

export default function QuoteCard({
  text,
  author,
  status,
  rating,
  submittedAt,
}: Quote) {
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  const starColor =
    status === "RATED"
      ? "text-yellow-500"
      : status === "PENDING"
        ? "text-gray-500"
        : "text-red-500";
  return (
    <div className="w-full bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-700 p-4">
      <p className="text-lg font-semibold text-gray-100">{text}</p>
      <div className="mt-3 text-sm text-gray-400 flex items-center justify-between">
        <span>- {author}</span>
        <span>{formatDate(submittedAt)}</span>
      </div>
      <div className={`mt-3 flex items-center space-x-1 ${starColor}`}>
        {[...Array(5)].map((_, index) => (
          <svg
            key={index}
            xmlns="http://www.w3.org/2000/svg"
            fill={index < rating ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            />
          </svg>
        ))}
      </div>
    </div>
  );
}
