// script.js - (with integrated validation + Paystack)
// Multi-step form controller for both mobile (.mobile-version) and desktop (.desktop-version).
// Toggle input IDs in HTML (e.g. toggle3-mobile, toggle3-desktop).


document.addEventListener("DOMContentLoaded", () => {



/* ======================
   Constants & Utilities
   ====================== */
   const STORAGE = {
    PERSONAL: "fm_personal",
    BILLING: "fm_billing",
    PLAN: "fm_plan",
    ADDONS: "fm_addons"
  };
  
  const PRICES = {
    monthly: { arcade: 9, advanced: 12, pro: 15 },
    yearly:  { arcade: 90, advanced: 120, pro: 150 }
  };
  
  const ADDON_PRICES = {
    monthly: { "online-service": 1, "larger-storage": 2, "customizable-profile": 2 },
    yearly:  { "online-service": 10, "larger-storage": 20, "customizable-profile": 20 }
  };
  
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function load(key, fallback = null){ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  function ucfirst(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  
  /* Defaults */
  if (!load(STORAGE.BILLING)) save(STORAGE.BILLING, "monthly");
  if (!load(STORAGE.PLAN)) save(STORAGE.PLAN, { name: "arcade", price: PRICES.monthly.arcade });
  
  /* ======================
     Helpers to find UI root
     ====================== */
  function getRoots() {
    // returns array of root elements that exist in the DOM (mobile, desktop)
    return [document.querySelector(".mobile-version"), document.querySelector(".desktop-version")].filter(Boolean);
  }
  function getVisibleRoot() {
    const roots = getRoots();
    for (const r of roots) {
      if (window.getComputedStyle(r).display !== "none") return r;
    }
    return document; // fallback
  }

  /* ======================
     Validation UI helpers
     ====================== */
  function showFormError(root, message) {
    if (!root) root = getVisibleRoot();
    // try to find existing error element
    let err = root.querySelector(".validation-error");
    if (!err) {
      // create and insert at top of form container to be visible
      err = document.createElement("p");
      err.className = "validation-error";
      // Basic inline style so it shows without requiring CSS changes
      err.style.color = "hsl(0, 100%, 70%)";
      err.style.margin = "8px 0";
      err.style.fontSize = "13px";
      const form = root.querySelector(".form");
      if (form) form.insertBefore(err, form.firstChild);
      else root.prepend(err);
    }
    err.textContent = message;
    err.style.display = "block";
  }

  function clearFormError(root) {
    if (!root) root = getVisibleRoot();
    const err = root.querySelector(".validation-error");
    if (err) {
      err.textContent = "";
      err.style.display = "none";
    }
  }

  // email validator
  function isValidEmail(email) {
    // simple but effective regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  /* ======================
     NAV highlighting
     ====================== */
  (function highlightNavForCurrentPage(){
    const pageFile = location.pathname.split("/").pop() || "index.html";
    const mapping = {
      "index.html": 0,
      "select.html": 1,
      "pickadons.html": 2,
      "finishingup.html": 3,
      "thankyou.html": 3
    };
    const idx = mapping[pageFile] ?? 0;
    getRoots().forEach(root => {
      // highlight only if root is visible (so mobile/desktop navs are independent)
      if (window.getComputedStyle(root).display === "none") return;
      const buttons = root.querySelectorAll(".navbar .btn");
      buttons.forEach((b, i) => b.classList.toggle("active", i === idx));
    });
  })();
  
  /* ======================
     Billing UI updater (per root)
     ====================== */
  function updateBillingUIForRoot(root, billing) {
    if (!root) return;
    const isYearly = billing === "yearly";
  
    // monthly/yearly label toggle (if present)
    const monthlyLabel = root.querySelector("#monthly-label");
    const yearlyLabel = root.querySelector("#yearly-label");
    if (monthlyLabel) monthlyLabel.classList.toggle("active", !isYearly);
    if (yearlyLabel) yearlyLabel.classList.toggle("active", isYearly);
  
    // Update plan prices and free-months visibility
    const planContainers = root.querySelectorAll(".container[data-plan]");
    planContainers.forEach(c => {
      const plan = c.dataset.plan;
      const priceEl = c.querySelector(".price");
      const freeEl = c.querySelector(".free-months");
      if (priceEl) priceEl.textContent = isYearly ? `$${PRICES.yearly[plan]}/yr` : `$${PRICES.monthly[plan]}/mo`;
      if (freeEl) freeEl.classList.toggle("visible", isYearly);
    });
  
    // update add-on prices
    const addonEls = root.querySelectorAll(".add-ons[data-addon]");
    addonEls.forEach(a => {
      const id = a.dataset.addon;
      const span = a.querySelector("span");
      if (!span) return;
      const price = isYearly ? ADDON_PRICES.yearly[id] : ADDON_PRICES.monthly[id];
      const suffix = isYearly ? "/yr" : "/mo";
      span.textContent = `+$${price}${suffix}`;
    });
  
    // ensure stored plan price + billing stay in sync
    const storedPlan = load(STORAGE.PLAN);
    if (storedPlan && storedPlan.name) {
      const newPrice = billing === "yearly" ? PRICES.yearly[storedPlan.name] : PRICES.monthly[storedPlan.name];
      save(STORAGE.PLAN, { name: storedPlan.name, price: newPrice, billing });
    } else {
      const def = "arcade";
      const defPrice = billing === "yearly" ? PRICES.yearly[def] : PRICES.monthly[def];
      save(STORAGE.PLAN, { name: def, price: defPrice, billing });
    }
  }
  
  /* ======================
     Initialize handlers for a root (mobile or desktop)
     ====================== */
  function initHandlersForRoot(root) {
    if (!root) return;
  
    /* ----- Toggle handler (per-root) ----- */
    // find the checkbox inside .toggle within this root
    const toggleInput = root.querySelector(".toggle input[type='checkbox']");
    if (toggleInput) {
      // initialize from storage
      const billingStored = load(STORAGE.BILLING, "monthly");
      toggleInput.checked = billingStored === "yearly";
      updateBillingUIForRoot(root, billingStored);
  
      // when this toggle changes, write billing and update both roots
      toggleInput.addEventListener("change", () => {
        const newBilling = toggleInput.checked ? "yearly" : "monthly";
        save(STORAGE.BILLING, newBilling);
  
        // update both roots so UI stays in sync
        getRoots().forEach(r => updateBillingUIForRoot(r, newBilling));
      });
  
      // keyboard support on the .toggle container
      const toggleContainer = toggleInput.closest(".toggle");
      if (toggleContainer) {
        toggleContainer.setAttribute("tabindex", "0");
        toggleContainer.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleInput.checked = !toggleInput.checked;
            toggleInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
    }
  
    /* ----- Plan selection ----- */
    const planContainers = root.querySelectorAll(".container[data-plan]");
    planContainers.forEach(c => {
      c.setAttribute("tabindex", "0");
      c.addEventListener("click", () => {
        const siblings = c.parentElement ? Array.from(c.parentElement.querySelectorAll(".container[data-plan]")) : [];
        siblings.forEach(s => s.classList.remove("selected"));
        c.classList.add("selected");
  
        const planKey = c.dataset.plan;
        const billing = load(STORAGE.BILLING, "monthly");
        const price = billing === "yearly" ? PRICES.yearly[planKey] : PRICES.monthly[planKey];
        save(STORAGE.PLAN, { name: planKey, price, billing });

        // clear any select-related validation message in this root
        clearFormError(root);
      });
  
      c.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          c.click();
        }
      });
    });
  
    // restore saved plan highlight if present
    const savedPlan = load(STORAGE.PLAN);
    if (savedPlan && savedPlan.name) {
      planContainers.forEach(c => c.classList.toggle("selected", c.dataset.plan === savedPlan.name));
    }
  
    /* ----- Add-ons: make whole container clickable ----- */
    const addonEls = root.querySelectorAll(".add-ons[data-addon]");
    addonEls.forEach(a => {
      // ensure checkbox exists (defensive)
      let cb = a.querySelector('input[type="checkbox"]');
      if (!cb) {
        cb = document.createElement("input");
        cb.type = "checkbox";
        a.prepend(cb);
      }
  
      // keyboard / accessibility
      cb.tabIndex = -1;
      a.setAttribute("tabindex", "0");
  
      // restore state from storage
      const savedAddons = load(STORAGE.ADDONS, []);
      const isSel = savedAddons.find(x => x.id === a.dataset.addon);
      cb.checked = !!isSel;
      a.classList.toggle("selected", !!isSel);
  
      // click on container toggles
      a.addEventListener("click", (ev) => {
        if (ev.target.tagName.toLowerCase() !== "input") cb.checked = !cb.checked;
        a.classList.toggle("selected", cb.checked);
        persistAddonsFromRepresentativeRoot();
      });
  
      // keyboard toggle
      a.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cb.checked = !cb.checked;
          a.classList.toggle("selected", cb.checked);
          persistAddonsFromRepresentativeRoot();
        }
      });
  
      // direct checkbox change
      cb.addEventListener("change", () => {
        a.classList.toggle("selected", cb.checked);
        persistAddonsFromRepresentativeRoot();
      });
    });
  }
  
  /* Persist addons using the most representative (visible) root */
  function persistAddonsFromRepresentativeRoot() {
    // Prefer desktop if visible, otherwise mobile, otherwise any root
    const desktop = document.querySelector(".desktop-version");
    const mobile = document.querySelector(".mobile-version");
    const rep = (desktop && window.getComputedStyle(desktop).display !== "none") ? desktop :
                (mobile && window.getComputedStyle(mobile).display !== "none") ? mobile :
                (desktop || mobile || document);
  
    const selected = [];
    rep.querySelectorAll(".add-ons[data-addon]").forEach(a => {
      const cb = a.querySelector('input[type="checkbox"]');
      if (cb && cb.checked) {
        const id = a.dataset.addon;
        const billing = load(STORAGE.BILLING, "monthly");
        const price = billing === "yearly" ? ADDON_PRICES.yearly[id] : ADDON_PRICES.monthly[id];
        const title = a.querySelector(".cont-2 h4") ? a.querySelector(".cont-2 h4").textContent : id;
        selected.push({ id, price, title });
      }
    });
    save(STORAGE.ADDONS, selected);
  }
  
  /* ======================
     Initialize everything
     ====================== */
  // Initialize handlers for both roots (so desktop handlers exist even if mobile visible)
  getRoots().forEach(root => initHandlersForRoot(root));
  
  // Sync billing UI for all roots from stored billing
  const currentBilling = load(STORAGE.BILLING, "monthly");
  getRoots().forEach(r => updateBillingUIForRoot(r, currentBilling));
  
  /* ======================
     Index page: validation & persistence (ENHANCED)
     ====================== */
  (function attachIndexValidation(){
    const pageFile = location.pathname.split("/").pop() || "index.html";
    if (pageFile !== "index.html") return;
  
    getRoots().forEach(root => {
      const inputs = Array.from(root.querySelectorAll(".form input")).slice(0,3);
      if (!inputs.length) return;
  
      // populate saved
      const saved = load(STORAGE.PERSONAL, {});
      if (saved) {
        if (inputs[0]) inputs[0].value = saved.name || "";
        if (inputs[1]) inputs[1].value = saved.email || "";
        if (inputs[2]) inputs[2].value = saved.phone || "";
      }
  
      // save on input
      inputs.forEach(inp => inp.addEventListener("input", () => {
        const data = {
          name: inputs[0]?.value || "",
          email: inputs[1]?.value || "",
          phone: inputs[2]?.value || ""
        };
        save(STORAGE.PERSONAL, data);
        inp.classList.remove("invalid");
        clearFormError(root);
      }));
  
      // intercept Next anchor(s) that go to select.html
      const nextAnchor = root.querySelector('.butt a[href="select.html"], .butt-2 a[href="select.html"]');
      if (nextAnchor) {
        nextAnchor.addEventListener("click", (ev) => {
          let ok = true;
          // 1) required fields
          inputs.forEach(inp => {
            if (!inp.value || inp.value.trim() === "") {
              inp.classList.add("invalid");
              ok = false;
            } else {
              inp.classList.remove("invalid");
            }
          });

          // 2) email format validation (only if not empty)
          const emailInput = inputs[1]; // assuming second input is email
          if (emailInput && emailInput.value && !isValidEmail(emailInput.value)) {
            emailInput.classList.add("invalid");
            ok = false;
            showFormError(root, "Please enter a valid email address.");
          } else {
            // if there was an email error shown earlier, clear it (only if okay)
            if (ok) clearFormError(root);
          }

          if (!ok) {
            ev.preventDefault();
            // if email format caused the error, the message is already shown.
            // otherwise show a generic message if nothing else displayed
            const errEl = root.querySelector(".validation-error");
            if (!errEl || !errEl.textContent) {
              showFormError(root, "Please fill in all required fields.");
            }
            const firstInvalid = root.querySelector(".invalid");
            if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
          } // else navigation allowed
        });
      }
    });
  })();

  /* ======================
     SELECT page: require a plan selection before moving forward
     ====================== */
  (function attachSelectValidation(){
    const pageFile = location.pathname.split("/").pop() || "index.html";
    if (pageFile !== "select.html") return;

    // For both roots (mobile & desktop) attach validation to Next anchors
    getRoots().forEach(root => {
      // clear any previous errors when user interacts with plan options (handled in initHandlersForRoot)
      // but ensure we clear when clicking anywhere in the plan area:
      const planArea = root.querySelector(".select-c, .form");
      if (planArea) {
        planArea.addEventListener("click", () => clearFormError(root));
      }

      const nextAnchor = root.querySelector('.butt a[href="pickadons.html"], .butt-2 a[href="pickadons.html"]');
      if (!nextAnchor) return;

      nextAnchor.addEventListener("click", (ev) => {
        // Check if a plan was selected in this root
        const selectedDOM = root.querySelector(".container.selected[data-plan]");
        // Also check storage as canonical source
        const storedPlan = load(STORAGE.PLAN, null);

        const hasSelection = !!(selectedDOM || (storedPlan && storedPlan.name));

        if (!hasSelection) {
          ev.preventDefault();
          // show validation message near the form
          showFormError(root, "Please select a plan to continue.");
          // scroll to plan area
          const firstPlan = root.querySelector(".container[data-plan]");
          if (firstPlan) firstPlan.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          // clear any previous errors and allow navigation
          clearFormError(root);
        }
      });
    });
  })();

  /* ======================
     Finishing up rendering & confirm intercept (with Paystack)
     ====================== */
  (function renderFinishingUp(){
    const pageFile = location.pathname.split("/").pop() || "index.html";
    if (pageFile !== "finishingup.html") return;
  
    // representative root (desktop if visible else mobile)
    const desktop = document.querySelector(".desktop-version");
    const mobile = document.querySelector(".mobile-version");
    const rep = (desktop && window.getComputedStyle(desktop).display !== "none") ? desktop :
                (mobile && window.getComputedStyle(mobile).display !== "none") ? mobile :
                (desktop || mobile || document);
  
    const plan = load(STORAGE.PLAN, { name: "arcade", price: PRICES.monthly.arcade, billing: load(STORAGE.BILLING, "monthly") });
    const addons = load(STORAGE.ADDONS, []);
    const billing = plan.billing || load(STORAGE.BILLING, "monthly");
  
    const planHeading = rep.querySelector(".plan-summary h4");
    const planPriceSpan = rep.querySelector(".summary span");
    const addonsBox = rep.querySelector(".addons-summary");
    const totalLabel = rep.querySelector(".total p");
    const totalSpan = rep.querySelector(".total span");
  
    if (planHeading) planHeading.textContent = `${ucfirst(plan.name)} (${billing === "monthly" ? "Monthly" : "Yearly"})`;
    if (planPriceSpan) planPriceSpan.textContent = billing === "monthly" ? `$${plan.price}/mo` : `$${plan.price}/yr`;
  
    if (addonsBox) {
      addonsBox.innerHTML = "";
      if (addons.length === 0) {
        const spacer = document.createElement("div");
        spacer.style.height = "6px";
        addonsBox.appendChild(spacer);
      } else {
        addons.forEach(a => {
          const g = document.createElement("div");
          g.className = "group-1";
          const title = a.title || a.id.replace(/-/g, " ");
          g.innerHTML = `<p>${ucfirst(title)}</p><span>+$${a.price}/${billing === "monthly" ? "mo" : "yr"}</span>`;
          addonsBox.appendChild(g);
        });
      }
    }
  
    let total = Number(plan.price) || 0;
    addons.forEach(a => total += Number(a.price || 0));
  
    if (totalLabel) totalLabel.textContent = `Total (per ${billing === "monthly" ? "month" : "year"})`;
    if (totalSpan) totalSpan.textContent = `+$${total}/${billing === "monthly" ? "mo" : "yr"}`;
  
    // intercept confirm to clear choices (keep personal info)
    const confirmAnchor = rep.querySelector('.butt-3 a[href="thankyou.html"]');
    if (confirmAnchor) {
      // if an anchor exists, intercept click to run Paystack first,
      // then redirect to thankyou on success (instead of immediate navigation).
      confirmAnchor.addEventListener("click", (ev) => {
        ev.preventDefault();
        // run Paystack payment flow
        // gather customer and order data:
        const personal = load(STORAGE.PERSONAL, {});
        const storedPlan = load(STORAGE.PLAN, null);
        const storedAddons = load(STORAGE.ADDONS, []);
        const billingType = storedPlan && storedPlan.billing ? storedPlan.billing : load(STORAGE.BILLING, "monthly");
        // compute total again
        let computedTotal = Number(storedPlan && storedPlan.price ? storedPlan.price : plan.price) || 0;
        storedAddons.forEach(a => computedTotal += Number(a.price || 0));
        const amountKobo = Math.round(computedTotal * 100);

        // basic validation: email required and valid
        if (!personal || !personal.email || !isValidEmail(personal.email)) {
          showFormError(rep, "Please complete your email before payment.");
          return;
        } else {
          clearFormError(rep);
        }

        if (amountKobo <= 0) {
          showFormError(rep, "Invalid total amount. Please go back and reselect plan/add-ons.");
          return;
        }

        // Paystack setup
        const handler = PaystackPop.setup({
          key: "pk_test_9f1d3a8d1cd0e657ef3248207e873109e2242eb9", // your public key
          email: personal.email,
          amount: amountKobo,
          currency: "NGN",
          metadata: {
            custom_fields: [
              { display_name: "Customer Name", variable_name: "customer_name", value: personal.name || "" },
              { display_name: "Phone", variable_name: "phone", value: personal.phone || "" },
              { display_name: "Selected Plan", variable_name: "selected_plan", value: storedPlan ? storedPlan.name : plan.name },
              { display_name: "Billing Cycle", variable_name: "billing_cycle", value: billingType },
              { display_name: "Add-ons", variable_name: "addons", value: storedAddons.map(a => a.title || a.id).join(", ") },
              { display_name: "Total", variable_name: "total_price", value: `${computedTotal}` }
            ]
          },
          callback: function(response) {
            // Payment successful
            // reset plan/addons storage as before and redirect to custom thank you URL
            try {
              save(STORAGE.BILLING, "monthly"); // reset default
              localStorage.removeItem(STORAGE.PLAN);
              localStorage.removeItem(STORAGE.ADDONS);
            } catch (e) { console.warn("Storage clear error:", e); }

            // redirect to provided Netlify thank you page with reference
            const thankYouUrl = "https://payment-successful.netlify.app/thankyou.html";
            window.location.href = `${thankYouUrl}?reference=${encodeURIComponent(response.reference)}`;
          },
          onClose: function() {
            // user closed the payment modal
            alert("Payment window closed.");
          }
        });

        handler.openIframe();
      });
    }

    // Also support a direct button option (if you changed anchor to a button with id="payButton")
    const payButton = rep.querySelector("#payButton");
    if (payButton) {
      payButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        // gather same data as above
        const personal = load(STORAGE.PERSONAL, {});
        const storedPlan = load(STORAGE.PLAN, null);
        const storedAddons = load(STORAGE.ADDONS, []);
        const billingType = storedPlan && storedPlan.billing ? storedPlan.billing : load(STORAGE.BILLING, "monthly");
        let computedTotal = Number(storedPlan && storedPlan.price ? storedPlan.price : plan.price) || 0;
        storedAddons.forEach(a => computedTotal += Number(a.price || 0));
        const amountKobo = Math.round(computedTotal * 100);

        if (!personal || !personal.email || !isValidEmail(personal.email)) {
          showFormError(rep, "Please complete your email before payment.");
          return;
        } else {
          clearFormError(rep);
        }

        if (amountKobo <= 0) {
          showFormError(rep, "Invalid total amount. Please go back and reselect plan/add-ons.");
          return;
        }

        const handler = PaystackPop.setup({
          key: "pk_test_9f1d3a8d1cd0e657ef3248207e873109e2242eb9",
          email: personal.email,
          amount: amountKobo,
          currency: "NGN",
          metadata: {
            custom_fields: [
              { display_name: "Customer Name", variable_name: "customer_name", value: personal.name || "" },
              { display_name: "Phone", variable_name: "phone", value: personal.phone || "" },
              { display_name: "Selected Plan", variable_name: "selected_plan", value: storedPlan ? storedPlan.name : plan.name },
              { display_name: "Billing Cycle", variable_name: "billing_cycle", value: billingType },
              { display_name: "Add-ons", variable_name: "addons", value: storedAddons.map(a => a.title || a.id).join(", ") },
              { display_name: "Total", variable_name: "total_price", value: `${computedTotal}` }
            ]
          },
          callback: function(response) {
            try {
              save(STORAGE.BILLING, "monthly");
              localStorage.removeItem(STORAGE.PLAN);
              localStorage.removeItem(STORAGE.ADDONS);
            } catch(e){ console.warn("Storage clear error:", e); }
            const thankYouUrl = "https://payment-successful.netlify.app/thankyou.html";
            window.location.href = `${thankYouUrl}?reference=${encodeURIComponent(response.reference)}`;
          },
          onClose: function() {
            alert("Payment window closed.");
          }
        });
        handler.openIframe();
      });
    }
  })();
  
  /* ======================
     Window resize: re-sync UI
     ====================== */
  window.addEventListener("resize", () => {
    // re-highlight nav for visible root
    (function reHighlight(){
      const pageFile = location.pathname.split("/").pop() || "index.html";
      const mapping = { "index.html":0, "select.html":1, "pickadons.html":2, "finishingup.html":3, "thankyou.html":3 };
      const idx = mapping[pageFile] ?? 0;
      getRoots().forEach(root => {
        if (window.getComputedStyle(root).display === "none") return;
        const buttons = root.querySelectorAll(".navbar .btn");
        buttons.forEach((b,i) => b.classList.toggle("active", i === idx));
      });
    })();
  
    const billingNow = load(STORAGE.BILLING, "monthly");
    getRoots().forEach(r => updateBillingUIForRoot(r, billingNow));
  });

});
