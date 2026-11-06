import React from "react";
import { createClient } from "@/utils/supabase/server";
import ExecutiveDashboard from "@/components/ExecutiveDashboard";
import { SchoolTenant } from "@/lib/schoolData";

export const dynamic = "force-dynamic";

/**
 * Server Component: HomePage (Página Inicial /)
 * Arquitetura Server-to-Client:
 * - Executa as queries iniciais no Supabase no servidor de forma assíncrona.
 * - Garante serialização estrita de todos os tipos primitivos (sem Date instances ou funções).
 * - Renderiza o Client Component ExecutiveDashboard passando dados limpos como props.
 */
export default async function HomePage() {
  const supabase = await createClient();

  let initialSchools: SchoolTenant[] = [];
  let teachersCount = 0;
  let classesCount = 0;

  // 1. Busca instituições cadastradas
  try {
    const { data: schoolsData, error: schoolsError } = await supabase
      .from("escolas")
      .select("id, nome, subtitulo, modelo_ensino, cnpj_ou_inep, cidade, plano_badge, logo_data_url")
      .order("created_at", { ascending: false });

    if (schoolsError) {
      console.error(
        "Erro no Supabase ao listar escolas no Server Component da Home:",
        schoolsError
      );
    } else if (schoolsData && schoolsData.length > 0) {
      initialSchools = (schoolsData || []).map((row: any) => ({
        id: String(row.id),
        name: String(row.nome || "Instituição de Ensino"),
        subtitle: String(
          row.subtitulo || row.modelo_ensino || "Instituição de Ensino"
        ),
        cnpjOrInep: String(row.cnpj_ou_inep || ""),
        educationModel: (row.modelo_ensino ||
          "Ensino Fundamental e Médio") as any,
        city: String(row.cidade || "Brasil"),
        planBadge: String(row.plano_badge || "Plano Ativo"),
        classesCount: 0,
        studentsCount: 0,
        logoDataUrl: row.logo_data_url ? String(row.logo_data_url) : undefined,
      }));
    }
  } catch (err) {
    console.error("Exceção ao listar escolas na Home:", err);
  }

  // 2. Busca contagem de professores cadastrados
  try {
    const { count: tCount, error: tError } = await supabase
      .from("professores")
      .select("*", { count: "exact", head: true });

    if (!tError && typeof tCount === "number") {
      teachersCount = tCount;
    }
  } catch {
    // Fallback silencioso para contagem local
  }

  // 3. Busca contagem de turmas cadastradas
  try {
    const { count: cCount, error: cError } = await supabase
      .from("turmas")
      .select("*", { count: "exact", head: true });

    if (!cError && typeof cCount === "number") {
      classesCount = cCount;
    }
  } catch {
    // Fallback silencioso para contagem local
  }

  return (
    <ExecutiveDashboard
      initialSchools={initialSchools}
      initialStats={{
        teachersCount,
        classesCount,
      }}
    />
  );
}
