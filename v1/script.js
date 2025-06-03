// Sample tour data - this would typically come from an API
// const sampleTours = [...]; // Delete this entire block

function generateMonthlyColorPalette() {
    const colors = [];
    const hueStep = 360 / 31; // Distribute hues
    for (let i = 0; i < 31; i++) {
        // Using HSL for more control over vibrancy and lightness
        // Saturation: 70-90% for vibrant but not overly garish colors
        // Lightness: 50-60% for good visibility against white/light backgrounds
        const hue = i * hueStep;
        const saturation = 70 + (i % 5) * 4; // Vary saturation slightly (70, 74, 78, 82, 86)
        const lightness = 55 + (i % 3) * 5;  // Vary lightness slightly (55, 60, 50)
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
}

class ToursCalendar {
    constructor() { 
        this.currentDate = new Date(); // Initial placeholder, will be updated
        this.selectedDate = null;
        this.tours = []; 
        this.monthColorPalette = generateMonthlyColorPalette();
        this.currentMonthDateColors = new Map();
        this.availableYears = []; // To store years with data
        this.minDataDate = null; // Earliest date with tour data
        this.maxDataDate = null; // Latest date with tour data
        
        this.initializeElements();
        this.bindEvents();      

        this.loadAndProcessTours().then(() => {
            this.populateYearSelectorAndSetCurrentDate();
            this.checkForUrlSelectedDate(); // Check for URL parameter after data is loaded
            this.render(); 
        }).catch(error => {
            console.error("Failed to load and process tours:", error);
            this.calendarDays.innerHTML = '<div class="loading">Error loading tours. Please try again later.</div>';
            this.toursScroll.innerHTML = '<div class="no-tours">Error loading tours.</div>';
            this.mobileTours.innerHTML = '<div class="no-tours">Error loading tours.</div>';
            this.populateYearSelectorAndSetCurrentDate(); 
            this.render(); // Still render to update button states even on error
        });
    }
    
    async loadAndProcessTours() {
        try {
            const response = await fetch('tours.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const rawToursData = await response.json();

            if (rawToursData.length === 0) {
                this.tours = [];
                this.availableYears = [new Date().getFullYear()];
                this.minDataDate = null;
                this.maxDataDate = null;
                console.warn("No tour data found in tours.json. Defaulting available year to current year.");
                return;
            }
            
            const years = new Set();
            const allDates = [];
            rawToursData.forEach(item => {
                if (item.date) {
                    const dateObj = new Date(item.date + 'T00:00:00');
                    if (!isNaN(dateObj)) { // Check if date is valid
                        years.add(dateObj.getFullYear());
                        allDates.push(dateObj);
                    }
                }
            });
            this.availableYears = Array.from(years).sort((a, b) => a - b);

            if (allDates.length > 0) {
                allDates.sort((a, b) => a - b); // Sort dates chronologically
                this.minDataDate = allDates[0];
                this.maxDataDate = allDates[allDates.length - 1];
            } else {
                this.minDataDate = null;
                this.maxDataDate = null;
            }

            const processedTours = [];
            const toursGroupedByTitleAndDate = {};

            rawToursData.forEach(item => {
                const tourTitle = item.tour;
                const tourDate = item.date;
                const groupKey = `${tourTitle}-${tourDate}`;
                if (!toursGroupedByTitleAndDate[groupKey]) {
                    toursGroupedByTitleAndDate[groupKey] = {
                        title: tourTitle,
                        date: tourDate,
                        description: item.description, 
                        image: item.image_url,      
                        hotels: [],
                        id: groupKey 
                    };
                }
                toursGroupedByTitleAndDate[groupKey].hotels.push({
                    name: item.hotel_name,
                    url: '#', 
                    rating: item.hotel_start_rating
                });
            });

            for (const key in toursGroupedByTitleAndDate) {
                processedTours.push(toursGroupedByTitleAndDate[key]);
            }
            
            this.tours = processedTours;

        } catch (error) {
            console.error("Error in loadAndProcessTours:", error);
            this.tours = []; 
            this.availableYears = [new Date().getFullYear()];
            this.minDataDate = null;
            this.maxDataDate = null;
            throw error; 
        }
    }

    populateYearSelectorAndSetCurrentDate() {
        this.yearSelect.innerHTML = ''; // Clear existing options

        if (this.availableYears.length === 0) {
            // Should have been set to current year in loadAndProcessTours if data was truly empty or errored
            // But as a fallback, ensure at least current year is there.
            if (!this.availableYears.includes(new Date().getFullYear())){
                 this.availableYears.push(new Date().getFullYear());
                 this.availableYears.sort((a,b) => a-b);
            }
        }

        this.availableYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            this.yearSelect.appendChild(option);
        });

        // Set currentDate to the first available year if not already in a valid range, or if tours is empty
        // This logic ensures that the calendar tries to start on a year that has data.
        let currentYearIsValid = this.availableYears.includes(this.currentDate.getFullYear());
        
        if (this.tours.length === 0 || !currentYearIsValid) { // If no tours, or current year isn't in the list of years with tours
            if (this.availableYears.length > 0) {
                 // Set to January of the earliest available year
                this.currentDate = new Date(this.availableYears[0], 0, 1); 
            } else {
                // Absolute fallback: current year, if availableYears somehow ended up empty
                // This case should ideally be handled by loadAndProcessTours defaulting availableYears
                this.currentDate = new Date(new Date().getFullYear(), 0, 1);
            }
        } else {
            // If current year is valid and we have tours, keep the month, but ensure day is 1st
            // to avoid issues if current month is different from initial currentDate's month
             this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        }
        
        // Update selectors to reflect the (potentially new) currentDate
        this.updateSelectors();
    }
    
    checkForUrlSelectedDate() {
        const urlParams = new URLSearchParams(window.location.search);
        const selectedTourDate = urlParams.get('selected_tour_date');
        
        if (selectedTourDate) {
            // Convert from YYYYMMDD format to YYYY-MM-DD format
            const formattedDate = this.formatUrlDateToStandard(selectedTourDate);
            
            if (formattedDate && this.isValidTourDate(formattedDate)) {
                // Set the selected date
                this.selectedDate = formattedDate;
                
                // Navigate to the month containing this date
                const dateObj = new Date(formattedDate + 'T00:00:00');
                this.currentDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
            }
        }
    }
    
    formatUrlDateToStandard(urlDate) {
        // Convert YYYYMMDD to YYYY-MM-DD
        if (urlDate && urlDate.length === 8) {
            const year = urlDate.substring(0, 4);
            const month = urlDate.substring(4, 6);
            const day = urlDate.substring(6, 8);
            return `${year}-${month}-${day}`;
        }
        return null;
    }
    
    formatStandardDateToUrl(standardDate) {
        // Convert YYYY-MM-DD to YYYYMMDD
        return standardDate.replace(/-/g, '');
    }
    
    isValidTourDate(dateStr) {
        // Check if the date has tours available
        return this.tours.some(tour => tour.date === dateStr);
    }
    
    addDateParameterToUrl(baseUrl, tourDate) {
        // Add the selected_tour_date parameter to the URL
        if (baseUrl === '#') return '#';
        
        try {
            const url = new URL(baseUrl, window.location.origin);
            const urlDateFormat = this.formatStandardDateToUrl(tourDate);
            url.searchParams.set('selected_tour_date', urlDateFormat);
            return url.toString();
        } catch (error) {
            // If URL parsing fails, return the original URL
            console.warn('Failed to parse URL:', baseUrl, error);
            return baseUrl;
        }
    }
    
    initializeElements() {
        this.monthSelect = document.getElementById('monthSelect');
        this.yearSelect = document.getElementById('yearSelect');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.calendarDays = document.getElementById('calendarDays');
        this.toursScroll = document.getElementById('toursScroll');
        this.mobileTours = document.getElementById('mobileTours');
        this.scrollLeft = document.getElementById('scrollLeft');
        this.scrollRight = document.getElementById('scrollRight');
        this.showAllBtn = document.getElementById('showAllBtn');
        this.showAllDatesElement = document.querySelector('.show-all-dates');
    }
    
    bindEvents() {
        this.monthSelect.addEventListener('change', () => this.onDateChange());
        this.yearSelect.addEventListener('change', () => this.onDateChange());
        this.prevBtn.addEventListener('click', () => this.previousMonth());
        this.nextBtn.addEventListener('click', () => this.nextMonth());
        this.scrollLeft.addEventListener('click', () => this.scrollTours(-1));
        this.scrollRight.addEventListener('click', () => this.scrollTours(1));
        this.showAllBtn.addEventListener('click', () => this.showAllDates());
        
        // Handle scroll events for button state updates
        const toursContainer = document.getElementById('toursContainer');
        if (toursContainer) {
            toursContainer.addEventListener('scroll', () => this.updateScrollButtons());
        }
        
        // Handle window resize for responsive behavior
        window.addEventListener('resize', () => this.handleResize());
        
        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    onDateChange() {
        const month = parseInt(this.monthSelect.value);
        const year = parseInt(this.yearSelect.value);
        this.currentDate = new Date(year, month, 1);
        this.render();
    }
    
    previousMonth() {
        if (!this.minDataDate) { // No data, do nothing
            this.updateNavigationButtonStates(); // Ensure buttons are disabled
            return;
        }

        const currentMonthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const minDataMonthStart = new Date(this.minDataDate.getFullYear(), this.minDataDate.getMonth(), 1);

        if (currentMonthStart <= minDataMonthStart) {
            this.updateNavigationButtonStates(); // Ensure prev is disabled
            return; // Already at or before the earliest month with data
        }
        
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        // updateSelectors() is not strictly needed here if render() calls it, but good for consistency
        this.updateSelectors(); 
        this.render();
    }
    
    nextMonth() {
        if (!this.maxDataDate) { // No data, do nothing
            this.updateNavigationButtonStates(); // Ensure buttons are disabled
            return;
        }

        const currentMonthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const maxDataMonthStart = new Date(this.maxDataDate.getFullYear(), this.maxDataDate.getMonth(), 1);

        if (currentMonthStart >= maxDataMonthStart) {
            this.updateNavigationButtonStates(); // Ensure next is disabled
            return; // Already at or after the latest month with data
        }
        
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.updateSelectors(); 
        this.render();
    }
    
    updateSelectors() {
        this.monthSelect.value = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();
        // Ensure the current year is actually an option before trying to set it
        if (Array.from(this.yearSelect.options).some(opt => opt.value == currentYear)) {
            this.yearSelect.value = currentYear;
        } else if (this.availableYears.length > 0) {
            // If current year is not in dropdown (e.g. after nav limit), select first/last available
            // This case should be less likely with nav limits, but good as a fallback
            if (currentYear < this.availableYears[0]) {
                this.yearSelect.value = this.availableYears[0];
            } else if (currentYear > this.availableYears[this.availableYears.length - 1]) {
                this.yearSelect.value = this.availableYears[this.availableYears.length - 1];
            }
            // If it's outside the range and not before/after, it means availableYears is empty or logic error
        }
    }
    
    render() {
        this.updateSelectors();
        this.renderCalendar();
        this.updateShowAllButton();
        this.renderTours();
        this.updateNavigationButtonStates(); // Call the new method
    }
    
    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        this.currentMonthDateColors.clear(); // Clear previous month's specific colors

        const datesWithToursInMonth = [...new Set(
            this.tours
                .filter(tour => {
                    const tourDate = new Date(tour.date + 'T00:00:00');
                    return tourDate.getFullYear() === year && tourDate.getMonth() === month;
                })
                .map(tour => tour.date)
        )].sort();

        datesWithToursInMonth.forEach((dateStr, index) => {
            // Use the pre-generated palette, cycling if more than 31 dates (though unlikely for a month)
            this.currentMonthDateColors.set(dateStr, this.monthColorPalette[index % this.monthColorPalette.length]);
        });
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        let startDay = (firstDay.getDay() + 6) % 7;
        this.calendarDays.innerHTML = '';

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const dayElement = this.createDayElement(day, 'other-month');
            this.calendarDays.appendChild(dayElement);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = this.createDayElement(day, 'current-month');
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            if (this.currentMonthDateColors.has(dateStr)) {
                dayElement.classList.add('has-tours');
                const colorForDate = this.currentMonthDateColors.get(dateStr);
                dayElement.style.setProperty('--day-dot-color', colorForDate);
            }
            
            dayElement.addEventListener('click', () => this.selectDate(dateStr, dayElement));
            this.calendarDays.appendChild(dayElement);
        }
        
        const totalCells = this.calendarDays.children.length;
        const remainingCells = 42 - totalCells; 
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = this.createDayElement(day, 'other-month');
            this.calendarDays.appendChild(dayElement);
        }

        if (this.selectedDate) {
            const selectedDateObj = new Date(this.selectedDate + 'T00:00:00');
            if (selectedDateObj.getFullYear() === year && selectedDateObj.getMonth() === month) {
                const day = selectedDateObj.getDate();
                const dayElement = Array.from(this.calendarDays.querySelectorAll('.current-month'))
                                      .find(el => parseInt(el.textContent) === day);
                if (dayElement) {
                    dayElement.classList.add('selected');
                }
            }
        }
    }
    
    createDayElement(day, monthClass) {
        const dayElement = document.createElement('div');
        dayElement.className = `calendar-day ${monthClass}`;
        dayElement.textContent = day;
        dayElement.tabIndex = 0;
        return dayElement;
    }
    
    selectDate(dateStr, dayElement) {
        // Check if clicking the same date to unselect
        if (this.selectedDate === dateStr) {
            // Unselect the current date
            dayElement.classList.remove('selected');
            this.selectedDate = null;
        } else {
            // Remove previous selection
            const prevSelected = this.calendarDays.querySelector('.selected');
            if (prevSelected) {
                prevSelected.classList.remove('selected');
            }
            
            // Add selection to clicked day
            dayElement.classList.add('selected');
            this.selectedDate = dateStr;
        }
        
        // Update show all button visibility
        this.updateShowAllButton();
        
        // Update tours display
        this.renderTours();
    }
    
    showAllDates() {
        // Remove any selected date
        const prevSelected = this.calendarDays.querySelector('.selected');
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }
        
        // Clear selected date
        this.selectedDate = null;
        
        // Update show all button visibility
        this.updateShowAllButton();
        
        // Update tours display to show all for the month
        this.renderTours();
    }
    
    updateShowAllButton() {
        if (this.selectedDate) {
            this.showAllDatesElement.classList.add('visible');
        } else {
            this.showAllDatesElement.classList.remove('visible');
        }
    }
    
    getToursForDate(dateStr) {
        return this.tours.filter(tour => tour.date === dateStr);
    }
    
    getToursForMonth() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        return this.tours.filter(tour => tour.date.startsWith(monthStr));
    }
    
    renderTours() {
        const tours = this.selectedDate ? 
            this.getToursForDate(this.selectedDate) : 
            this.getToursForMonth();
        
        // Group tours by date
        const toursByDate = this.groupToursByDate(tours);
        
        // Render desktop tours
        this.renderDesktopTours(toursByDate);
        
        // Render mobile tours
        this.renderMobileTours(toursByDate);
    }
    
    groupToursByDate(tours) {
        const grouped = {};
        tours.forEach(tour => {
            if (!grouped[tour.date]) {
                grouped[tour.date] = [];
            }
            grouped[tour.date].push(tour);
        });
        return grouped;
    }
    
    renderDesktopTours(toursByDate) {
        this.toursScroll.innerHTML = '';
        
        if (Object.keys(toursByDate).length === 0) {
            this.toursScroll.innerHTML = '<div class="no-tours"><h3>No tours available</h3><p>Select a different date or month to see available tours.</p></div>';
            return;
        }
        
        // Get dates and sort them chronologically
        const sortedDates = Object.keys(toursByDate).sort((a, b) => new Date(a) - new Date(b));

        sortedDates.forEach(date => {
            const toursOnDate = toursByDate[date];
            toursOnDate.forEach(tour => {
                const tourCard = this.createDesktopTourCard(tour);
                this.toursScroll.appendChild(tourCard);
            });
        });
        
        const container = document.getElementById('toursContainer');
        if (container) {
            container.scrollLeft = 0;
        }
        this.updateScrollButtons();
    }
    
    renderMobileTours(toursByDate) {
        this.mobileTours.innerHTML = '';
        
        if (Object.keys(toursByDate).length === 0) {
            this.mobileTours.innerHTML = '<div class="no-tours"><h3>No tours available</h3><p>Select a different date or month to see available tours.</p></div>';
            return;
        }
        
        // Sort dates for chronological order in mobile view
        const sortedDates = Object.keys(toursByDate).sort((a, b) => new Date(a) - new Date(b));

        sortedDates.forEach(date => {
            const toursOnDate = toursByDate[date];
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.textContent = this.formatDate(date);
            dateGroup.appendChild(dateHeader);
            
            const dateColorForGroup = this.currentMonthDateColors.get(date) || '#cccccc'; 
            const toursContainer = document.createElement('div');
            toursContainer.className = 'date-tours';
            toursContainer.style.setProperty('--tour-group-color', dateColorForGroup);
            
            toursOnDate.forEach(tour => {
                const tourCard = this.createMobileTourCard(tour); 
                toursContainer.appendChild(tourCard);
            });
            
            dateGroup.appendChild(toursContainer);
            this.mobileTours.appendChild(dateGroup);
        });
    }
    
    createDesktopTourCard(tour) {
        const card = document.createElement('div');
        card.className = 'tour-card-desktop';
        
        const formattedDate = this.formatDate(tour.date);
        
        // Get primary hotel (first hotel) for main display
        const primaryHotel = tour.hotels.length > 0 ? tour.hotels[0] : null;
        const primaryHotelUrl = primaryHotel ? this.addDateParameterToUrl(primaryHotel.url, tour.date) : '#';
        
        // Get remaining hotels for "Other Hotel Options"
        const otherHotels = tour.hotels.slice(1);
        
        // Create primary hotel display (next to tour title)
        const primaryHotelHtml = primaryHotel ? 
            `<div class="primary-hotel">
                <a href="${primaryHotelUrl}" class="primary-hotel-link">
                    ${primaryHotel.name}
                    <span class="hotel-rating">${this.generateStars(primaryHotel.rating)}</span>
                </a>
            </div>` : '';
        
        // Create other hotels section
        const otherHotelsHtml = otherHotels.length > 0 ? 
            `<div class="other-hotels">
                <div class="other-hotels-label">Other Hotel Options:</div>
                <div class="other-hotels-list">
                    ${otherHotels.map(hotel => 
                        `<a href="${this.addDateParameterToUrl(hotel.url, tour.date)}" class="hotel-link">
                            ${hotel.name}
                            <span class="hotel-rating">${this.generateStars(hotel.rating)}</span>
                        </a>`
                    ).join('')}
                </div>
            </div>` : '';

        const dateColor = this.currentMonthDateColors.get(tour.date) || '#cccccc'; // Fallback color
        card.style.setProperty('--tour-indicator-color', dateColor);
        
        card.innerHTML = `
            <a href="${primaryHotelUrl}" class="tour-image-link">
                <img src="${tour.image}" alt="${tour.title}" class="tour-image" loading="lazy">
            </a>
            <div class="tour-content">
                <div class="tour-date">${formattedDate}</div>
                <div class="tour-content-with-indicator">
                    <div class="tour-indicator"></div> <!-- Color applied via CSS var -->
                    <div class="tour-details">
                        <a href="${primaryHotelUrl}" class="tour-title-link">
                            <div class="tour-title">${tour.title}</div>
                        </a>
                        ${primaryHotelHtml}
                        <div class="tour-description">${tour.description}</div>
                        ${otherHotelsHtml}
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }
    
    createMobileTourCard(tour) {
        const card = document.createElement('div');
        card.className = 'tour-card-mobile';
        
        // For mobile, show all hotels together (like the original design)
        // Get primary hotel URL for the title link
        const primaryHotelUrl = tour.hotels.length > 0 ? this.addDateParameterToUrl(tour.hotels[0].url, tour.date) : '#';
        
        // Create all hotels list
        const allHotelsHtml = tour.hotels.map(hotel => 
            `<a href="${this.addDateParameterToUrl(hotel.url, tour.date)}" class="hotel-link">
                ${hotel.name}
                <span class="hotel-rating">${this.generateStars(hotel.rating)}</span>
            </a>`
        ).join('');
        
        // The mobile tour card itself doesn't have the colored line directly;
        // it's on the parent .date-tours container.
        card.innerHTML = `
            <div class="tour-content">
                <a href="${primaryHotelUrl}" class="tour-title-link">
                    <div class="tour-title">${tour.title}</div>
                </a>
                <div class="tour-hotels-mobile">${allHotelsHtml}</div>
            </div>
        `;
        
        return card;
    }
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const options = { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        };
        
        const formatted = date.toLocaleDateString('en-US', options);
        
        // Add ordinal suffix to day
        const day = date.getDate();
        const suffix = this.getOrdinalSuffix(day);
        
        return formatted.replace(day.toString(), `${day}${suffix}`);
    }
    
    getOrdinalSuffix(day) {
        if (day >= 11 && day <= 13) {
            return 'th';
        }
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
    
    generateStars(rating) {
        const fullStars = '★'.repeat(rating);
        const emptyStars = '☆'.repeat(5 - rating);
        return fullStars + emptyStars;
    }
    
    scrollTours(direction) {
        const container = document.getElementById('toursContainer');
        const cardWidth = 340; // 320px + 20px gap
        const scrollAmount = cardWidth * direction;
        
        container.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }
    
    updateScrollButtons() {
        const container = document.getElementById('toursContainer');
        if (!container) return;
        
        const isAtStart = container.scrollLeft <= 0;
        const isAtEnd = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;
        
        this.scrollLeft.disabled = isAtStart;
        this.scrollRight.disabled = isAtEnd;
        
        this.scrollLeft.style.opacity = isAtStart ? '0.3' : '0.8';
        this.scrollRight.style.opacity = isAtEnd ? '0.3' : '0.8';
    }
    
    handleResize() {
        // Reset scroll position on resize
        const container = document.getElementById('toursContainer');
        if (container) {
            container.scrollLeft = 0;
            this.updateScrollButtons();
        }
    }
    
    handleKeyboard(e) {
        // Handle keyboard navigation for calendar
        const focused = document.activeElement;
        if (!focused.classList.contains('calendar-day')) return;
        
        const days = Array.from(this.calendarDays.children);
        const currentIndex = days.indexOf(focused);
        let newIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowLeft':
                newIndex = Math.max(0, currentIndex - 1);
                break;
            case 'ArrowRight':
                newIndex = Math.min(days.length - 1, currentIndex + 1);
                break;
            case 'ArrowUp':
                newIndex = Math.max(0, currentIndex - 7);
                break;
            case 'ArrowDown':
                newIndex = Math.min(days.length - 1, currentIndex + 7);
                break;
            case 'Enter':
            case ' ':
                if (focused.classList.contains('current-month')) {
                    focused.click();
                }
                e.preventDefault();
                return;
            default:
                return;
        }
        
        if (newIndex !== currentIndex) {
            days[newIndex].focus();
            e.preventDefault();
        }
    }

    updateNavigationButtonStates() {
        let canGoPrev = true;
        let canGoNext = true;

        if (this.minDataDate) {
            const currentMonthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            const minDataMonthStart = new Date(this.minDataDate.getFullYear(), this.minDataDate.getMonth(), 1);
            if (currentMonthStart <= minDataMonthStart) {
                canGoPrev = false;
            }
        } else { // No min date, cannot go previous
            canGoPrev = false;
        }

        if (this.maxDataDate) {
            const currentMonthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            const maxDataMonthStart = new Date(this.maxDataDate.getFullYear(), this.maxDataDate.getMonth(), 1);
            if (currentMonthStart >= maxDataMonthStart) {
                canGoNext = false;
            }
        } else { // No max date, cannot go next
            canGoNext = false;
        }

        this.prevBtn.disabled = !canGoPrev;
        this.nextBtn.disabled = !canGoNext;

        this.prevBtn.style.opacity = canGoPrev ? '1' : '0.5';
        this.nextBtn.style.opacity = canGoNext ? '1' : '0.5';
    }
}

// Initialize the calendar when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => { // No longer async here
    new ToursCalendar();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToursCalendar;
} 