document.addEventListener('DOMContentLoaded', () => {
    fetch('tours.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(rawToursData => {
            const tourProducts = processRawTours(rawToursData);
            const toursGrid = document.getElementById('toursGrid');

            if (toursGrid && tourProducts.length > 0) {
                toursGrid.innerHTML = ''; // Clear existing content (like sample card)

                // Group tours by country
                const toursByCountry = tourProducts.reduce((acc, tour) => {
                    const country = tour.country || "Uncategorized"; // Fallback for tours without a country
                    if (!acc[country]) {
                        acc[country] = [];
                    }
                    acc[country].push(tour);
                    return acc;
                }, {});

                // Define the desired order of countries
                const countryOrder = ["Italy", "Austria", "Croatia", "Sardinia", "France", "Spain"];
                const sortedCountries = Object.keys(toursByCountry).sort((a, b) => {
                    const indexA = countryOrder.indexOf(a);
                    const indexB = countryOrder.indexOf(b);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1; // Known countries first
                    if (indexB !== -1) return 1;
                    return a.localeCompare(b); // Alphabetical for others
                });
                
                createCountryBreadcrumbs(sortedCountries, toursGrid); // Insert breadcrumbs

                sortedCountries.forEach(country => {
                    const countryHeader = document.createElement('h2');
                    countryHeader.className = 'country-heading';
                    countryHeader.textContent = country;
                    // Add ID for anchor linking
                    countryHeader.id = 'country-' + country.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    toursGrid.appendChild(countryHeader);

                    const countryTourContainer = document.createElement('div');
                    countryTourContainer.className = 'country-tours-grid'; // For specific grid styling per country if needed

                    toursByCountry[country].forEach(tourProduct => {
                        const tourCard = createTourCard(tourProduct);
                        countryTourContainer.appendChild(tourCard);
                    });
                    toursGrid.appendChild(countryTourContainer);
                    equalizeCardHeights(countryTourContainer);
                });

            } else if (toursGrid) {
                toursGrid.innerHTML = '<p>No tours available.</p>';
            }
        })
        .catch(error => {
            console.error("Failed to load or process tours:", error);
            const toursGrid = document.getElementById('toursGrid');
            if (toursGrid) {
                toursGrid.innerHTML = '<p>Error loading tours. Please try again later.</p>';
            }
        });

    setupBackToTopButton(); // Initialize the back to top button
});

// Helper function for country and location detection
const countryKeywords = {
    "IT": { name: "ITALY", keywords: ["italy", "italian", "rome", "venice", "florence", "tuscany", "sorrento", "amalfi", "sicily", "sardinia", "pompeii", "verona", "elba", "cinque terre", "garda", "forte dei marmi", "puglia"] },
    "AT": { name: "AUSTRIA", keywords: ["austria", "austrian", "innsbruck", "salzburg", "vienna", "tyrol", "mayrhofen", "zell am see", "st. johann", "achensee"] },
    "HR": { name: "CROATIA", keywords: ["croatia", "croatian", "plitvice", "krk", "istrian", "dubrovnik", "split"] },
    "ES": { name: "SPAIN", keywords: ["spain", "spanish", "barcelona", "majorca", "costa brava", "ibiza"] },
    "CH": { name: "SWITZERLAND", keywords: ["switzerland", "swiss", "lucerne", "interlaken", "alps"] }, // Added "alps" for broader match
    "FR": { name: "FRANCE", keywords: ["france", "french", "paris", "nice", "riviera", "provence", "corsica"] },
    "DE": { name: "GERMANY", keywords: ["germany", "german", "rhine", "bavaria", "berlin"] },
    "PT": { name: "PORTUGAL", keywords: ["portugal", "portuguese", "lisbon", "algarve", "porto"] },
    "GR": { name: "GREECE", keywords: ["greece", "greek", "athens", "crete", "santorini"] },
    "GB": { name: "UK", keywords: ["uk", "united kingdom", "britain", "british", "england", "scotland", "wales", "london", "scottish"] }
};

