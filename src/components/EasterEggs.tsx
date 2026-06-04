"use client";
import { useEffect } from "react";

/**
 * Site-wide easter eggs:
 *  - Loading curtain (first of session only)
 *  - SEW theme swap (typed anywhere)
 *  - Idle 15s needle + heart
 *  - Scroll reveal observer
 *  - Logo tape measure (handled by Header click → fires CustomEvent("sh:logo"))
 *  - Toast helper
 *  - Page-specific eggs (collage, scissors tile, product image 5×, offers bow, trust flip)
 *    bind via class hooks on the home page elements.
 */
export default function EasterEggs() {
  useEffect(() => {
    const $  = <T extends Element = Element>(s: string, c: ParentNode = document) => c.querySelector(s) as T | null;
    const $$ = <T extends Element = Element>(s: string, c: ParentNode = document) => Array.from(c.querySelectorAll(s)) as T[];

    /* ---------- toast helper ---------- */
    const toast = $("#toast") as HTMLElement | null;
    let toastTimer: any;
    function say(msg: string) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
    }

    /* ---------- 1. loading curtain ---------- */
    const loader = $("#loader") as HTMLElement | null;
    if (loader) {
      function revealLoader() {
        loader!.classList.add("done");
        setTimeout(() => loader!.classList.add("hide"), 800);
      }
      if (sessionStorage.getItem("sh_loaded")) {
        loader.classList.add("done", "hide");
      } else {
        sessionStorage.setItem("sh_loaded", "1");
        const onLoad = () => setTimeout(revealLoader, 1300);
        if (document.readyState === "complete") onLoad();
        else window.addEventListener("load", onLoad);
        setTimeout(revealLoader, 2600);
      }
    }

    /* ---------- scroll reveal ---------- */
    const revealEls = $$<HTMLElement>(".reveal, .stitch-underline");
    function showAll() { revealEls.forEach(el => el.classList.add("in")); }
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window && revealEls.length) {
      io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { (e.target as HTMLElement).classList.add("in"); io!.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      revealEls.forEach(el => io!.observe(el));
      const failsafe = () => setTimeout(() => { if (!document.querySelector(".reveal.in")) showAll(); }, 1200);
      if (document.readyState === "complete") failsafe();
      else window.addEventListener("load", failsafe);
    } else if (revealEls.length) {
      showAll();
    }

    /* ---------- 2. theme spools (type SEW) ---------- */
    const KEYS = ["b50","b100","b200","b300","b400","b500","b600","b700","b800","b900"];
    const THEMES = [
      { name: "Terracotta", v: ["252 246 239","251 238 225","244 216 191","233 185 142","219 146 88","202 111 46","180 87 28","148 67 15","115 52 12","82 38 11"] },
      { name: "Indigo",     v: ["241 243 251","227 231 247","195 203 236","152 166 222","107 127 203","74 93 181","54 71 154","41 55 122","31 42 94","22 29 66"] },
      { name: "Forest",     v: ["240 247 241","222 239 225","188 223 195","140 199 154","87 168 109","47 138 75","31 111 58","21 87 48","16 67 38","11 47 27"] },
    ];
    let themeIdx = parseInt(localStorage.getItem("sh_theme") || "0");
    function applyTheme(i: number) {
      const t = THEMES[i];
      KEYS.forEach((k, n) => document.documentElement.style.setProperty(`--${k}`, t.v[n]));
    }
    if (themeIdx > 0) applyTheme(themeIdx);
    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key && e.key.length === 1) {
        buf = (buf + e.key.toLowerCase()).slice(-3);
        if (buf === "sew") {
          themeIdx = (themeIdx + 1) % THEMES.length;
          applyTheme(themeIdx);
          localStorage.setItem("sh_theme", String(themeIdx));
          say(`🧵 Re-threaded: ${THEMES[themeIdx].name}`);
          buf = "";
        }
      }
    };
    window.addEventListener("keydown", onKey);

    /* ---------- 3. logo → tape measure (via custom event from Header) ---------- */
    const tape = $("#tape") as HTMLElement | null;
    let tapeTimer: any;
    const onLogo = () => {
      if (!tape) return;
      tape.classList.add("show");
      say("📏 Measure twice, cut once!");
      clearTimeout(tapeTimer);
      tapeTimer = setTimeout(() => tape.classList.remove("show"), 3000);
    };
    window.addEventListener("sh:logo", onLogo as EventListener);

    /* ---------- 4. scissors tile → 3 clicks = snip ---------- */
    const sc = $("#cat-scissors") as HTMLAnchorElement | null;
    let scN = 0, scT: any;
    if (sc) {
      sc.addEventListener("click", function (e) {
        e.preventDefault();
        scN++; clearTimeout(scT);
        const ico = $(".ico", sc) as HTMLElement | null;
        if (ico) {
          ico.style.transition = "transform .12s";
          ico.style.transform = "rotate(-18deg)";
          setTimeout(() => (ico.style.transform = ""), 120);
        }
        if (scN >= 3) { scN = 0; snip(sc); return; }
        scT = setTimeout(() => { scN = 0; window.location.href = sc.getAttribute("href") || "/"; }, 480);
      });
    }
    function snip(el: HTMLElement) {
      say("✂️ snip snip!");
      const r = el.getBoundingClientRect();
      const line = document.createElement("div");
      line.style.cssText = `position:fixed;left:${r.left}px;top:${r.top + r.height/2}px;height:0;border-top:3px dashed rgb(var(--b600));width:0;z-index:88;pointer-events:none;transition:width .5s ease`;
      document.body.appendChild(line);
      requestAnimationFrame(() => { line.style.width = (window.innerWidth - r.left - 20) + "px"; });
      setTimeout(() => line.remove(), 900);
    }

    /* ---------- 5. product image 5× → Tailor's Pick patch ---------- */
    $$<HTMLAnchorElement>(".egg-prod").forEach(card => {
      const img = $(".img", card) as HTMLElement | null;
      if (!img) return;
      let n = 0, t: any;
      img.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        n++; clearTimeout(t);
        img.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 160 });
        if (n >= 5) {
          n = 0;
          if (!img.querySelector(".patch")) {
            const p = document.createElement("span");
            p.className = "patch";
            p.textContent = "⭐ Tailor's Pick";
            img.appendChild(p);
            requestAnimationFrame(() => p.classList.add("on"));
            say("⭐ Tailor's Pick unlocked!");
          }
          return;
        }
        t = setTimeout(() => { n = 0; window.location.href = card.getAttribute("href") || "/"; }, 480);
      });
    });

    /* ---------- 6. offers banner hover 2s → ribbon bow ---------- */
    const ob = $("#offers-banner") as HTMLElement | null;
    const bow = $("#bow") as HTMLElement | null;
    let bowT: any;
    if (ob && bow) {
      ob.addEventListener("mouseenter", () => { bowT = setTimeout(() => { bow.classList.add("on"); say("🎀 All wrapped up!"); }, 2000); });
      ob.addEventListener("mouseleave", () => clearTimeout(bowT));
    }

    /* ---------- 7. trust icons flip ---------- */
    $$<HTMLElement>(".egg-trust").forEach(b => {
      const ic = $(".ti", b) as HTMLElement | null;
      if (!ic) return;
      const orig = ic.textContent || "";
      const alt = b.getAttribute("data-alt") || orig;
      let flipped = false;
      b.addEventListener("click", () => {
        const a = ic.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(90deg)" }], { duration: 140 });
        a.onfinish = () => {
          flipped = !flipped;
          ic.textContent = flipped ? alt : orig;
          ic.animate([{ transform: "rotateY(90deg)" }, { transform: "rotateY(0)" }], { duration: 140 });
        };
      });
    });

    /* ---------- 8. collage: click all → confetti ---------- */
    const collage = $$<HTMLElement>(".egg-collage");
    const clicked: Record<number, boolean> = {};
    collage.forEach((el, i) => {
      el.addEventListener("click", () => {
        clicked[i] = true;
        el.animate([{ transform: "scale(1)" }, { transform: "scale(1.18) rotate(8deg)" }, { transform: "scale(1)" }], { duration: 220 });
        if (Object.keys(clicked).length === collage.length) {
          Object.keys(clicked).forEach(k => delete clicked[+k]);
          confetti();
          say("🎉 You found them all!");
        }
      });
    });
    function confetti() {
      const emo = ["🔘","🎀","🧵","🧷","✂️","🪡","🧶"];
      for (let i = 0; i < 36; i++) {
        const s = document.createElement("div");
        s.className = "confetti";
        s.textContent = emo[Math.floor(Math.random() * emo.length)];
        s.style.left = Math.random() * 100 + "vw";
        const dur = 2.2 + Math.random() * 1.8;
        s.style.animationDuration = dur + "s";
        s.style.fontSize = (16 + Math.random() * 16) + "px";
        document.body.appendChild(s);
        setTimeout(() => s.remove(), dur * 1000 + 200);
      }
    }

    /* ---------- idle 15s → needle + heart ---------- */
    const idle = $("#idle") as HTMLElement | null;
    let idleT: any;
    function resetIdle() {
      if (!idle) return;
      idle.classList.remove("on");
      clearTimeout(idleT);
      idleT = setTimeout(() => idle.classList.add("on"), 15000);
    }
    const events = ["mousemove","keydown","scroll","touchstart","click"];
    events.forEach(ev => window.addEventListener(ev, resetIdle, { passive: true } as any));
    resetIdle();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("sh:logo", onLogo as EventListener);
      events.forEach(ev => window.removeEventListener(ev, resetIdle));
      io?.disconnect();
    };
  }, []);

  return (
    <>
      {/* Loading curtain */}
      <div id="loader">
        <div className="panel left" />
        <div className="panel right" />
        <div className="center">
          <div className="flex flex-col items-center gap-4">
            <div className="spool">🧵</div>
            <svg className="stitchline" viewBox="0 0 200 20"><line x1="0" y1="10" x2="200" y2="10" /></svg>
            <p className="font-serif text-brand-700 font-semibold text-sm tracking-wide">Stitching things together…</p>
          </div>
        </div>
      </div>
      <div id="toast" />
      <div id="idle">🪡<span style={{ fontSize: 18 }}>❤️</span></div>
    </>
  );
}
