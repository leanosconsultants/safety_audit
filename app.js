const pages = [...document.querySelectorAll(".page")];
const form = document.getElementById("auditForm");
const stepList = document.getElementById("stepList");
const dots = document.getElementById("progressDots");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const mobileTitle = document.getElementById("mobileTitle");
const liveScore = document.getElementById("liveScore");
const finalScore = document.getElementById("finalScore");
const scoreFill = document.getElementById("scoreFill");
const scoreLabel = document.getElementById("scoreLabel");
const finalMessage = document.getElementById("finalMessage");
const toast = document.getElementById("toast");
const appShell = document.querySelector(".app-shell");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarExpandBtn = document.getElementById("sidebarExpandBtn");
const requiredPages = {
  0: ["companyName","siteLocation","industryType","workers","auditDate"],
  1: ["riskLevel","proceduresFollowed","immediateDanger"],
  3: ["firstAidKit","kitType","attendants","certificationLevel"],
  4: ["emergencyPlan","evacProcedure","emergencyContacts"],
  8: ["keyIssues","recommendedActions","priorityLevel"],
  9: ["auditorName","clientRep"]
};

let currentPage = 0;

const scoreLabels = [
  { min: 80, label: "Strong compliance" },
  { min: 60, label: "Needs improvement" },
  { min: 35, label: "High attention required" },
  { min: 0, label: "Critical gaps likely" }
];

function init() {
  buildNavigation();
  addHazard();
  setToday();
  setupConditionalLogic();
  setupSidebar();
  setupPhotos();
  setupSignaturePad();
  updatePage();
  updateScore();
}

function buildNavigation() {
  pages.forEach((page, index) => {
    const title = page.dataset.title;
    const icon = page.dataset.icon;

    const step = document.createElement("button");
    step.type = "button";
    step.className = "step-item";
    step.innerHTML = `<span>${icon}</span><span>${String(index + 1).padStart(2, "0")} · ${title}</span>`;
    step.addEventListener("click", () => {
      currentPage = index;
      updatePage();
    });
    stepList.appendChild(step);

    const dot = document.createElement("span");
    dots.appendChild(dot);
  });
}

