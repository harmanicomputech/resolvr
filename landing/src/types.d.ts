declare module '@alpinejs/csp' {
    import Alpine from 'alpinejs';
    export default Alpine;
}

interface ImportMetaEnv {
    /** Base URL of the Laravel app, e.g. https://app.resolvrapp.com */
    readonly VITE_APP_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
