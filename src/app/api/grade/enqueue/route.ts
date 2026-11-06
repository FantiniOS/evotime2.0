import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enqueueSolverJob } from "@/lib/solver/jobStore";
import { getAuthenticatedTenantContext } from "@/lib/security/tenantAuth";

/**
 * POST /api/grade/enqueue
 * Arquitetura Assíncrona:
 * Não executa o cálculo pesado do Solver na mesma requisição HTTP para evitar timeouts na Vercel.
 * Enfileira a tarefa no Broker (Upstash QStash / Redis / Vercel Queues) e retorna imediatamente:
 * `{ status: "processing", job_id }`
 */
export async function POST(request: NextRequest) {
  try {
    let schoolId = "santa-maria";
    try {
      const claims = await getAuthenticatedTenantContext();
      schoolId = claims.schoolId;
    } catch {
      // Fallback para sessão demo se chamado antes do login completo
    }

    const body = await request.json().catch(() => ({}));
    const turma =
      typeof body.turma === "string" ? body.turma : "1º Ano A - Ensino Médio";
    const mode = body.mode === "unfeasible" ? "unfeasible" : "optimal";

    // 1. Cria e enfileira o Job de Otimização
    const job = enqueueSolverJob({
      school_id: schoolId,
      turma,
      mode,
    });

    // 2. Se Upstash QStash estiver configurado no ambiente, dispara a mensagem assíncrona para o Worker
    const qstashToken = process.env.QSTASH_TOKEN;
    const workerUrl =
      process.env.SOLVER_WORKER_URL ||
      `${request.nextUrl.origin}/api/grade/worker`;

    if (qstashToken) {
      fetch(`https://qstash.upstash.io/v2/publish/${workerUrl}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qstashToken}`,
          "Content-Type": "application/json",
          "Upstash-Retries": "3",
        },
        body: JSON.stringify({
          job_id: job.job_id,
          school_id: schoolId,
          turma,
          mode,
        }),
      }).catch(() => {
        // Fallback silencioso para processamento em memória
      });
    }

    return NextResponse.json(
      {
        status: "processing",
        job_id: job.job_id,
        school_id: schoolId,
        progress: job.progress,
        stageMessage: job.stageMessage,
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to enqueue solver job",
        message:
          error instanceof Error ? error.message : "Erro ao enfileirar tarefa.",
      },
      { status: 500 }
    );
  }
}
