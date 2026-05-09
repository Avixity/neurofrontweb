const loader = document.querySelector(".page-loader");
const cursorGlow = document.querySelector(".cursor-glow");
const particleCanvas = document.getElementById("particle-canvas");
const revealItems = document.querySelectorAll(".reveal");
const countItems = document.querySelectorAll("[data-count]");
const waveCanvases = document.querySelectorAll(".wave-canvas");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const navAnchors = document.querySelectorAll('.nav-links a, .button[href^="#"], .brand');
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

let loaderHidden = false;

const hideLoader = () => {
  if (loaderHidden) {
    return;
  }

  loaderHidden = true;
  loader?.classList.add("is-hidden");
  document.body.classList.remove("is-loading");
};

window.addEventListener("DOMContentLoaded", () => {
  window.setTimeout(hideLoader, 450);
});

window.addEventListener("load", () => {
  window.setTimeout(hideLoader, 150);
});

window.setTimeout(hideLoader, 1800);

if (!("ontouchstart" in window) && cursorGlow) {
  window.addEventListener("mousemove", (event) => {
    cursorGlow.classList.add("is-active");
    cursorGlow.style.transform = `translate(${event.clientX - cursorGlow.offsetWidth / 2}px, ${
      event.clientY - cursorGlow.offsetHeight / 2
    }px)`;
  });

  window.addEventListener("mouseleave", () => {
    cursorGlow.classList.remove("is-active");
  });
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (!navToggle.contains(target) && !navLinks.contains(target)) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
  });
}

navAnchors.forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const href = anchor.getAttribute("href");

    if (href && href.startsWith("#")) {
      const target = document.querySelector(href);

      if (target) {
        event.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    }

    navLinks?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  });
});

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -40px 0px",
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const animateCount = (element) => {
  const target = Number(element.dataset.count || 0);
  const duration = 1400;
  const start = performance.now();

  const step = (timestamp) => {
    const progress = clamp((timestamp - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = String(Math.round(target * eased));

    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = String(target);
    }
  };

  window.requestAnimationFrame(step);
};

const countObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      animateCount(entry.target);
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.45 }
);

countItems.forEach((item) => countObserver.observe(item));

const setupParticles = () => {
  if (!particleCanvas) {
    return;
  }

  const context = particleCanvas.getContext("2d");
  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let particles = [];

  const particleCount = () => {
    const base = Math.floor((window.innerWidth * window.innerHeight) / 18000);
    return clamp(base, 45, 120);
  };

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    particleCanvas.width = Math.floor(width * ratio);
    particleCanvas.height = Math.floor(height * ratio);
    particleCanvas.style.width = `${width}px`;
    particleCanvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    particles = Array.from({ length: particleCount() }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: Math.random() * 1.8 + 0.6,
      alpha: Math.random() * 0.45 + 0.1,
    }));
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);

    particles.forEach((particle, index) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -10 || particle.x > width + 10) {
        particle.vx *= -1;
      }
      if (particle.y < -10 || particle.y > height + 10) {
        particle.vy *= -1;
      }

      context.beginPath();
      context.fillStyle = `rgba(114, 213, 255, ${particle.alpha})`;
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();

      for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
        const other = particles[nextIndex];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 120) {
          context.beginPath();
          context.strokeStyle = `rgba(94, 242, 214, ${0.08 * (1 - distance / 120)})`;
          context.lineWidth = 1;
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.stroke();
        }
      }
    });

    window.requestAnimationFrame(draw);
  };

  resize();
  draw();
  window.addEventListener("resize", resize);
};

const setupWaveCanvases = () => {
  waveCanvases.forEach((canvas, index) => {
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let tick = index * 0.75;

    const render = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (!width || !height) {
        window.requestAnimationFrame(render);
        return;
      }

      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(94, 242, 214, 0.85)");
      gradient.addColorStop(0.5, "rgba(114, 213, 255, 0.92)");
      gradient.addColorStop(1, "rgba(255, 101, 132, 0.86)");

      context.strokeStyle = "rgba(114, 213, 255, 0.08)";
      context.lineWidth = 1;
      for (let line = 1; line <= 4; line += 1) {
        const y = (height / 5) * line;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      context.strokeStyle = gradient;
      context.lineWidth = 2.2;
      context.shadowBlur = 12;
      context.shadowColor = "rgba(114, 213, 255, 0.25)";
      context.beginPath();

      for (let x = 0; x <= width; x += 4) {
        const normalized = x / width;
        const pulse = Math.sin(normalized * 14 + tick) * 11;
        const micro = Math.sin(normalized * 41 - tick * 1.4) * 4.8;
        const drift = Math.cos(normalized * 6 + tick * 0.5) * 6.2;
        const y = height * 0.5 + pulse + micro + drift;

        if (x === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
      context.shadowBlur = 0;

      tick += prefersReducedMotion ? 0 : 0.028;
      window.requestAnimationFrame(render);
    };

    render();
  });
};

const setupGsap = () => {
  if (typeof gsap === "undefined" || prefersReducedMotion) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  gsap.from(".hero-copy > *", {
    y: 28,
    opacity: 0,
    duration: 0.9,
    stagger: 0.12,
    ease: "power3.out",
  });

  gsap.from(".hero-visual .command-center", {
    y: 36,
    opacity: 0,
    scale: 0.98,
    duration: 1,
    ease: "power3.out",
    delay: 0.15,
  });

  gsap.to(".float-card", {
    yPercent: -3,
    xPercent: 1,
    duration: 4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    stagger: 0.4,
  });

  gsap.utils.toArray(".parallax-card").forEach((card) => {
    gsap.to(card, {
      yPercent: -4,
      ease: "none",
      scrollTrigger: {
        trigger: card,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });

  gsap.utils.toArray(".future-card").forEach((card) => {
    gsap.to(card, {
      y: -4,
      duration: 3.4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: Math.random() * 0.9,
    });
  });
};

setupParticles();
setupWaveCanvases();
setupGsap();
