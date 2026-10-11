
const SUPABASE_URL = 'https://iuhmiygcmtguwlrhidfm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qANoQ2H_0Rzri2ZZj9lqDQ_-tLyn7pR';



let supabaseClient;
try {
  // Use sessionStorage so the user is logged out when the tab closes
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: window.sessionStorage
    }
  });
} catch (err) {
  console.error("Supabase Initialization Failed. Did you enter your keys?", err);
}

// ... Keep the rest of your app.js exactly the same below this point ...


const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';

const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authError = document.getElementById('auth-error');
const fileUpload = document.getElementById('file-upload');
const btnAnalyze = document.getElementById('btn-analyze');

// Auth Toggles
document.getElementById('btn-show-signup').addEventListener('click', () => {
  document.getElementById('dob').style.display = 'block';
  document.getElementById('login-buttons').style.display = 'none';
  document.getElementById('signup-buttons').style.display = 'flex';
  document.getElementById('auth-subtitle').innerText = "Create a secure account to begin analysing your contracts.";
  authError.style.display = 'none';
});

document.getElementById('btn-show-login').addEventListener('click', () => {
  document.getElementById('dob').style.display = 'none';
  document.getElementById('login-buttons').style.display = 'flex';
  document.getElementById('signup-buttons').style.display = 'none';
  document.getElementById('auth-subtitle').innerText = "Sign in to audit your commercial contracts for legal vulnerabilities instantly.";
  authError.style.display = 'none';
});
// Toggle to Forgot Password Mode
document.getElementById('btn-show-reset').addEventListener('click', () => {
  document.getElementById('password').style.display = 'none';
  document.getElementById('dob').style.display = 'block';
  document.getElementById('new-password').style.display = 'block';
  
  document.getElementById('login-buttons').style.display = 'none';
  document.getElementById('signup-buttons').style.display = 'none';
  document.getElementById('reset-buttons').style.display = 'flex';
  
  document.getElementById('auth-subtitle').innerText = "Enter your email and Date of Birth to reset your password.";
  authError.style.display = 'none';
});

// Reusable Back to Login function
const resetToLogin = () => {
  document.getElementById('password').style.display = 'block';
  document.getElementById('dob').style.display = 'none';
  document.getElementById('new-password').style.display = 'none';
  
  document.getElementById('login-buttons').style.display = 'flex';
  document.getElementById('signup-buttons').style.display = 'none';
  document.getElementById('reset-buttons').style.display = 'none';
  
  document.getElementById('auth-subtitle').innerText = "Sign in to audit your commercial contracts for legal vulnerabilities instantly.";
  authError.style.display = 'none';
};

document.getElementById('btn-back-login1').addEventListener('click', resetToLogin);
document.getElementById('btn-back-login2').addEventListener('click', resetToLogin);

// Execute Confirm Password Reset
document.getElementById('btn-confirm-reset').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const dob = document.getElementById('dob').value;
  const newPassword = document.getElementById('new-password').value;
  
  if (!email || !dob || !newPassword) {
    authError.innerText = "Please complete all fields to reset your password.";
    authError.style.display = 'block';
    return;
  }

  // Call the Vercel Admin API Bridge
  const response = await fetch('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, dob, newPassword })
  });

  const data = await response.json();

  if (!response.ok) {
    authError.innerText = data.error;
    authError.style.display = 'block';
  } else {
    alert("Password reset successfully! You can now sign in with your new password.");
    resetToLogin();
  }
});

// Navigation Toggles
const viewNew = document.getElementById('new-analysis-view');
const viewHistory = document.getElementById('history-view');
const navNew = document.getElementById('nav-new');
const navHistory = document.getElementById('nav-history');

navNew.addEventListener('click', () => {
  viewNew.style.display = 'block';
  viewHistory.style.display = 'none';
  navNew.className = 'btn-primary';
  navHistory.className = 'btn-secondary';
});

navHistory.addEventListener('click', () => {
  viewNew.style.display = 'none';
  viewHistory.style.display = 'block';
  navNew.className = 'btn-secondary';
  navHistory.className = 'btn-primary';
  loadHistory(); // Fetch records when tab is clicked
});

// Check Session
async function checkUser() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    document.getElementById('user-email').innerText = session.user.email;
  } else {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
  }
}
checkUser(); 

// Auth Actions
document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if (!email || !password) return (authError.innerText = "Please enter email and password.", authError.style.display = 'block');
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { authError.innerText = error.message; authError.style.display = 'block'; }
  else { authError.style.display = 'none'; checkUser(); }
});