function detectCountriesAndLocations(title, description, countryFieldValue) {
    const searchText = ( (title || "") + " " + (description || "") + " " + (countryFieldValue || "") ).toLowerCase();
    const detectedCountries = [];
    const foundCountryCodes = new Set();

    for (const code in countryKeywords) {
        if (countryKeywords[code].keywords.some(kw => {
            // Use a regular expression with word boundaries for more precise matching
            // Escape special regex characters in the keyword first, though our current keywords are simple
            const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Basic escaping
            const regex = new RegExp(`\\b${escapedKw}\\b`, 'i'); // 'i' for case-insensitive
            return regex.test(searchText);
        })) {
            if (!foundCountryCodes.has(code)) {
                detectedCountries.push({ name: countryKeywords[code].name, code: code });
                foundCountryCodes.add(code);
            }
        }
    }
    
    let locationDisplayString = "";
    const titleParts = title.split(/[,&]| and | with /i).map(p => p.trim()).filter(p => p.length > 2);

    if (detectedCountries.length > 0) {
        locationDisplayString = detectedCountries.map(c => c.name).join(" \u2022 "); // e.g., ITALY \u2022 FRANCE

        // Try to find a more specific location from title that isn't a country name itself
        let specificLocationAdded = false;
        for (const part of titleParts) {
            const partLower = part.toLowerCase();
            // Check if the part is NOT a country name we already detected
            // And also check it's not a generic keyword for those countries (to avoid ITALY • TUSCANY if Tuscany implies Italy)
            if (!detectedCountries.some(c => partLower.includes(c.name.toLowerCase()))) {
                let isKeywordOfDetected = false;
                for(const country of detectedCountries) {
                    if(countryKeywords[country.code].keywords.some(kw => partLower.includes(kw))) {
                        isKeywordOfDetected = true;
                        break;
                    }
                }
                if (!isKeywordOfDetected || detectedCountries.length > 1) { // Add if not a keyword, or if it is but multiple countries involved
                    locationDisplayString += " \u2022 " + part.toUpperCase();
                    specificLocationAdded = true;
                    break; // Add first specific one
                }
            }
        }
        // If no specific location was added and we have title parts, and only one country, add the first title part.
        if (!specificLocationAdded && titleParts.length > 0 && detectedCountries.length === 1) {
            if (!detectedCountries.some(c => titleParts[0].toLowerCase().includes(c.name.toLowerCase()))){
                 locationDisplayString += " \u2022 " + titleParts[0].toUpperCase();
            }
        }

    } else if (titleParts.length > 0) {
        locationDisplayString = titleParts[0].toUpperCase(); // Fallback to first part of title
    } else {
        locationDisplayString = "Popular Destination"; // Generic fallback
    }

    return { detectedCountries, locationDisplayString };
}

function processRawTours(rawToursData) {
    const groupedTours = {};

    rawToursData.forEach(item => {
        const tourNameForKey = (item.tour || "").trim().toLowerCase();
        const productKey = tourNameForKey; 

        if (!groupedTours[productKey]) {
            const { detectedCountries } = detectCountriesAndLocations(item.tour, item.description, item.country);
            
            let countryLocationDisplay = "Destination"; 
            if (detectedCountries && detectedCountries.length > 0) {
                countryLocationDisplay = detectedCountries.map(c => c.name.toUpperCase()).join(" \u2022 ");
            }

            groupedTours[productKey] = {
                title: item.tour, // Use the original tour name for display
                description: item.description, // Use description from the first item
                image_url: item.image_url, // Use image_url from the first item
                availableDates: [],
                hotels: [],
                detectedCountries: detectedCountries, 
                locationDisplayString: countryLocationDisplay, // UPDATED to use only country name
                activityLevel: item.tour_activity_level || "Moderate", 
                price_from: item.price_from, // General price for the tour product
                country: item.country || "Uncategorized" // Add country field
            };
        }
        groupedTours[productKey].availableDates.push(item.date);
        
        // Ensure hotel specific price is captured if it varies
        const existingHotel = groupedTours[productKey].hotels.find(h => h.name === item.hotel_name);
        if (!existingHotel) {
            groupedTours[productKey].hotels.push({
                name: item.hotel_name,
                url: `#${item.hotel_name.toLowerCase().replace(/\\s+/g, '-')}-link`, // Simple link generation
                rating: item.hotel_start_rating, 
                price_from: item.price_from // Price for this specific hotel instance on the tour product
            });
        } else {
            // Optionally, update price if a different one is found for an existing hotel on this tour product.
            // For now, we take the first one encountered.
        }
    });

    return Object.values(groupedTours).map(product => {
        product.availableDates = [...new Set(product.availableDates)].sort();
        return product;
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const options = { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
    };
    const formatted = date.toLocaleDateString('en-US', options);
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);
    return formatted.replace(day.toString(), `${day}${suffix}`);
}

function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

function generateStars(rating) {
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 0 || numRating > 5) {
      return 'N/A'; // Or some other placeholder for invalid ratings
    }
    const fullStars = '★'.repeat(numRating);
    return fullStars; // Return only full stars
}

