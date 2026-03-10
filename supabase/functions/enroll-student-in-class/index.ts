import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client for the calling user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a parent
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "parent")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Only parents can enroll students" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, studentId } = await req.json();

    if (!code || !studentId) {
      return new Response(JSON.stringify({ error: "code and studentId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify student is the parent's child
    const { data: link } = await supabaseAdmin
      .from("parent_student_links")
      .select("id")
      .eq("parent_id", user.id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (!link) {
      return new Response(JSON.stringify({ error: "This student is not linked to your account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the invite code
    const { data: inviteCode } = await supabaseAdmin
      .from("invite_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!inviteCode) {
      return new Response(JSON.stringify({ error: "Invalid invite code" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(inviteCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This invite code has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max_uses if set
    if (inviteCode.max_uses !== null) {
      const { count } = await supabaseAdmin
        .from("invite_code_uses")
        .select("id", { count: "exact", head: true })
        .eq("code_id", inviteCode.id);

      if ((count || 0) >= inviteCode.max_uses) {
        return new Response(JSON.stringify({ error: "This invite code has reached its maximum uses" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!inviteCode.class_id) {
      return new Response(JSON.stringify({ error: "This invite code is not associated with a class" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if student is already in the class
    const { data: existingEnrollment } = await supabaseAdmin
      .from("class_students")
      .select("id")
      .eq("class_id", inviteCode.class_id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existingEnrollment) {
      return new Response(JSON.stringify({ error: "Student is already enrolled in this class" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enroll student in class
    const { error: enrollError } = await supabaseAdmin
      .from("class_students")
      .insert({ class_id: inviteCode.class_id, student_id: studentId });

    if (enrollError) {
      return new Response(JSON.stringify({ error: "Failed to enroll student: " + enrollError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create teacher-student link if not exists
    const { data: existingTeacherLink } = await supabaseAdmin
      .from("teacher_student_links")
      .select("id")
      .eq("teacher_id", inviteCode.teacher_id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (!existingTeacherLink) {
      await supabaseAdmin.from("teacher_student_links").insert({
        teacher_id: inviteCode.teacher_id,
        student_id: studentId,
      });
    }

    // Record the code use
    await supabaseAdmin.from("invite_code_uses").insert({
      code_id: inviteCode.id,
      parent_id: user.id,
      student_id: studentId,
    });

    // Get class name for response
    const { data: classData } = await supabaseAdmin
      .from("classes")
      .select("name")
      .eq("id", inviteCode.class_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Student enrolled in ${classData?.name || "class"} successfully!`,
        className: classData?.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
