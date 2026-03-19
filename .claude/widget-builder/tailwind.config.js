/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./clients/*/src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Brand
                primary: 'var(--aw-primary)',
                accent: 'var(--aw-accent)',
                glass: 'var(--aw-glass)',
                // Surfaces
                'aw-surface-bg': 'var(--aw-surface-bg)',
                'aw-surface-card': 'var(--aw-surface-card)',
                'aw-surface-border': 'var(--aw-surface-border)',
                'aw-surface-input': 'var(--aw-surface-input)',
                'aw-surface-input-focus': 'var(--aw-surface-input-focus)',
                // Text
                'aw-text-primary': 'var(--aw-text-primary)',
                'aw-text-secondary': 'var(--aw-text-secondary)',
                'aw-text-muted': 'var(--aw-text-muted)',
                // Header
                'aw-header-from': 'var(--aw-header-from)',
                'aw-header-via': 'var(--aw-header-via)',
                'aw-header-to': 'var(--aw-header-to)',
                // Toggle
                'aw-toggle-from': 'var(--aw-toggle-from)',
                'aw-toggle-via': 'var(--aw-toggle-via)',
                'aw-toggle-to': 'var(--aw-toggle-to)',
                'aw-toggle-shadow': 'var(--aw-toggle-shadow)',
                // Send button
                'aw-send': 'var(--aw-send-from)',
                'aw-send-hover': 'var(--aw-send-hover)',
                // Online dot
                'aw-online-dot': 'var(--aw-online-dot)',
                'aw-online-dot-border': 'var(--aw-online-dot-border)',
                // User messages
                'aw-user-msg-from': 'var(--aw-user-msg-from)',
                'aw-user-msg-to': 'var(--aw-user-msg-to)',
                'aw-user-msg-shadow': 'var(--aw-user-msg-shadow)',
                // Avatar
                'aw-avatar-from': 'var(--aw-avatar-from)',
                'aw-avatar-to': 'var(--aw-avatar-to)',
                'aw-avatar-border': 'var(--aw-avatar-border)',
                'aw-avatar-icon': 'var(--aw-avatar-icon)',
                // Chips / Quick replies
                'aw-chip-border': 'var(--aw-chip-border)',
                'aw-chip-from': 'var(--aw-chip-from)',
                'aw-chip-to': 'var(--aw-chip-to)',
                'aw-chip-text': 'var(--aw-chip-text)',
                'aw-chip-hover-from': 'var(--aw-chip-hover-from)',
                'aw-chip-hover-to': 'var(--aw-chip-hover-to)',
                'aw-chip-hover-border': 'var(--aw-chip-hover-border)',
                // Links
                'aw-link': 'var(--aw-link)',
                'aw-link-hover': 'var(--aw-link-hover)',
                // Copy
                'aw-copy-hover': 'var(--aw-copy-hover)',
                'aw-copy-active': 'var(--aw-copy-active)',
                // Focus
                'aw-focus-border': 'var(--aw-focus-border)',
                'aw-focus-ring': 'var(--aw-focus-ring)',
                // Image button
                'aw-img-active-border': 'var(--aw-img-active-border)',
                'aw-img-active-bg': 'var(--aw-img-active-bg)',
                'aw-img-active-text': 'var(--aw-img-active-text)',
                'aw-img-hover-text': 'var(--aw-img-hover-text)',
                'aw-img-hover-border': 'var(--aw-img-hover-border)',
                'aw-img-hover-bg': 'var(--aw-img-hover-bg)',
                // Feedback
                'aw-feedback-active': 'var(--aw-feedback-active)',
                'aw-feedback-hover': 'var(--aw-feedback-hover)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
