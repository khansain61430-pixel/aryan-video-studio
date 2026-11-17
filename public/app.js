const $ = (id) => document.getElementById(id);
let mode = "image", aspectRatio = "adaptive", duration = 5, selectedFile = null, uploadedPath = null;

function setStatus(title, message, details = "", badge = "READY") {
  $("statusPanel").hidden = false;
  $("statusTitle").textContent = title;
  $("statusMessage").textContent = message;
  $("statusDetails").textContent = details;
  $("statusBadge").textContent = badge;
}
document.querySelectorAll(".mode-tab").forEach(button => button.addEventListener("click", () => {
  mode = button.dataset.mode;
  document.querySelectorAll(".mode-tab").forEach(tab => {
    const active = tab === button;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  $("imageMode").hidden = mode !== "image";
  $("promptStep").textContent = mode === "image" ? "03" : "02";
  $("generateBtn").innerHTML = `Prepare video <span>↗</span>`;
  $("statusPanel").hidden = true;
}));
function wireChoices(id, setter) {
  const group = $(id);
  group.addEventListener("click", event => {
    const button = event.target.closest("button[data-value]");
    if (!button) return;
    group.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
    setter(button.dataset.value);
  });
}
wireChoices("ratioChoices", value => aspectRatio = value);
wireChoices("durationChoices", value => duration = Number(value));
$("prompt").addEventListener("input", () => {
  $("charCount").textContent = `${$("prompt").value.length} / 2000`;
});
function clearImage() {
  selectedFile = null; uploadedPath = null; $("imageFile").value = "";
  $("imagePreviewWrap").hidden = true; $("uploadZone").hidden = false;
}
$("imageFile").addEventListener("change", () => {
  const file = $("imageFile").files[0];
  if (!file) return;
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
    setStatus("Unsupported image", "Please select a JPG, PNG, or WebP image."); clearImage(); return;
  }
  if (file.size > 15 * 1024 * 1024) {
    setStatus("Image is too large", "Please choose an image smaller than 15 MB."); clearImage(); return;
  }
  selectedFile = file;
  $("imagePreview").src = URL.createObjectURL(file);
  $("imageName").textContent = file.name;
  $("imageSize").textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  $("uploadZone").hidden = true; $("imagePreviewWrap").hidden = false; $("statusPanel").hidden = true;
});
$("removeImage").addEventListener("click", clearImage);
const zone = $("uploadZone");
["dragenter","dragover"].forEach(name => zone.addEventListener(name, e => { e.preventDefault(); zone.classList.add("dragging"); }));
["dragleave","drop"].forEach(name => zone.addEventListener(name, e => { e.preventDefault(); zone.classList.remove("dragging"); }));
zone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const transfer = new DataTransfer(); transfer.items.add(file); $("imageFile").files = transfer.files;
  $("imageFile").dispatchEvent(new Event("change"));
});
$("generateBtn").addEventListener("click", async () => {
  const prompt = $("prompt").value.trim();
  if (!prompt) return setStatus("Prompt required", "Please describe what should happen in your video.", "", "ACTION NEEDED");
  if (mode === "image" && !selectedFile) return setStatus("Image required", "Choose one image from your computer first.", "", "ACTION NEEDED");
  const button = $("generateBtn"); button.disabled = true; button.textContent = "Preparing...";
  try {
    if (mode === "image" && !uploadedPath) {
      const form = new FormData(); form.append("image", selectedFile);
      const uploadResponse = await fetch("/api/upload-image", { method: "POST", body: form });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData.error || "Image upload failed.");
      uploadedPath = uploadData.previewUrl;
    }
    const modeName = mode === "image" ? "Image to Video" : "Prompt to Video";
    setStatus("Workspace ready", `${modeName} settings are prepared. Kling video generation is not connected yet.`,
      `Mode: ${modeName}\nPrompt: ${prompt}\nImage: ${mode === "image" ? "Selected and saved locally" : "Not required"}\nResolution: 720p\nLength: ${duration} sec\nAspect ratio: ${aspectRatio}\n\nNext phase: connect secure media hosting and Kling API.`, "NOT CONNECTED");
  } catch (error) {
    setStatus("Could not prepare request", error.message, "", "ERROR");
  } finally {
    button.disabled = false; button.innerHTML = `Prepare video <span>↗</span>`;
  }
});

// Video gallery: files are stored in the local project folder and remain after restart.
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function renderGallery(videos) {
  const grid = $("videoGrid");
  if (!videos.length) {
    grid.innerHTML = `<div class="gallery-empty"><span>▶</span><strong>No videos saved yet</strong><p>Add a video from your computer. When Kling is connected, generated videos can be added here automatically.</p></div>`;
    return;
  }
  grid.innerHTML = videos.map(video => `
    <article class="video-card" data-id="${escapeHtml(video.id)}">
      <div class="video-frame"><video controls preload="metadata" src="${escapeHtml(video.url)}"></video></div>
      <div class="video-card-info"><strong title="${escapeHtml(video.name)}">${escapeHtml(video.name)}</strong><span>${formatSize(video.size)} · ${new Date(video.createdAt).toLocaleDateString()}</span></div>
      <div class="video-card-actions"><a class="download-video" href="${escapeHtml(video.url)}" download="${escapeHtml(video.name)}">↓ Download</a><button class="delete-video" type="button" data-delete="${escapeHtml(video.id)}">Delete</button></div>
    </article>`).join("");
}
async function loadGallery() {
  try {
    const response = await fetch("/api/videos");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load gallery.");
    renderGallery(data.videos || []);
    $("galleryNotice").textContent = `${(data.videos || []).length} saved video${(data.videos || []).length === 1 ? "" : "s"} in your local gallery.`;
  } catch (error) {
    $("galleryNotice").textContent = error.message;
  }
}
$("videoFile").addEventListener("change", async () => {
  const file = $("videoFile").files[0];
  if (!file) return;
  if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
    $("galleryNotice").textContent = "Please choose an MP4, WebM, or MOV video."; $("videoFile").value = ""; return;
  }
  if (file.size > 500 * 1024 * 1024) {
    $("galleryNotice").textContent = "This video is larger than the 500 MB limit."; $("videoFile").value = ""; return;
  }
  const form = new FormData(); form.append("video", file);
  $("galleryNotice").textContent = "Adding your video to the gallery...";
  try {
    const response = await fetch("/api/videos", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Video upload failed.");
    $("galleryNotice").textContent = "Video added successfully. You can preview or download it below.";
    await loadGallery();
  } catch (error) {
    $("galleryNotice").textContent = error.message;
  } finally {
    $("videoFile").value = "";
  }
});
$("videoGrid").addEventListener("click", async event => {
  const button = event.target.closest("button[data-delete]");
  if (!button) return;
  if (!confirm("Delete this video from your gallery?")) return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/videos/${encodeURIComponent(button.dataset.delete)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not delete video.");
    await loadGallery();
  } catch (error) {
    $("galleryNotice").textContent = error.message;
    button.disabled = false;
  }
});
loadGallery();
