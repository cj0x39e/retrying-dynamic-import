<template>
  <div style="with: 200px; margin: 0 aut">
    <h1>Home</h1>
    <p>
      <router-link to="/one">page one</router-link>
      &nbsp; &nbsp;
      <router-link to="/two">page two</router-link>
    </p>
    <router-view></router-view>
  </div>
</template>

<script lang="ts" setup></script>
