"use server";

import {
  getAuthenticatedTenantContext,
  assertAuthorizedRole,
  enforceServerTenantId,
  buildTenantScopedQuery,
} from "@/lib/security/tenantAuth";
import type { ActionResponse } from "@/types/actions";

/**
 * 1. QUERY (GET) SEGURA MULTI-TENANT
 * Busca registros de uma das 4 tabelas principais (turmas, disciplinas, professores, grade)
 * usando EXCLUSIVAMENTE o `school_id` extraído do token JWT do usuário autenticado.
 */
export async function listTenantRecordsAction(
  table: "turmas" | "disciplinas" | "professores" | "grade"
): Promise<ActionResponse> {
  try {
    const claims = await getAuthenticatedTenantContext();

    // Qualquer usuário autenticado da escola (LEITOR, PROFESSOR, COORDENADOR, ADMIN) pode consultar
    assertAuthorizedRole(
      claims,
      ["ADMIN", "COORDENADOR", "PROFESSOR", "LEITOR"],
      `Listar ${table}`
    );

    const query = buildTenantScopedQuery(
      claims,
      `SELECT * FROM public.${table} WHERE school_id = $1 ORDER BY created_at DESC`
    );

    return {
      success: true,
      enforcedSchoolId: claims.schoolId,
      data: {
        table,
        queryDescriptor: query,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao consultar dados.",
    };
  }
}

/**
 * 2. MUTATION (POST/PUT) • SALVAR CONFIGURAÇÕES DE TURNO E REGRAS DA IA
 * Exige obrigatoriamente que o usuário tenha a role 'COORDENADOR' ou 'ADMIN'.
 * Ignora qualquer `school_id` enviado no body pelo cliente.
 */
export async function saveSchoolShiftSettingsAction(
  clientPayload: Record<string, unknown>
): Promise<ActionResponse> {
  try {
    const claims = await getAuthenticatedTenantContext();

    // Validação estrita de nível de acesso antes de gravar configurações de turno
    assertAuthorizedRole(
      claims,
      ["COORDENADOR", "ADMIN"],
      "Salvar Configurações de Turno e Motor IA"
    );

    // Blindagem: remove qualquer school_id vindo do cliente e injeta o school_id do JWT
    const safeData = enforceServerTenantId(clientPayload, claims);

    const query = buildTenantScopedQuery(
      claims,
      `UPDATE public.schools_config
          SET shifts = $2::jsonb,
              include_saturdays = $3,
              ai_rules = $4::jsonb,
              updated_by = $5,
              updated_at = NOW()
        WHERE school_id = $1`,
      [
        JSON.stringify(safeData.shifts ?? {}),
        Boolean(safeData.includeSaturdays),
        JSON.stringify(safeData.aiRules ?? {}),
        claims.userId,
      ]
    );

    return {
      success: true,
      enforcedSchoolId: claims.schoolId,
      data: {
        updatedBy: claims.userId,
        roleVerified: claims.role,
        queryDescriptor: query,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Operação não autorizada para este perfil.",
    };
  }
}

/**
 * 3. MUTATION (POST/PUT) • CRIAR OU ATUALIZAR ENTIDADE (TURMAS, DISCIPLINAS, PROFESSORES, GRADE)
 * Exige role 'COORDENADOR' ou 'ADMIN' e força `school_id` a partir do token JWT do servidor.
 */
export async function upsertTenantEntityAction(
  table: "turmas" | "disciplinas" | "professores" | "grade",
  clientPayload: Record<string, unknown>
): Promise<ActionResponse> {
  try {
    const claims = await getAuthenticatedTenantContext();

    assertAuthorizedRole(
      claims,
      ["COORDENADOR", "ADMIN"],
      `Gravar registro em ${table}`
    );

    const safeRecord = enforceServerTenantId(clientPayload, claims);

    const query = buildTenantScopedQuery(
      claims,
      `INSERT INTO public.${table} (school_id, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       RETURNING id, school_id`,
      [JSON.stringify(safeRecord)]
    );

    return {
      success: true,
      enforcedSchoolId: claims.schoolId,
      data: {
        table,
        roleVerified: claims.role,
        record: safeRecord,
        queryDescriptor: query,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro de permissão ao gravar.",
    };
  }
}

/**
 * 4. MUTATION (DELETE) • EXCLUIR REGISTRO COM TRAVA DUPLA (ID DO REGISTRO + SCHOOL_ID DO JWT)
 * Mesmo que um usuário mal-intencionado envie o UUID de uma turma de outra escola,
 * a cláusula `WHERE id = $2 AND school_id = $1` + política RLS impedem a deleção.
 */
export async function deleteTenantEntityAction(
  table: "turmas" | "disciplinas" | "professores" | "grade",
  recordId: string
): Promise<ActionResponse> {
  try {
    const claims = await getAuthenticatedTenantContext();

    assertAuthorizedRole(
      claims,
      ["COORDENADOR", "ADMIN"],
      `Excluir registro de ${table}`
    );

    const query = buildTenantScopedQuery(
      claims,
      `DELETE FROM public.${table} WHERE school_id = $1 AND id = $2`,
      [recordId]
    );

    return {
      success: true,
      enforcedSchoolId: claims.schoolId,
      data: {
        deletedId: recordId,
        roleVerified: claims.role,
        queryDescriptor: query,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Erro ao excluir registro.",
    };
  }
}
