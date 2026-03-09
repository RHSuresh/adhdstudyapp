import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidClassroomCode(code: string) {
  return /^[0-9]{6}$/.test(code);
}

function decodeJwtSubject(authHeader: string): string | null {
  const token = authHeader.replace("Bearer ", "").trim();
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
    const authHeader = req.headers.get("Authorization");
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
      .eq("role", "parent")
      .maybeSingle();

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Only parents can create student accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullName, email, password, classroomCode } = await req.json();
    if (!fullName || !email || !password) {
      return new Response(JSON.stringify({ error: "fullName, email, and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let classroom: { id: string; teacher_id: string } | null = null;
    if (classroomCode) {
      if (!isValidClassroomCode(classroomCode)) {
        return new Response(JSON.stringify({ error: "classroomCode must be a 6-digit number" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: classroomData, error: classroomError } = await supabaseAdmin
        .from("classrooms")
        .select("id, teacher_id")
        .eq("code", classroomCode)
        .eq("is_active", true)
        .maybeSingle();

      if (classroomError) {
        return new Response(JSON.stringify({ error: classroomError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!classroomData) {
        return new Response(JSON.stringify({ error: "Invalid or inactive classroom code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      classroom = classroomData;
    }

    let studentId: string | null = null;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "student" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    studentId = newUser.user.id;

    try {
      const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
        user_id: studentId,
        full_name: fullName,
      });
      if (profileErr) throw profileErr;

      const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
        user_id: studentId,
        role: "student",
      });
      if (roleErr) throw roleErr;

      const { error: statsErr } = await supabaseAdmin.from("student_stats").insert({
        user_id: studentId,
        points: 0,
        streak_days: 0,
        tasks_completed: 0,
      });
      if (statsErr) throw statsErr;

      const { error: parentLinkErr } = await supabaseAdmin.from("parent_student_links").insert({
        parent_id: callerId,
        student_id: studentId,
      });
      if (parentLinkErr) throw parentLinkErr;

      if (classroom) {
        const { error: classroomLinkErr } = await supabaseAdmin.from("classroom_students").insert({
          classroom_id: classroom.id,
          student_id: studentId,
          joined_via: "parent_signup",
        });
        if (classroomLinkErr) throw classroomLinkErr;

        const { error: teacherLinkErr } = await supabaseAdmin.from("teacher_student_links").upsert(
          {
            teacher_id: classroom.teacher_id,
            student_id: studentId,
          },
          {
            onConflict: "teacher_id,student_id",
            ignoreDuplicates: true,
          },
        );
        if (teacherLinkErr) throw teacherLinkErr;
      }
    } catch (writeError) {
      if (studentId) {
        await supabaseAdmin.auth.admin.deleteUser(studentId);
      }
      return new Response(JSON.stringify({ error: (writeError as Error).message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        studentId,
        joinedClassroom: !!classroom,
        classroomId: classroom?.id ?? null,
        message: `Student account created for ${fullName}`,
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
