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
  3: ["firstAidKit","attendants","certificationLevel"],
  4: ["emergencyPlan","evacProcedure","emergencyContacts"],
  8: ["keyIssues","recommendedActions","priorityLevel"],
  9: ["auditorName","clientRep"]
};

let currentPage = 0;
let signatureTouched = false;
let cameraStream = null;
let evidencePhotos = [];
let generatedSummary = {
  keyIssues: "",
  recommendedActions: ""
};

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
  setupProofUploads();
  setupPhotos();
  setupSummaryGeneration();
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
    step.addEventListener("click", () => goToPage(index));
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

  if (currentPage === 8) {
    applyGeneratedSummary();
  }

  prevBtn.style.visibility = currentPage === 0 ? "hidden" : "visible";
  nextBtn.classList.toggle("hidden", currentPage === pages.length - 1);
  submitBtn.classList.toggle("hidden", currentPage !== pages.length - 1);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToPage(targetPage) {
  if (targetPage === currentPage) return;

  if (targetPage > currentPage) {
    for (let pageIndex = currentPage; pageIndex < targetPage; pageIndex += 1) {
      currentPage = pageIndex;
      if (!validateCurrentPage()) {
        updatePage();
        return;
      }
    }
  }

  currentPage = targetPage;
  updatePage();
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
    if(answer==="Yes"&&upload&&upload.files.length===0&&upload.dataset.captured!=="true"){showFieldError(upload,"Upload proof or take a picture because this answer is Yes.");ok=false;}
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
  if(currentPage===1&&getRadioValue("immediateDanger")==="Yes"){
    const hazards=form.querySelector("[name='immediateHazards']");
    clearFieldError(hazards);
    if(!hazards.value.trim()){showFieldError(hazards,"Describe the immediate hazards before continuing.");ok=false;}
  }
  if(currentPage===3&&getRadioValue("firstAidKit")==="Yes"){
    const kitType=form.querySelector("[name='kitType']");
    clearFieldError(kitType);
    if(!kitType.value.trim()){showFieldError(kitType,"Select the available kit type.");ok=false;}
  }
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
  if (currentPage < pages.length - 1) {
    goToPage(currentPage + 1);
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

  card.querySelector("select[name='hazardType[]']").value = data.type || "";
  card.querySelector("select[name='hazardRisk[]']").value = data.risk || "";
  card.querySelector("textarea[name='hazardDescription[]']").value = data.description || "";
  card.querySelector("textarea[name='hazardAction[]']").value = data.action || "";

  hazardsList.appendChild(card);
}

document.getElementById("addHazardBtn").addEventListener("click", () => addHazard());

function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function assignCapturedFile(input, dataUrl, filename) {
  input.dataset.captured = "true";
  if (window.DataTransfer) {
    const transfer = new DataTransfer();
    transfer.items.add(dataUrlToFile(dataUrl, filename));
    input.files = transfer.files;
  }
}

async function takeCameraPhoto() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not available in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false
  });

  try {
    const track = stream.getVideoTracks()[0];
    const imageCaptureSupported = "ImageCapture" in window && track;
    if (imageCaptureSupported) {
      const imageCapture = new ImageCapture(track);
      const blob = await imageCapture.takePhoto();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.readAsDataURL(blob);
      });
    }

    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    await new Promise(resolve => {
      if (video.readyState >= 2) resolve();
      else video.onloadedmetadata = resolve;
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    stream.getTracks().forEach(track => track.stop());
  }
}

function setupProofUploads() {
  document.querySelectorAll(".mini-upload").forEach(wrap => {
    const input = wrap.querySelector("input[type='file']");
    const preview = wrap.querySelector(".proof-preview");
    const uploadBtn = wrap.querySelector(".proof-upload-btn");
    const cameraBtn = wrap.querySelector(".proof-camera-btn");

    function showPreview(src) {
      if (!preview) return;
      preview.src = src;
      preview.classList.remove("hidden");
    }

    uploadBtn?.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      input.dataset.captured = "";
      clearFieldError(input);
      const file = input.files[0];
      if (!file?.type.startsWith("image/")) {
        preview?.classList.add("hidden");
        return;
      }

      const reader = new FileReader();
      reader.onload = event => showPreview(event.target.result);
      reader.readAsDataURL(file);
    });

    cameraBtn?.addEventListener("click", async () => {
      try {
        const dataUrl = await takeCameraPhoto();
        assignCapturedFile(input, dataUrl, `${input.name || "proof"}-${Date.now()}.jpg`);
        showPreview(dataUrl);
        clearFieldError(input);
      } catch (error) {
        console.error(error);
        input.click();
        toast.textContent = "Camera could not open. Choose an image file instead.";
        toast.classList.remove("hidden");
        setTimeout(() => toast.classList.add("hidden"), 3200);
      }
    });
  });
}

