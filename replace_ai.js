const fs = require('fs');
const file = 'c:\\Users\\micha\\.gemini\\antigravity\\scratch\\car-wash-timeclock\\src\\renderer.js';
let content = fs.readFileSync(file, 'utf8');

// Replace declarations
content = content.replace("const btnAiSchedule = document.getElementById('btn-ai-schedule');", 
`const aiFab = document.getElementById('ai-fab');
const aiChatPanel = document.getElementById('ai-chat-panel');
const btnCloseAi = document.getElementById('btn-close-ai');
const aiChatHistory = document.getElementById('ai-chat-history');
const aiChatInput = document.getElementById('ai-chat-input');
const btnSendAi = document.getElementById('btn-send-ai');`);

// Replace logic block
const startStr = "if (btnAiSchedule) {";
const endStr = "  });\n}";
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx) + endStr.length;

if (startIdx > -1 && endIdx > -1) {
  const newLogic = `if (aiFab) {
  aiFab.addEventListener('click', () => {
    aiChatPanel.classList.toggle('hidden');
  });
  btnCloseAi.addEventListener('click', () => {
    aiChatPanel.classList.add('hidden');
  });

  async function sendAiMessage(message) {
    const userMsg = document.createElement('div');
    userMsg.style = "background: var(--primary); padding: 10px; border-radius: 10px; color: white; align-self: flex-end; max-width: 85%; line-height: 1.4;";
    userMsg.textContent = message;
    aiChatHistory.appendChild(userMsg);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

    const typingMsg = document.createElement('div');
    typingMsg.style = "background: rgba(142, 68, 173, 0.1); border: 1px solid rgba(142, 68, 173, 0.3); padding: 10px; border-radius: 10px; color: var(--text-muted); align-self: flex-start; max-width: 85%; line-height: 1.4;";
    typingMsg.innerHTML = "<i>Thinking...</i>";
    aiChatHistory.appendChild(typingMsg);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

    const apiKey = localStorage.getItem('gemini_api_key') || 'AIzaSyAqMshZjG5cWnnn8DpfzJvGJQyFec9rnsY';

    let context = "";
    if (postScheduleSection && !postScheduleSection.classList.contains('hidden')) {
      const headers = Array.from(document.querySelectorAll('.schedule-header-input')).map(inp => inp.value || '-');
      const employees = [];
      document.querySelectorAll('#schedule-editor-body tr').forEach(tr => {
        employees.push(tr.querySelector('td strong').innerText);
      });
      context = \`CURRENT UI CONTEXT: The manager is viewing the Schedule Editor. Employees: \${employees.join(', ')}. Days: \${headers.join(', ')}. If asked to generate a schedule, return a JSON block in \\\`\\\`\\\`json format like [{"employee": "Name", "shifts": ["8:00-4:00", "-", "9:00-5:00", "9:00-5:00", "8:00-4:00", "-", "-"]}]. Give 30-40 hours total, 2 days off ("-").\`;
    }

    const promptText = \`You are a helpful AI assistant for Longhorn Car Wash.\\n\${context}\\n\\nUser says: \${message}\`;

    try {
      const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${apiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      let aiText = data.candidates[0].content.parts[0].text;
      
      const jsonMatch = aiText.match(/\\\`\\\`\\\`json\\n([\\s\\S]*?)\\n\\\`\\\`\\\`/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          const trs = document.querySelectorAll('#schedule-editor-body tr');
          trs.forEach(tr => {
            const empName = tr.querySelector('td strong').innerText;
            const empData = parsed.find(s => s.employee === empName);
            if (empData && empData.shifts) {
              const shiftInputs = tr.querySelectorAll('.sched-cell');
              shiftInputs.forEach((inp, idx) => {
                if (empData.shifts[idx]) inp.value = empData.shifts[idx];
              });
            }
          });
          aiText = aiText.replace(/\\\`\\\`\\\`json\\n[\\s\\S]*?\\n\\\`\\\`\\\`/, "✅ I've populated the schedule editor for you.");
        } catch(e) {}
      }

      typingMsg.innerHTML = aiText.replace(/\\n/g, '<br>');
      typingMsg.style.color = "var(--text)";
    } catch (err) {
      typingMsg.textContent = "Error: " + err.message;
      typingMsg.style.color = "var(--danger)";
    }
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
  }

  btnSendAi.addEventListener('click', () => {
    const msg = aiChatInput.value.trim();
    if (msg) {
      aiChatInput.value = '';
      sendAiMessage(msg);
    }
  });
  aiChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const msg = aiChatInput.value.trim();
      if (msg) {
        aiChatInput.value = '';
        sendAiMessage(msg);
      }
    }
  });
}`;
  content = content.substring(0, startIdx) + newLogic + content.substring(endIdx);
  fs.writeFileSync(file, content);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find bounds", startIdx, endIdx);
}
