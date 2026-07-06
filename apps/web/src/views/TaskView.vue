<script setup lang="ts">
import { useQuery } from "@pinia/colada";
import { useRoute } from "vue-router";

import dateFormatter from "@/web/lib/date-formatter";
import { taskByIdQueryOptions } from "@/web/lib/queries";

const route = useRoute();
const id = route.params.id as string;

const { data, status, error } = useQuery(() => taskByIdQueryOptions(route.params.id as string));
</script>

<template>
  <article v-if="status === 'pending'">
    <progress />
  </article>
  <article v-else-if="error" class="error">
    {{ error.message }}
  </article>
  <article v-else-if="data">
    <h2>{{ data.name }}</h2>
    <h4>Done: {{ data.done ? "✅" : "❌" }}</h4>
    <hr>
    <small>Updated: {{ dateFormatter.format(new Date(data.updatedAt)) }}</small>
    <br>
    <small>Created: {{ dateFormatter.format(new Date(data.createdAt)) }}</small>
    <div class="buttons">
      <RouterLink role="button" :to="`/task/${id}/edit`" class="contrast outline">
        Edit
      </RouterLink>
    </div>
  </article>
</template>