function setupPhotos() {
  const input = document.getElementById("photoUpload");
  const preview = document.getElementById("photoPreview");
  const uploadBtn = document.getElementById("uploadPhotoBtn");
  const uploadZone = document.querySelector(".upload-zone");
  const openCameraBtn = document.getElementById("openCameraBtn");
  const closeCameraBtn = document.getElementById("closeCameraBtn");
  const capturePhotoBtn = document.getElementById("capturePhotoBtn");
  const cameraPanel = document.getElementById("cameraPanel");
  const video = document.getElementById("cameraStream");
  const canvas = document.getElementById("cameraCanvas");

  function renderPhotos() {
    preview.innerHTML = "";

    evidencePhotos.forEach((photo, index) => {
      const item = document.createElement("div");
      item.className = "photo-item";
      item.innerHTML = `
        <img src="${photo.src}" alt="${escapeHtml(photo.name)}">
        <button type="button" class="remove-photo" aria-label="Remove ${escapeHtml(photo.name)}">×</button>
      `;
      item.querySelector(".remove-photo").addEventListener("click", () => {
        evidencePhotos.splice(index, 1);
        renderPhotos();
      });
      preview.appendChild(item);
    });

    updateScore();
  }

  function addPhoto(src, name) {
    evidencePhotos.push({ src, name });
    renderPhotos();
  }

  function readImageFile(file) {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = event => addPhoto(event.target.result, file.name);
    reader.readAsDataURL(file);
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    video.srcObject = null;
    cameraPanel.classList.add("hidden");
  }

  uploadBtn.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    [...input.files].forEach(readImageFile);
    input.value = "";
  });

  uploadZone?.addEventListener("dragover", event => {
    event.preventDefault();
    uploadZone.classList.add("dragging");
  });

  uploadZone?.addEventListener("dragleave", () => uploadZone.classList.remove("dragging"));

  uploadZone?.addEventListener("drop", event => {
    event.preventDefault();
    uploadZone.classList.remove("dragging");
    [...event.dataTransfer.files].forEach(readImageFile);
  });

  openCameraBtn.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.textContent = "Camera access is not available in this browser. Use Upload Photos instead.";
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 3200);
      return;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      video.srcObject = cameraStream;
      cameraPanel.classList.remove("hidden");
    } catch (error) {
      console.error(error);
      toast.textContent = "Camera permission was blocked or no camera was found.";
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 3200);
    }
  });

  capturePhotoBtn.addEventListener("click", () => {
    if (!cameraStream || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    addPhoto(canvas.toDataURL("image/jpeg", 0.9), `Camera photo ${evidencePhotos.length + 1}`);
  });

  closeCameraBtn.addEventListener("click", stopCamera);
  window.addEventListener("beforeunload", stopCamera);
}

function updateScore() {
  let points = 0;
  let possible = 0;

  const add = condition => {
    possible += 1;
    if (condition) points += 1;
  };

  add(Boolean(getFieldValue("companyName").trim()));
  add(Boolean(getFieldValue("siteLocation").trim()));
  const riskLevel = getRadioValue("riskLevel");
  add(Boolean(riskLevel) && riskLevel !== "High");
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
    const previousSignature = signatureTouched ? canvas.toDataURL("image/png") : "";
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#075E67";

    if (previousSignature) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = previousSignature;
    }
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
    event.preventDefault();
    signatureTouched = true;
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
    signatureTouched = false;
  });
}

function getRadioValue(name) {
  return form.querySelector(`input[name='${name}']:checked`)?.value || "";
}

function getCheckboxValue(name) {
  return form.querySelector(`input[name='${name}']`)?.checked ? "Yes" : "No";
}

