import ReactQuill from "react-quill";
const Quill = ReactQuill.Quill;
const Font = Quill.import("formats/font");

// Define the new whitelist of fonts with a focus on Urdu and key English options.
const urduFonts = [
    'noto-nastaliq-urdu', 'jameel-noori-nastaleeq', 'alvi-nastaleeq',
    'mehr-nastaliq', 'gulzar', 'scheherazade-new', 'lateef',
    'amiri', 'harmattan', 'tajawal', 'lalezar'
];
const englishFonts = [
    "roboto", "open-sans", "lato", "montserrat", "merriweather",
    "playfair-display", "poppins", "lora", "eb-garamond", "crimson-text"
];

export const fontList = [...urduFonts, ...englishFonts];
Font.whitelist = fontList;

Quill.register(Font, true);

export const quillModules = {
    toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ["bold", "italic", "underline", "strike", "blockquote"],
        [{ color: [] }],
        [{ font: fontList }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link", "image"],
        ["clean"],
    ],
};

export const parseRichText = (body) => {
    if (!body) return "";
    if (typeof body === "object" && body !== null) return body;
    if (typeof body === "string") {
        try {
            const parsed = JSON.parse(body);
            if (typeof parsed === "object" && parsed !== null) return parsed;
        } catch (error) {
            return body;
        }
    }
    return body;
};

