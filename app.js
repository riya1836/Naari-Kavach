if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

// ================= FAKE RINGTONE + VIBRATION =================
const ringtone = new Audio("./ringtone.mp3");
ringtone.loop = true;


// ================= IMPORTS =================
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

console.log("app.js loaded");

// ===== AUDIO UNLOCK FOR MOBILE (IMPORTANT) =====
let audioUnlocked = false;

document.addEventListener("click", () => {
  if (audioUnlocked) return;

  ringtone.play()
    .then(() => {
      ringtone.pause();
      ringtone.currentTime = 0;
      audioUnlocked = true;
      console.log("🔊 Audio unlocked");
    })
    .catch(() => {
      console.log("Audio unlock blocked");
    });
}, { once: true });


// ================= DOM ELEMENTS =================
const sosBtn = document.getElementById("sosBtn");
const statusText = document.getElementById("statusText");
const actions = document.getElementById("actions");

const navButtons = document.querySelectorAll(".nav-btn");
const screens = document.querySelectorAll(".screen");

const contactList = document.getElementById("contactList");
const addContactBtn = document.getElementById("addContactBtn");

const shareLink = document.getElementById("shareLink");


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
  clearTimeout(holdTimer);
}

function triggerSOS() {
  sosBtn.disabled = true;
  statusText.innerText = "Fetching location…";

  if (!navigator.geolocation) {
    statusText.innerText = "Location not supported.";
    sosBtn.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      try {
        await addDoc(collection(db, "sos_events"), {
          latitude: lat,
          longitude: lng,
          status: "triggered",
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error("Firebase error:", err);
      }

      const mapLink = `https://maps.google.com/?q=${lat},${lng}`;
      const message = `I need help. My live location: ${mapLink}`;
      const whatsappURL = `https://wa.me/?text=${encodeURIComponent(message)}`;

      // ✅ SET ONLY, DO NOT OPEN
      shareLink.href = whatsappURL;
      shareLink.target = "_blank";

      statusText.innerText = "Emergency alert sent.";
      actions.classList.remove("d-none");
    },
    (error) => {
      console.error(error);
      statusText.innerText = "Location permission denied.";
      sosBtn.disabled = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
}


function resetSOSUI() {
  sosBtn.disabled = false;
  statusText.innerText = "Tap and hold SOS in case of emergency";
  actions?.classList.add("d-none");
}

// ================= CONTACTS =================
async function loadContacts() {
  if (!contactList) return;

  contactList.innerHTML = "";

  const q = query(
    collection(db, "emergency_contacts"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    contactList.innerHTML =
      `<p style="text-align:center;color:#9ca3af;font-size:14px;">
        No contacts added
      </p>`;
    return;
  }

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;

    const item = document.createElement("div");
    item.className = "call-item";

    item.innerHTML = `
      <div class="call-info">
        <strong>${data.name}</strong>
        <span>${data.phone}</span>
      </div>
      <div class="call-actions">
        <button class="call-btn">📞</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;

    item.querySelector(".call-btn").onclick = () =>
      window.location.href = `tel:${data.phone}`;

    item.querySelector(".delete-btn").onclick = async (e) => {
      e.stopPropagation();
      await deleteDoc(doc(db, "emergency_contacts", id));
      loadContacts();
    };

    contactList.appendChild(item);
  });
}

addContactBtn?.addEventListener("click", async () => {
  const name = contactName.value.trim();
  const phone = contactPhone.value.trim();

  if (!name || !phone) {
    alert("Enter name and phone number");
    return;
  }

  await addDoc(collection(db, "emergency_contacts"), {
    name,
    phone,
    createdAt: serverTimestamp()
  });

  contactName.value = "";
  contactPhone.value = "";
  loadContacts();
});

// ---------- FAKE CALL LOGIC ----------
const ringtone = document.getElementById("ringtone");

triggerFakeCallBtn?.addEventListener("click", () => {
  const name = fakeCallerInput.value.trim();

  if (!name) {
    alert("Enter caller name");
    return;
  }

  incomingCallerName.innerText = name;

  // ✅ START RINGTONE HERE (USER GESTURE)
  ringtone.currentTime = 0;
  ringtone.play().catch(err => {
    console.log("Audio blocked:", err);
  });

  fakeCallOverlay.classList.remove("d-none");
});

acceptCallBtn?.addEventListener("click", () => {
  ringtone.pause();

  fakeCallOverlay.classList.add("d-none");
  ongoingCallerName.innerText = incomingCallerName.innerText;
  callOngoingOverlay.classList.remove("d-none");
});

declineCallBtn?.addEventListener("click", () => {
  ringtone.pause();
  fakeCallOverlay.classList.add("d-none");
});

endCallBtn?.addEventListener("click", () => {
  ringtone.pause();
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