function getFieldValue(name) {
  return form.elements[name]?.value || "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function yesNoBadge(value) {
  const yes = value === "Yes";
  return `<span class="badge ${yes ? "ok" : "bad"}">${yes ? "Yes" : "No"}</span>`;
}

function collectHazards() {
  return [...document.querySelectorAll(".hazard-card")]
    .map(card => ({
      type: card.querySelector("select[name='hazardType[]']").value,
      risk: card.querySelector("select[name='hazardRisk[]']").value,
      description: card.querySelector("textarea[name='hazardDescription[]']").value.trim(),
      action: card.querySelector("textarea[name='hazardAction[]']").value.trim()
    }))
    .filter(hazard => hazard.type || hazard.risk || hazard.description || hazard.action);
}

function collectPhotos() {
  return evidencePhotos.map(photo => photo.src);
}

function getSignatureImage() {
  return signatureTouched ? document.getElementById("signaturePad").toDataURL("image/png") : "";
}

function addFinding(items, insight, action) {
  items.insights.push(insight);
  items.actions.push(action);
}

function buildGeneratedSummary() {
  const items = { insights: [], actions: [] };
  const riskLevel = getRadioValue("riskLevel");
  const ppeLabels = {
    ppeHardHats: "hard hats",
    ppeBoots: "safety boots",
    ppeGloves: "gloves",
    ppeHiVis: "high visibility clothing"
  };
  const complianceLabels = {
    safetyProgram: "safety program",
    hazardAssessments: "hazard assessments",
    trainingRecords: "training records",
    incidentReporting: "incident reporting system",
    safetyMeetings: "safety meetings"
  };

  if (riskLevel === "High") {
    addFinding(items, "Overall site risk is marked High.", "Stop or restrict affected work until critical hazards are controlled and a supervisor verifies the area.");
  } else if (riskLevel === "Medium") {
    addFinding(items, "Overall site risk is marked Medium.", "Assign corrective-action owners and verify controls during the next supervisor inspection.");
  }

  if (getRadioValue("proceduresFollowed") === "No") {
    addFinding(items, "Workers are not consistently following documented safety procedures.", "Review procedures with workers, document coaching, and complete a supervisor follow-up observation.");
  }

  if (getRadioValue("immediateDanger") === "Yes") {
    const detail = getFieldValue("immediateHazards").trim();
    addFinding(items, `Immediate danger was reported${detail ? `: ${detail}` : "."}`, "Control the immediate danger before work continues and document the interim control used.");
  }

  const missingPpe = Object.entries(ppeLabels)
    .filter(([name]) => getCheckboxValue(name) === "No")
    .map(([, label]) => label);
  if (missingPpe.length) {
    addFinding(items, `PPE compliance gap: missing or unconfirmed ${missingPpe.join(", ")}.`, "Provide or enforce the required PPE and re-check worker compliance before the task resumes.");
  }

  const ppeIssues = getFieldValue("ppeIssues").trim();
  if (ppeIssues) {
    addFinding(items, `PPE issue noted: ${ppeIssues}`, "Correct the observed PPE issue and confirm the control with the affected worker group.");
  }

  if (getRadioValue("firstAidKit") === "No") {
    addFinding(items, "First aid kit is not available.", "Provide the required first aid kit for the site and verify it is stocked, visible, and accessible.");
  }

  if (Number(getFieldValue("attendants") || 0) === 0) {
    addFinding(items, "No first aid attendant has been recorded.", "Assign a trained first aid attendant for the shift and document their name and certification level.");
  }

  if (getFieldValue("certificationLevel") === "None") {
    addFinding(items, "No first aid certification level has been recorded.", "Confirm first aid certification requirements for the crew size and update the site records.");
  }

  if (getRadioValue("emergencyPlan") === "No") {
    addFinding(items, "Emergency plan is not available.", "Create or post the emergency plan and review it with workers at the next safety meeting.");
  }

  if (getRadioValue("evacProcedure") === "No") {
    addFinding(items, "Evacuation procedure is not posted.", "Post evacuation procedures in a visible location and confirm workers know the muster point.");
  }

  if (getRadioValue("emergencyContacts") === "No") {
    addFinding(items, "Emergency contacts are not displayed.", "Post current emergency contacts where workers can access them quickly.");
  }

  const emergencyGaps = getFieldValue("emergencyGaps").trim();
  if (emergencyGaps) {
    addFinding(items, `Emergency planning gap noted: ${emergencyGaps}`, "Assign an owner to close the emergency planning gap and verify completion with photo or document evidence.");
  }

  collectHazards().forEach(hazard => {
    const prefix = hazard.risk ? `${hazard.risk}-risk hazard` : "Hazard";
    addFinding(
      items,
      `${prefix} recorded${hazard.type ? ` (${hazard.type})` : ""}: ${hazard.description || "No description provided."}`,
      hazard.action || "Assign a corrective action, owner, and due date for the recorded hazard."
    );
  });

  Object.entries(complianceLabels).forEach(([name, label]) => {
    if (getCheckboxValue(name) === "No") {
      addFinding(items, `WorkSafeBC compliance item not confirmed: ${label}.`, `Confirm, document, or implement the ${label} and keep evidence with the audit record.`);
    }
  });

  if (!items.insights.length) {
    items.insights.push("No major compliance gaps were identified from the selected audit answers.");
    items.actions.push("Continue routine inspections, keep documentation current, and monitor controls during regular safety meetings.");
  }

  return {
    keyIssues: items.insights.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    recommendedActions: items.actions.map((item, index) => `${index + 1}. ${item}`).join("\n")
  };
}

