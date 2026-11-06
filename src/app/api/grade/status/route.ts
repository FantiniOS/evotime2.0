import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSolverJobState } from "@/lib/solver/jobStore";

/**
 * GET /api/grade/status?job_id=...
 * Endpoint consultado via Polling a cada 3 segundos pela tela /grade.
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("job_id");

  if (!jobId) {
    return NextResponse.json(
      { error: "Parâmetro job_id é obrigatório." },
      { status: 400 }
    );
  }

  const jobState = getSolverJobState(jobId);

  if (!jobState) {
    return NextResponse.json(
      { error: "Job não encontrado ou expirado.", job_id: jobId },
      { status: 404 }
    );
  }

  return NextResponse.json(jobState, { status: 200 });
}
