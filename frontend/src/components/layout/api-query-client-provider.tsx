'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { errorNotification } from '~/reusable-functions'

export default function ApiQueryClientProvider({ children }: { children: React.ReactNode }) {
	// Create a query client instance with proper configuration
	const queryClient = new QueryClient({
		defaultOptions: {
			mutations: {
				retry: false,
				// Only show error notifications for rate limiting
				onError: (error: unknown) => {
					const status = (error as { status?: number })?.status
					if (status === 429) {
						errorNotification({
							message: 'You have hit the rate limit. Please try again after some time.'
						})
					}
				}
			},
			queries: {
				// Don't retry failed queries automatically
				retry: (failureCount, error) => {
					// Don't retry unauthorized errors (will be handled by auth flow)
					if (((error as unknown as { status: number }).status as number) === 401) {
						return false
					}
					// Only retry network errors, and max 2 times
					return failureCount < 2 && ((error as unknown as { status: number }).status as number) === 0
				},
				// Implement stale time to reduce unnecessary refetches
				staleTime: 30 * 1000, // 30 seconds
				// Cache successful query results for 5 minutes
				gcTime: 5 * 60 * 1000,
				// Don't throw errors to the UI
				throwOnError: false,
				// Only refetch when online
				networkMode: 'online',
				// Don't refetch on window focus - reduces unnecessary requests
				refetchOnWindowFocus: false
			}
		}
	})

	return (
		<>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</>
	)
}
