import { createRouter, createWebHistory } from "vue-router";

import DefaultLayout from "@/app/layouts/DefaultLayout.vue";
import { aboutRoutes } from "@/features/about/routes";
import { healthRoutes } from "@/features/health/routes";
import { homeRoutes } from "@/features/home/routes";
import { taskRoutes } from "@/features/tasks/routes";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: DefaultLayout,
      children: [...homeRoutes, ...aboutRoutes, ...healthRoutes, ...taskRoutes],
    },
  ],
});

export default router;
