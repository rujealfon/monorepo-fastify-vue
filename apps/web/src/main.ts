import { PiniaColada } from "@pinia/colada";
import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import { useAuth } from "./composables/use-auth";
import router from "./router";
import "./index.css";

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth();
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { path: "/login" };
  }
});

createApp(App)
  .use(router)
  .use(createPinia())
  .use(PiniaColada)
  .mount("#app");
