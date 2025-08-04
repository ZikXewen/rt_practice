import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import QuoteScore from "@/components/QuoteScore";

export default async function QuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const id = +(await params).quoteId;
  const quote = await prisma.quote.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!quote) notFound();

  return <QuoteScore id={id} />;
}
