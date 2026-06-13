import { useMemo } from "react";
import { getContactSettings } from "../config/contactSettings";

/** Returns the same contact details used on the Contact Us page. */
export function useContactSettings() {
  return useMemo(() => getContactSettings(), []);
}
