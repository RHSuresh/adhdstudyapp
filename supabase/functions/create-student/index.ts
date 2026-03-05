import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Create client with user's token to verify they're a parent
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a parent
    const { data: roleData } = await supabaseUser.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "parent").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Only parents can create student accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullName, email, password } = await req.json();
    if (!fullName || !email || !password) {
      return new Response(JSON.stringify({ error: "fullName, email, and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to create the student user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Create auth user with auto-confirm
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

    const studentId = newUser.user.id;

    // Create profile, role, stats, and parent link
    const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
      user_id: studentId,
      full_name: fullName,
    });
    if (profileErr) console.error("Profile error:", profileErr);

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: studentId,
      role: "student",
    });
    if (roleErr) console.error("Role error:", roleErr);

    const { error: statsErr } = await supabaseAdmin.from("student_stats").insert({
      user_id: studentId,
      points: 0,
      streak_days: 0,
      tasks_completed: 0,
    });
    if (statsErr) console.error("Stats error:", statsErr);

    // Link parent to student
    const { error: linkErr } = await supabaseAdmin.from("parent_student_links").insert({
      parent_id: caller.id,
      student_id: studentId,
    });
    if (linkErr) console.error("Link error:", linkErr);

    // Also link any teachers that are linked to the parent (for the super-admin flow)
    // Check if caller also has teacher role, if so auto-link
    const { data: teacherRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "teacher").maybeSingle();
    if (teacherRole) {
      await supabaseAdmin.from("teacher_student_links").insert({
        teacher_id: caller.id,
        student_id: studentId,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      studentId,
      message: `Student account created for ${fullName}` 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
