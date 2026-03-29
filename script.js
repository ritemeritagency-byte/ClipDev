import { setupGA4, syncMotionPreference, reducedMotionQuery } from "./assets/js/shared.js";
import { setupExperience } from "./assets/js/experience.js";
import { setupSiteSearch } from "./assets/js/search.js";
import { setupCommerce } from "./assets/js/commerce.js";
import { setupAuthFeatures } from "./assets/js/auth.js";
import { setupForms } from "./assets/js/forms.js";

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
