const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pbgatghmutejbsmcedsw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WwJQsA6iuQcMiCP6vZWMgw_71wB5smo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log("Fetching users to get an ID...");
  const users = await supabase.from('users').select('*').limit(1);
  if (!users.data || users.data.length === 0) {
    console.log("No users.");
    return;
  }
  const userId = users.data[0].id;
  console.log("User ID:", userId);

  console.log("Fetching employee logs...");
  const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
  console.log("Logs Data:", data ? data.length : 'null', "Error:", error);
}

test();
