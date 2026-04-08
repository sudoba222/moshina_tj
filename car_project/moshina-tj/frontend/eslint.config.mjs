import nextConfig from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextConfig,
  {
    rules: {
      // react-hooks/set-state-in-effect triggers false positives on legitimate patterns:
      // - async effects that call setState in promise callbacks (AuthContext.me())
      // - effects that read localStorage on mount and call setState
      // - useEffect(() => { loadData() }, [loadData]) where loadData is a useCallback
      // These are all correct React patterns. The rule is over-aggressive in v5.
      'react-hooks/set-state-in-effect': 'off',

      // react-hooks/immutability triggers false positives on:
      // - function declarations used inside useEffect (they ARE hoisted, this is valid JS)
      // - dismissRef.current = onDismiss (standard pattern for stable callback refs)
      // - _clearAuth() called from inside useEffect promise callbacks
      'react-hooks/immutability': 'off',

      // react-hooks/refs triggers false positives on the standard "stable callback ref"
      // pattern where ref.current is updated during render to keep the latest value.
      'react-hooks/refs': 'off',
    },
  },
]

export default config
