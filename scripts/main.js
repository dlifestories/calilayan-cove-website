(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-button");
  const nav = document.querySelector(".site-nav");
  const year = document.getElementById("current-year");
  const video = document.getElementById("resort-video");
  const content = window.CALILAYAN_CONTENT;

  if (year) year.textContent = String(new Date().getFullYear());

  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 48);
  };

  const closeMenu = () => {
    if (!menuButton || !nav) return;
    nav.classList.remove("is-open");
    menuButton.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      menuButton.classList.toggle("is-open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || menuButton.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) closeMenu();
    });
  }

  const accommodationList = document.getElementById("accommodation-list");
  if (accommodationList && content) {
    accommodationList.innerHTML = content.accommodations.map((item) => {
      const imageClass = item.imageFit === "contain" ? "fit-contain" : "";
      return `
        <article class="stay-card">
          <figure><img class="${imageClass}" src="assets/images/${item.image}" alt="${item.name} preview at Calilayan Cove" loading="lazy"></figure>
          <div class="card-body">
            <p class="card-kicker">${item.type}</p>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <div class="card-meta"><span>Official details pending</span><span>Request info</span></div>
          </div>
        </article>
      `;
    }).join("");
  }

  const activityList = document.getElementById("activity-list");
  if (activityList && content) {
    activityList.innerHTML = content.activities.map((item, index) => `
      <article class="experience-item">
        <span class="experience-number">${String(index + 1).padStart(2, "0")}</span>
        <div><h3>${item.name}</h3><p>${item.description}</p></div>
        <span class="experience-status">Confirm availability</span>
      </article>
    `).join("");
  }

  document.querySelectorAll(".contact-link").forEach((link) => {
    const clearPressedState = () => link.classList.remove("is-pressed");
    link.addEventListener("pointerdown", () => link.classList.add("is-pressed"));
    link.addEventListener("pointerup", clearPressedState);
    link.addEventListener("pointercancel", clearPressedState);
    link.addEventListener("pointerleave", clearPressedState);
    link.addEventListener("blur", clearPressedState);
  });

  if (video && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && !video.paused) video.pause();
      });
    }, { threshold: 0.18 });
    observer.observe(video);
  }
})();
