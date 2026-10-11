const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  const { email, dob, newPassword } = req.body;
  if (!email || !dob || !newPassword) return res.status(400).json({ error: "Missing required fields." });

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: "No account found with that email." });

    if (user.user_metadata?.date_of_birth !== dob) {
      return res.status(401).json({ error: "Date of Birth does not match our records." });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword
    });
    if (updateError) throw updateError;

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset Error:", error);
    return res.status(500).json({ error: "Failed to reset password." });
  }
};