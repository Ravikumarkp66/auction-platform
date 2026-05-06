export const APPLICATION_ROUTE_PREFIXES = [
    '/auction/kpl/apply',
    '/auction/kpl/status',
    '/auction/kpl/review',
    '/apply/',
    '/register/',
];

export function isApplicationRoute(pathname = '') {
    return APPLICATION_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getCanonicalApplyRoute(token) {
    return token ? `/auction/kpl/apply/${token}` : '/auction/kpl/apply';
}
