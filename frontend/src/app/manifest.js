export default function manifest() {
    return {
        id: '/v2',
        name: 'Lakshmish Cricket Events',
        short_name: 'Lakshmish',
        description: 'Live cricket auction platform',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
        orientation: 'portrait',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
        screenshots: [
            {
                src: '/screenshots/mobile-1.png',
                sizes: '780x1687',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Tournament dashboard',
            },
            {
                src: '/screenshots/mobile-2.png',
                sizes: '780x1687',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Live auction page',
            },
        ],
        categories: ['sports', 'entertainment'],
        lang: 'en',
        dir: 'ltr',
    }
}