function getGeneratedPriority(summary) {
  if (/Immediate danger|Overall site risk is marked High|High-risk hazard|First aid kit is not available/i.test(summary.keyIssues)) {
    return "Immediate";
  }
  if (/Medium-risk hazard|Overall site risk is marked Medium|not available|not posted|not displayed|not confirmed|No first aid/i.test(summary.keyIssues)) {
    return "Within 7 days";
  }
  return "Within 30 days";
}

function shouldReplaceGeneratedField(field, previousValue) {
  const value = field.value.trim();
  return !value || value === previousValue;
}

function applyGeneratedSummary(force = false) {
  const keyIssuesField = form.elements.keyIssues;
  const actionsField = form.elements.recommendedActions;
  const priorityField = form.elements.priorityLevel;
  const nextSummary = buildGeneratedSummary();

  if (force || shouldReplaceGeneratedField(keyIssuesField, generatedSummary.keyIssues)) {
    keyIssuesField.value = nextSummary.keyIssues;
  }

  if (force || shouldReplaceGeneratedField(actionsField, generatedSummary.recommendedActions)) {
    actionsField.value = nextSummary.recommendedActions;
  }

  if (force || !priorityField.value) {
    priorityField.value = getGeneratedPriority(nextSummary);
  }

  generatedSummary = nextSummary;
  updateScore();
}

function setupSummaryGeneration() {
  document.getElementById("generateSummaryBtn")?.addEventListener("click", () => applyGeneratedSummary(true));
  form.addEventListener("change", () => {
    if (currentPage === 8) applyGeneratedSummary();
  });
}