function createTourCard(tourProduct) {
    const card = document.createElement('div');
    card.className = 'tour-card';
    
    const allHotels = tourProduct.hotels || []; // Get all hotels
    // const primaryHotelForLink = allHotels.length > 0 ? allHotels[0] : null; // No longer needed for main card links
    // const primaryHotelUrl = primaryHotelForLink ? primaryHotelForLink.url : '#'; // No longer needed for main card links

    const fullyGuidedBadgeHtml = `
        <img src="images/fully_guided.png" alt="Fully Guided Tour" class="fully-guided-badge tour-badge">
    `;
    const soleOccBadgeHtml = `
        <img src="images/sole_occ.png" alt="Single Rooms Available" class="sole-occ-badge tour-badge">
    `;

    let locationBarContentHtml = '';
    if (tourProduct.detectedCountries && tourProduct.detectedCountries.length > 0) {
        const countrySegments = tourProduct.detectedCountries.map(country => {
            let flagImg = '';
            if (country.code) {
                const countryCode = country.code.toUpperCase();
                flagImg = `<img src="https://flagsapi.com/${countryCode}/flat/24.png" alt="Flag of ${country.name}" class="flag-icon">`;
            } else {
                // Optional: could add a placeholder span here if a country name exists but no code
                // flagImg = `<span class="flag-icon placeholder"></span>`; 
            }
            return `<span class="country-name-segment">${flagImg}${country.name.toUpperCase()}</span>`;
        });
        locationBarContentHtml = countrySegments.join(' <span class="location-separator">•</span> ');
    } else {
        locationBarContentHtml = '<span class="location-text">Destinations</span>';
    }

    const locationBarHtml = `
        <div class="location-bar">
            ${locationBarContentHtml}
        </div>
    `;

    let allHotelsHtml = '';
    if (allHotels.length > 0) {
        allHotelsHtml = `
            <div class="all-hotels-list">
                ${allHotels.map(hotel => 
                    `<div class="hotel-entry">
                        <div class="hotel-text-details">
                            <a href="${hotel.url}" class="hotel-link" target="_blank">${hotel.name}</a>
                            <div class="hotel-price-rating">
                                <span class="hotel-rating">${generateStars(hotel.rating)}</span>
                                <span class="hotel-price">From ${hotel.price_from || 'N/A'}</span>
                            </div>
                        </div>
                        <a href="${hotel.url}" class="view-hotel-button" target="_blank">View Tour</a>
                    </div>`
                ).join('')}
            </div>`;
    } else {
        allHotelsHtml = '<p class="no-hotels-info">Hotel information not available.</p>';
    }

    const activityLevelValue = tourProduct.activityLevel || "Moderate";
    const activityIndicatorHtml = `
        <div class="activity-indicator">
            <div class="activity-gauge">
                <img src="images/tours_activity_circle.png" alt="Activity gauge background" class="gauge-background-img">
                <img src="images/tours_activity_needle.png" alt="Gauge needle" class="gauge-needle-img">
            </div>
            <div class="activity-text-box">
                <span class="activity-text-label">ACTIVITY LEVEL</span>
                <span class="activity-text-value">${activityLevelValue.toUpperCase()}</span>
            </div>
        </div>
    `;

    const tourTitleAreaHtml = `
        <div class="tour-title-area">
            <h2 class="tour-title">${tourProduct.title || 'Tour Title'}</h2>
        </div>
    `;

    const tourDetailsAreaHtml = `
        <div class="tour-details-area">
            <p class="tour-description">${tourProduct.description || 'No description available.'}</p>
            ${allHotelsHtml}
        </div>
    `;

    card.innerHTML = `
        <div class="tour-image-wrapper">
            <img src="${tourProduct.image_url || 'placeholder.jpg'}" alt="${tourProduct.title || 'Tour image'}" class="tour-image" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/600x400?text=Image+Not+Available';">
            <div class="badges-container">
                ${fullyGuidedBadgeHtml}
                ${soleOccBadgeHtml}
            </div>
            ${locationBarHtml}
        </div>
        
        <div class="title-activity-wrapper">
            ${tourTitleAreaHtml}
            ${activityIndicatorHtml}
        </div>
        ${tourDetailsAreaHtml}
    `;
    
    const needleImg = card.querySelector('.gauge-needle-img');
    if (needleImg) {
        const rotation = getActivityLevelRotation(activityLevelValue);
        needleImg.style.transform = `rotate(${rotation}deg)`;
    }

    const monthAvailabilityContainer = document.createElement('div');
    monthAvailabilityContainer.className = 'month-availability';

    const departingInHeader = document.createElement('div');
    departingInHeader.className = 'departing-in-header';
    departingInHeader.textContent = 'Departing in';
    monthAvailabilityContainer.appendChild(departingInHeader); // Add header first

    renderMonthAvailability(tourProduct.availableDates, monthAvailabilityContainer);
    // card.appendChild(monthAvailabilityContainer); // Old position

    // Find the title-activity-wrapper to insert monthAvailabilityContainer after it
    const titleActivityWrapper = card.querySelector('.title-activity-wrapper');
    if (titleActivityWrapper) {
        titleActivityWrapper.insertAdjacentElement('afterend', monthAvailabilityContainer);
    } else {
        // Fallback if the wrapper isn't found for some reason (shouldn't happen)
        card.appendChild(monthAvailabilityContainer);
    }
    
    return card;
}

