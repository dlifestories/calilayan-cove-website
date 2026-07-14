(() => {
  "use strict";

  const content = window.CALILAYAN_CONTENT || {};
  const config = window.CALILAYAN_CONFIG || {};
  const form = document.getElementById("booking-form");
  const accommodationSelect = document.getElementById("accommodation-select");
  const activityOptions = document.getElementById("activity-options");
  const nightCount = document.getElementById("night-count");
  const estimatedAmount = document.getElementById("estimated-amount");
  const estimateNotice = document.getElementById("estimate-notice");
  const formMessage = document.getElementById("form-message");
  const submitButton = form?.querySelector('button[type="submit"]');
  const endpoint = String(config.appsScriptEndpoint || "").trim();

  const state = {
    accommodations: [],
    activities: [],
    currency: "PHP",
    estimateNotice: "Estimated total only. Final availability and pricing will be confirmed by Calilayan Cove."
  };

  const cleanText = (value) => String(value ?? "").trim();
  const asNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const isActive = (value) => value !== false && String(value).toLowerCase() !== "false" && String(value) !== "0";
  const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    const nights = Math.round((end - start) / 86400000);
    return nights > 0 ? nights : null;
  };

  const toList = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      return Object.entries(value).map(([key, item]) => (
        item && typeof item === "object" ? { key, ...item } : { key, name: item }
      ));
    }
    return [];
  };

  const normalizeAccommodation = (item) => {
    if (typeof item === "string") return { key: item, name: item, rate: 0, active: true };
    const name = cleanText(firstDefined(item.displayName, item.name, item.label, item.accommodation));
    return {
      key: cleanText(firstDefined(item.key, item.id, name)),
      name,
      rate: asNumber(firstDefined(item.ratePerNight, item.rate, item.price, 0)),
      active: isActive(firstDefined(item.active, item.isActive, true))
    };
  };

  const normalizeActivity = (item) => {
    if (typeof item === "string") return { key: item, name: item, rate: 0, rateBasis: "Per Booking", active: true };
    const name = cleanText(firstDefined(item.displayName, item.name, item.label, item.activity));
    return {
      key: cleanText(firstDefined(item.key, item.id, name)),
      name,
      rate: asNumber(firstDefined(item.rate, item.price, 0)),
      rateBasis: cleanText(firstDefined(item.rateBasis, item.basis, "Per Booking")),
      active: isActive(firstDefined(item.active, item.isActive, true))
    };
  };

  const fallbackAccommodations = () => (content.accommodationNames || [])
    .map(normalizeAccommodation)
    .filter((item) => item.name);

  const fallbackActivities = () => (content.activities || [])
    .map(normalizeActivity)
    .filter((item) => item.name);

  const resolveRoot = (payload) => {
    if (!payload || typeof payload !== "object") return {};
    return payload.data || payload.config || payload.settings || payload.result || payload;
  };

  const findList = (payload, names) => {
    const roots = [payload, resolveRoot(payload), payload?.data, payload?.config, payload?.settings].filter(Boolean);
    for (const root of roots) {
      for (const name of names) {
        const list = toList(root?.[name]);
        if (list.length) return list;
      }
    }
    return [];
  };

  const parseResponse = async (response) => {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (_) {
      throw new Error("The booking service returned an unreadable response.");
    }
  };

  const renderAccommodations = () => {
    if (!accommodationSelect) return;
    const selectedValue = accommodationSelect.value;
    accommodationSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select an accommodation";
    accommodationSelect.append(placeholder);

    state.accommodations.filter((item) => item.active && item.name).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.name;
      option.textContent = item.name;
      option.dataset.key = item.key;
      option.dataset.rate = String(item.rate);
      accommodationSelect.append(option);
    });

    if ([...accommodationSelect.options].some((option) => option.value === selectedValue)) {
      accommodationSelect.value = selectedValue;
    }
  };

  const renderActivities = () => {
    if (!activityOptions) return;
    const selectedNames = new Set(
      [...activityOptions.querySelectorAll('input[name="activities"]:checked')].map((input) => input.value)
    );
    activityOptions.replaceChildren();

    state.activities.filter((item) => item.active && item.name).forEach((item) => {
      const label = document.createElement("label");
      label.className = "checkbox-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "activities";
      input.value = item.name;
      input.dataset.key = item.key;
      input.dataset.rate = String(item.rate);
      input.dataset.rateBasis = item.rateBasis;
      input.checked = selectedNames.has(item.name);
      const span = document.createElement("span");
      span.textContent = item.name;
      label.append(input, span);
      activityOptions.append(label);
    });
  };

  const formatAmount = (amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return "To be confirmed";
    try {
      return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: state.currency || "PHP",
        maximumFractionDigits: 2
      }).format(amount);
    } catch (_) {
      return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const calculateEstimate = () => {
    if (!form) return 0;
    const nights = calculateNights(form.elements.checkIn.value, form.elements.checkOut.value) || 0;
    const rooms = Math.max(1, asNumber(form.elements.numberOfRooms?.value));
    const adults = Math.max(0, asNumber(form.elements.adults.value));
    const children = Math.max(0, asNumber(form.elements.children.value));
    const accommodation = state.accommodations.find((item) => item.name === form.elements.accommodation.value);
    let total = accommodation ? accommodation.rate * nights * rooms : 0;

    [...form.querySelectorAll('input[name="activities"]:checked')].forEach((input) => {
      const activity = state.activities.find((item) => item.name === input.value);
      if (!activity || activity.rate <= 0) return;
      const basis = activity.rateBasis.toLowerCase();
      if (basis.includes("person")) total += activity.rate * (adults + children);
      else if (basis.includes("night")) total += activity.rate * nights;
      else if (basis.includes("room")) total += activity.rate * rooms;
      else total += activity.rate;
    });

    return total;
  };

  const updateEstimate = () => {
    if (!form) return;
    const nights = calculateNights(form.elements.checkIn.value, form.elements.checkOut.value);
    if (nightCount) nightCount.textContent = nights ? String(nights) : "—";
    if (estimatedAmount) estimatedAmount.textContent = formatAmount(calculateEstimate());
    if (estimateNotice) estimateNotice.textContent = state.estimateNotice;
  };

  const loadRemoteSettings = async () => {
    if (!endpoint) return;
    const separator = endpoint.includes("?") ? "&" : "?";
    const response = await fetch(`${endpoint}${separator}action=config&_=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      redirect: "follow"
    });
    if (!response.ok) throw new Error("The booking settings could not be loaded.");
    const payload = await parseResponse(response);
    const root = resolveRoot(payload);
    const accommodations = findList(payload, ["accommodations", "accommodationOptions"])
      .map(normalizeAccommodation)
      .filter((item) => item.active && item.name);
    const activities = findList(payload, ["activities", "addOns", "activityOptions"])
      .map(normalizeActivity)
      .filter((item) => item.active && item.name);

    if (accommodations.length) state.accommodations = accommodations;
    if (activities.length) state.activities = activities;
    state.currency = cleanText(firstDefined(root.currency, payload.currency, state.currency)) || "PHP";
    state.estimateNotice = cleanText(firstDefined(
      root.estimateNotice,
      root.estimate_notice,
      payload.estimateNotice,
      state.estimateNotice
    ));
    renderAccommodations();
    renderActivities();
    updateEstimate();
  };

  state.accommodations = fallbackAccommodations();
  state.activities = fallbackActivities();
  renderAccommodations();
  renderActivities();

  if (form) {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    form.elements.checkIn.min = localToday;
    form.elements.checkOut.min = localToday;

    form.elements.checkIn.addEventListener("change", () => {
      form.elements.checkOut.min = form.elements.checkIn.value || localToday;
      updateEstimate();
    });
    form.elements.checkOut.addEventListener("change", updateEstimate);
    form.elements.accommodation.addEventListener("change", updateEstimate);
    form.elements.numberOfRooms?.addEventListener("input", updateEstimate);
    form.elements.adults.addEventListener("input", updateEstimate);
    form.elements.children.addEventListener("input", updateEstimate);
    activityOptions?.addEventListener("change", updateEstimate);
    updateEstimate();

    loadRemoteSettings().catch(() => {
      if (formMessage && !formMessage.textContent) {
        formMessage.textContent = "Live booking settings are temporarily unavailable. The displayed options remain available for this prototype request.";
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (formMessage) formMessage.textContent = "";
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const nights = calculateNights(data.get("checkIn"), data.get("checkOut"));
      if (!nights) {
        if (formMessage) formMessage.textContent = "Check-out must be later than check-in.";
        form.elements.checkOut.focus();
        return;
      }
      if (!endpoint) {
        if (formMessage) formMessage.textContent = "The booking service is not configured yet.";
        return;
      }

      const fullName = cleanText(data.get("fullName"));
      const email = cleanText(data.get("email"));
      const mobile = cleanText(data.get("mobile"));
      const contactChannel = cleanText(data.get("contactChannel"));
      const checkIn = cleanText(data.get("checkIn"));
      const checkOut = cleanText(data.get("checkOut"));
      const accommodation = cleanText(data.get("accommodation"));
      const numberOfRooms = Math.max(1, asNumber(data.get("numberOfRooms")));
      const adults = Math.max(1, asNumber(data.get("adults")));
      const children = Math.max(0, asNumber(data.get("children")));
      const activities = data.getAll("activities").map(cleanText).filter(Boolean);
      const selectedActivities = [...form.querySelectorAll('input[name="activities"]:checked')]
        .map((input) => cleanText(input.dataset.key || input.value))
        .filter(Boolean);
      const selectedAccommodation = accommodationSelect?.selectedOptions?.[0];
      const accommodationKey = cleanText(selectedAccommodation?.dataset.key || accommodation);
      const specialRequests = cleanText(data.get("specialRequests"));
      const clientEstimate = calculateEstimate();

      const payload = {
        guestName: fullName,
        email,
        mobileNumber: mobile,
        preferredContactChannel: contactChannel,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        accommodation,
        accommodationKey,
        numberOfRooms,
        adults,
        children,
        selectedActivities,
        addOns: [],
        eventType: "",
        estimatedAmount: clientEstimate,
        specialRequests,
        bookingPolicyConsent: true,
        privacyConsent: true,
        website: ""
      };

      const originalButtonText = submitButton?.textContent || "Submit booking request";
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending request...";
      }
      form.setAttribute("aria-busy", "true");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
          cache: "no-store",
          credentials: "omit",
          redirect: "follow"
        });
        if (!response.ok) throw new Error("The booking service could not be reached.");
        const responsePayload = await parseResponse(response);
        const result = resolveRoot(responsePayload);
        const succeeded = firstDefined(responsePayload.ok, responsePayload.success, result.ok, result.success, true);
        if (succeeded === false || String(succeeded).toLowerCase() === "false") {
          throw new Error(cleanText(firstDefined(result.message, responsePayload.message, result.error, responsePayload.error)) || "The booking request was not accepted.");
        }

        const reference = cleanText(firstDefined(
          result.bookingReference,
          responsePayload.bookingReference,
          result.reference,
          responsePayload.reference
        ));
        if (!reference) throw new Error("The booking service did not return a booking reference.");

        const serverEstimate = firstDefined(
          result.estimatedAmount,
          responsePayload.estimatedAmount,
          result.estimate,
          responsePayload.estimate
        );
        const summary = {
          reference,
          fullName,
          email,
          mobile,
          contactChannel,
          checkIn,
          checkOut,
          nights: asNumber(firstDefined(result.numberOfNights, result.nights, nights)) || nights,
          numberOfRooms,
          adults: String(adults),
          children: String(children),
          accommodation,
          activities,
          specialRequests: specialRequests || "None provided",
          estimatedAmount: typeof serverEstimate === "number" ? formatAmount(serverEstimate) : cleanText(serverEstimate) || formatAmount(calculateEstimate()),
          prototypeMode: true,
          duplicate: Boolean(firstDefined(result.duplicate, responsePayload.duplicate, false)),
          message: cleanText(firstDefined(result.message, responsePayload.message)),
          resortEmailResult: cleanText(firstDefined(result.resortEmailResult, responsePayload.resortEmailResult)),
          customerEmailResult: cleanText(firstDefined(result.customerEmailResult, responsePayload.customerEmailResult))
        };

        sessionStorage.setItem("calilayanBookingRequest", JSON.stringify(summary));
        sessionStorage.removeItem("calilayanDemoBooking");
        window.location.href = `thank-you.html?reference=${encodeURIComponent(reference)}`;
      } catch (error) {
        const message = cleanText(error?.message);
        if (formMessage) {
          formMessage.textContent = message
            ? `Your request was not completed: ${message}`
            : "Your request was not completed. Please check your connection and try again.";
        }
      } finally {
        form.removeAttribute("aria-busy");
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      }
    });
  }

  const referenceElement = document.getElementById("booking-reference");
  const summaryElement = document.getElementById("booking-summary");
  const copyButton = document.getElementById("copy-booking");
  const copyStatus = document.getElementById("copy-status");

  if (referenceElement && summaryElement) {
    let summary = null;
    try {
      summary = JSON.parse(
        sessionStorage.getItem("calilayanBookingRequest") ||
        sessionStorage.getItem("calilayanDemoBooking") ||
        "null"
      );
    } catch (_) {
      summary = null;
    }

    const queryReference = cleanText(new URLSearchParams(window.location.search).get("reference"));
    if (summary) {
      referenceElement.textContent = summary.reference;
      const rows = [
        ["Guest", summary.fullName],
        ["Contact", `${summary.email} · ${summary.mobile}`],
        ["Preferred channel", summary.contactChannel],
        ["Dates", `${summary.checkIn} to ${summary.checkOut} (${summary.nights} night${summary.nights === 1 ? "" : "s"})`],
        ["Accommodation", `${summary.accommodation} · ${summary.numberOfRooms || 1} room${Number(summary.numberOfRooms || 1) === 1 ? "" : "s"}`],
        ["Guests", `${summary.adults} adult${summary.adults === "1" ? "" : "s"}, ${summary.children} child${summary.children === "1" ? "" : "ren"}`],
        ["Activities", summary.activities.length ? summary.activities.join(", ") : "None selected"],
        ["Estimated amount", summary.estimatedAmount || "To be confirmed"],
        ["Special requests", summary.specialRequests]
      ];
      if (summary.duplicate) rows.unshift(["Submission status", "Existing matching request found; the original booking reference was returned."]);
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
            "Calilayan Cove prototype booking request",
            `Booking Reference: ${summary.reference}`,
            `Guest: ${summary.fullName}`,
            `Contact: ${summary.email} / ${summary.mobile}`,
            `Dates: ${summary.checkIn} to ${summary.checkOut} (${summary.nights} nights)`,
            `Accommodation: ${summary.accommodation} (${summary.numberOfRooms || 1} room/s)`,
            `Guests: ${summary.adults} adults, ${summary.children} children`,
            `Activities: ${summary.activities.length ? summary.activities.join(", ") : "None selected"}`,
            `Estimated Amount: ${summary.estimatedAmount || "To be confirmed"}`,
            `Special Requests: ${summary.specialRequests}`,
            "",
            "Prototype request only — not a confirmed reservation."
          ].join("\n");
          try {
            await navigator.clipboard.writeText(text);
            if (copyStatus) copyStatus.textContent = "Booking details copied.";
          } catch (_) {
            if (copyStatus) copyStatus.textContent = "Copy was unavailable. Please select the details manually.";
          }
        });
      }
    } else if (queryReference) {
      referenceElement.textContent = queryReference;
      summaryElement.innerHTML = "<div><dt>Status</dt><dd>The booking reference was received, but the detailed summary is no longer available in this browser session.</dd></div>";
      if (copyButton) copyButton.disabled = true;
    } else {
      summaryElement.innerHTML = "<div><dt>Status</dt><dd>No booking summary was found. Return to the homepage to submit a request.</dd></div>";
      if (copyButton) copyButton.disabled = true;
    }
  }
})();
