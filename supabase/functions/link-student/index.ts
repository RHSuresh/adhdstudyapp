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

    // Verify caller is a teacher
    const { data: roleData } = await supabaseUser.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "teacher").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Only teachers can link students" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Student email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin client to find user by email
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user by email
    const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      return new Response(JSON.stringify({ error: "Failed to look up user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const student = users.users.find(u => u.email === email);
    if (!student) {
      return new Response(JSON.stringify({ error: "No account found with that email" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify they're a student
    const { data: studentRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", student.id).eq("role", "student").maybeSingle();
    if (!studentRole) {
      return new Response(JSON.stringify({ error: "That account is not a student" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already linked
    const { data: existing } = await supabaseAdmin.from("teacher_student_links").select("id").eq("teacher_id", caller.id).eq("student_id", student.id).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Student is already linked to you" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create link
    const { error: linkErr } = await supabaseAdmin.from("teacher_student_links").insert({
      teacher_id: caller.id,
      student_id: student.id,
    });

    if (linkErr) {
      return new Response(JSON.stringify({ error: linkErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get student name
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("user_id", student.id).maybeSingle();

    return new Response(JSON.stringify({ 
      success: true, 
      studentName: profile?.full_name || email,
      message: `Successfully linked to ${profile?.full_name || email}` 
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
