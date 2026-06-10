import { NextResponse } from "next/server";
import { getAnalysisDatabase } from "../../../../lib/analysis/database";
import { buildAnalysisProofArtifactForSession } from "../../../../lib/analysis/proof-artifact";
import { getCurrentSession } from "../../../../lib/auth/server";

type AnalysisProofRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: AnalysisProofRouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication is required to download this proof artifact." },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const artifact = await buildAnalysisProofArtifactForSession(
      getAnalysisDatabase(),
      session,
      id
    );

    if (!artifact) {
      return NextResponse.json(
        { error: "Analysis proof artifact was not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(artifact, {
      headers: {
        "Content-Disposition": `attachment; filename="${artifact.analysisId}-proof.json"`
      }
    });
  } catch (error) {
    console.error("Failed to build analysis proof artifact.", error);
    return NextResponse.json(
      { error: "Analysis proof artifact could not be generated." },
      { status: 500 }
    );
  }
}