export const generateQuillFontCss = () => {
    return `
        /* Constrain the dropdown panel's size and make it scrollable */
         .ql-toolbar .ql-picker.ql-font .ql-picker-label {
            max-width: 110px;        /* Set a max-width for the label */
            overflow: hidden;        /* Hide overflowing text */
            text-overflow: ellipsis; /* Add '...' for long font names */
            white-space: nowrap;     /* Prevent text from wrapping */
            display: inline-block !important; /* Ensure ellipsis works */
            vertical-align: middle;
            font-size: 12px !important; /* Force a standard size for the label itself */
            height: 24px;            /* Give the container a fixed height */
            line-height: 24px !important; /* Vertically center the text within the fixed height */
            padding-right: 15px;     /* Add some padding so the text doesn't touch the arrow */
        }
        /* --- REMOVE ARROWS --- */
        /* This targets the SVG icon that Quill uses for the dropdown arrow and hides it. */
        .ql-toolbar .ql-picker.ql-font .ql-picker-label svg {
            display: none;
        }
        .ql-toolbar .ql-picker.ql-font:after {
            display: none;
        }
        /* --- END OF FIX --- */
        .ql-picker.ql-font .ql-picker-options {
            max-height: 250px; /* Adjust this value as needed */
            overflow-y: auto;
        }
        /* Reduce the font size and padding of the items within the dropdown */
        .ql-picker.ql-font .ql-picker-item {
            font-size: 10x; /* Smaller font size for the list items */
            padding: 3px 5px;
        }
        /* Font Previews for Editor Content */
        .ql-font-roboto { font-family: 'Roboto', sans-serif; }
        .ql-font-open-sans { font-family: 'Open Sans', sans-serif; }
        .ql-font-lato { font-family: 'Lato', sans-serif; }
        .ql-font-montserrat { font-family: 'Montserrat', sans-serif; }
        .ql-font-merriweather { font-family: 'Merriweather', serif; }
        .ql-font-playfair-display { font-family: 'Playfair Display', serif; }
        .ql-font-poppins { font-family: 'Poppins', sans-serif; }
        .ql-font-lora { font-family: 'Lora', serif; }
        .ql-font-eb-garamond { font-family: 'EB Garamond', serif; }
        .ql-font-crimson-text { font-family: 'Crimson Text', serif; }

        .ql-font-noto-nastaliq-urdu { font-family: 'Noto Nastaliq Urdu', serif; }
        .ql-font-jameel-noori-nastaleeq { font-family: 'Jameel Noori Nastaleeq', serif; }
        .ql-font-alvi-nastaleeq { font-family: 'Alvi Nastaleeq', serif; }
        .ql-font-mehr-nastaliq { font-family: 'Mehr Nastaliq', serif; }
        .ql-font-gulzar { font-family: 'Gulzar', serif; }
        .ql-font-scheherazade-new { font-family: 'Scheherazade New', serif; }
        .ql-font-lateef { font-family: 'Lateef', cursive; }
        .ql-font-amiri { font-family: 'Amiri', serif; }
        .ql-font-harmattan { font-family: 'Harmattan', sans-serif; }
        .ql-font-tajawal { font-family: 'Tajawal', sans-serif; }
        .ql-font-lalezar { font-family: 'Lalezar', cursive; }

        /* Font Previews for Dropdown Labels */
        .ql-picker.ql-font .ql-picker-label[data-value="roboto"]::before, .ql-picker.ql-font .ql-picker-item[data-value="roboto"]::before { content: 'Roboto'; font-family: 'Roboto', sans-serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="open-sans"]::before, .ql-picker.ql-font .ql-picker-item[data-value="open-sans"]::before { content: 'Open Sans'; font-family: 'Open Sans', sans-serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="lato"]::before, .ql-picker.ql-font .ql-picker-item[data-value="lato"]::before { content: 'Lato'; font-family: 'Lato', sans-serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="montserrat"]::before, .ql-picker.ql-font .ql-picker-item[data-value="montserrat"]::before { content: 'Montserrat'; font-family: 'Montserrat', sans-serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="merriweather"]::before, .ql-picker.ql-font .ql-picker-item[data-value="merriweather"]::before { content: 'Merriweather'; font-family: 'Merriweather', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="playfair-display"]::before, .ql-picker.ql-font .ql-picker-item[data-value="playfair-display"]::before { content: 'Playfair Display'; font-family: 'Playfair Display', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="poppins"]::before, .ql-picker.ql-font .ql-picker-item[data-value="poppins"]::before { content: 'Poppins'; font-family: 'Poppins', sans-serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="lora"]::before, .ql-picker.ql-font .ql-picker-item[data-value="lora"]::before { content: 'Lora'; font-family: 'Lora', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="eb-garamond"]::before, .ql-picker.ql-font .ql-picker-item[data-value="eb-garamond"]::before { content: 'EB Garamond'; font-family: 'EB Garamond', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="crimson-text"]::before, .ql-picker.ql-font .ql-picker-item[data-value="crimson-text"]::before { content: 'Crimson Text'; font-family: 'Crimson Text', serif; }
        
        .ql-picker.ql-font .ql-picker-label[data-value="noto-nastaliq-urdu"]::before, .ql-picker.ql-font .ql-picker-item[data-value="noto-nastaliq-urdu"]::before { content: 'Noto Nastaliq Urdu'; font-family: 'Noto Nastaliq Urdu', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="jameel-noori-nastaleeq"]::before, .ql-picker.ql-font .ql-picker-item[data-value="jameel-noori-nastaleeq"]::before { content: 'Jameel Noori Nastaleeq'; font-family: 'Jameel Noori Nastaleeq', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="alvi-nastaleeq"]::before, .ql-picker.ql-font .ql-picker-item[data-value="alvi-nastaleeq"]::before { content: 'Alvi Nastaleeq'; font-family: 'Alvi Nastaleeq', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="mehr-nastaliq"]::before, .ql-picker.ql-font .ql-picker-item[data-value="mehr-nastaliq"]::before { content: 'Mehr Nastaliq'; font-family: 'Mehr Nastaliq', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="gulzar"]::before, .ql-picker.ql-font .ql-picker-item[data-value="gulzar"]::before { content: 'Gulzar'; font-family: 'Gulzar', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="scheherazade-new"]::before, .ql-picker.ql-font .ql-picker-item[data-value="scheherazade-new"]::before { content: 'Scheherazade New'; font-family: 'Scheherazade New', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="lateef"]::before, .ql-picker.ql-font .ql-picker-item[data-value="lateef"]::before { content: 'Lateef'; font-family: 'Lateef', cursive; }
        .ql-picker.ql-font .ql-picker-label[data-value="amiri"]::before, .ql-picker.ql-font .ql-picker-item[data-value="amiri"]::before { content: 'Amiri'; font-family: 'Amiri', serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="harmattan"]::before, .ql-picker.ql-font .ql-picker-item[data-value="harmattan"]::before { content: 'Harmattan'; font-family: 'Harmattan', sans-serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="tajawal"]::before, .ql-picker.ql-font .ql-picker-item[data-value="tajawal"]::before { content: 'Tajawal'; font-family: 'Tajawal', sans-serif; }
        .ql-picker.ql-font .ql-picker-label[data-value="lalezar"]::before, .ql-picker.ql-font .ql-picker-item[data-value="lalezar"]::before { content: 'Lalezar'; font-family: 'Lalezar', cursive; }
    `;
};