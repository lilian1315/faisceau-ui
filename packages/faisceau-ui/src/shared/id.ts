let nextId = 0

const ID_PREFIX_PATTERN = /^fui-[a-z0-9][a-z0-9_-]*$/i

/**
 * Creates a process-local DOM id suitable for associating component parts.
 *
 * The returned id always starts with `fui-`. Passing `"select"`, for example,
 * produces ids such as `fui-select-1`.
 */
export function createId(prefix = 'component'): string {
  const normalizedPrefix = prefix.startsWith('fui-') ? prefix : `fui-${prefix}`

  if (!ID_PREFIX_PATTERN.test(normalizedPrefix)) {
    throw new Error(
      `[Faisceau UI] Invalid id prefix "${prefix}". Use letters, numbers, hyphens, or underscores.`,
    )
  }

  let id: string

  do {
    nextId += 1
    id = `${normalizedPrefix}-${nextId.toString(36)}`
  } while (typeof document !== 'undefined' && document.getElementById(id) !== null)

  return id
}
