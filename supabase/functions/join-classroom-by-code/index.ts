import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidClassroomCode(code: string) {
  return /^[0-9]{6}$/.test(code);
}

function decodeJwtSubject(authHeader: string): string | null {
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = (bearerMatch ? bearerMatch[1] : authHeader).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = decodeJwtSubject(authHeader);
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Invalid authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "student")
      .maybeSingle();

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Only students can join classrooms by code" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    if (!code || !isValidClassroomCode(code)) {
      return new Response(JSON.stringify({ error: "code must be a 6-digit number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: classroom, error: classroomError } = await supabaseAdmin
      .from("classrooms")
      .select("id, name, teacher_id")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (classroomError) {
      return new Response(JSON.stringify({ error: classroomError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!classroom) {
      return new Response(JSON.stringify({ error: "Invalid or inactive classroom code" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingLink, error: existingLinkError } = await supabaseAdmin
      .from("classroom_students")
      .select("id")
      .eq("classroom_id", classroom.id)
      .eq("student_id", callerId)
      .maybeSingle();

    if (existingLinkError) {
      return new Response(JSON.stringify({ error: existingLinkError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const alreadyJoined = !!existingLink;

    if (!alreadyJoined) {
      const { error: membershipError } = await supabaseAdmin.from("classroom_students").insert({
        classroom_id: classroom.id,
        student_id: callerId,
        joined_via: "student_join",
      });

      if (membershipError) {
        return new Response(JSON.stringify({ error: membershipError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error: teacherLinkError } = await supabaseAdmin.from("teacher_student_links").upsert(
      {
        teacher_id: classroom.teacher_id,
        student_id: callerId,
      },
      {
        onConflict: "teacher_id,student_id",
        ignoreDuplicates: true,
      },
    );

    if (teacherLinkError) {
      return new Response(JSON.stringify({ error: teacherLinkError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        alreadyJoined,
        classroom: {
          id: classroom.id,
          name: classroom.name,
          teacherId: classroom.teacher_id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
