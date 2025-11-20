// script.js - Universal Multi-Step Form with Validation & Paystack
// Works for both mobile (.mobile-version) and desktop (.desktop-version)

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
    yearly: { arcade: 90, advanced: 120, pro: 150 }
  };

  const ADDON_PRICES = {
    monthly: { "online-service": 1, "larger-storage": 2, "customizable-profile": 2 },
    yearly: { "online-service": 10, "larger-storage": 20, "customizable-profile": 20 }
  };

  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function load(key, fallback = null) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  function ucfirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // Defaults
  if (!load(STORAGE.BILLING)) save(STORAGE.BILLING, "monthly");
  if (!load(STORAGE.PLAN)) save(STORAGE.PLAN, { name: "arcade", price: PRICES.monthly.arcade, billing: "monthly" });

  /* ======================
     Helpers to find UI root
     ====================== */
  function getRoots() {
    return [document.querySelector(".mobile-version"), document.querySelector(".desktop-version")].filter(Boolean);
  }
  function getVisibleRoot() {
    const roots = getRoots();
    for (const r of roots) if (window.getComputedStyle(r).display !== "none") return r;
    return document;
  }

  /* ======================
     Validation helpers
     ====================== */
  function showFormError(root, message) {
    if (!root) root = getVisibleRoot();
    let err = root.querySelector(".validation-error");
    if (!err) {
      err = document.createElement("p");
      err.className = "validation-error";
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
    if (err) { err.textContent = ""; err.style.display = "none"; }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /* ======================
     Nav highlighting
     ====================== */
  (function highlightNav() {
    const pageFile = location.pathname.split("/").pop() || "index.html";
    const mapping = { "index.html": 0, "select.html": 1, "pickadons.html": 2, "finishingup.html": 3, "thankyou.html": 3 };
    const idx = mapping[pageFile] ?? 0;
    getRoots().forEach(root => {
      if (window.getComputedStyle(root).display === "none") return;
      const buttons = root.querySelectorAll(".navbar .btn");
      buttons.forEach((b, i) => b.classList.toggle("active", i === idx));
    });
  })();

  /* ======================
     Billing UI updater
     ====================== */
  function updateBillingUIForRoot(root, billing) {
    if (!root) return;
    const isYearly = billing === "yearly";

    const monthlyLabel = root.querySelector("#monthly-label");
    const yearlyLabel = root.querySelector("#yearly-label");
    if (monthlyLabel) monthlyLabel.classList.toggle("active", !isYearly);
    if (yearlyLabel) yearlyLabel.classList.toggle("active", isYearly);

    const planContainers = root.querySelectorAll(".container[data-plan]");
    planContainers.forEach(c => {
      const plan = c.dataset.plan;
      const priceEl = c.querySelector(".price");
      const freeEl = c.querySelector(".free-months");
      if (priceEl) priceEl.textContent = isYearly ? `$${PRICES.yearly[plan]}/yr` : `$${PRICES.monthly[plan]}/mo`;
      if (freeEl) freeEl.classList.toggle("visible", isYearly);
    });

    const addonEls = root.querySelectorAll(".add-ons[data-addon]");
    addonEls.forEach(a => {
      const id = a.dataset.addon;
      const span = a.querySelector("span");
      if (!span) return;
      const price = isYearly ? ADDON_PRICES.yearly[id] : ADDON_PRICES.monthly[id];
      const suffix = isYearly ? "/yr" : "/mo";
      span.textContent = `+$${price}${suffix}`;
    });

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
     Root handlers
     ====================== */
  function initHandlersForRoot(root) {
    if (!root) return;

    // Toggle billing
    const toggleInput = root.querySelector(".toggle input[type='checkbox']");
    if (toggleInput) {
      const billingStored = load(STORAGE.BILLING, "monthly");
      toggleInput.checked = billingStored === "yearly";
      updateBillingUIForRoot(root, billingStored);

      toggleInput.addEventListener("change", () => {
        const newBilling = toggleInput.checked ? "yearly" : "monthly";
        save(STORAGE.BILLING, newBilling);
        getRoots().forEach(r => updateBillingUIForRoot(r, newBilling));
      });

      const toggleContainer = toggleInput.closest(".toggle");
      if (toggleContainer) {
        toggleContainer.setAttribute("tabindex", "0");
        toggleContainer.addEventListener("keydown", e => {
          if (["Enter"," "].includes(e.key)) {
            e.preventDefault();
            toggleInput.checked = !toggleInput.checked;
            toggleInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
    }

    // Plan selection
    const planContainers = root.querySelectorAll(".container[data-plan]");
    planContainers.forEach(c => {
      c.setAttribute("tabindex", "0");
      c.addEventListener("click", () => {
        planContainers.forEach(s => s.classList.remove("selected"));
        c.classList.add("selected");
        const planKey = c.dataset.plan;
        const billing = load(STORAGE.BILLING, "monthly");
        const price = billing === "yearly" ? PRICES.yearly[planKey] : PRICES.monthly[planKey];
        save(STORAGE.PLAN, { name: planKey, price, billing });
        clearFormError(root);
      });
      c.addEventListener("keydown", e => { if (["Enter"," "].includes(e.key)) { e.preventDefault(); c.click(); } });
    });
    const savedPlan = load(STORAGE.PLAN);
    if (savedPlan && savedPlan.name) planContainers.forEach(c => c.classList.toggle("selected", c.dataset.plan === savedPlan.name));

    // Add-ons
    const addonEls = root.querySelectorAll(".add-ons[data-addon]");
    addonEls.forEach(a => {
      let cb = a.querySelector('input[type="checkbox"]') || (() => { const el = document.createElement("input"); el.type="checkbox"; a.prepend(el); return el; })();
      cb.tabIndex = -1; a.setAttribute("tabindex","0");

      const savedAddons = load(STORAGE.ADDONS, []);
      const isSel = savedAddons.find(x=>x.id===a.dataset.addon);
      cb.checked = !!isSel;
      a.classList.toggle("selected", !!isSel);

      a.addEventListener("click", ev => {
        if(ev.target.tagName.toLowerCase() !== "input") cb.checked = !cb.checked;
        a.classList.toggle("selected", cb.checked);
        persistAddons();
      });
      a.addEventListener("keydown", e => { if(["Enter"," "].includes(e.key)){ e.preventDefault(); cb.checked=!cb.checked; a.classList.toggle("selected", cb.checked); persistAddons(); } });
      cb.addEventListener("change", ()=>{ a.classList.toggle("selected", cb.checked); persistAddons(); });
    });
  }

  function persistAddons() {
    const desktop = document.querySelector(".desktop-version");
    const mobile = document.querySelector(".mobile-version");
    const rep = (desktop && window.getComputedStyle(desktop).display !== "none") ? desktop :
                (mobile && window.getComputedStyle(mobile).display !== "none") ? mobile :
                (desktop || mobile || document);
    const selected = [];
    rep.querySelectorAll(".add-ons[data-addon]").forEach(a => {
      const cb = a.querySelector('input[type="checkbox"]');
      if(cb && cb.checked){
        const id=a.dataset.addon;
        const billing=load(STORAGE.BILLING,"monthly");
        const price=billing==="yearly"?ADDON_PRICES.yearly[id]:ADDON_PRICES.monthly[id];
        const title=a.querySelector(".cont-2 h4")?.textContent||id;
        selected.push({id,price,title});
      }
    });
    save(STORAGE.ADDONS, selected);
  }

  /* ======================
     Initialize everything
     ====================== */
  getRoots().forEach(initHandlersForRoot);
  const currentBilling = load(STORAGE.BILLING,"monthly");
  getRoots().forEach(r=>updateBillingUIForRoot(r,currentBilling));

  /* ======================
     Index page validation
     ====================== */
  (function indexValidation(){
    if((location.pathname.split("/").pop()||"index.html")!=="index.html") return;
    getRoots().forEach(root=>{
      const inputs=Array.from(root.querySelectorAll(".form input")).slice(0,3);
      const saved=load(STORAGE.PERSONAL,{});
      if(saved){
        if(inputs[0]) inputs[0].value=saved.name||"";
        if(inputs[1]) inputs[1].value=saved.email||"";
        if(inputs[2]) inputs[2].value=saved.phone||"";
      }
      inputs.forEach(inp=>inp.addEventListener("input",()=>{
        save(STORAGE.PERSONAL,{name:inputs[0]?.value||"",email:inputs[1]?.value||"",phone:inputs[2]?.value||""});
        inp.classList.remove("invalid"); clearFormError(root);
      }));
      const nextAnchor=root.querySelector('.butt a[href="select.html"], .butt-2 a[href="select.html"]');
      if(nextAnchor){
        nextAnchor.addEventListener("click",ev=>{
          let ok=true;
          inputs.forEach(inp=>{ if(!inp.value.trim()){inp.classList.add("invalid"); ok=false;}else inp.classList.remove("invalid"); });
          if(inputs[1] && inputs[1].value && !isValidEmail(inputs[1].value)){inputs[1].classList.add("invalid"); ok=false; showFormError(root,"Please enter a valid email address.");}
          else if(ok) clearFormError(root);
          if(!ok){ ev.preventDefault(); const firstInvalid=root.querySelector(".invalid"); if(firstInvalid) firstInvalid.scrollIntoView({behavior:"smooth",block:"center"}); if(!root.querySelector(".validation-error")?.textContent) showFormError(root,"Please fill in all required fields."); }
        });
      }
    });
  })();

  /* ======================
     Select page validation
     ====================== */
  (function selectValidation(){
    if((location.pathname.split("/").pop()||"index.html")!=="select.html") return;
    getRoots().forEach(root=>{
      const planArea=root.querySelector(".select-c,.form");
      if(planArea) planArea.addEventListener("click",()=>clearFormError(root));
      const nextAnchor=root.querySelector('.butt a[href="pickadons.html"], .butt-2 a[href="pickadons.html"]');
      if(!nextAnchor) return;
      nextAnchor.addEventListener("click",ev=>{
        const selectedDOM=root.querySelector(".container.selected[data-plan]");
        const storedPlan=load(STORAGE.PLAN,null);
        if(!(selectedDOM || (storedPlan && storedPlan.name))){
          ev.preventDefault();
          showFormError(root,"Please select a plan to continue.");
          const firstPlan=root.querySelector(".container[data-plan]");
          if(firstPlan) firstPlan.scrollIntoView({behavior:"smooth",block:"center"});
        } else clearFormError(root);
      });
    });
  })();

  /* ======================
     FinishingUp page: render summary & Paystack
     ====================== */
  (function finishingUp(){
    if((location.pathname.split("/").pop()||"index.html")!=="finishingup.html") return;

    const desktop=document.querySelector(".desktop-version");
    const mobile=document.querySelector(".mobile-version");
    const rep=(desktop && window.getComputedStyle(desktop).display!=="none")?desktop:
              (mobile && window.getComputedStyle(mobile).display!=="none")?mobile:
              (desktop||mobile||document);

    const plan=load(STORAGE.PLAN,{name:"arcade",price:PRICES.monthly.arcade,billing:load(STORAGE.BILLING,"monthly")});
    const addons=load(STORAGE.ADDONS,[]);
    const billing=plan.billing||load(STORAGE.BILLING,"monthly");

    const planHeading=rep.querySelector(".plan-summary h4");
    const planPriceSpan=rep.querySelector(".summary span");
    const addonsBox=rep.querySelector(".addons-summary");
    const totalLabel=rep.querySelector(".total p");
    const totalSpan=rep.querySelector(".total span");

    if(planHeading) planHeading.textContent=`${ucfirst(plan.name)} (${billing==="monthly"?"Monthly":"Yearly"})`;
    if(planPriceSpan) planPriceSpan.textContent=billing==="monthly"?`$${plan.price}/mo`:`$${plan.price}/yr`;

    if(addonsBox){ addonsBox.innerHTML=""; if(addons.length===0){ const spacer=document.createElement("div"); spacer.style.height="6px"; addonsBox.appendChild(spacer); } else { addons.forEach(a=>{ const g=document.createElement("div"); g.className="group-1"; const title=a.title||a.id.replace(/-/g," "); g.innerHTML=`<p>${ucfirst(title)}</p><span>+$${a.price}/${billing==="monthly"?"mo":"yr"}</span>`; addonsBox.appendChild(g); }); } }

    let total=Number(plan.price)||0; addons.forEach(a=>total+=Number(a.price||0));
    if(totalLabel) totalLabel.textContent=`Total (per ${billing==="monthly"?"month":"year"})`;
    if(totalSpan) totalSpan.textContent=`+$${total}/${billing==="monthly"?"mo":"yr"}`;

    function runPaystack() {
      const personal=load(STORAGE.PERSONAL,{});
      const storedPlan=load(STORAGE.PLAN,null);
      const storedAddons=load(STORAGE.ADDONS,[]);
      const billingType=storedPlan?.billing||load(STORAGE.BILLING,"monthly");
      let computedTotal=Number(storedPlan?.price||plan.price); storedAddons.forEach(a=>computedTotal+=Number(a.price||0));
      const amountKobo=Math.round(computedTotal*100);

      if(!personal?.email || !isValidEmail(personal.email)){ showFormError(rep,"Please complete your email before payment."); return; }
      clearFormError(rep);
      if(amountKobo<=0){ showFormError(rep,"Invalid total amount. Please go back and reselect plan/add-ons."); return; }

      const handler=PaystackPop.setup({
        key:"pk_test_9f1d3a8d1cd0e657ef3248207e873109e2242eb9",
        email:personal.email,
        amount:amountKobo,
        currency:"NGN",
        metadata:{custom_fields:[
          {display_name:"Customer Name", variable_name:"customer_name", value:personal.name||""},
          {display_name:"Phone", variable_name:"phone", value:personal.phone||""},
          {display_name:"Selected Plan", variable_name:"selected_plan", value:storedPlan?storedPlan.name:plan.name},
          {display_name:"Billing Cycle", variable_name:"billing_cycle", value:billingType},
          {display_name:"Add-ons", variable_name:"addons", value:storedAddons.map(a=>a.title||a.id).join(", ")},
          {display_name:"Total", variable_name:"total_price", value:`${computedTotal}`}
        ]},
        callback:function(response){
          try{ save(STORAGE.BILLING,"monthly"); localStorage.removeItem(STORAGE.PLAN); localStorage.removeItem(STORAGE.ADDONS); }catch(e){console.warn("Storage clear error:",e);}
          window.location.href=`https://payment-successful.netlify.app/thankyou.html?reference=${encodeURIComponent(response.reference)}`;
        },
        onClose:function(){ alert("Payment window closed."); }
      });
      handler.openIframe();
    }

    const confirmAnchor=rep.querySelector('.butt-3 a[href="thankyou.html"]');
    if(confirmAnchor) confirmAnchor.addEventListener("click",ev=>{ ev.preventDefault(); runPaystack(); });
    const payButton=rep.querySelector("#payButton");
    if(payButton) payButton.addEventListener("click",ev=>{ ev.preventDefault(); runPaystack(); });

  })();

  /* ======================
     Window resize: sync UI
     ====================== */
  window.addEventListener("resize",()=>{
    highlightNav();
    const billingNow=load(STORAGE.BILLING,"monthly");
    getRoots().forEach(r=>updateBillingUIForRoot(r,billingNow));
  });

});
