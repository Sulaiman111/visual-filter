import { FilterType, GroupType, DataType } from "@visual-filter/common"

export = function applyFilter(filter: any, methods: any, data: any) {
  // Helper function to normalize date values
  function normalizeDateValue(value: any): Date | null {
    if (value === null || value === undefined) return null
    
    // If it's already a Date object
    if (value instanceof Date) return value
    
    // If it's a string in YYYY-MM-DD format
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value + 'T00:00:00.000Z')
    }
    
    // Try to parse as Date
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }

  function buildPremiseTree(filter: any) {
    if (filter.type === FilterType.CONDITION) {
      return data
        .find((field: any) => field.name === filter.fieldName)
        .values.map((value: any) => {
          try {
            // Handle DATE type with special logic
            if (filter.dataType === DataType.DATE) {
              const normalizedValue = normalizeDateValue(value)
              const normalizedArgument = normalizeDateValue(filter.argument)
              
              if (normalizedValue === null || normalizedArgument === null) {
                return false
              }
              
              switch (filter.method) {
                case 'equals':
                  // Compare only the date part (ignore time)
                  return normalizedValue.toDateString() === normalizedArgument.toDateString()
                case 'before':
                  return normalizedValue < normalizedArgument
                case 'after':
                  return normalizedValue > normalizedArgument
                default:
                  return false
              }
            }
            
            return methods[filter.dataType][filter.method](
              value,
              filter.argument,
            )
          } catch {
            return false
          }
        })
    }
    return filter.filters.map(buildPremiseTree)
  }

  function shouldntDeleteRow(rowIndex: any, premises: any, group: any) {
    for (
      let conditionIndex = 0;
      conditionIndex < premises.length;
      ++conditionIndex
    ) {
      const currentPremise =
        premises[conditionIndex][0]?.constructor === Array
          ? shouldntDeleteRow(
              rowIndex,
              premises[conditionIndex],
              group.filters[conditionIndex],
            )
          : premises[conditionIndex][rowIndex]

      if (currentPremise === true) {
        switch (group.groupType) {
          case GroupType.AND:
            continue
          case GroupType.NOT_AND:
            return false
          case GroupType.OR:
            return true
          case GroupType.NOT_OR:
            continue
        }
      } else {
        switch (group.groupType) {
          case GroupType.AND:
            return false
          case GroupType.NOT_AND:
            continue
          case GroupType.OR:
            continue
          case GroupType.NOT_OR:
            return true
        }
      }
    }

    switch (group.groupType) {
      case GroupType.AND:
      case GroupType.NOT_AND:
        return true
      case GroupType.OR:
      case GroupType.NOT_OR:
        return false
    }
  }

  const premiseTree = buildPremiseTree(filter)

  for (
    let rowIndex = 0, rowsCount = data[0].values.length, deletionCount = 0;
    rowIndex < rowsCount;
    ++rowIndex
  ) {
    if (shouldntDeleteRow(rowIndex, premiseTree, filter) === false) {
      data.forEach((field: any) =>
        field.values.splice(rowIndex - deletionCount, 1),
      )
      ++deletionCount
    }
  }

  return data
}
