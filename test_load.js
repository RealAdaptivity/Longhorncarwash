const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pbgatghmutejbsmcedsw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WwJQsA6iuQcMiCP6vZWMgw_71wB5smo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getStartOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0,0,0,0);
  return monday;
}

async function testLoad() {
  try {
    const { data: usersData, error: usersError } = await supabase.from('users').select('*');
    const { data: logsData, error: logsError } = await supabase.from('time_logs').select('*').order('created_at', { ascending: true });
    
    if (usersError || logsError) throw new Error('Fetch failed: ' + (usersError?.message || logsError?.message));

    const startOfWeek = getStartOfWeek().getTime();
    const employeeMap = {};
    usersData.forEach(u => {
      employeeMap[u.id] = { name: u.name, weekMs: [0,0,0,0,0,0,0], currentStatus: 'OUT', lastIn: null };
    });

    logsData.forEach(log => {
      const emp = employeeMap[log.user_id];
      if (!emp) return;

      const time = new Date(log.created_at).getTime();
      
      if (log.action === 'IN') {
        emp.currentStatus = 'IN';
        emp.lastIn = time;
      } else if (log.action === 'OUT') {
        if (emp.currentStatus === 'IN' && emp.lastIn) {
          const duration = time - emp.lastIn;
          if (emp.lastIn >= startOfWeek) {
            const dayIndex = (new Date(emp.lastIn).getDay() + 6) % 7;
            emp.weekMs[dayIndex] += duration;
          } else if (time >= startOfWeek) {
            emp.weekMs[0] += (time - startOfWeek);
          }
        }
        emp.currentStatus = 'OUT';
        emp.lastIn = null;
      }
    });

    console.log("Success! Map keys:", Object.keys(employeeMap).length);
  } catch (e) {
    console.error("FAIL:", e);
  }
}

testLoad();