function getRiskClass(risk){return risk==="High"?"bad":risk==="Medium"?"warn":"ok";}
function getComplianceStatus(score){const v=Number(String(score).replace("%",""));return v>=80?"Compliant / Monitor":v>=60?"Partially Compliant":"Needs Immediate Improvement";}
function getExecutiveSummary(score,hazards){const v=Number(String(score).replace("%",""));const high=hazards.filter(h=>h.risk==="High").length;const med=hazards.filter(h=>h.risk==="Medium").length;if(v>=80)return "The site demonstrates a strong safety posture with most core compliance controls in place. Continued monitoring, documentation upkeep, and routine supervisory verification are recommended.";if(v>=60)return "The site shows a moderate level of compliance with notable gaps that should be corrected within the assigned priority window.";return `The audit indicates significant compliance and operational safety gaps. Immediate management attention is recommended for first aid, PPE, emergency preparedness, documentation, and hazard-control items. The hazard register includes ${high} high-risk and ${med} medium-risk item(s).`;}
function generateReportHTML() {
  updateScore();
  const score = liveScore.textContent;
  const hazards = collectHazards();
  const photos = collectPhotos();
  const signature = getSignatureImage();
  const company = getFieldValue("companyName") || "Safety Audit Report";
  const date = getFieldValue("auditDate") || new Date().toISOString().slice(0, 10);
  const logoSrc = new URL("LeanOS_logo.png", location.href).href;
  const siteLocation = getFieldValue("siteLocation") || "Not provided";
  const industryType = getFieldValue("industryType") || "Not provided";
  const supervisorName = getFieldValue("supervisorName") || "Not provided";
  const workers = getFieldValue("workers") || "0";
  const priorityLevel = getFieldValue("priorityLevel") || "Not set";
  const recommendedActions = getFieldValue("recommendedActions") || "Management should assign owners, document corrective actions, and verify completion within the selected priority timeframe.";
  const ppeIssues = getFieldValue("ppeIssues") || "No PPE issues were described.";
  const kitType = getFieldValue("kitType") || "Not selected";
  const attendants = getFieldValue("attendants") || "0";
  const certificationLevel = getFieldValue("certificationLevel") || "None";
  const emergencyGaps = getFieldValue("emergencyGaps") || "No emergency gaps were described.";
  const keyIssues = getFieldValue("keyIssues") || "No key issues were recorded.";
  const auditorName = getFieldValue("auditorName") || "Auditor";
  const clientRep = getFieldValue("clientRep") || "Client Representative";
  const findings = [
    getRadioValue("riskLevel") === "High" ? "Overall site risk is marked High." : "",
    getRadioValue("proceduresFollowed") === "No" ? "Workers are not consistently following safety procedures." : "",
    getRadioValue("immediateDanger") === "Yes" ? `Immediate danger reported: ${getFieldValue("immediateHazards") || "Details not provided."}` : "",
    getRadioValue("firstAidKit") === "No" ? "First aid kit is not available." : "",
    Number(getFieldValue("attendants") || 0) === 0 ? "No first aid attendant has been recorded." : "",
    getFieldValue("certificationLevel") === "None" ? "No first aid certification level has been recorded." : "",
    getRadioValue("emergencyPlan") === "No" ? "Emergency plan is not available." : "",
    getRadioValue("evacProcedure") === "No" ? "Evacuation procedure is not posted." : "",
    getRadioValue("emergencyContacts") === "No" ? "Emergency contacts are not displayed." : "",
    getCheckboxValue("safetyProgram") === "No" ? "Safety program is not confirmed." : "",
    getCheckboxValue("trainingRecords") === "No" ? "Training records are not confirmed." : ""
  ].filter(Boolean);

  return `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:white;color:#21313C;font-family:"Open Sans",Calibri,Arial,sans-serif}.pdf-report{width:794px;margin:0 auto}.cover{min-height:1040px;padding:56px;color:white;background:linear-gradient(145deg,#075E67,#04464d);display:flex;flex-direction:column;justify-content:space-between}.report-logo{width:128px;height:128px;object-fit:contain;border-radius:8px;background:white;padding:10px;margin-bottom:28px}.cover h1{margin:0;font-size:52px;line-height:1.02;letter-spacing:0}.meta{margin-top:24px;color:rgba(255,255,255,.82);font-size:16px;line-height:1.8}.score-hero{margin-top:42px;padding:28px;border-radius:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18)}.score-hero strong{display:block;margin:12px 0;font-size:86px;line-height:.95;letter-spacing:0}.page{padding:46px 52px;min-height:1040px}h2{margin:0 0 18px;color:#075E67;font-size:30px;letter-spacing:0}h3{margin:24px 0 12px;color:#21313C;font-size:18px}p{color:#667085;line-height:1.65}.box,.metric,.detail{background:#F4F8F8;border:1px solid #d9e0ea;border-radius:8px;padding:16px}.box{padding:22px}.metrics,.two-col{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.two-col{grid-template-columns:1fr 1fr}.metric span,.detail span{display:block;color:#667085;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}.metric strong{display:block;color:#075E67;font-size:20px}.badge{display:inline-flex;padding:6px 10px;border-radius:999px;font-weight:800;font-size:12px}.ok{color:#166534;background:#dcfce7}.bad{color:#991b1b;background:#fee2e2}.warn{color:#92400e;background:#fef3c7}.neutral{color:#344054;background:#e5e7eb}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}th,td{text-align:left;padding:12px;border-bottom:1px solid #d9e0ea;vertical-align:top}th{color:#667085;background:#F4F8F8;font-size:10px;text-transform:uppercase;letter-spacing:.08em}ul{line-height:1.7}.photos{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.photos img{width:100%;aspect-ratio:1.2;object-fit:cover;border-radius:8px;border:1px solid #d9e0ea}.signature-img{width:100%;height:130px;object-fit:contain;border:1px solid #d9e0ea;border-radius:8px;background:#fff}</style></head><body><article id="pdfReport" class="pdf-report"><section class="cover"><div><img class="report-logo" src="${escapeHtml(logoSrc)}" alt="LeanOS Consultants logo"><p style="color:rgba(255,255,255,.72);font-weight:800;letter-spacing:.12em;text-transform:uppercase">Executive Safety Audit Report</p><h1>${escapeHtml(company)}</h1><div class="meta">Site: ${escapeHtml(siteLocation)}<br>Industry: ${escapeHtml(industryType)}<br>Audit Date: ${escapeHtml(date)}<br>Supervisor: ${escapeHtml(supervisorName)}</div><div class="score-hero"><span>Compliance Score</span><strong>${escapeHtml(score)}</strong><div>${escapeHtml(scoreLabel.textContent)} &middot; ${escapeHtml(getComplianceStatus(score))}</div></div></div><div class="meta">Prepared by ${escapeHtml(auditorName)} for ${escapeHtml(clientRep)}</div></section><section class="page"><h2>1. Executive Summary</h2><div class="box"><p>${escapeHtml(getExecutiveSummary(score,hazards))}</p></div><div class="metrics"><div class="metric"><span>Workers</span><strong>${escapeHtml(workers)}</strong></div><div class="metric"><span>Priority</span><strong>${escapeHtml(priorityLevel)}</strong></div><div class="metric"><span>Status</span><strong>${escapeHtml(getComplianceStatus(score))}</strong></div></div><h3>Critical Findings</h3>${findings.length?`<ul>${findings.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`:`<p>No critical findings were recorded.</p>`}<h3>Management Recommendation</h3><p>${escapeHtml(recommendedActions)}</p></section><section class="page"><h2>2. Compliance Overview</h2><table><thead><tr><th>Control Area</th><th>Status</th><th>Executive Note</th></tr></thead><tbody><tr><td>Safety Procedures</td><td>${yesNoBadge(getRadioValue("proceduresFollowed"))}</td><td>Worker behaviour and supervision should be verified through regular inspections.</td></tr><tr><td>PPE Compliance</td><td>${yesNoBadge(["ppeHardHats","ppeBoots","ppeGloves","ppeHiVis"].every(n=>getCheckboxValue(n)==="Yes")?"Yes":"No")}</td><td>${escapeHtml(ppeIssues)}</td></tr><tr><td>First Aid Readiness</td><td>${yesNoBadge(getRadioValue("firstAidKit")==="Yes"&&Number(attendants||0)>0&&certificationLevel!=="None"?"Yes":"No")}</td><td>Kit: ${escapeHtml(kitType)}; Attendants: ${escapeHtml(attendants)}; Certification: ${escapeHtml(certificationLevel)}</td></tr><tr><td>Emergency Preparedness</td><td>${yesNoBadge(getRadioValue("emergencyPlan")==="Yes"&&getRadioValue("evacProcedure")==="Yes"&&getRadioValue("emergencyContacts")==="Yes"?"Yes":"No")}</td><td>${escapeHtml(emergencyGaps)}</td></tr></tbody></table><h3>Site Details</h3><div class="two-col"><div class="detail"><span>Company</span>${escapeHtml(company)}</div><div class="detail"><span>Location</span>${escapeHtml(siteLocation)}</div><div class="detail"><span>Industry</span>${escapeHtml(industryType)}</div><div class="detail"><span>Workers</span>${escapeHtml(workers)}</div></div></section><section class="page"><h2>3. Hazard Register and Corrective Actions</h2>${hazards.length?`<table><thead><tr><th>Hazard Type</th><th>Risk</th><th>Observation</th><th>Corrective Action</th></tr></thead><tbody>${hazards.map(h=>`<tr><td>${escapeHtml(h.type)}</td><td><span class="badge ${getRiskClass(h.risk)}">${escapeHtml(h.risk)}</span></td><td>${escapeHtml(h.description||"No description provided.")}</td><td>${escapeHtml(h.action||"No action provided.")}</td></tr>`).join("")}</tbody></table>`:`<p>No hazards were recorded.</p>`}<h3>Key Issues Identified</h3><p>${escapeHtml(keyIssues)}</p></section><section class="page"><h2>4. Evidence and Sign-off</h2><h3>Site Evidence</h3>${photos.length?`<div class="photos">${photos.map(src=>`<img src="${src}" alt="Site evidence photo">`).join("")}</div>`:`<p>No site evidence photos were uploaded.</p>`}<h3>Sign-off</h3><div class="two-col"><div class="detail"><span>Auditor</span>${escapeHtml(auditorName === "Auditor" ? "Not provided" : auditorName)}</div><div class="detail"><span>Client Representative</span>${escapeHtml(clientRep === "Client Representative" ? "Not provided" : clientRep)}</div></div>${signature?`<h3>Signature</h3><img class="signature-img" src="${signature}" alt="Auditor signature">`:""}</section></article></body></html>`;
}

function downloadHtmlReport(html, baseName) {
  if (typeof Blob === "function" && typeof URL !== "undefined" && URL.createObjectURL) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "download";
  }

  const reportWindow = window.open("", "_blank");
  if (reportWindow) {
    reportWindow.document.write(html);
    reportWindow.document.close();
    return "window";
  }

  showInlineReport(html);
  return "inline";
}

