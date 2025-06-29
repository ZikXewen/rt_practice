import { NextResponse } from "next/server";

export function badRequest(msg = "Bad Request") {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export function json<T = unknown>(data: T) {
  return NextResponse.json(data);
}
