import prisma from "@/lib/prisma";
import { json } from "@/lib/responses";
import { notFound } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params: { id } }: { params: { id: string } },
) {
  const quote = await prisma.quote.findUnique({ where: { id: +id } });

  if (!quote) return notFound();

  return json(quote);
}
