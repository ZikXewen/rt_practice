import prisma from "@/lib/prisma";
import { badRequest, json } from "@/lib/responses";
import { ListSchema, SubmitSchema } from "@/lib/schema";
import { type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const parsed = ListSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    console.error(parsed.error);
    return badRequest();
  }

  const { limit, cursor } = parsed.data;

  const data = await prisma.quote.findMany({
    take: limit,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { id: "desc" },
  });

  const nextCursor = data.at(-1)?.id;

  return json({ data, nextCursor });
}

export async function POST(req: NextRequest) {
  const parsed = SubmitSchema.safeParse(await req.json());
  if (!parsed.success) {
    console.error(parsed.error);
    return badRequest();
  }

  const data = await prisma.quote.create({
    data: {
      text: parsed.data.quote,
      author: parsed.data.author,
    },
    select: { id: true },
  });

  return json(data);
}