function setToday() {
  const dateInput = form.querySelector("input[name='auditDate']");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

function updatePage() {
  pages.forEach((page, index) => page.classList.toggle("active", index === currentPage));

  [...stepList.children].forEach((step, index) => {
    step.classList.toggle("active", index === currentPage);
  });

  [...dots.children].forEach((dot, index) => {
    dot.classList.toggle("active", index === currentPage);
  });

  const title = pages[currentPage].dataset.title;
  mobileTitle.textContent = title;

  prevBtn.style.visibility = currentPage === 0 ? "hidden" : "visible";
  nextBtn.classList.toggle("hidden", currentPage === pages.length - 1);
  submitBtn.classList.toggle("hidden", currentPage !== pages.length - 1);

  window.scrollTo({ top: 0, behavior: "smooth" });
}


function setupSidebar(){
  sidebarToggle?.addEventListener("click",()=>appShell.classList.add("sidebar-collapsed"));
  sidebarExpandBtn?.addEventListener("click",()=>appShell.classList.remove("sidebar-collapsed"));
  document.getElementById("sidebarLogo")?.addEventListener("click",()=>appShell.classList.remove("sidebar-collapsed"));
}
function showFieldError(control,msg="This field is required before continuing."){
  if(!control)return;
  const field=control.closest(".field")||control.closest(".card")||control.closest(".mini-upload")||control.parentElement;
  control.classList.add("invalid");
  let err=field.querySelector(".field-error");
  if(!err){err=document.createElement("small");err.className="field-error";field.appendChild(err);}
  err.textContent=msg;err.style.display="block";
}
function clearFieldError(control){
  if(!control)return;
  const field=control.closest(".field")||control.closest(".card")||control.closest(".mini-upload")||control.parentElement;
  control.classList.remove("invalid");
  const err=field.querySelector(".field-error"); if(err)err.style.display="none";
}
function validateHazardsPage(){
  if(currentPage!==5)return true;
  let ok=true;
  document.querySelectorAll(".hazard-card").forEach(card=>{
    const type=card.querySelector("select[name='hazardType[]']");
    const risk=card.querySelector("select[name='hazardRisk[]']");
    const desc=card.querySelector("textarea[name='hazardDescription[]']");
    const action=card.querySelector("textarea[name='hazardAction[]']");
    [type,risk,desc,action].forEach(clearFieldError);
    if(!type.value){showFieldError(type,"Select the hazard type.");ok=false;}
    if(!risk.value){showFieldError(risk,"Select the risk level.");ok=false;}
    if(!desc.value.trim()){showFieldError(desc,"Describe the hazard before continuing.");ok=false;}
    if(!action.value.trim()){showFieldError(action,"Add a recommended action before continuing.");ok=false;}
  });
  return ok;
}
function validateEmergencyProofs(){
  let ok=true;
  ["emergencyPlan","evacProcedure","emergencyContacts"].forEach(name=>{
    const answer=form.querySelector(`input[name='${name}']:checked`)?.value;
    const upload=form.querySelector(`[data-upload-for='${name}'] input`);
    clearFieldError(upload);
    if(answer==="Yes"&&upload&&upload.files.length===0){showFieldError(upload,"Upload proof or take a picture because this answer is Yes.");ok=false;}
  });
  return ok;
}
function validateCurrentPage(){
  let ok=true;
  (requiredPages[currentPage]||[]).forEach(name=>{
    const control=form.querySelector(`[name='${name}']`);
    if(!control)return;
    if(control.type==="radio"){
      const radios=[...form.querySelectorAll(`input[name='${name}']`)];
      radios.forEach(clearFieldError);
      if(!form.querySelector(`input[name='${name}']:checked`)){showFieldError(radios[0],"Choose an option before continuing.");ok=false;}
    } else {
      clearFieldError(control);
      if(!String(control.value||"").trim()){showFieldError(control);ok=false;}
    }
  });
  if(currentPage===4)ok=validateEmergencyProofs()&&ok;
  ok=validateHazardsPage()&&ok;
  if(!ok){toast.textContent="Please complete the required fields on this page.";toast.classList.remove("hidden");setTimeout(()=>toast.classList.add("hidden"),2400);}
  return ok;
}
form.addEventListener("input",e=>clearFieldError(e.target));
form.addEventListener("change",e=>clearFieldError(e.target));

prevBtn.addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage -= 1;
    updatePage();
  }
});

nextBtn.addEventListener("click", () => {
  if (!validateCurrentPage()) return;
  if (currentPage < pages.length - 1) {
    currentPage += 1;
    updatePage();
  }
});

function setupConditionalLogic() {
  form.addEventListener("change", () => {
    const danger = form.querySelector("input[name='immediateDanger']:checked")?.value;
    document.getElementById("hazardDescriptionWrap").classList.toggle("hidden", danger !== "Yes");
    ["emergencyPlan","evacProcedure","emergencyContacts"].forEach(name=>{
      const answer=form.querySelector(`input[name='${name}']:checked`)?.value;
      const uploadWrap=form.querySelector(`[data-upload-for='${name}']`);
      uploadWrap?.classList.toggle("hidden",answer!=="Yes");
    });

    checkFirstAidCompliance();
    updateScore();
  });

  form.addEventListener("input", () => {
    checkFirstAidCompliance();
    updateScore();
  });
}

function checkFirstAidCompliance() {
  const workers = Number(document.getElementById("workersCount").value || 0);
  const attendants = Number(document.getElementById("attendantsCount").value || 0);
  const certLevel = document.getElementById("certLevel").value;
  const noTrainedAttendant = attendants === 0 || certLevel === "None";

  document
    .getElementById("firstAidWarning")
    .classList
    .toggle("hidden", !(workers >= 2 && noTrainedAttendant));
}

