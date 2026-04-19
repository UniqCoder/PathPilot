import React from "react";
import type { ReactElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { apiError } from "@/lib/apiResponse";
import { findPaymentByToken } from "@/lib/paymentStore";
import ReportPdfDocument from "@/lib/pdf/ReportPdfDocument";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import type { FormPayload, ReportData } from "@/lib/types";

type ExportBody = {
  reportId?: string;
  token?: string;
};

type ReportRow = {
  id: string;
  created_at: string;
  profile: Partial<FormPayload> | null;
  report_data: ReportData;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportBody;
    const reportId = body.reportId?.trim();
    const token = body.token?.trim();

    if (!reportId || !token) {
      return apiError("Missing reportId or token", 400);
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const payment = await findPaymentByToken(token);
    if (!payment || !payment.verified || payment.reportId !== reportId) {
      return apiError("Invalid unlock token", 403);
    }

    if (payment.plan !== "full-roadmap-99" && payment.plan !== "shadow-you") {
      return apiError("Current plan does not allow PDF export", 403);
    }

    if (payment.expiresAt && new Date(payment.expiresAt).getTime() < new Date().getTime()) {
      return apiError("Unlock token expired", 403);
    }

    const { data, error } = await supabase
      .from("reports")
      .select("id,created_at,profile,report_data")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      return apiError("Report not found", 404);
    }

    const row = data as unknown as ReportRow;

    const documentElement = React.createElement(ReportPdfDocument, {
      report: row.report_data,
      profile: row.profile,
      reportId: row.id,
      createdAt: row.created_at,
    }) as unknown as ReactElement<DocumentProps>;

    const pdfBuffer = await renderToBuffer(documentElement);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=pathpilot-report-${row.id}.pdf`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export PDF";
    return apiError(message, 500);
  }
}
