import retryingDynamicImport from "retrying-dynamic-import";

retryingDynamicImport();

import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import "./style.css";
import App from "./App.vue";
import HomeVue from "./views/Home.vue";

const routes = [
  {
    path: "/",
    component: HomeVue,
    children: [
      { path: "one", component: () => import("./views/PageOne.vue") },
      { path: "two", component: () => import("./views/PageTwo.vue") },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);

app.use(router);

app.mount("#app");