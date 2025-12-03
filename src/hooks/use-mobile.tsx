
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  )

  React.useEffect(() => {
    const checkIsMobile = () => {
      return window.innerWidth < MOBILE_BREAKPOINT
    }

    const handleResize = () => {
      setIsMobile(checkIsMobile())
    }

    if (typeof window !== 'undefined') {
        // Check on mount (and only on client)
        handleResize();
        // Add event listener
        window.addEventListener("resize", handleResize)
    }


    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return isMobile
}

    