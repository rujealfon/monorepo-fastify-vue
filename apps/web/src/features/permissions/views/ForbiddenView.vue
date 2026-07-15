<template>
  <UEmpty
    icon="i-lucide-shield-x"
    title="Access denied"
    description="You do not have permission to view this page."
  >
    <template #actions>
      <UButton to="/" color="primary" label="Back to home" />
    </template>
  </UEmpty>
</template>
