/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                "primary": "#0066ff",
                "background-light": "#f5f7f8",
                "surface-dark": "#1e293b",
            },
        },
    },
    plugins: [require('@tailwindcss/forms')],
}