function addHazard(data = {}) {
  const hazardsList = document.getElementById("hazardsList");
  const card = document.createElement("div");
  card.className = "hazard-card";

  card.innerHTML = `
    <div class="grid two-col">
      <label class="field">
        <span>Hazard Type</span>
        <select name="hazardType[]">
          <option value="">Select hazard</option>
          <option>Fall Hazard</option>
          <option>Equipment</option>
          <option>Electrical</option>
          <option>Chemical</option>
          <option>Other</option>
        </select>
      </label>

      <div class="risk-remove-stack">
        <button type="button" class="ghost-btn remove-hazard">Remove</button>
        <label class="field">
          <span>Risk Level</span>
          <select name="hazardRisk[]">
            <option value="">Select risk</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </label>
      </div>
    </div>

    <label class="field">
      <span>Description</span>
      <textarea name="hazardDescription[]" placeholder="Describe the observed hazard."></textarea>
    </label>

    <label class="field">
      <span>Recommended Action</span>
      <textarea name="hazardAction[]" placeholder="What should be done to correct or control this hazard?"></textarea>
    </label>
  `;

  card.querySelector(".remove-hazard").addEventListener("click", () => {
    if (document.querySelectorAll(".hazard-card").length > 1) {
      card.remove();
      updateScore();
    }
  });

  hazardsList.appendChild(card);
}

document.getElementById("addHazardBtn").addEventListener("click", () => addHazard());

function setupPhotos() {
  const input = document.getElementById("photoUpload");
  const preview = document.getElementById("photoPreview");

  input.addEventListener("change", () => {
    preview.innerHTML = "";

    [...input.files].forEach(file => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = event => {
        const img = document.createElement("img");
        img.src = event.target.result;
        img.alt = file.name;
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });

    updateScore();
  });
}

function updateScore() {
  let points = 0;
  let possible = 0;

  const add = condition => {
    possible += 1;
    if (condition) points += 1;
  };

  add(Boolean(form.companyName?.value));
  add(Boolean(form.siteLocation?.value));
  add((form.querySelector("input[name='riskLevel']:checked")?.value || "") !== "High");
  add(form.querySelector("input[name='proceduresFollowed']:checked")?.value === "Yes");
  add(form.querySelector("input[name='immediateDanger']:checked")?.value === "No");

  ["ppeHardHats", "ppeBoots", "ppeGloves", "ppeHiVis"].forEach(name => {
    add(form.querySelector(`input[name='${name}']`)?.checked);
  });

  add(form.querySelector("input[name='firstAidKit']:checked")?.value === "Yes");
  add(Number(document.getElementById("attendantsCount").value || 0) > 0);
  add(document.getElementById("certLevel").value !== "None");

  add(form.querySelector("input[name='emergencyPlan']:checked")?.value === "Yes");
  add(form.querySelector("input[name='evacProcedure']:checked")?.value === "Yes");
  add(form.querySelector("input[name='emergencyContacts']:checked")?.value === "Yes");

  ["safetyProgram", "hazardAssessments", "trainingRecords", "incidentReporting", "safetyMeetings"].forEach(name => {
    add(form.querySelector(`input[name='${name}']`)?.checked);
  });

  const score = possible ? Math.round((points / possible) * 100) : 0;
  const label = scoreLabels.find(item => score >= item.min).label;

  liveScore.textContent = `${score}%`;
  finalScore.textContent = `${score}%`;
  scoreFill.style.width = `${score}%`;
  scoreLabel.textContent = label;
  finalMessage.textContent = label;
}

