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
