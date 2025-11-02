import { createContext } from "react";
import type { AuthState } from "../../hooks/useAuth";
import type { ThemeSettings } from "../../hooks/useColorTheme";
import type { EntriesState } from "../../hooks/useEntries";


export interface AppContext {
    auth: AuthState;
    entries: EntriesState;
    settings: ThemeSettings;
}

export const AppContext = createContext<AppContext>({} as AppContext);