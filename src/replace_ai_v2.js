const fs = require('fs');

// --- Modify index.html ---
const indexFile = 'c:\\Users\\micha\\.gemini\\antigravity\\scratch\\car-wash-timeclock\\src\\index.html';
let indexContent = fs.readFileSync(indexFile, 'utf8');

// Add hidden class to ai-fab if it doesn't have one
indexContent = indexContent.replace('id="ai-fab" style=', 'id="ai-fab" class="hidden" style=');

// Add image preview UI and upload button to ai-chat-panel
const originalInputArea = `<div style="padding: 15px; border-top: 1px solid var(--border); display: flex; gap: 10px;">
          <input type="text" id="ai-chat-input"`;

const newInputArea = `<div id="ai-image-preview-container" class="hidden" style="padding: 5px 15px; background: rgba(0,0,0,0.2); border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
          <span id="ai-image-preview-name" style="font-size: 0.8rem; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
          <button id="btn-remove-ai-image" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.2rem;">✖</button>
        </div>
        <div style="padding: 15px; border-top: 1px solid var(--border); display: flex; gap: 10px; align-items: center;">
          <input type="file" id="ai-chat-file" accept="image/*" style="display: none;" />
          <button id="btn-upload-ai" class="btn-ghost" style="padding: 5px; font-size: 1.2rem; cursor: pointer; border: none; color: var(--text-muted); background: none;" title="Upload Image">📷</button>
          <input type="text" id="ai-chat-input"`;

if (indexContent.includes(originalInputArea)) {
  indexContent = indexContent.replace(originalInputArea, newInputArea);
}
fs.writeFileSync(indexFile, indexContent);


// --- Modify renderer.js ---
const file = 'c:\\Users\\micha\\.gemini\\antigravity\\scratch\\car-wash-timeclock\\src\\renderer.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace the top declaration
const origDecl = "const btnAiSchedule = document.getElementById('btn-ai-schedule');";
const newDecl = `const aiFab = document.getElementById('ai-fab');
const aiChatPanel = document.getElementById('ai-chat-panel');
const btnCloseAi = document.getElementById('btn-close-ai');
const aiChatHistory = document.getElementById('ai-chat-history');
const aiChatInput = document.getElementById('ai-chat-input');
const btnSendAi = document.getElementById('btn-send-ai');
const btnUploadAi = document.getElementById('btn-upload-ai');
const aiChatFile = document.getElementById('ai-chat-file');
const aiImagePreviewContainer = document.getElementById('ai-image-preview-container');
const aiImagePreviewName = document.getElementById('ai-image-preview-name');
const btnRemoveAiImage = document.getElementById('btn-remove-ai-image');

let aiSelectedImageBase64 = null;
let aiSelectedImageMime = null;`;

if (content.includes(origDecl)) {
  content = content.replace(origDecl, newDecl);
}

// 2. Add aiFab visibility toggle in switchView
const switchViewStr = "function switchView(view) {";
if (content.includes(switchViewStr) && !content.includes("aiFab.classList.toggle('hidden', view !== 'manager' && view !== 'schedule');")) {
    const aiToggleStr = `\n  if (typeof aiFab !== 'undefined' && aiFab) { aiFab.classList.toggle('hidden', view !== 'manager' && view !== 'schedule'); }`;
    content = content.replace(switchViewStr, switchViewStr + aiToggleStr);
}

// 3. Replace the old btnAiSchedule block with the new aiFab chat block
const startStr = "if (btnAiSchedule) {";
const endStr = "  });\n}";
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx);

if (startIdx > -1 && endIdx > -1) {
  const newLogic = `if (aiFab) {
  aiFab.addEventListener('click', () => {
    aiChatPanel.classList.toggle('hidden');
  });
  btnCloseAi.addEventListener('click', () => {
    aiChatPanel.classList.add('hidden');
  });

  // Image Upload Handlers
  btnUploadAi.addEventListener('click', () => {
    aiChatFile.click();
  });

  aiChatFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target.result;
        const [meta, base64] = result.split(',');
        aiSelectedImageMime = meta.match(/:(.*?);/)[1];
        aiSelectedImageBase64 = base64;
        
        aiImagePreviewName.textContent = file.name;
        aiImagePreviewContainer.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  btnRemoveAiImage.addEventListener('click', () => {
    aiSelectedImageBase64 = null;
    aiSelectedImageMime = null;
    aiChatFile.value = '';
    aiImagePreviewContainer.classList.add('hidden');
  });

  async function sendAiMessage(message) {
    const userMsg = document.createElement('div');
    userMsg.style = "background: var(--primary); padding: 10px; border-radius: 10px; color: white; align-self: flex-end; max-width: 85%; line-height: 1.4;";
    
    if (aiSelectedImageBase64) {
      userMsg.innerHTML = \`<img src="data:\${aiSelectedImageMime};base64,\${aiSelectedImageBase64}" style="max-width: 100%; border-radius: 5px; margin-bottom: 5px;" /><br>\` + message;
    } else {
      userMsg.textContent = message;
    }
    
    aiChatHistory.appendChild(userMsg);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

    const typingMsg = document.createElement('div');
    typingMsg.style = "background: rgba(142, 68, 173, 0.1); border: 1px solid rgba(142, 68, 173, 0.3); padding: 10px; border-radius: 10px; color: var(--text-muted); align-self: flex-start; max-width: 85%; line-height: 1.4;";
    typingMsg.innerHTML = "<i>Thinking...</i>";
    aiChatHistory.appendChild(typingMsg);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

    // Grab key & Context
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

    // Prepare API Payload
    let parts = [{ text: promptText }];
    if (aiSelectedImageBase64) {
      parts.push({
        inline_data: {
          mime_type: aiSelectedImageMime,
          data: aiSelectedImageBase64
        }
      });
    }

    const currentImageBase64 = aiSelectedImageBase64; // preserve in case they remove it while sending
    
    // Clear attachment after sending
    btnRemoveAiImage.click();

    try {
      const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${apiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: parts }] })
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
    if (msg || aiSelectedImageBase64) {
      aiChatInput.value = '';
      sendAiMessage(msg || "Look at this image.");
    }
  });
  aiChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const msg = aiChatInput.value.trim();
      if (msg || aiSelectedImageBase64) {
        aiChatInput.value = '';
        sendAiMessage(msg || "Look at this image.");
      }
    }
  });
}`;
  content = content.substring(0, startIdx) + newLogic + content.substring(endIdx + endStr.length);
  fs.writeFileSync(file, content);
  console.log("Renderer replaced successfully!");
} else {
  console.log("Could not find start/end bounds for old AI logic in renderer.js");
}
