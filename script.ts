import { setupGA4, syncMotionPreference, reducedMotionQuery } from "./assets/js/shared.ts";
import { setupExperience } from "./assets/js/experience.ts";
import { setupSiteSearch } from "./assets/js/search.ts";
import { setupCommerce } from "./assets/js/commerce.ts";
import { setupAuthFeatures } from "./assets/js/auth.ts";
import { setupForms } from "./assets/js/forms.ts";

setupGA4();
syncMotionPreference();

if (typeof reducedMotionQuery.addEventListener === "function") {
  reducedMotionQuery.addEventListener("change", syncMotionPreference);
} else if (typeof reducedMotionQuery.addListener === "function") {
  reducedMotionQuery.addListener(syncMotionPreference);
}

setupExperience();
setupSiteSearch();
setupCommerce();
setupAuthFeatures();
setupForms();
