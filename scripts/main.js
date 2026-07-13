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
    let longPressTimer = 0;
    let releaseTimer = 0;

    const clearInteractionState = (delay = 0) => {
      window.clearTimeout(longPressTimer);
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => {
        link.classList.remove("is-pressed", "is-long-pressed");
      }, delay);
    };

    link.addEventListener("pointerdown", (event) => {
      const bounds = link.getBoundingClientRect();
      link.style.setProperty("--press-x", `${event.clientX - bounds.left}px`);
      link.style.setProperty("--press-y", `${event.clientY - bounds.top}px`);
      link.classList.add("is-pressed");
      window.clearTimeout(longPressTimer);
      longPressTimer = window.setTimeout(() => {
        link.classList.add("is-long-pressed");
      }, 360);
    });

    link.addEventListener("pointerup", () => clearInteractionState(220));
    link.addEventListener("pointercancel", () => clearInteractionState());
    link.addEventListener("pointerleave", () => clearInteractionState());
    link.addEventListener("blur", () => clearInteractionState());
  });


  const scrollToPageTop = (event) => {
    if (event) event.preventDefault();
    closeMenu();

    const reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reduceMotion ? "auto" : "smooth"
    });

    // Keep the address clean and make the fallback reliable in every browser.
    if (window.location.hash === "#top") {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  };

  document.querySelectorAll(".js-scroll-top").forEach((link) => {
    link.addEventListener("click", scrollToPageTop);
  });

  /* V18 IMAGE INTERACTION START */
  const imageModalTargets = Array.from(
    document.querySelectorAll("main figure")
  ).filter((figure) => figure.querySelector("img"));

  if (imageModalTargets.length) {
    const imageModal = document.createElement("div");

    imageModal.className = "image-modal";
    imageModal.id = "image-modal";
    imageModal.hidden = true;
    imageModal.setAttribute("aria-hidden", "true");

    imageModal.innerHTML = `
      <div
        class="image-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-modal-title"
      >
        <h2 class="sr-only" id="image-modal-title">
          Full image preview
        </h2>

        <button
          class="image-modal-close"
          type="button"
          aria-label="Close full image preview"
        >
          ×
        </button>

        <img
          class="image-modal-preview"
          src=""
          alt=""
        >
      </div>
    `;

    document.body.appendChild(imageModal);

    const imageModalPreview =
      imageModal.querySelector(".image-modal-preview");

    const imageModalClose =
      imageModal.querySelector(".image-modal-close");

    let previouslyFocusedElement = null;
    let previousBodyPaddingRight = "";

    const openImageModal = (image) => {
      if (!image || !imageModalPreview || !imageModalClose) return;

      previouslyFocusedElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      const imageSource =
        image.currentSrc ||
        image.getAttribute("src") ||
        "";

      const imageAlt =
        image.getAttribute("alt") ||
        "Calilayan Cove image";

      const scrollbarWidth =
        window.innerWidth -
        document.documentElement.clientWidth;

      previousBodyPaddingRight =
        document.body.style.paddingRight;

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight =
          `${scrollbarWidth}px`;
      }

      imageModalPreview.src = imageSource;
      imageModalPreview.alt = imageAlt;

      imageModal.hidden = false;
      imageModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("image-modal-open");

      window.requestAnimationFrame(() => {
        imageModalClose.focus();
      });
    };

    const closeImageModal = () => {
      if (imageModal.hidden) return;

      imageModal.hidden = true;
      imageModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("image-modal-open");
      document.body.style.paddingRight =
        previousBodyPaddingRight;

      imageModalPreview.src = "";
      imageModalPreview.alt = "";

      if (
        previouslyFocusedElement &&
        document.contains(previouslyFocusedElement)
      ) {
        previouslyFocusedElement.focus();
      }
    };

    imageModalClose.addEventListener(
      "click",
      closeImageModal
    );

    /*
      Deliberately do not close when the backdrop,
      modal image, or random screen area is touched.
      The X button is the only closing control.
    */
    imageModal.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener(
      "keydown",
      (event) => {
        if (imageModal.hidden) return;

        if (event.key === "Escape") {
          event.preventDefault();
          event.stopImmediatePropagation();
          imageModalClose.focus();
          return;
        }

        if (event.key === "Tab") {
          event.preventDefault();
          imageModalClose.focus();
        }
      },
      true
    );

    imageModalTargets.forEach((target) => {
      const image = target.querySelector("img");

      if (!image) return;

      target.classList.add("image-lightbox-target");
      target.setAttribute("role", "button");
      target.setAttribute("tabindex", "0");
      target.setAttribute("aria-haspopup", "dialog");

      const imageDescription =
        image.getAttribute("alt") ||
        "Calilayan Cove image";

      target.setAttribute(
        "aria-label",
        `Open full image: ${imageDescription}`
      );

      let pointerStartX = 0;
      let pointerStartY = 0;
      let pointerMoved = false;
      let releaseTimer = 0;

      const clearPressedState = (delay = 0) => {
        window.clearTimeout(releaseTimer);

        releaseTimer = window.setTimeout(() => {
          target.classList.remove("is-image-pressed");
        }, delay);
      };

      target.addEventListener("pointerdown", (event) => {
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        pointerMoved = false;

        target.classList.add("is-image-pressed");
      });

      target.addEventListener("pointermove", (event) => {
        const horizontalDistance =
          Math.abs(event.clientX - pointerStartX);

        const verticalDistance =
          Math.abs(event.clientY - pointerStartY);

        if (
          horizontalDistance > 10 ||
          verticalDistance > 10
        ) {
          pointerMoved = true;
          clearPressedState();
        }
      });

      target.addEventListener("pointerup", () => {
        clearPressedState(120);
      });

      target.addEventListener("pointercancel", () => {
        pointerMoved = true;
        clearPressedState();
      });

      target.addEventListener("pointerleave", () => {
        clearPressedState();
      });

      target.addEventListener("click", (event) => {
        if (pointerMoved) {
          pointerMoved = false;
          return;
        }

        event.preventDefault();
        openImageModal(image);
      });

      target.addEventListener("keydown", (event) => {
        if (
          event.key !== "Enter" &&
          event.key !== " "
        ) {
          return;
        }

        event.preventDefault();
        openImageModal(image);
      });
    });
  }
  /* V18 IMAGE INTERACTION END */
  if (video && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && !video.paused) video.pause();
      });
    }, { threshold: 0.18 });
    observer.observe(video);
  }
})();
