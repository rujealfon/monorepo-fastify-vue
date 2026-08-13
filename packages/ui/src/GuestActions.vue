<script setup lang="ts">
withDefaults(defineProps<{
  activePath?: string
  loginHref: string
  registerHref: string
}>(), { activePath: '' })
</script>

<template>
  <UButton v-if="activePath !== loginHref" :to="loginHref" color="neutral" variant="ghost" label="Login" />
  <UButton v-if="activePath !== registerHref" :to="registerHref" color="primary" label="Register" />
</template>
