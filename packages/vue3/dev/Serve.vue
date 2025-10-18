<script setup lang="ts">
import { ref, onMounted } from 'vue'

const currentFilter = ref<any|null>(null)
const resetKey = ref(0)
const initialFilter = ref<any|null>(null)
const filterComponent = ref<any>(null)

function onFilterUpdate(payload:any){
  const state = payload?.filter ?? payload
  currentFilter.value = structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state))
}

function saveToLocal(){
  if(!currentFilter.value) return
  localStorage.setItem('vf_filter', JSON.stringify(currentFilter.value))
  alert('Saved')
}

function copyLink(){
  if(!currentFilter.value) return
  const url = new URL(window.location.href)
  url.searchParams.set('vf', encodeURIComponent(JSON.stringify(currentFilter.value)))
  navigator.clipboard.writeText(url.toString())
  alert('Link copied')
}

function resetAll(){
  resetKey.value++
  currentFilter.value = null
  const url = new URL(window.location.href)
  url.searchParams.delete('vf')
  history.replaceState(null,'',url.toString())
}

function loadFromQuery(){
  const raw = new URLSearchParams(window.location.search).get('vf')
  if(!raw) return
  try{
    const parsed = JSON.parse(decodeURIComponent(raw))
    initialFilter.value = parsed
    localStorage.setItem('vf_filter', JSON.stringify(parsed))
  }catch{}
}

function undo(){
  if(filterComponent.value?.undo) {
    filterComponent.value.undo()
  }
}

function redo(){
  if(filterComponent.value?.redo) {
    filterComponent.value.redo()
  }
}

function loadSavedFilter(){
  const saved = localStorage.getItem('vf_filter')
  if(saved) {
    try {
      const parsed = JSON.parse(saved)
      initialFilter.value = parsed
      resetKey.value++
    } catch {}
  }
}

onMounted(() => {
  loadFromQuery()
  loadSavedFilter()
})

const filteringOptions = {
  data: [
    {
      name: "First Name",
      type: "nominal",
      values: ["Obada", "Ahmad", "Omar"],
    },
    {
      name: "Last Name",
      type: "nominal",
      values: ["Khalili", "Drhili", "Hala hili"],
    },
    {
      name: "Grade",
      type: "numeric",
      values: [3.72, 3.52, 3.4],
    },
    {
      name: "Created At",
      type: "date",
      values: ["2023-12-15", "2024-01-10", "2024-02-05"],
    },
  ],
  methods: {
    numeric: {
      "="(cellValue, argument) {
        return cellValue == argument
      },
      ">"(cellValue, argument) {
        return cellValue > argument
      },
      "<"(cellValue, argument) {
        return cellValue < argument
      },
    },
    nominal: {
      contains(cellValue, argument) {
        return cellValue.includes(argument)
      },
      startsWith(cellValue, argument) {
        return cellValue.startsWith(argument)
      },
      endsWith(cellValue, argument) {
        return cellValue.endsWith(argument)
      },
    },
    date: {
      equals(cellValue, argument) {
        return cellValue === argument
      },
      before(cellValue, argument) {
        return cellValue < argument
      },
      after(cellValue, argument) {
        return cellValue > argument
      },
    },
  },
}
</script>

<template>
  <div style="display:flex;gap:.5rem;margin-bottom:.75rem;flex-wrap:wrap">
    <button @click="saveToLocal">Save</button>
    <button @click="copyLink" :disabled="!currentFilter">Copy Link</button>
    <button @click="resetAll">Reset</button>
    <button @click="undo" :disabled="!filterComponent?.canUndo">Undo</button>
    <button @click="redo" :disabled="!filterComponent?.canRedo">Redo</button>
    <button @click="loadSavedFilter">Load Saved</button>
  </div>

  <vue-visual-filter
    ref="filterComponent"
    :key="resetKey"
    :filtering-options="filteringOptions"
    :initial-filter="initialFilter"
    @filter-update="onFilterUpdate"
  />
</template>
