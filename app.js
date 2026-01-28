// ================= SERVICE WORKER =================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

// ================= FAKE RINGTONE + VIBRATION =================
const ringtone = new Audio("./ringtone.mp3");
ringtone.loop = true;

// ===== MOBILE AUDIO UNLOCK (MANDATORY) =====
let audioUnlocked = false;

document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("touchstart", unlockAudio, { once: true });

function unlockAudio() {
  ringtone.play()
    .then(() => {
      ringtone.pause();
      ringtone.currentTime = 0;
      audioUnlocked = true;
      console.log("🔊 Audio unlocked");
    })
    .catch(err => console.log("Audio unlock blocked", err));
}

// ================= FIREBASE IMPORTS =================
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { db } from "./firebase.js";

// ================= DOM ELEMENTS =================
const sosBtn = document.getElementById("sosBtn");
const statusText = document.getElementById("statusText");
const actions = document.getElementById("actions");
const shareLink = document.getElementById("shareLink");

const navButtons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");

const contactList = document.getElementById("contactList");
const addContactBtn = document.getElementById("addContactBtn");
const contactName = document.getElementById("contactName");
const contactPhone = document.getElementById("contactPhone");

// Fake call elements
const triggerFakeCallBtn = document.getElementById("triggerFakeCall");
const fakeCallerInput = document.getElementById("fakeCallerName");
const fakeCallOverlay = document.getElementById("fakeCallOverlay");
const callOngoingOverlay = document.getElementById("callOngoingOverlay");
const incomingCallerName = document.getElementById("incomingCallerName");
const ongoingCallerName = document.getElementById("ongoingCallerName");
const acceptCallBtn = document.getElementById("acceptCall");
const declineCallBtn = document.getElementById("declineCall");
const endCallBtn = document.getElementById("endCall");

// ================= SOS HOLD =================
let holdTimer = null;
const HOLD_TIME = 3000;

sosBtn?.addEventListener("mousedown", startHold);
sosBtn?.addEventListener("touchstart", startHold, { passive: false });
sosBtn?.addEventListener("mouseup", cancelHold);
sosBtn?.addEventListener("mouseleave", cancelHold);
sosBtn?.addEventListener("touchend", cancelHold);

function startHold(e) {
  e.preventDefault();
  if (sosBtn.disabled) return;

  statusText.innerText = "Hold for 3 seconds…";
  holdTimer = setTimeout(triggerSOS, HOLD_TIME);
}

function cancelHold() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
}

function triggerSOS() {
  sosBtn.disabled = true;
  statusText.innerText = "Fetching location…";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      await addDoc(collection(db, "sos_events"), {
        latitude,
        longitude,
        timestamp: serverTimestamp()
      });

      const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
      const msg = `I need help. My live location: ${mapLink}`;
      shareLink.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      shareLink.target = "_blank";

      statusText.innerText = "Emergency alert sent.";
      actions.classList.remove("d-none");
    },
    () => {
      statusText.innerText = "Location permission denied.";
      sosBtn.disabled = false;
    }
  );
}

function resetSOSUI() {
  sosBtn.disabled = false;
  statusText.innerText = "Tap and hold SOS in case of emergency";
  actions.classList.add("d-none");
}

// ================= CONTACTS =================
async function loadContacts() {
  contactList.innerHTML = "";

  const q = query(
    collection(db, "emergency_contacts"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;

    const item = document.createElement("div");
    item.className = "call-item";
    item.innerHTML = `
      <div>
        <strong>${data.name}</strong>
        <span>${data.phone}</span>
      </div>
      <div class="call-actions">
        <button>📞</button>
        <button>🗑️</button>
      </div>
    `;

    item.querySelector("button").onclick = () =>
      window.location.href = `tel:${data.phone}`;

    item.querySelectorAll("button")[1].onclick = async () => {
      await deleteDoc(doc(db, "emergency_contacts", id));
      loadContacts();
    };

    contactList.appendChild(item);
  });
}

addContactBtn?.addEventListener("click", async () => {
  if (!contactName.value || !contactPhone.value) return;

  await addDoc(collection(db, "emergency_contacts"), {
    name: contactName.value,
    phone: contactPhone.value,
    createdAt: serverTimestamp()
  });

  contactName.value = "";
  contactPhone.value = "";
  loadContacts();
});

// ================= FAKE CALL =================
triggerFakeCallBtn?.addEventListener("click", () => {
  const name = fakeCallerInput.value.trim();
  if (!name) return alert("Enter caller name");

  incomingCallerName.innerText = name;
  fakeCallOverlay.classList.remove("d-none");

  if (audioUnlocked) {
    ringtone.currentTime = 0;
    ringtone.play().catch(() => {});
  }

  navigator.vibrate?.([800, 400, 800]);
});

function stopRingtone() {
  ringtone.pause();
  ringtone.currentTime = 0;
  navigator.vibrate?.(0);
}

acceptCallBtn?.addEventListener("click", () => {
  stopRingtone();
  fakeCallOverlay.classList.add("d-none");
  ongoingCallerName.innerText = incomingCallerName.innerText;
  callOngoingOverlay.classList.remove("d-none");
});

declineCallBtn?.addEventListener("click", () => {
  stopRingtone();
  fakeCallOverlay.classList.add("d-none");
});

endCallBtn?.addEventListener("click", () => {
  stopRingtone();
  callOngoingOverlay.classList.add("d-none");
});

// ================= NAVIGATION =================
navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    screens.forEach(s => s.classList.remove("active"));
    navButtons.forEach(b => b.classList.remove("active"));

    document.getElementById(btn.dataset.screen).classList.add("active");
    btn.classList.add("active");

    if (btn.dataset.screen === "homeScreen") resetSOSUI();
    if (btn.dataset.screen === "contactsScreen") loadContacts();
  });
});
