"use client"

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import axios from "axios"
import { ThemeProvider } from "next-themes"
import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { authKeys } from "@/hooks/use-auth"

// Lỗi 4xx là lỗi nghiệp vụ, thử lại không có ích
function shouldRetry(failureCount: number, error: unknown) {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  return failureCount < 2 && (status === undefined || status >= 500)
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    // Làm mới phiên cũng thất bại (401): về màn đăng nhập
    const onError = (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) client.setQueryData(authKeys.me, null)
    }
    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: shouldRetry },
        mutations: { retry: false },
      },
    })
    return client
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
