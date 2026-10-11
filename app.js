
const SUPABASE_URL = 'https://iuhmiygcmtguwlrhidfm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qANoQ2H_0Rzri2ZZj9lqDQ_-tLyn7pR';


let supabaseClient;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage: window.sessionStorage }
  });
} catch (err) {
  console.error("Supabase Initialization Failed.", err);
}

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const fileUpload = document.getElementById('file-upload');
const btnAnalyze = document.getElementById('btn-analyze');

// Views
const viewNewAnalysis = document.getElementById('new-analysis-view');
const viewHistory = document.getElementById('history-view');
const viewResults = document.getElementById('results-dashboard');
const navNew = document.getElementById('nav-new');
const navHistory = document.getElementById('nav-history');

// Auth UI Elements
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const dobInput = document.getElementById('dob');
const newPassInput = document.getElementById('new-password');

const loginBtns = document.getElementById('login-buttons');
const signupBtns = document.getElementById('signup-buttons');
const verifyBtns = document.getElementById('verify-buttons');
const savePassBtns = document.getElementById('save-password-buttons');
const authSubtitle = document.getElementById('auth-subtitle');
const authError = document.getElementById('auth-error');

// Reusable function to reset the UI back to the default Login state
const resetToLogin = () => {
  passInput.style.display = 'block';
  dobInput.style.display = 'none';
  newPassInput.style.display = 'none';
  loginBtns.style.display = 'flex';
  signupBtns.style.display = 'none';
  verifyBtns.style.display = 'none';
  savePassBtns.style.display = 'none';
  authSubtitle.innerText = "Sign in to audit your commercial contracts for legal vulnerabilities instantly.";
  authError.style.display = 'none';
  emailInput.value = ''; passInput.value = ''; dobInput.value = ''; newPassInput.value = '';
};

// Bind "Back to Sign In" buttons
document.getElementById('btn-back-login-signup').addEventListener('click', resetToLogin);
document.getElementById('btn-back-login-reset').addEventListener('click', resetToLogin);

// Auth Screen Toggles
document.getElementById('btn-show-signup').addEventListener('click', () => {
  passInput.style.display = 'block'; dobInput.style.display = 'block'; newPassInput.style.display = 'none';
  loginBtns.style.display = 'none'; signupBtns.style.display = 'flex';
  authSubtitle.innerText = "Create a secure account (Requires Date of Birth for recovery).";
  authError.style.display = 'none';
});

document.getElementById('btn-show-reset').addEventListener('click', () => {
  passInput.style.display = 'none'; dobInput.style.display = 'block'; newPassInput.style.display = 'none';
  loginBtns.style.display = 'none'; verifyBtns.style.display = 'flex';
  authSubtitle.innerText = "Enter your Email and Date of Birth to verify your identity.";
  authError.style.display = 'none';
});

// Check Session on Load
async function checkUser() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block'; // Changed to block for new layout
    document.getElementById('user-email').innerText = session.user.email;
  } else {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
  }
}
checkUser(); 

// Handle Login
document.getElementById('btn-login').addEventListener('click', async () => {
  if (!emailInput.value || !passInput.value) return (authError.innerText = "Enter email and password.", authError.style.display = 'block');
  const { error } = await supabaseClient.auth.signInWithPassword({ email: emailInput.value, password: passInput.value });
  if (error) { authError.innerText = error.message; authError.style.display = 'block'; }
  else { authError.style.display = 'none'; checkUser(); }
});

// Handle Account Creation
document.getElementById('btn-confirm-signup').addEventListener('click', async () => {
  if (!emailInput.value || !passInput.value || !dobInput.value) return (authError.innerText = "Complete all fields.", authError.style.display = 'block');
  const { error } = await supabaseClient.auth.signUp({ 
    email: emailInput.value, password: passInput.value, options: { data: { date_of_birth: dobInput.value } } 
  });
  if (error) { authError.innerText = error.message; authError.style.display = 'block'; }
  else { alert("Account created! Please log in."); resetToLogin(); }
});

