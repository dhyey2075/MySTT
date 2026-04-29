/** Map Electron accelerator tokens to short display labels for keycaps. */
export function acceleratorParts(accelerator: string): string[] {
  return accelerator
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      switch (part) {
        case 'CommandOrControl':
          return typeof navigator !== 'undefined' && /Mac|iPhone/i.test(navigator.platform ?? '')
            ? '⌘'
            : 'Ctrl'
        case 'Control':
          return 'Ctrl'
        case 'Command':
          return '⌘'
        case 'Shift':
          return '⇧'
        case 'Alt':
          return 'Alt'
        case 'Option':
          return '⌥'
        default:
          return part
      }
    })
}
