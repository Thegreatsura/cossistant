import { useEffect, useState } from "react";

const defaultIsPageVisible =
        typeof document !== "undefined" ? !document.hidden : true;
const defaultHasWindowFocus =
        typeof document !== "undefined" && typeof document.hasFocus === "function"
                ? document.hasFocus()
                : true;

export type WindowVisibilityFocusState = {
        isPageVisible: boolean;
        hasWindowFocus: boolean;
};

export function useWindowVisibilityFocus(): WindowVisibilityFocusState {
        const [isPageVisible, setIsPageVisible] = useState(defaultIsPageVisible);
        const [hasWindowFocus, setHasWindowFocus] = useState(defaultHasWindowFocus);

        useEffect(() => {
                if (typeof document === "undefined") {
                        return;
                }

                const handleVisibilityChange = () => {
                        const visible = !document.hidden;
                        setIsPageVisible(visible);
                        setHasWindowFocus(
                                visible &&
                                        (typeof document.hasFocus === "function"
                                                ? document.hasFocus()
                                                : true)
                        );
                };

                document.addEventListener("visibilitychange", handleVisibilityChange);
                return () => {
                        document.removeEventListener(
                                "visibilitychange",
                                handleVisibilityChange
                        );
                };
        }, []);

        useEffect(() => {
                if (typeof window === "undefined") {
                        return;
                }

                const handleFocus = () => setHasWindowFocus(true);
                const handleBlur = () => setHasWindowFocus(false);

                window.addEventListener("focus", handleFocus);
                window.addEventListener("blur", handleBlur);

                return () => {
                        window.removeEventListener("focus", handleFocus);
                        window.removeEventListener("blur", handleBlur);
                };
        }, []);

        return { isPageVisible, hasWindowFocus };
}