// Handle Forgot Password - Step 1
document.getElementById('btn-verify-dob').addEventListener('click', async () => {
  if (!emailInput.value || !dobInput.value) return (authError.innerText = "Enter Email and Date of Birth.", authError.style.display = 'block');
  const res = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailInput.value, dob: dobInput.value }) });
  const data = await res.json();
  if (!res.ok) { authError.innerText = data.error; authError.style.display = 'block'; }
  else {
    authError.style.display = 'none'; dobInput.style.display = 'none'; emailInput.style.display = 'none'; newPassInput.style.display = 'block';
    verifyBtns.style.display = 'none'; savePassBtns.style.display = 'flex';
    authSubtitle.innerText = "Identity verified. Enter your new password below.";
  }
});

// Handle Forgot Password - Step 2
document.getElementById('btn-save-password').addEventListener('click', async () => {
  if (!newPassInput.value) return (authError.innerText = "Enter a new password.", authError.style.display = 'block');
  const res = await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailInput.value, dob: dobInput.value, newPassword: newPassInput.value }) });
  const data = await res.json();
  if (!res.ok) { authError.innerText = data.error; authError.style.display = 'block'; }
  else { await supabaseClient.auth.signInWithPassword({ email: emailInput.value, password: newPassInput.value }); checkUser(); }
});

// Handle Logout
document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  resetToLogin();
  checkUser();
});

// Navigation Toggles
navNew.addEventListener('click', () => {
  viewNewAnalysis.style.display = 'block';
  viewHistory.style.display = 'none';
  viewResults.style.display = 'none'; // Hide results until an analysis is run
  navNew.className = 'nav-btn active';
  navHistory.className = 'nav-btn';
});

navHistory.addEventListener('click', () => {
  viewNewAnalysis.style.display = 'none';
  viewHistory.style.display = 'block';
  viewResults.style.display = 'none';
  navNew.className = 'nav-btn';
  navHistory.className = 'nav-btn active';
  loadHistory();
});

// File Upload Enable
fileUpload.addEventListener('change', () => { btnAnalyze.disabled = fileUpload.files.length === 0; });

// Analysis Execution
btnAnalyze.addEventListener('click', async () => {
  const file = fileUpload.files[0];
  if (!file) return;
  document.getElementById('loading-spinner').style.display = 'block';
  viewResults.style.display = 'none';
  btnAnalyze.disabled = true;

  try {
    let contractText = '';
    if (file.name.endsWith('.txt')) { contractText = await file.text(); }
    else if (file.name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        contractText += content.items.map(item => item.str).join(' ') + '\n';
      }
    }

    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractText }) });
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

// Render Dashboard
function renderDashboard(data, fileName) {
  viewResults.style.display = 'block';
  document.getElementById('doc-title').innerText = `Evaluation: ${fileName}`;
  document.getElementById('score-val').innerText = `${data.overall_risk_score} / 100`;
  document.getElementById('score-val').style.color = data.overall_risk_score >= 70 ? '#cc0000' : data.overall_risk_score >= 40 ? '#ff9900' : '#009933';
  
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
          <span style="color: #666; font-size: 14px;">Date: ${date} | Score: ${log.risk_score}/100</span>
        </div>
        <button class="btn-primary" style="width: auto; margin-bottom: 0;" onclick='restoreAudit(${JSON.stringify(log.analysis_payload).replace(/'/g, "&apos;")}, "${log.document_name}")'>Load Dashboard</button>
      </div>`;
  });
}

// Restore History Item to View
window.restoreAudit = function(payload, fileName) {
  // Hide New Analysis Upload section and History list
  viewNewAnalysis.style.display = 'none';
  viewHistory.style.display = 'none';
  
  // Set navbar buttons to inactive
  navNew.className = 'nav-btn';
  navHistory.className = 'nav-btn';
  
  // Render just the dashboard
  renderDashboard(payload, fileName);
};