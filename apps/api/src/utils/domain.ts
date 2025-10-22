export const normalizeDomain = (domain: string): string => {
        if (!domain) {
                return "";
        }

        return domain
                .trim()
                .replace(/^https?:\/\//i, "")
                .replace(/\/.*$/, "")
                .toLowerCase();
};
