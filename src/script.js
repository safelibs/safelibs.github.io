const buildStamp = document.querySelector("[data-build-time]");

if (buildStamp) {
  const iso = buildStamp.getAttribute("datetime");
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.valueOf())) {
      buildStamp.textContent = parsed.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC"
      });
    }
  }
}

const faqItems = [...document.querySelectorAll(".faq-item")];

for (const item of faqItems) {
  item.addEventListener("toggle", () => {
    if (!item.open) {
      return;
    }

    for (const sibling of faqItems) {
      if (sibling !== item) {
        sibling.open = false;
      }
    }
  });
}
