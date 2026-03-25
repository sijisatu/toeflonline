import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CalculateScoreRequest {
  sessionId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId }: CalculateScoreRequest = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("test_sessions")
      .select("user_id, package_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: sections, error: sectionsError } = await supabase
      .from("test_sections")
      .select("id, title")
      .eq("package_id", session.package_id)
      .order("section_order");

    if (sectionsError) throw sectionsError;

    const scores: Record<string, number> = {
      listening: 0,
      structure: 0,
      reading: 0,
    };

    for (const section of sections || []) {
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id, correct_answer")
        .eq("section_id", section.id);

      if (questionsError) throw questionsError;

      let correctCount = 0;
      const totalQuestions = questions?.length || 0;

      for (const question of questions || []) {
        const { data: answer } = await supabase
          .from("user_answers")
          .select("selected_answer")
          .eq("session_id", sessionId)
          .eq("question_id", question.id)
          .maybeSingle();

        if (answer && answer.selected_answer === question.correct_answer) {
          correctCount++;
        }
      }

      const percentage = totalQuestions > 0 ? correctCount / totalQuestions : 0;
      const scaledScore = Math.round(31 + percentage * 37);

      const sectionKey = section.title.toLowerCase().includes("listening")
        ? "listening"
        : section.title.toLowerCase().includes("structure")
        ? "structure"
        : "reading";

      scores[sectionKey] = scaledScore;
    }

    const totalScore = Math.round(
      ((scores.listening + scores.structure + scores.reading) / 3) * 10
    );

    const { data: certificate, error: certificateError } = await supabase
      .from("certificates")
      .upsert(
        [
          {
            session_id: sessionId,
            user_id: session.user_id,
            package_id: session.package_id,
            listening_score: scores.listening,
            structure_score: scores.structure,
            reading_score: scores.reading,
            total_score: totalScore,
          },
        ],
        {
          onConflict: "session_id",
        }
      )
      .select()
      .single();

    if (certificateError) throw certificateError;

    return new Response(
      JSON.stringify({
        success: true,
        certificate,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error calculating score:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
