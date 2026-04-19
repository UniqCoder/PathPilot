import { NextResponse } from "next/server";

export const apiSuccess = <T>(data: T, status = 200) =>
  NextResponse.json({ success: true, data }, { status });

export const apiError = (error: string, status = 500) =>
  NextResponse.json({ success: false, error }, { status });
