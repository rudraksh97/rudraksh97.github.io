/* ==========================================================================
   FRAMER-INSPIRED PORTFOLIO - JavaScript Interactions
   ========================================================================== */

(function () {
    'use strict';

    // --------------------------------------------------------------------------
    // Theme Toggle
    // --------------------------------------------------------------------------
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const iconSun = themeToggle?.querySelector('.icon-sun');
    const iconMoon = themeToggle?.querySelector('.icon-moon');

    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle?.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        if (iconSun && iconMoon) {
            if (theme === 'dark') {
                iconSun.style.display = 'block';
                iconMoon.style.display = 'none';
            } else {
                iconSun.style.display = 'none';
                iconMoon.style.display = 'block';
            }
        }
    }

    // --------------------------------------------------------------------------
    // Mobile Navigation
    // --------------------------------------------------------------------------
    const navToggle = document.getElementById('nav-toggle');
    const navMobileMenu = document.getElementById('nav-mobile-menu');
    const navMobileLinks = document.querySelectorAll('.nav-mobile-link');

    navToggle?.addEventListener('click', () => {
        const isOpen = navMobileMenu.classList.contains('active');
        navMobileMenu.classList.toggle('active');
        navToggle.setAttribute('aria-expanded', !isOpen);

        // Animate hamburger
        const spans = navToggle.querySelectorAll('span');
        if (!isOpen) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        }
    });

    // Close mobile menu when clicking a link
    navMobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMobileMenu.classList.remove('active');
            const spans = navToggle?.querySelectorAll('span');
            if (spans) {
                spans[0].style.transform = '';
                spans[1].style.opacity = '';
                spans[2].style.transform = '';
            }
        });
    });

    // --------------------------------------------------------------------------
    // Smooth Scrolling with Offset
    // --------------------------------------------------------------------------
    const navHeight = 72;

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // --------------------------------------------------------------------------
    // Scroll Reveal Animations
    // --------------------------------------------------------------------------
    const revealElements = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Don't unobserve to keep animation state
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // --------------------------------------------------------------------------
    // Stagger Children Animation
    // --------------------------------------------------------------------------
    const staggerContainers = document.querySelectorAll('.stagger-children');

    const staggerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.2
    });

    staggerContainers.forEach(el => staggerObserver.observe(el));

    // --------------------------------------------------------------------------
    // Active Navigation Link
    // --------------------------------------------------------------------------
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function updateActiveNav() {
        const scrollPos = window.scrollY + navHeight + 100;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollPos >= top && scrollPos < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + id) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav, { passive: true });
    updateActiveNav();

    // --------------------------------------------------------------------------
    // Navbar Background on Scroll
    // --------------------------------------------------------------------------
    const nav = document.getElementById('nav');

    function updateNavBackground() {
        if (window.scrollY > 50) {
            nav.style.background = 'var(--color-bg-glass)';
        } else {
            nav.style.background = 'transparent';
        }
    }

    window.addEventListener('scroll', updateNavBackground, { passive: true });
    updateNavBackground();

    // --------------------------------------------------------------------------
    // Card Mouse Glow Effect
    // --------------------------------------------------------------------------
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', x + '%');
            card.style.setProperty('--mouse-y', y + '%');
        });
    });

    // --------------------------------------------------------------------------
    // Parallax Effect on Hero
    // --------------------------------------------------------------------------
    const heroContent = document.querySelector('.hero-content');
    const heroBg = document.querySelector('.hero-bg');

    function handleParallax() {
        const scrolled = window.scrollY;
        const heroHeight = window.innerHeight;

        if (scrolled < heroHeight && heroContent && heroBg) {
            const opacity = 1 - (scrolled / heroHeight) * 0.8;
            const translateY = scrolled * 0.3;

            heroContent.style.opacity = opacity;
            heroContent.style.transform = `translateY(${translateY}px)`;
            heroBg.style.transform = `translateY(${scrolled * 0.2}px)`;
        }
    }

    window.addEventListener('scroll', handleParallax, { passive: true });

    // --------------------------------------------------------------------------
    // Form Focus Animation
    // --------------------------------------------------------------------------
    const formInputs = document.querySelectorAll('.form-input, .form-textarea');

    formInputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', () => {
            input.parentElement.classList.remove('focused');
        });
    });

    // --------------------------------------------------------------------------
    // Button Ripple Effect
    // --------------------------------------------------------------------------
    const buttons = document.querySelectorAll('.btn');

    buttons.forEach(button => {
        button.addEventListener('click', function (e) {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.style.cssText = `
        position: absolute;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        left: ${x}px;
        top: ${y}px;
        width: 100px;
        height: 100px;
        margin-left: -50px;
        margin-top: -50px;
      `;

            button.style.position = 'relative';
            button.style.overflow = 'hidden';
            button.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Add ripple animation to stylesheet
    const style = document.createElement('style');
    style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
    document.head.appendChild(style);

    // --------------------------------------------------------------------------
    // Typewriter Effect for Hero (Optional Enhancement)
    // --------------------------------------------------------------------------
    // Uncomment if you want a typewriter effect on the hero badge
    /*
    const heroBadgeText = document.querySelector('.hero-badge span:last-child');
    if (heroBadgeText) {
      const text = heroBadgeText.textContent;
      heroBadgeText.textContent = '';
      let i = 0;
      
      function typeWriter() {
        if (i < text.length) {
          heroBadgeText.textContent += text.charAt(i);
          i++;
          setTimeout(typeWriter, 50);
        }
      }
      
      setTimeout(typeWriter, 1000);
    }
    */

    // --------------------------------------------------------------------------
    // Performance: Debounce scroll events
    // --------------------------------------------------------------------------
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --------------------------------------------------------------------------
    // Cursor Trail Effect (Optional - Uncomment for extra flair)
    // --------------------------------------------------------------------------
    /*
    const cursor = document.createElement('div');
    cursor.className = 'cursor-trail';
    cursor.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--color-accent-glow), transparent 70%);
      pointer-events: none;
      z-index: 9999;
      opacity: 0.5;
      transition: transform 0.1s ease-out;
    `;
    document.body.appendChild(cursor);
  
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX - 10 + 'px';
      cursor.style.top = e.clientY - 10 + 'px';
    });
    */

    // --------------------------------------------------------------------------
    // Console Easter Egg
    // --------------------------------------------------------------------------
    console.log('%c👋 Hey there, fellow developer!', 'font-size: 20px; font-weight: bold; color: #888;');
    console.log('%cThanks for checking out my portfolio. Feel free to reach out!', 'font-size: 14px; color: #666;');
    console.log('%cEmail: rudraksh.agarwal97@gmail.com', 'font-size: 12px; color: #555;');

})();