function showInlineReport(html) {
  let preview = document.getElementById("inlineReportPreview");
  if (!preview) {
    preview = document.createElement("section");
    preview.id = "inlineReportPreview";
    preview.className = "inline-report-preview";
    document.body.appendChild(preview);
  }

  preview.innerHTML = `
    <div class="inline-report-toolbar">
      <strong>Generated report preview</strong>
      <button type="button" class="primary-btn" id="printInlineReport">Print / Save PDF</button>
    </div>
    <iframe title="Generated safety audit report"></iframe>
  `;

  const frame = preview.querySelector("iframe");
  frame.srcdoc = html;
  preview.querySelector("#printInlineReport").addEventListener("click", () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  });
  preview.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function openReport(){
  const html=generateReportHTML();
  const baseName=(getFieldValue("companyName")||"Safety-Audit").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"")||"Safety-Audit";
  const filename=`${baseName}-Executive-Audit-Report.pdf`;

  if(!window.jspdf||!window.html2canvas){
    return downloadHtmlReport(html, `${baseName}-Executive-Audit-Report`);
  }

  const container=document.createElement("div");
  try{
    container.style.position="fixed";
    container.style.left="-99999px";
    container.style.top="0";
    container.style.width="794px";
    container.innerHTML=html;
    document.body.appendChild(container);
    await Promise.all([...container.querySelectorAll("img")].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF("p","pt","a4");
    const reportPages=[...container.querySelector("#pdfReport").children];
    for(let i=0;i<reportPages.length;i++){
      const canvas=await html2canvas(reportPages[i],{scale:2,useCORS:true,backgroundColor:"#fff"});
      const img=canvas.toDataURL("image/jpeg",.96);
      const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();
      const ratio=Math.min(pw/canvas.width,ph/canvas.height);
      if(i>0)pdf.addPage();
      pdf.addImage(img,"JPEG",0,0,canvas.width*ratio,canvas.height*ratio);
    }
    pdf.save(filename);
    return "pdf";
  }catch(error){
    console.error(error);
    return downloadHtmlReport(html, `${baseName}-Executive-Audit-Report`);
  }finally{
    container.remove();
  }
}
form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!validateCurrentPage())return;
  updateScore();
  submitBtn.disabled=true;
  toast.textContent="Preparing executive PDF report...";
  toast.classList.remove("hidden");
  try{
    const format=await openReport();
    const messages={
      pdf:"Executive PDF report downloaded.",
      download:"Executive HTML report downloaded; PDF libraries were unavailable.",
      window:"Executive report opened in a new tab.",
      inline:"Report preview opened below. Use Print / Save PDF."
    };
    toast.textContent=messages[format]||"Executive report generated.";
  }catch(error){
    console.error(error);
    try {
      showInlineReport(generateReportHTML());
      toast.textContent="Report preview opened below. Use Print / Save PDF.";
    } catch (previewError) {
      console.error(previewError);
      toast.textContent="Report could not be generated. Check required fields and try again.";
    }
  }finally{
    submitBtn.disabled=false;
    setTimeout(()=>toast.classList.add("hidden"),2800);
  }
});

init();
