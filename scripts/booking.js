(() => {
  "use strict";

  const content = window.CALILAYAN_CONTENT;
  const config = window.CALILAYAN_CONFIG;
  const form = document.getElementById("booking-form");
  const accommodationSelect = document.getElementById("accommodation-select");
  const activityOptions = document.getElementById("activity-options");
  const nightCount = document.getElementById("night-count");
  const formMessage = document.getElementById("form-message");

  const escapeText = (value) => String(value ?? "").trim();

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    const nights = Math.round((end - start) / 86400000);
    return nights > 0 ? nights : null;
  };

  const updateNights = () => {
    if (!form || !nightCount) return;
    const nights = calculateNights(form.elements.checkIn.value, form.elements.checkOut.value);
    nightCount.textContent = nights ? String(nights) : "—";
  };

  if (accommodationSelect && content) {
    accommodationSelect.insertAdjacentHTML("beforeend", content.accommodationNames.map((name) => `<option>${name}</option>`).join(""));
  }

  if (activityOptions && content) {
    activityOptions.innerHTML = content.activities.map((item) => `
      <label class="checkbox-option"><input type="checkbox" name="activities" value="${item.name}"><span>${item.name}</span></label>
    `).join("");
  }

  if (form) {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    form.elements.checkIn.min = localToday;
    form.elements.checkOut.min = localToday;
    form.elements.checkIn.addEventListener("change", () => {
      form.elements.checkOut.min = form.elements.checkIn.value || localToday;
      updateNights();
    });
    form.elements.checkOut.addEventListener("change", updateNights);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      formMessage.textContent = "";

      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const nights = calculateNights(data.get("checkIn"), data.get("checkOut"));
      if (!nights) {
        formMessage.textContent = "Check-out must be later than check-in.";
        form.elements.checkOut.focus();
        return;
      }

      const dateCode = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      const randomCode = Math.random().toString(36).slice(2, 6).toUpperCase();
      const reference = `${config?.bookingReferencePrefix || "CAL"}-${dateCode}-${randomCode}`;
      const activities = data.getAll("activities");
      const summary = {
        reference,
        fullName: escapeText(data.get("fullName")),
        email: escapeText(data.get("email")),
        mobile: escapeText(data.get("mobile")),
        contactChannel: escapeText(data.get("contactChannel")),
        checkIn: escapeText(data.get("checkIn")),
        checkOut: escapeText(data.get("checkOut")),
        nights,
        adults: escapeText(data.get("adults")),
        children: escapeText(data.get("children")) || "0",
        accommodation: escapeText(data.get("accommodation")),
        activities,
        specialRequests: escapeText(data.get("specialRequests")) || "None provided",
        estimatedAmount: "To be confirmed",
        prototypeMode: true
      };

      sessionStorage.setItem("calilayanDemoBooking", JSON.stringify(summary));
      window.location.href = "thank-you.html";
    });
  }

  const referenceElement = document.getElementById("booking-reference");
  const summaryElement = document.getElementById("booking-summary");
  const copyButton = document.getElementById("copy-booking");
  const copyStatus = document.getElementById("copy-status");

  if (referenceElement && summaryElement) {
    let summary = null;
    try {
      summary = JSON.parse(sessionStorage.getItem("calilayanDemoBooking") || "null");
    } catch (_) {
      summary = null;
    }

    if (summary) {
      referenceElement.textContent = summary.reference;
      const rows = [
        ["Guest", summary.fullName],
        ["Contact", `${summary.email} · ${summary.mobile}`],
        ["Preferred channel", summary.contactChannel],
        ["Dates", `${summary.checkIn} to ${summary.checkOut} (${summary.nights} night${summary.nights === 1 ? "" : "s"})`],
        ["Guests", `${summary.adults} adult${summary.adults === "1" ? "" : "s"}, ${summary.children} child${summary.children === "1" ? "" : "ren"}`],
        ["Accommodation", summary.accommodation],
        ["Activities", summary.activities.length ? summary.activities.join(", ") : "None selected"],
        ["Estimated amount", summary.estimatedAmount],
        ["Special requests", summary.specialRequests]
      ];
      summaryElement.replaceChildren();
      rows.forEach(([label, value]) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const detail = document.createElement("dd");
        term.textContent = label;
        detail.textContent = value;
        row.append(term, detail);
        summaryElement.append(row);
      });

      if (copyButton) {
        copyButton.addEventListener("click", async () => {
          const text = [
            "Calilayan Cove demo booking request",
            `Booking Reference: ${summary.reference}`,
            `Guest: ${summary.fullName}`,
            `Contact: ${summary.email} / ${summary.mobile}`,
            `Dates: ${summary.checkIn} to ${summary.checkOut} (${summary.nights} nights)`,
            `Guests: ${summary.adults} adults, ${summary.children} children`,
            `Accommodation: ${summary.accommodation}`,
            `Activities: ${summary.activities.length ? summary.activities.join(", ") : "None selected"}`,
            `Estimated Amount: ${summary.estimatedAmount}`,
            `Special Requests: ${summary.specialRequests}`,
            "",
            "Prototype only — not a confirmed reservation."
          ].join("\n");
          try {
            await navigator.clipboard.writeText(text);
            copyStatus.textContent = "Booking details copied.";
          } catch (_) {
            copyStatus.textContent = "Copy was unavailable. Please select the details manually.";
          }
        });
      }
    } else {
      summaryElement.innerHTML = "<div><dt>Status</dt><dd>No demo booking summary was found. Return to the homepage to create one.</dd></div>";
      if (copyButton) copyButton.disabled = true;
    }
  }
})();
