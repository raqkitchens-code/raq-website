"use strict";

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#main-nav");

if (menuButton && navigation) {
  const closeMenu = () => {
    menuButton.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
  };

  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    navigation.classList.toggle("is-open", !expanded);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      menuButton.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 640) closeMenu();
  });
}

// Visit request: builds a WhatsApp message on the visitor's device and opens it. Nothing is stored or sent by the site itself.
const visitForm = document.querySelector("#visit-form");
const WHATSAPP_NUMBER = "201055585530"; // DEC-43: the main number
const SOURCES = { showroom: "شاشة المعرض", flyer: "الفلاير", card: "الكارت" };

if (visitForm) {
  const error = visitForm.querySelector("#visit-error");
  const params = new URLSearchParams(window.location.search);
  const source = SOURCES[params.get("src")] ?? null;

  visitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(visitForm);
    const field = (name) => String(data.get(name) ?? "").trim().replace(/\s+/g, " ");
    const name = field("name");
    const service = field("service");
    const missing = [!name && "الاسم", !service && "الخدمة"].filter(Boolean);
    if (missing.length) {
      error.textContent = `ناقص: ${missing.join(" و")}.`;
      error.hidden = false;
      visitForm.querySelector(name ? "#visit-service" : "#visit-name").focus();
      return;
    }
    error.hidden = true;
    const lines = [
      "السلام عليكم، عايز أحجز معاينة.",
      `الاسم: ${name}`,
      `الخدمة: ${service}`,
      field("area") && `المنطقة: ${field("area")}`,
      field("note") && `تفاصيل: ${field("note")}`,
      source && `عرفتكم من: ${source}`,
    ].filter(Boolean);
    window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  });
}
