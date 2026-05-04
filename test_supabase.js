const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pbgatghmutejbsmcedsw.supabase.co';
const supabaseKey = 'sb_publishable_WwJQsA6iuQcMiCP6vZWMgw_71wB5smo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('time_logs').select('*');
  console.log('Users Data:', data);
  console.log('Users Error:', error);
}

test();