document.getElementById('btn-confirm-signup').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const dob = document.getElementById('dob').value;
  if (!email || !password || !dob) return (authError.innerText = "Please complete all fields.", authError.style.display = 'block');
  const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { date_of_birth: dob } } });
  if (error) { authError.innerText = error.message; authError.style.display = 'block'; }
  else { alert("Account created!"); document.getElementById('btn-show-login').click(); }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  checkUser();
});

// File Upload
fileUpload.addEventListener('change', () => { btnAnalyze.disabled = fileUpload.files.length === 0; });

// Analysis Execution
btnAnalyze.addEventListener('click', async () => {
  const file = fileUpload.files[0];
  if (!file) return;
  document.getElementById('loading-spinner').style.display = 'block';
  document.getElementById('results-dashboard').style.display = 'none';
  btnAnalyze.disabled = true;

  try {
    let contractText = '';
    if (file.name.endsWith('.txt')) {
      contractText = await file.text();
    } else if (file.name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        contractText += content.items.map(item => item.str).join(' ') + '\n';
      }
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractText })
    });

    if (!response.ok) throw new Error("API Bridge failed.");
    const aiData = await response.json();
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    await supabaseClient.from('contract_logs').insert([
      { user_id: session.user.id, document_name: file.name, risk_score: aiData.overall_risk_score, analysis_payload: aiData }
    ]);

    renderDashboard(aiData, file.name);
  } catch (error) {
    alert("Error analysing document: " + error.message);
  } finally {
    document.getElementById('loading-spinner').style.display = 'none';
    btnAnalyze.disabled = false;
  }
});

function renderDashboard(data, fileName) {
  document.getElementById('results-dashboard').style.display = 'block';
  document.getElementById('doc-title').innerText = `Evaluation: ${fileName}`;
  document.getElementById('score-val').innerText = `${data.overall_risk_score} / 100`;
  document.getElementById('score-val').style.color = data.overall_risk_score >= 70 ? '#ff4b4b' : data.overall_risk_score >= 40 ? '#ffa700' : '#21c55d';
  
  document.getElementById('high-val').innerText = data.risks.filter(r => r.severity.toLowerCase() === 'high').length;
  document.getElementById('med-val').innerText = data.risks.filter(r => r.severity.toLowerCase() === 'medium').length;
  document.getElementById('low-val').innerText = data.risks.filter(r => r.severity.toLowerCase() === 'low').length;
  document.getElementById('summary-text').innerText = data.summary;

  const container = document.getElementById('clauses-container');
  container.innerHTML = ''; 
  data.risks.forEach(risk => {
    container.innerHTML += `
      <div class="clause-box">
        <h3>${risk.clause_name}</h3>
        <span class="badge ${risk.severity.toLowerCase()}">${risk.severity.toUpperCase()} RISK</span>
        <div class="clause-grid">
          <div><strong>Extracted Contract Language</strong><div class="risk-text">${risk.extracted_text}</div><br><strong>Risk Explanation</strong><p>${risk.risk_explanation}</p></div>
          <div><strong>Recommended Safe Revision</strong><div class="safe-text">${risk.revised_text}</div></div>
        </div>
      </div>`;
  });
}

// History Fetching
async function loadHistory() {
  const container = document.getElementById('history-container');
  const loader = document.getElementById('history-loading');
  container.innerHTML = '';
  loader.style.display = 'block';

  const { data: { session } } = await supabaseClient.auth.getSession();
  const { data, error } = await supabaseClient
    .from('contract_logs')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  loader.style.display = 'none';

  if (error || !data || data.length === 0) {
    container.innerHTML = '<div class="info-box">No past audits found in your archive.</div>';
    return;
  }

  data.forEach(log => {
    const date = new Date(log.created_at).toLocaleDateString();
    container.innerHTML += `
      <div class="clause-box" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin:0 0 5px 0;">${log.document_name}</h3>
          <span style="color: #8b949e; font-size: 0.85rem;">Date: ${date} | Score: ${log.risk_score}/100</span>
        </div>
        <button class="btn-primary" style="width: auto;" onclick='restoreAudit(${JSON.stringify(log.analysis_payload).replace(/'/g, "&apos;")}, "${log.document_name}")'>Load Dashboard</button>
      </div>`;
  });
}

// Global function to restore audit from history
window.restoreAudit = function(payload, fileName) {
  navNew.click(); // Switch back to main view
  renderDashboard(payload, fileName);
};
