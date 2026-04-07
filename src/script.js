document.documentElement.classList.add("js");

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -32px 0px"
  }
);

for (const node of document.querySelectorAll("[data-reveal]")) {
  observer.observe(node);
}

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
