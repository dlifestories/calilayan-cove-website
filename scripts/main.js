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
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
      });
    });
  }

  const accommodationList = document.getElementById("accommodation-list");
  if (accommodationList && content) {
    accommodationList.innerHTML = content.accommodations.map((item) => `
      <article class="stay-card">
        <figure><img src="assets/images/${item.image}" alt="${item.name} preview at Calilayan Cove" loading="lazy"></figure>
        <div class="card-body">
          <p class="card-kicker">${item.type}</p>
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <div class="card-meta"><span>Official details pending</span><span>Request info</span></div>
        </div>
      </article>
    `).join("");
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

  if (video && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && !video.paused) video.pause();
      });
    }, { threshold: 0.18 });
    observer.observe(video);
  }
})();
