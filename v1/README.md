# Escorted Tours Calendar Widget

A responsive calendar widget for displaying escorted tour availability with different layouts for mobile and desktop devices. Built with vanilla HTML, CSS, and JavaScript.

## Features

### 📅 Calendar Functionality

- **Month/Year Navigation**: Navigate between months using arrow buttons or dropdown selectors
- **Tour Indicators**: Colored dots on calendar dates indicate tour availability
- **Date Selection**: Click on any date to filter tours for that specific day
- **Keyboard Navigation**: Full keyboard support for accessibility (arrow keys, Enter, Space)

### 🎨 Responsive Design

- **Mobile/Portrait**: Vertical list layout without images for optimal mobile viewing
- **Desktop/Landscape**: Horizontal scrolling layout with tour images and enhanced information
- **Adaptive Layout**: Automatically switches between layouts based on screen size and orientation

### 🏨 Tour Information

- **Multiple Hotels**: Each tour can be associated with multiple hotel options
- **Color Coding**: Tours are grouped by color for easy visual identification
- **Hotel Links**: Direct links to individual hotel booking pages
- **Rich Content**: Tour titles, dates, and hotel information displayed clearly

### ♿ Accessibility

- **Keyboard Navigation**: Full keyboard support for calendar navigation
- **Focus Management**: Clear focus indicators for all interactive elements
- **Screen Reader Support**: Semantic HTML structure for assistive technologies
- **Reduced Motion**: Respects user's motion preferences

## File Structure

```
├── index.html          # Main HTML structure
├── styles.css          # Responsive CSS styles
├── script.js           # JavaScript functionality
└── README.md          # This documentation
```

## Usage

### Basic Setup

1. Include all three files in your project
2. Open `index.html` in a web browser
3. The calendar will automatically initialize with sample tour data

### Customizing Tour Data

The tour data is defined in the `sampleTours` array in `script.js`. Each tour object should have the following structure:

```javascript
{
    id: 1,                                    // Unique identifier
    title: "Tour Name",                       // Tour title
    date: "2025-06-01",                      // Date in YYYY-MM-DD format
    hotels: [                                // Array of associated hotels
        {
            name: "Hotel Name",
            url: "#hotel-link"
        }
    ],
    color: 1,                                // Color group (1-4)
    image: "https://example.com/image.jpg"   // Tour image URL
}
```

### Color Coding

Tours are organized into 4 color groups:

- **Color 1**: Blue (`#489AFF`)
- **Color 2**: Pink (`#FF48F9`)
- **Color 3**: Green (`#20C96F`)
- **Color 4**: Orange (`#FFAC48`)

### Integration with APIs

To integrate with your own data source:

1. Replace the `sampleTours` array with an API call
2. Ensure your data matches the expected structure
3. Call `this.render()` after updating the tours data

```javascript
// Example API integration
async loadTours() {
    try {
        const response = await fetch('/api/tours');
        this.tours = await response.json();
        this.render();
    } catch (error) {
        console.error('Failed to load tours:', error);
    }
}
```

## Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile Browsers**: iOS Safari 12+, Chrome Mobile 60+
- **Features Used**: CSS Grid, Flexbox, ES6 Classes, Fetch API

## Responsive Breakpoints

- **Mobile**: `max-width: 767px` - Vertical list layout
- **Desktop**: `min-width: 768px` and `orientation: landscape` - Horizontal scroll layout

## Customization

### Styling

The CSS uses CSS custom properties for easy theming. Key variables include:

```css
:root {
  --primary-color: #007aff;
  --background-color: #ffffff;
  --text-color: #1f1f1f;
  --border-radius: 8px;
  --shadow: 0px 4px 4px 5px rgba(0, 0, 0, 0.05);
}
```

### Layout Modifications

- **Calendar Grid**: Modify `.calendar-days` grid template for different layouts
- **Tour Cards**: Customize `.tour-card-desktop` and `.tour-card-mobile` for different designs
- **Colors**: Update tour color classes (`.tour-color-1`, etc.) for brand consistency

## Performance Considerations

- **Lazy Loading**: Tour images use `loading="lazy"` attribute
- **Efficient Rendering**: Only renders visible tours to minimize DOM manipulation
- **Debounced Resize**: Window resize events are handled efficiently
- **Minimal Dependencies**: No external libraries required

## Accessibility Features

- **ARIA Labels**: Semantic HTML with proper labeling
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Focus Management**: Clear focus indicators and logical tab order
- **Color Contrast**: WCAG AA compliant color combinations
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

## Future Enhancements

Potential improvements for production use:

1. **Date Range Selection**: Allow selecting multiple dates or date ranges
2. **Filtering**: Add filters by tour type, price, or destination
3. **Search**: Implement tour search functionality
4. **Booking Integration**: Direct booking flow integration
5. **Internationalization**: Multi-language support
6. **Caching**: Local storage for tour data caching
7. **Progressive Web App**: Service worker for offline functionality

## License

This project is provided as-is for demonstration purposes. Feel free to modify and use in your own projects.

## Support

For questions or issues, please refer to the code comments or create an issue in your project repository.
