<script>
import { h } from "vue"
import {
  FilterType,
  GroupType,
  DataType,
  deepCopy,
} from "@visual-filter/common"
import applyFilter from "@visual-filter/applyer"

import FilterGroup from "./FilterGroup.vue"
import FilterCondition from "./FilterCondition.vue"

export default {
  name: "VueVisualFilter",
  emits: ["filterUpdate"],
  props: {
    filteringOptions: {
      type: Object,
      required: true,
      validator(value) {
        try {
          return (
            value.data.length &&
            value.data.every(
              (field, index, fields) =>
                typeof field.name === "string" &&
                typeof field.type === "string" &&
                field.values.constructor === Array &&
                (index > 0
                  ? field.values.length === fields[index - 1].values.length
                  : true),
            ) &&
            Object.values(value.methods.numeric).every(
              (method) => typeof method === "function",
            ) &&
            Object.values(value.methods.nominal).every(
              (method) => typeof method === "function",
            )
          )
        } catch {
          return false
        }
      },
    },
    initialFilter: {
      type: Object,
      default: null,
    },
    resetKey: {
      type: [String, Number],
      default: 0,
    },
  },
  data() {
    return {
      filter: {
        type: FilterType.GROUP,
        groupType: GroupType.AND,
        filters: [],
      },
      history: [],
      historyIndex: -1,
      isUpdatingFromHistory: false,
    }
  },
  computed: {
    fieldNames() {
      return this.filteringOptions.data.map((field) => field.name)
    },
    numericMethodNames() {
      return Object.keys(this.filteringOptions.methods.numeric)
    },
    nominalMethodNames() {
      return Object.keys(this.filteringOptions.methods.nominal)
    },
    dateMethodNames() {
      return Object.keys(this.filteringOptions.methods.date || {})
    },
    canUndo() {
      return this.historyIndex > 0
    },
    canRedo() {
      return this.historyIndex < this.history.length - 1
    },
  },
  watch: {
    filter: {
      deep: true,
      handler() {
        if (!this.isUpdatingFromHistory) {
          this.addToHistory()
        }
        this.$emit("filterUpdate", {
          filter: deepCopy(this.filter),
          data: applyFilter(
            this.filter,
            this.filteringOptions.methods,
            deepCopy(this.filteringOptions.data),
          ),
        })
      },
    },
    initialFilter: {
      handler(newFilter) {
        if (newFilter) {
          this.loadFilter(newFilter)
        }
      },
      immediate: true,
    },
    resetKey: {
      handler() {
        this.resetFilter()
      },
    },
  },
  methods: {
    updateConditionField(condition, newFieldName) {
      const {
        type: newType,
        values: [newSampleValue = ""],
      } = this.filteringOptions.data.find(
        (field) => field.name === newFieldName,
      )
      if (condition.dataType !== newType) {
        condition.method =
          (newType === DataType.NUMERIC
            ? this.numericMethodNames[0]
            : newType === DataType.DATE
            ? this.dateMethodNames[0]
            : this.nominalMethodNames[0]) || ""
        condition.argument = newSampleValue
        condition.dataType = newType
      }
    },
    addFilter(filters, newFilterType) {
      if (newFilterType === FilterType.GROUP) {
        filters.push({
          type: FilterType.GROUP,
          groupType: GroupType.AND,
          filters: [],
        })
      } else {
        const {
          name,
          type,
          values: [sampleValue = ""],
        } = this.filteringOptions.data[0]

        filters.push({
          type: FilterType.CONDITION,
          fieldName: name,
          dataType: type,
          method:
            (type === DataType.NUMERIC
              ? this.numericMethodNames[0]
              : type === DataType.DATE
              ? this.dateMethodNames[0]
              : this.nominalMethodNames[0]) || "",
          argument: sampleValue,
        })
      }
    },
    deleteFilter(filterToDelete) {
      function recursiveDeletion(filter, index, filters) {
        if (filter === filterToDelete) {
          filters.splice(index, 1)
        } else if (filter.type === FilterType.GROUP) {
          filter.filters.map(recursiveDeletion)
        }
      }

      if (filterToDelete !== this.filter) {
        recursiveDeletion(this.filter)
      }
    },
    addToHistory() {
      const filterCopy = deepCopy(this.filter)
      this.history = this.history.slice(0, this.historyIndex + 1)
      this.history.push(filterCopy)
      this.historyIndex = this.history.length - 1
      
      // Limit history size to prevent memory issues
      if (this.history.length > 50) {
        this.history.shift()
        this.historyIndex--
      }
    },
    undo() {
      if (this.canUndo) {
        this.historyIndex--
        this.loadFromHistory()
      }
    },
    redo() {
      if (this.canRedo) {
        this.historyIndex++
        this.loadFromHistory()
      }
    },
    loadFromHistory() {
      this.isUpdatingFromHistory = true
      this.filter = deepCopy(this.history[this.historyIndex])
      this.$nextTick(() => {
        this.isUpdatingFromHistory = false
      })
    },
    loadFilter(filter) {
      this.isUpdatingFromHistory = true
      this.filter = deepCopy(filter)
      this.history = [deepCopy(filter)]
      this.historyIndex = 0
      this.$nextTick(() => {
        this.isUpdatingFromHistory = false
      })
    },
    resetFilter() {
      this.isUpdatingFromHistory = true
      this.filter = {
        type: FilterType.GROUP,
        groupType: GroupType.AND,
        filters: [],
      }
      this.history = [deepCopy(this.filter)]
      this.historyIndex = 0
      this.$nextTick(() => {
        this.isUpdatingFromHistory = false
      })
    },
    getCurrentFilter() {
      return deepCopy(this.filter)
    },
  },
  render() {
    const createVisualizer = (filter) => {
      if (filter.type === FilterType.GROUP) {
        return h(
          FilterGroup,
          {
            group: filter,
            filterTypes: Object.values(FilterType),
            groupTypes: Object.values(GroupType),
            removable: filter !== this.filter,
            onAddFilter: this.addFilter,
            onDeleteGroup: this.deleteFilter,
          },
          {
            groupTypes: this.$slots.groupTypes,
            filterAddition: this.$slots.filterAddition,
            groupDeletion: this.$slots.groupDeletion,
            groupChildren: () => filter.filters.map(createVisualizer),
          },
        )
      } else {
        return h(
          FilterCondition,
          {
            condition: filter,
            fieldNames: this.fieldNames,
            numericMethodNames: this.numericMethodNames,
            nominalMethodNames: this.nominalMethodNames,
            dateMethodNames: this.dateMethodNames,
            onUpdateField: this.updateConditionField,
            onDeleteCondition: this.deleteFilter,
          },
          {
            fieldUpdation: this.$slots.fieldUpdation,
            methodUpdation: this.$slots.methodUpdation,
            argumentUpdation: this.$slots.argumentUpdation,
            conditionDeletion: this.$slots.conditionDeletion,
          },
        )
      }
    }

    return createVisualizer(this.filter)
  },
}
</script>
