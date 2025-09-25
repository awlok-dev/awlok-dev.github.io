// Document ready function
document.addEventListener("DOMContentLoaded", function() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Scroll animations with mobile optimization
    const observerOptions = {
        threshold: 0.05, // Lower threshold for mobile
        rootMargin: '0px 0px -20px 0px' // Reduced margin for mobile
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
        
        // Fallback for mobile devices - force visibility after a delay
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                if (!el.classList.contains('visible')) {
                    el.classList.add('visible');
                }
            }, 1000);
        }
    });

    // Additional mobile-specific fix for projects section
    function ensureProjectsVisibility() {
        const projectsSection = document.getElementById('projects');
        if (projectsSection && window.innerWidth <= 768) {
            projectsSection.style.opacity = '1';
            projectsSection.style.transform = 'translateY(0)';
            projectsSection.style.visibility = 'visible';
            projectsSection.classList.add('visible');
        }
    }

    // Call immediately and on resize
    ensureProjectsVisibility();
    window.addEventListener('resize', ensureProjectsVisibility);

    // Navbar background on scroll
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav');
        if (window.scrollY > 100) {
            nav.style.background = 'rgba(15, 15, 35, 0.95)';
        } else {
            nav.style.background = 'rgba(15, 15, 35, 0.9)';
        }
    });

    // Parallax effect for hero section
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero-content');
        if (hero) {
            const speed = scrolled * 0.3;
            hero.style.transform = `translateY(${speed}px)`;
        }
    });

    // Game card interactions
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-url');
            if (url) {
                window.location.href = url;
            }
        });

        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-15px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Video controls toggle on hover
    let videos = document.querySelectorAll('.gallery-item video');
    
    videos.forEach(video => {
        video.controls = false; // Hide controls by default
    
        video.onmouseover = function () {
            this.controls = true;
        };
    
        video.onmouseout = function () {
            this.controls = false;
        };
    });
    
    // Pause other videos when one starts playing
    videos.forEach(video => {
        video.addEventListener('play', function() {
            videos.forEach(v => {
                if(v != this) v.pause();
            });
        });
    });

    // Mobile Navigation functionality
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileNavClose = document.getElementById('mobile-nav-close');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    const mobileThemeButton = document.getElementById('mobile-theme-button');

    // Function to open mobile menu
    function openMobileMenu() {
        mobileNav.classList.add('active');
        mobileMenuBtn.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Add keyboard focus trap
        const focusableElements = mobileNav.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    // Function to close mobile menu
    function closeMobileMenu() {
        mobileNav.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Return focus to menu button
        mobileMenuBtn.focus();
    }

    // Mobile menu button click
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (mobileNav.classList.contains('active')) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
    }

    // Close button click
    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', closeMobileMenu);
    }

    // Overlay click to close
    if (mobileNavOverlay) {
        mobileNavOverlay.addEventListener('click', closeMobileMenu);
    }

    // Close menu when clicking nav links
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
            // Small delay to allow smooth scrolling to work
            setTimeout(() => {
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 300);
        });
    });

    // Keyboard accessibility - ESC to close menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // Handle window resize - close menu on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileNav.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // Touch/swipe functionality for mobile nav
    let touchStartX = 0;
    let touchEndX = 0;

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }

    function handleSwipe() {
        const swipeThreshold = 100; // Minimum distance for a swipe
        const swipeDistance = touchEndX - touchStartX;

        // Swipe right to close menu (when swiping on the content panel)
        if (swipeDistance > swipeThreshold && mobileNav.classList.contains('active')) {
            closeMobileMenu();
        }
    }

    // Add touch listeners to mobile nav content
    if (mobileNav) {
        const mobileNavContent = mobileNav.querySelector('.mobile-nav-content');
        if (mobileNavContent) {
            mobileNavContent.addEventListener('touchstart', handleTouchStart, { passive: true });
            mobileNavContent.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
    }

    // Sync mobile theme button with main theme
    function syncThemeButtons() {
        const mainThemeBtn = document.getElementById('theme-button');
        if (mainThemeBtn && mobileThemeButton) {
            const iconText = mainThemeBtn.textContent;
            mobileThemeButton.innerHTML = `<i class="material-icons">${iconText}</i>`;
        }
    }

    // Mobile theme button functionality
    if (mobileThemeButton) {
        mobileThemeButton.addEventListener('click', () => {
            // Trigger the main theme button click
            const mainThemeBtn = document.getElementById('theme-button');
            if (mainThemeBtn) {
                mainThemeBtn.click();
                // Sync the mobile button after theme change
                setTimeout(syncThemeButtons, 100);
            }
        });
    }

    // Initial sync of theme buttons
    syncThemeButtons();

    // Theme toggle functionality
    const themeButton = document.getElementById('theme-button');
    if (themeButton) {
        themeButton.textContent = 'light_mode';
        
        themeButton.addEventListener('click', function () {
            const body = document.body;
            const icon = document.getElementById('theme-button');
            const particles = document.getElementById('particles-js');

            if (body.classList.contains('light-mode')) {
                body.classList.remove('light-mode');
                body.classList.add('dark-mode');
                icon.textContent = 'light_mode';
                if (particles) particles.style.backgroundColor = 'black';
                // Sync mobile theme button
                if (mobileThemeButton) {
                    mobileThemeButton.innerHTML = '<i class="material-icons">light_mode</i>';
                }

                // Update particles for dark mode
                if (window.particlesJS) {
                    particlesJS('particles-js', {
                        "particles": {
                            "number": {
                                "value": 80,
                                "density": {
                                    "enable": true,
                                    "value_area": 800
                                }
                            },
                            "color": {
                                "value": "#ffffff"
                            },
                            "shape": {
                                "type": "circle",
                                "stroke": {
                                    "width": 0,
                                    "color": "#000000"
                                }
                            },
                            "opacity": {
                                "value": 0.5,
                                "random": false,
                                "anim": {
                                    "enable": false,
                                    "speed": 1,
                                    "opacity_min": 0.1,
                                    "sync": false
                                }
                            },
                            "size": {
                                "value": 5,
                                "random": true,
                                "anim": {
                                    "enable": false,
                                    "speed": 40,
                                    "size_min": 0.1,
                                    "sync": false
                                }
                            },
                            "line_linked": {
                                "enable": true,
                                "distance": 150,
                                "color": "#ffffff",
                                "opacity": 0.4,
                                "width": 1
                            },
                            "move": {
                                "enable": true,
                                "speed": 1,
                                "direction": "none",
                                "random": false,
                                "straight": false,
                                "out_mode": "out"
                            }
                        },
                        "interactivity": {
                            "detect_on": "canvas",
                            "events": {
                                "onhover": {
                                    "enable": false,
                                    "mode": "repulse"
                                },
                                "onclick": {
                                    "enable": false,
                                    "mode": "push"
                                },
                                "resize": true
                            }
                        },
                        "retina_detect": true
                    });
                }
            } else {
                body.classList.remove('dark-mode');
                body.classList.add('light-mode');
                icon.textContent = 'dark_mode';
                if (particles) particles.style.backgroundColor = 'white';
                // Sync mobile theme button
                if (mobileThemeButton) {
                    mobileThemeButton.innerHTML = '<i class="material-icons">dark_mode</i>';
                }

                // Update particles for light mode
                if (window.particlesJS) {
                    particlesJS('particles-js', {
                        "particles": {
                            "number": {
                                "value": 80,
                                "density": {
                                    "enable": true,
                                    "value_area": 800
                                }
                            },
                            "color": {
                                "value": "#000000"
                            },
                            "shape": {
                                "type": "circle",
                                "stroke": {
                                    "width": 0,
                                    "color": "#000000"
                                }
                            },
                            "opacity": {
                                "value": 0.5,
                                "random": false,
                                "anim": {
                                    "enable": false,
                                    "speed": 1,
                                    "opacity_min": 0.1,
                                    "sync": false
                                }
                            },
                            "size": {
                                "value": 5,
                                "random": true,
                                "anim": {
                                    "enable": false,
                                    "speed": 40,
                                    "size_min": 0.1,
                                    "sync": false
                                }
                            },
                            "line_linked": {
                                "enable": true,
                                "distance": 150,
                                "color": "#000000",
                                "opacity": 0.4,
                                "width": 1
                            },
                            "move": {
                                "enable": true,
                                "speed": 1,
                                "direction": "none",
                                "random": false,
                                "straight": false,
                                "out_mode": "out"
                            }
                        },
                        "interactivity": {
                            "detect_on": "canvas",
                            "events": {
                                "onhover": {
                                    "enable": false,
                                    "mode": "repulse"
                                },
                                "onclick": {
                                    "enable": false,
                                    "mode": "push"
                                },
                                "resize": true
                            }
                        },
                        "retina_detect": true
                    });
                }
            }
        });
    }

    // Typing effect for hero text
    function typeWriter(element, text, speed = 50) {
        let i = 0;
        element.innerHTML = '';
        
        function typing() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(typing, speed);
            }
        }
        typing();
    }

    // Initialize typing effect when page loads
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        setTimeout(() => {
            typeWriter(heroTitle, originalText, 100);
        }, 500);
    }

    // Cursor trail effect
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Contact cards hover effects
    const contactCards = document.querySelectorAll('.contact-card');
    contactCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
            card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
            card.style.boxShadow = '';
        });
    });

    // Gallery lightbox effects
    const galleryItems = document.querySelectorAll('.gallery-item img');
    galleryItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'scale(1.05)';
            item.style.filter = 'brightness(1.1)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'scale(1)';
            item.style.filter = 'brightness(1)';
        });
    });

    // Initialize particles.js if available
    if (window.particlesJS && document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 80,
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": "#ffffff"
                },
                "shape": {
                    "type": "circle",
                    "stroke": {
                        "width": 0,
                        "color": "#000000"
                    }
                },
                "opacity": {
                    "value": 0.5,
                    "random": false,
                    "anim": {
                        "enable": false,
                        "speed": 1,
                        "opacity_min": 0.1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 5,
                    "random": true,
                    "anim": {
                        "enable": false,
                        "speed": 40,
                        "size_min": 0.1,
                        "sync": false
                    }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#ffffff",
                    "opacity": 0.4,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 1,
                    "direction": "none",
                    "random": false,
                    "straight": false,
                    "out_mode": "out"
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": {
                        "enable": false,
                        "mode": "repulse"
                    },
                    "onclick": {
                        "enable": false,
                        "mode": "push"
                    },
                    "resize": true
                }
            },
            "retina_detect": true
        });
    }

    // Performance optimization: debounce scroll events
    function debounce(func, wait = 20, immediate = true) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    // Apply debouncing to scroll events
    window.addEventListener('scroll', debounce(() => {
        // Navbar background on scroll
        const nav = document.querySelector('nav');
        if (window.scrollY > 100) {
            nav.style.background = 'rgba(15, 15, 35, 0.95)';
        } else {
            nav.style.background = 'rgba(15, 15, 35, 0.9)';
        }

        // Parallax effect for hero section
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero-content');
        if (hero) {
            const speed = scrolled * 0.3;
            hero.style.transform = `translateY(${speed}px)`;
        }
    }));

    // Enhanced Sequential Lazy Loading Implementation - loads images one by one
    function initLazyLoading() {
        const lazyImages = document.querySelectorAll('img.lazy-load');
        let loadingQueue = [];
        let isLoading = false;
        
        // Function to load next image in queue
        function loadNextImage() {
            if (loadingQueue.length === 0 || isLoading) return;
            
            isLoading = true;
            const img = loadingQueue.shift();
            const placeholder = img.nextElementSibling;
            const spinner = placeholder ? placeholder.querySelector('.loading-spinner') : null;
            
            // Add loading state to image
            img.classList.add('loading');
            
            // Load the image
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            
            // Handle load event
            img.addEventListener('load', () => {
                // Remove loading state and add loaded state
                img.classList.remove('loading');
                img.classList.add('loaded');
                
                // Hide placeholder with smooth transition
                if (placeholder && placeholder.classList.contains('image-placeholder')) {
                    setTimeout(() => {
                        placeholder.classList.add('hidden');
                    }, 100);
                }
                
                // Mark as not loading and process next image
                isLoading = false;
                setTimeout(() => {
                    loadNextImage();
                }, 200); // Small delay between image loads for smooth sequential effect
            });
            
            // Handle error event
            img.addEventListener('error', () => {
                img.classList.remove('loading');
                img.classList.add('loaded');
                
                if (placeholder && placeholder.classList.contains('image-placeholder')) {
                    // Replace spinner with error message
                    if (spinner) {
                        spinner.style.display = 'none';
                    }
                    const errorMsg = document.createElement('div');
                    errorMsg.innerHTML = '<span style="font-size: 1rem; color: #ff6b6b; text-align: center;">Failed to load image</span>';
                    placeholder.appendChild(errorMsg);
                    
                    // Hide error message after a delay
                    setTimeout(() => {
                        placeholder.classList.add('hidden');
                    }, 2000);
                }
                
                // Mark as not loading and process next image
                isLoading = false;
                setTimeout(() => {
                    loadNextImage();
                }, 200);
            });
        }
        
        // Check if browser supports Intersection Observer
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        
                        // Add to loading queue instead of loading immediately
                        if (!loadingQueue.includes(img) && img.dataset.src) {
                            loadingQueue.push(img);
                            
                            // Start loading if not already loading
                            if (!isLoading) {
                                loadNextImage();
                            }
                        }
                        
                        observer.unobserve(img);
                    }
                });
            }, {
                root: null,
                rootMargin: '100px', // Increased margin for better sequential loading
                threshold: 0.1
            });
            
            lazyImages.forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback for older browsers - still sequential but immediate
            let currentIndex = 0;
            
            function loadNextSequentially() {
                if (currentIndex >= lazyImages.length) return;
                
                const img = lazyImages[currentIndex];
                const placeholder = img.nextElementSibling;
                const spinner = placeholder ? placeholder.querySelector('.loading-spinner') : null;
                
                img.classList.add('loading');
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                
                img.addEventListener('load', () => {
                    img.classList.remove('loading');
                    img.classList.add('loaded');
                    if (placeholder && placeholder.classList.contains('image-placeholder')) {
                        setTimeout(() => {
                            placeholder.classList.add('hidden');
                        }, 100);
                    }
                    
                    currentIndex++;
                    setTimeout(() => {
                        loadNextSequentially();
                    }, 200);
                });
                
                img.addEventListener('error', () => {
                    img.classList.remove('loading');
                    img.classList.add('loaded');
                    if (placeholder && placeholder.classList.contains('image-placeholder')) {
                        if (spinner) {
                            spinner.style.display = 'none';
                        }
                        const errorMsg = document.createElement('div');
                        errorMsg.innerHTML = '<span style="font-size: 1rem; color: #ff6b6b;">Failed to load</span>';
                        placeholder.appendChild(errorMsg);
                        setTimeout(() => {
                            placeholder.classList.add('hidden');
                        }, 2000);
                    }
                    
                    currentIndex++;
                    setTimeout(() => {
                        loadNextSequentially();
                    }, 200);
                });
            }
            
            // Start sequential loading after a short delay
            setTimeout(() => {
                loadNextSequentially();
            }, 500);
        }
    }

    // Preload critical images for better performance
    function preloadCriticalImages() {
        const criticalImages = [
            'assets/images/web_icon.png',
            './assets/images/icon.png'
        ];
        
        criticalImages.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }

    // Image optimization: Progressive JPEG detection and WebP support
    function checkWebPSupport() {
        return new Promise((resolve) => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                resolve(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    // Initialize lazy loading and performance optimizations
    preloadCriticalImages();
    initLazyLoading();
    
    // Check WebP support for future optimization
    checkWebPSupport().then(supportsWebP => {
        if (supportsWebP) {
            console.log('WebP is supported - consider using WebP format for better compression');
        } else {
            console.log('WebP not supported - using fallback formats');
        }
    });
});