function setupSignaturePad() {
  const canvas = document.getElementById("signaturePad");
  const ctx = canvas.getContext("2d");
  let drawing = false;

  function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1E3A5F";
  }

  function position(event) {
    const rect = canvas.getBoundingClientRect();
    const point = event.touches ? event.touches[0] : event;
    return {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top
    };
  }

  function start(event) {
    drawing = true;
    const { x, y } = position(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event) {
    if (!drawing) return;
    event.preventDefault();
    const { x, y } = position(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing = false;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", end);
  canvas.addEventListener("mouseleave", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  document.getElementById("clearSignature").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

function getRiskClass(risk){return risk==="High"?"bad":risk==="Medium"?"warn":"ok";}
function getComplianceStatus(score){const v=Number(String(score).replace("%",""));return v>=80?"Compliant / Monitor":v>=60?"Partially Compliant":"Needs Immediate Improvement";}
function getExecutiveSummary(score,hazards){const v=Number(String(score).replace("%",""));const high=hazards.filter(h=>h.risk==="High").length;const med=hazards.filter(h=>h.risk==="Medium").length;if(v>=80)return "The site demonstrates a strong safety posture with most core compliance controls in place. Continued monitoring, documentation upkeep, and routine supervisory verification are recommended.";if(v>=60)return "The site shows a moderate level of compliance with notable gaps that should be corrected within the assigned priority window.";return `The audit indicates significant compliance and operational safety gaps. Immediate management attention is recommended for first aid, PPE, emergency preparedness, documentation, and hazard-control items. The hazard register includes ${high} high-risk and ${med} medium-risk item(s).`;}
function generateReportHTML(){updateScore();const score=liveScore.textContent,hazards=collectHazards(),photos=collectPhotos();const company=form.companyName.value||"Safety Audit Report",date=form.auditDate.value||new Date().toISOString().slice(0,10);const findings=[getRadioValue("riskLevel")==="High"?"Overall site risk is marked High.":"",getRadioValue("proceduresFollowed")==="No"?"Workers are not consistently following safety procedures.":"",getRadioValue("immediateDanger")==="Yes"?`Immediate danger reported: ${form.immediateHazards.value||"Details not provided."}`:"",getRadioValue("firstAidKit")==="No"?"First aid kit is not available.":"",Number(form.attendants.value||0)===0?"No first aid attendant has been recorded.":"",form.certificationLevel.value==="None"?"No first aid certification level has been recorded.":"",getRadioValue("emergencyPlan")==="No"?"Emergency plan is not available.":"",getRadioValue("evacProcedure")==="No"?"Evacuation procedure is not posted.":"",getRadioValue("emergencyContacts")==="No"?"Emergency contacts are not displayed.":"",getCheckboxValue("safetyProgram")==="No"?"Safety program is not confirmed.":"",getCheckboxValue("trainingRecords")==="No"?"Training records are not confirmed.":""].filter(Boolean);return `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:white;color:#101828;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.pdf-report{width:794px;margin:0 auto}.cover{min-height:1040px;padding:56px;color:white;background:radial-gradient(circle at top right,rgba(255,255,255,.22),transparent 360px),linear-gradient(145deg,#1E3A5F,#123052);display:flex;flex-direction:column;justify-content:space-between}.cover h1{margin:0;font-size:52px;line-height:.96;letter-spacing:-.06em}.meta{margin-top:24px;color:rgba(255,255,255,.78);font-size:16px;line-height:1.8}.score-hero{margin-top:42px;padding:28px;border-radius:28px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18)}.score-hero strong{display:block;margin:12px 0;font-size:90px;line-height:.9;letter-spacing:-.08em}.page{padding:46px 52px;min-height:1040px}h2{margin:0 0 18px;color:#1E3A5F;font-size:30px;letter-spacing:-.04em}h3{margin:24px 0 12px;color:#26364d;font-size:18px}p{color:#667085;line-height:1.65}.box,.metric,.detail{background:#f6f8fb;border:1px solid #d9e0ea;border-radius:18px;padding:16px}.box{padding:22px;border-radius:22px}.metrics,.two-col{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.two-col{grid-template-columns:1fr 1fr}.metric span,.detail span{display:block;color:#667085;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}.metric strong{display:block;color:#1E3A5F;font-size:20px}.badge{display:inline-flex;padding:6px 10px;border-radius:999px;font-weight:800;font-size:12px}.ok{color:#166534;background:#dcfce7}.bad{color:#991b1b;background:#fee2e2}.warn{color:#92400e;background:#fef3c7}.neutral{color:#344054;background:#e5e7eb}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}th,td{text-align:left;padding:12px;border-bottom:1px solid #d9e0ea;vertical-align:top}th{color:#667085;background:#f6f8fb;font-size:10px;text-transform:uppercase;letter-spacing:.08em}ul{line-height:1.7}.photos{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.photos img{width:100%;aspect-ratio:1.2;object-fit:cover;border-radius:16px;border:1px solid #d9e0ea}</style></head><body><article id="pdfReport" class="pdf-report"><section class="cover"><div><p style="color:rgba(255,255,255,.72);font-weight:800;letter-spacing:.12em;text-transform:uppercase">Executive Safety Audit Report</p><h1>${escapeHtml(company)}</h1><div class="meta">Site: ${escapeHtml(form.siteLocation.value||"Not provided")}<br>Industry: ${escapeHtml(form.industryType.value||"Not provided")}<br>Audit Date: ${escapeHtml(date)}<br>Supervisor: ${escapeHtml(form.supervisorName.value||"Not provided")}</div><div class="score-hero"><span>Compliance Score</span><strong>${escapeHtml(score)}</strong><div>${escapeHtml(scoreLabel.textContent)} · ${escapeHtml(getComplianceStatus(score))}</div></div></div><div class="meta">Prepared by ${escapeHtml(form.auditorName.value||"Auditor")} for ${escapeHtml(form.clientRep.value||"Client Representative")}</div></section><section class="page"><h2>1. Executive Summary</h2><div class="box"><p>${escapeHtml(getExecutiveSummary(score,hazards))}</p></div><div class="metrics"><div class="metric"><span>Workers</span><strong>${escapeHtml(form.workers.value||"0")}</strong></div><div class="metric"><span>Priority</span><strong>${escapeHtml(form.priorityLevel.value||"Not set")}</strong></div><div class="metric"><span>Status</span><strong>${escapeHtml(getComplianceStatus(score))}</strong></div></div><h3>Critical Findings</h3>${findings.length?`<ul>${findings.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`:`<p>No critical findings were recorded.</p>`}<h3>Management Recommendation</h3><p>${escapeHtml(form.recommendedActions.value||"Management should assign owners, document corrective actions, and verify completion within the selected priority timeframe.")}</p></section><section class="page"><h2>2. Compliance Overview</h2><table><thead><tr><th>Control Area</th><th>Status</th><th>Executive Note</th></tr></thead><tbody><tr><td>Safety Procedures</td><td>${yesNoBadge(getRadioValue("proceduresFollowed")).replaceAll("report-badge","badge")}</td><td>Worker behaviour and supervision should be verified through regular inspections.</td></tr><tr><td>PPE Compliance</td><td>${yesNoBadge(["ppeHardHats","ppeBoots","ppeGloves","ppeHiVis"].every(n=>getCheckboxValue(n)==="Yes")?"Yes":"No").replaceAll("report-badge","badge")}</td><td>${escapeHtml(form.ppeIssues.value||"No PPE issues were described.")}</td></tr><tr><td>First Aid Readiness</td><td>${yesNoBadge(getRadioValue("firstAidKit")==="Yes"&&Number(form.attendants.value||0)>0&&form.certificationLevel.value!=="None"?"Yes":"No").replaceAll("report-badge","badge")}</td><td>Kit: ${escapeHtml(form.kitType.value||"Not selected")}; Attendants: ${escapeHtml(form.attendants.value||"0")}; Certification: ${escapeHtml(form.certificationLevel.value||"None")}</td></tr><tr><td>Emergency Preparedness</td><td>${yesNoBadge(getRadioValue("emergencyPlan")==="Yes"&&getRadioValue("evacProcedure")==="Yes"&&getRadioValue("emergencyContacts")==="Yes"?"Yes":"No").replaceAll("report-badge","badge")}</td><td>${escapeHtml(form.emergencyGaps.value||"No emergency gaps were described.")}</td></tr></tbody></table><h3>Site Details</h3><div class="two-col"><div class="detail"><span>Company</span>${escapeHtml(form.companyName.value)}</div><div class="detail"><span>Location</span>${escapeHtml(form.siteLocation.value)}</div><div class="detail"><span>Industry</span>${escapeHtml(form.industryType.value)}</div><div class="detail"><span>Workers</span>${escapeHtml(form.workers.value)}</div></div></section><section class="page"><h2>3. Hazard Register and Corrective Actions</h2>${hazards.length?`<table><thead><tr><th>Hazard Type</th><th>Risk</th><th>Observation</th><th>Corrective Action</th></tr></thead><tbody>${hazards.map(h=>`<tr><td>${escapeHtml(h.type)}</td><td><span class="badge ${getRiskClass(h.risk)}">${escapeHtml(h.risk)}</span></td><td>${escapeHtml(h.description||"No description provided.")}</td><td>${escapeHtml(h.action||"No action provided.")}</td></tr>`).join("")}</tbody></table>`:`<p>No hazards were recorded.</p>`}<h3>Key Issues Identified</h3><p>${escapeHtml(form.keyIssues.value||"No key issues were recorded.")}</p></section><section class="page"><h2>4. Evidence and Sign-off</h2><h3>Site Evidence</h3>${photos.length?`<div class="photos">${photos.map(src=>`<img src="${src}" alt="Site evidence photo">`).join("")}</div>`:`<p>No site evidence photos were uploaded.</p>`}<h3>Sign-off</h3><div class="two-col"><div class="detail"><span>Auditor</span>${escapeHtml(form.auditorName.value||"Not provided")}</div><div class="detail"><span>Client Representative</span>${escapeHtml(form.clientRep.value||"Not provided")}</div></div></section></article></body></html>`;}
async function openReport(){const html=generateReportHTML();const filename=`${(form.companyName.value||"Safety-Audit").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"")}-Executive-Audit-Report.pdf`;if(!window.jspdf||!window.html2canvas){const w=window.open("","_blank");if(!w){alert("Please allow pop-ups or enable internet so PDF libraries can load.");return;}w.document.write(html);w.document.close();setTimeout(()=>w.print(),600);return;}const container=document.createElement("div");container.style.position="fixed";container.style.left="-99999px";container.style.top="0";container.style.width="794px";container.innerHTML=html;document.body.appendChild(container);const {jsPDF}=window.jspdf;const pdf=new jsPDF("p","pt","a4");const pages=[...container.querySelector("#pdfReport").children];for(let i=0;i<pages.length;i++){const canvas=await html2canvas(pages[i],{scale:2,useCORS:true,backgroundColor:"#fff"});const img=canvas.toDataURL("image/jpeg",.96);const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();const ratio=Math.min(pw/canvas.width,ph/canvas.height);if(i>0)pdf.addPage();pdf.addImage(img,"JPEG",0,0,canvas.width*ratio,canvas.height*ratio);}pdf.save(filename);document.body.removeChild(container);}
form.addEventListener("submit",event=>{event.preventDefault();if(!validateCurrentPage())return;updateScore();toast.textContent="Executive PDF report downloaded.";toast.classList.remove("hidden");setTimeout(()=>toast.classList.add("hidden"),2600);openReport();});

init();
