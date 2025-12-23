// ================= ALL INITIALIZATION ON DOM LOAD =================
document.addEventListener("DOMContentLoaded", () => {
    
    // ================= SWIPER SLIDER =================
    const homeSlider = document.querySelector(".home-slider");
    if (homeSlider) {
        var swiper = new Swiper(".home-slider", {
            loop:true,
            navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
            },
            autoplay:{
                delay:3500,
                disableOnInteraction:false,
            },
        });
    }

    // ================= MOBILE MENU TOGGLE =================
    const menu = document.querySelector('#menu-btn');
    const navbar = document.querySelector('.header .navbar');

    if (menu && navbar) {
        menu.onclick = () => {
            menu.classList.toggle('fa-times');
            navbar.classList.toggle('active');
        }

        // Close menu on scroll
        window.onscroll = () => {
            menu.classList.remove('fa-times');
            navbar.classList.remove('active');
        }
    }

    // ================= REVIEW SLIDER =================
    const reviews = document.querySelectorAll(".review-card");
    const dotsContainer = document.querySelector(".dots");
    const nextBtn = document.querySelector(".next");
    const prevBtn = document.querySelector(".prev");

    if (reviews.length > 0 && dotsContainer && nextBtn && prevBtn) {
        let index = 0;
        let autoSlide;

        function showReview(i) {
            reviews.forEach((review, idx) => {
                review.classList.remove("active");
                if (dotsContainer.children[idx]) {
                    dotsContainer.children[idx].classList.remove("active");
                }
                if (idx === i) {
                    review.classList.add("active");
                    if (dotsContainer.children[idx]) {
                        dotsContainer.children[idx].classList.add("active");
                    }
                }
            });
            index = i;
        }

        reviews.forEach((_, i) => {
            let dot = document.createElement("span");
            dot.addEventListener("click", () => {
                showReview(i);
                resetAutoSlide();
            });
            dotsContainer.appendChild(dot);
        });

        showReview(0);

        nextBtn.addEventListener("click", () => {
            index = (index + 1) % reviews.length;
            showReview(index);
            resetAutoSlide();
        });

        prevBtn.addEventListener("click", () => {
            index = (index - 1 + reviews.length) % reviews.length;
            showReview(index);
            resetAutoSlide();
        });

        function autoPlay() {
            index = (index + 1) % reviews.length;
            showReview(index);
        }

        function resetAutoSlide() {
            clearInterval(autoSlide);
            autoSlide = setInterval(autoPlay, 4000);
        }

        autoSlide = setInterval(autoPlay, 4000);
    }

    // ================= CUSTOM SLIDER =================
    const customSliderTrack = document.querySelector('.custom-slider-track');
    const customLeftBtn = document.querySelector('.custom-slider-left');
    const customRightBtn = document.querySelector('.custom-slider-right');

    if (customSliderTrack && customLeftBtn && customRightBtn) {
        let customScrollAmount = 0;
        const customScrollStep = 320;

        customLeftBtn.addEventListener('click', () => {
            customScrollAmount -= customScrollStep;
            if (customScrollAmount < 0) customScrollAmount = 0;
            customSliderTrack.style.transform = `translateX(-${customScrollAmount}px)`;
        });

        customRightBtn.addEventListener('click', () => {
            const maxScroll = customSliderTrack.scrollWidth - customSliderTrack.clientWidth;
            customScrollAmount += customScrollStep;
            if (customScrollAmount > maxScroll) customScrollAmount = maxScroll;
            customSliderTrack.style.transform = `translateX(-${customScrollAmount}px)`;
        });
    }

    // ================= STATS ANIMATION =================
    const stats = document.querySelectorAll(".stat");

    function animateCounter(el) {
        const target = +el.getAttribute("data-target");
        let count = 0;
        const increment = target / 200;

        function updateCounter() {
            count += increment;
            if (count < target) {
                el.textContent = Math.floor(count);
                requestAnimationFrame(updateCounter);
            } else {
                el.textContent = target + "+";
            }
        }
        updateCounter();
    }

    function showStats() {
        stats.forEach(stat => {
            const rect = stat.getBoundingClientRect();
            if (rect.top < window.innerHeight - 50) {
                stat.classList.add("visible");
                const num = stat.querySelector(".number");
                if (!num.classList.contains("done")) {
                    animateCounter(num);
                    num.classList.add("done");
                }
            }
        });
    }

    if (stats.length > 0) {
        window.addEventListener("scroll", showStats);
        window.addEventListener("load", showStats);
    }

    // ================= COURSE MENU TOGGLE =================
    const menuToggle = document.getElementById("courseMenuToggle");
    const navLinks = document.getElementById("courseNavLinks");

    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            navLinks.classList.toggle("active");
        });
    }

    // ================= ADMIN SIDEBAR TOGGLE (MOBILE) =================
    const adminMenuToggle = document.querySelector(".menu-toggle");
    const adminSidebar = document.querySelector(".admin-sidebar");

    if (adminMenuToggle && adminSidebar) {
        adminMenuToggle.addEventListener("click", () => {
            adminSidebar.classList.toggle("active");
        });
    }
});
