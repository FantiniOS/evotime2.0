import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { criarUsuario, listarUsuarios } from "@/actions/usuarioActions";

export async function GET() {
  try {
    const result = await listarUsuarios();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await criarUsuario(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Erro inesperado ao processar cadastro de usuário.",
      },
      { status: 500 }
    );
  }
}
