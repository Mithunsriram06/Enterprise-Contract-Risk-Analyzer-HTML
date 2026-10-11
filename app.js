// Add your Supabase credentials here (These are safe to be public in frontend code)
const SUPABASE_URL = 'https://iuhmiygcmtguwlrhidfm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qANoQ2H_0Rzri2ZZj9lqDQ_-tLyn7pR';

let supabase;
try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error("Supabase Initialization Failed. Did you enter your keys?", err);
}

// Setup PDF.js worker
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authError = document.getElementById('auth-error');
const fileUpload = document.getElementById('file-upload');
const btnAnalyze = document.getElementById('btn-analyze');

// Auth UI Toggle Elements
const dobInput = document.getElementById('dob');
const loginButtons = document.getElementById('login-buttons');
const signupButtons = document.getElementById('signup-buttons');
const authSubtitle = document.getElementById('auth-subtitle');

// Toggle to Sign Up Mode
document.getElementById('btn-show-signup').addEventListener('click', () => {
  dobInput.style.display = 'block';
  loginButtons.style.display = 'none';
  signupButtons.style.display = 'flex';
  authSubtitle.innerText = "Create a secure account to begin analysing your contracts.";
  authError.style.display = 'none';
});

// Toggle to Login Mode
document.getElementById('btn-show-login').addEventListener('click', () => {
  dobInput.style.display = 'none';
  loginButtons.style.display = 'flex';
  signupButtons.style.display = 'none';
  authSubtitle.innerText = "Sign in to audit your commercial contracts for legal vulnerabilities instantly.";
  authError.style.display = 'none';
});

// Handle Authentication State
async function checkUser() {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
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

// Execute Login
document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    authError.innerText = "Please enter both email and password.";
    authError.style.display = 'block';
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { authError.innerText = error.message; authError.style.display = 'block'; }
  else { authError.style.display = 'none'; checkUser(); }
});

// Execute Confirm Creation (Signup)
document.getElementById('btn-confirm-signup').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const dob = document.getElementById('dob').value;
  
  if (!email || !password || !dob) {
    authError.innerText = "Please complete all fields, including Date of Birth.";
    authError.style.display = 'block';
    return;
  }

  // Pass the DOB into Supabase's user metadata
  const { error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: { data: { date_of_birth: dob } }
  });

  if (error) { 
    authError.innerText = error.message; 
    authError.style.display = 'block'; 
  } else { 
    alert("Account created successfully! You can now sign in.");
    document.getElementById('btn-show-login').click(); // Switch back to login view
  }
});

// Execute Logout
document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  checkUser();
});

// File Upload Enable
fileUpload.addEventListener('change', () => {
  btnAnalyze.disabled = fileUpload.files.length === 0;
});

// Run AI Analysis
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
    
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('contract_logs').insert([
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

// Render Results to UI
function renderDashboard(data, fileName) {
  document.getElementById('results-dashboard').style.display = 'block';
  document.getElementById('doc-title').innerText = `Evaluation: ${fileName}`;
  
  document.getElementById('score-val').innerText = `${data.overall_risk_score} / 100`;
  document.getElementById('score-val').style.color = data.overall_risk_score >= 70 ? '#ff4b4b' : data.overall_risk_score >= 40 ? '#ffa700' : '#21c55d';
  
  const high = data.risks.filter(r => r.severity.toLowerCase() === 'high').length;
  const med = data.risks.filter(r => r.severity.toLowerCase() === 'medium').length;
  const low = data.risks.filter(r => r.severity.toLowerCase() === 'low').length;
  
  document.getElementById('high-val').innerText = high;
  document.getElementById('med-val').innerText = med;
  document.getElementById('low-val').innerText = low;
  document.getElementById('summary-text').innerText = data.summary;

  const container = document.getElementById('clauses-container');
  container.innerHTML = ''; 

  data.risks.forEach(risk => {
    const box = document.createElement('div');
    box.className = 'clause-box';
    box.innerHTML = `
      <h3>${risk.clause_name}</h3>
      <span class="badge ${risk.severity.toLowerCase()}">${risk.severity.toUpperCase()} RISK</span>
      <div class="clause-grid">
        <div>
          <strong>Extracted Contract Language</strong>
          <div class="risk-text">${risk.extracted_text}</div>
          <br><strong>Risk Explanation</strong>
          <p>${risk.risk_explanation}</p>
        </div>
        <div>
          <strong>Recommended Safe Revision</strong>
          <div class="safe-text">${risk.revised_text}</div>
        </div>
      </div>
    `;
    container.appendChild(box);
  });
}
