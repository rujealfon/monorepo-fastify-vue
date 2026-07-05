import { createRouter, createWebHistory } from "vue-router";

import HomeView from "../views/HomeView.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: HomeView,
    },
    {
      path: "/login",
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/register",
      component: () => import("../views/RegisterView.vue"),
    },
    {
      path: "/profile",
      component: () => import("../views/ProfileView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/task/:id",
      component: () => import("../views/TaskView.vue"),
    },
    {
      path: "/task/:id/edit",
      component: () => import("../views/TaskEditView.vue"),
    },
  ],
});