function getActivityLevelRotation(level) {
    switch (level.toLowerCase()) {
        case 'relaxed': return -80;
        case 'leisurely': return -40;
        case 'moderate': return 0;
        case 'active': return 40;
        case 'challenging': return 80;
        default: return 0;
    }
}

function renderMonthAvailability(availableDates, container) {
    // Clear only year toggle and month grid, not the entire container
    const existingYearToggle = container.querySelector('.year-toggle');
    if (existingYearToggle) existingYearToggle.remove();
    const existingMonthGrid = container.querySelector('.month-grid');
    if (existingMonthGrid) existingMonthGrid.remove();

    const availabilityByYear = {};
    availableDates.forEach(dateStr => {
        const date = new Date(dateStr + 'T00:00:00');
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        if (!availabilityByYear[year]) {
            availabilityByYear[year] = new Set();
        }
        availabilityByYear[year].add(month);
    });

    // Determine years for the toggle: current year and next year
    const currentCalendarYear = new Date().getFullYear();
    const yearsToDisplay = [currentCalendarYear, currentCalendarYear + 1];

    let currentSelectedYear = currentCalendarYear; // Default to current calendar year

    // Year Toggle
    const yearToggleContainer = document.createElement('div');
    yearToggleContainer.className = 'year-toggle';

    yearsToDisplay.forEach(year => {
        const yearButton = document.createElement('button');
        yearButton.type = 'button';
        yearButton.textContent = year;
        yearButton.dataset.year = year;
        if (year === currentSelectedYear) {
            yearButton.classList.add('active');
        }
        yearButton.addEventListener('click', (e) => {
            currentSelectedYear = parseInt(e.currentTarget.dataset.year, 10);
            yearToggleContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateMonthGrid();
        });
        yearToggleContainer.appendChild(yearButton);
    });
    container.appendChild(yearToggleContainer);

    // Month Grid
    const monthGrid = document.createElement('div');
    monthGrid.className = 'month-grid';
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    monthNames.forEach((name, index) => {
        const monthCell = document.createElement('div');
        monthCell.className = 'month-cell';
        monthCell.textContent = name;
        monthCell.dataset.month = index;
        monthGrid.appendChild(monthCell);
    });
    container.appendChild(monthGrid);

    function updateMonthGrid() {
        // Get available months for the currentSelectedYear from the tour's specific data
        const availableMonthsForSelectedYear = availabilityByYear[currentSelectedYear] || new Set();
        monthGrid.querySelectorAll('.month-cell').forEach(cell => {
            const monthIndex = parseInt(cell.dataset.month, 10);
            if (availableMonthsForSelectedYear.has(monthIndex)) {
                cell.classList.add('available');
            } else {
                cell.classList.remove('available');
            }
        });
    }

    updateMonthGrid(); // Initial population
}

