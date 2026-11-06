import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSolverJobFromWorker } from "@/lib/solver/jobStore";

/**
 * POST /api/grade/worker
 * Worker consumindo a fila de mensagens (Upstash QStash / Vercel Queues)
 * e delegando o cálculo pesado ao microserviço Python com Google OR-Tools (CP-SAT).
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { job_id, school_id, turma, mode, constraints } = payload;

    if (!job_id) {
      return NextResponse.json(
        { error: "job_id ausente no payload do Worker." },
        { status: 400 }
      );
    }

    const pythonSolverUrl = process.env.SOLVER_PYTHON_URL;

    // Se o microserviço Python OR-Tools externo estiver configurado, repassa as Hard e Soft Constraints
    if (pythonSolverUrl) {
      const response = await fetch(`${pythonSolverUrl}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id,
          school_id,
          turma,
          mode,
          hard_constraints: {
            no_teacher_overlap: true,
            respect_unavailable_slots: true,
            fulfill_exact_curriculum_hours: true,
          },
          soft_constraints: {
            avoid_teacher_gaps: constraints?.avoidGaps ?? true,
            max_two_consecutive_same_subject:
              constraints?.enforceMaxTwoConsecutive ?? true,
            decision_balance_slider: constraints?.decisionBalance ?? 55,
          },
        }),
      });

      const solverResult = await response.json();

      if (solverResult.status === "INFEASIBLE") {
        updateSolverJobFromWorker(job_id, {
          status: "unfeasible",
          progress: 100,
          stageMessage:
            "Inviabilidade matemática detectada pelo Google OR-Tools (INFEASIBLE).",
          unfeasibleReport: solverResult.unfeasibleReport,
        });
      } else {
        updateSolverJobFromWorker(job_id, {
          status: "completed",
          progress: 100,
          stageMessage: "Solução Ótima Encontrada (CP-SAT OPTIMAL)!",
          metrics: solverResult.metrics,
        });
      }
    }

    return NextResponse.json({
      acknowledged: true,
      job_id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro no processamento do Worker",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