// Debounce utility function
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

// MODIFIED: Function to equalize card heights on a per-row basis
function equalizeCardHeights(container) {
    const cards = Array.from(container.querySelectorAll('.tour-card'));
    if (!cards.length) return;

    // Reset heights first to get natural height of all cards
    cards.forEach(card => {
        card.style.minHeight = '0'; 
    });

    // Group cards by row (based on offsetTop)
    const rows = {};
    cards.forEach(card => {
        const topOffset = card.offsetTop;
        if (!rows[topOffset]) {
            rows[topOffset] = [];
        }
        rows[topOffset].push(card);
    });

    // Set minHeight for each row
    for (const key in rows) {
        const rowCards = rows[key];
        let maxHeightInRow = 0;
        rowCards.forEach(card => {
            const cardHeight = card.offsetHeight;
            if (cardHeight > maxHeightInRow) {
                maxHeightInRow = cardHeight;
            }
        });
        rowCards.forEach(card => {
            card.style.minHeight = maxHeightInRow + 'px';
        });
    }
}

// ADDED: Resize handler to re-equalize heights
function handleResize() {
    const countryContainers = document.querySelectorAll('.country-tours-grid');
    countryContainers.forEach(container => {
        equalizeCardHeights(container);
    });
}

// Debounced version of the resize handler
const debouncedHandleResize = debounce(handleResize, 150);
window.addEventListener('resize', debouncedHandleResize);

function createCountryBreadcrumbs(countries, targetElementToPrependBefore) {
    const breadcrumbsNav = document.createElement('nav');
    breadcrumbsNav.id = 'country-breadcrumbs-nav';
    breadcrumbsNav.className = 'country-breadcrumbs'; // For styling

    const breadcrumbsList = document.createElement('ul');

    countries.forEach(country => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        const sectionId = 'country-' + country.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        link.href = `#${sectionId}`;
        link.textContent = country;

        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetElement = document.getElementById(sectionId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        listItem.appendChild(link);
        breadcrumbsList.appendChild(listItem);
    });

    breadcrumbsNav.appendChild(breadcrumbsList);

    if (targetElementToPrependBefore && targetElementToPrependBefore.parentNode) {
        targetElementToPrependBefore.parentNode.insertBefore(breadcrumbsNav, targetElementToPrependBefore);
    } else {
        document.body.insertBefore(breadcrumbsNav, document.body.firstChild); // Fallback if target isn't ready/found
    }
}

// Back to Top Button functionality
function setupBackToTopButton() {
    const backToTopButton = document.createElement('button');
    backToTopButton.id = 'backToTopBtn';
    backToTopButton.textContent = '↑'; // Or an icon/SVG
    document.body.appendChild(backToTopButton);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) { // Show button after scrolling 200px
            backToTopButton.classList.add('show');
        } else {
            backToTopButton.classList.remove('show');
        }
    });

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

