'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthState } from '~/hooks/use-auth-state'
import { useQuery } from '@tanstack/react-query'
import customInstance from '~/utils/api-client'
import { AUTH_TOKEN_LS } from '~/constants'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/signin', '/sign-up', '/verify-otp']
const DEFAULT_AUTH_REDIRECT = '/dashboard'

export default function AuthProvisioner({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const { authState, setAuthToken, isLoading } = useAuthState()

    // Check if the current route is public
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))

    // Only fetch user data if we have a token and are not on a public route
    const shouldFetchUser = authState.isAuthenticated === true && !isPublicRoute

    // Fetch current user data only when authenticated and not on public routes
    const { data: userData, isLoading: isUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            try {
                return await customInstance({
                    url: '/api/users/me',
                    method: 'GET'
                })
            } catch (error) {
                // If we get a 401, clear the token and redirect to sign-in
                if ((error as any)?.status === 401) {
                    localStorage.removeItem(AUTH_TOKEN_LS)
                    setAuthToken(null)
                    router.replace('/signin')
                }
                throw error
            }
        },
        enabled: shouldFetchUser,
        retry: (failureCount, error) => {
            return failureCount < 2 && (error as any)?.status !== 401
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000
    })

    // Handle routing based on authentication state
    useEffect(() => {
        // Skip if still loading authentication state
        if (isLoading) return

        // If authenticated but on a public route, redirect to dashboard
        if (authState.isAuthenticated === true && isPublicRoute) {
            router.replace(DEFAULT_AUTH_REDIRECT)
            return
        }

        // If not authenticated and not on a public route, redirect to signin
        if (authState.isAuthenticated === false && !isPublicRoute) {
            router.replace('/signin')
            return
        }
    }, [authState.isAuthenticated, isLoading, isPublicRoute, pathname, router])

    // Show loading screen while authentication state is being determined
    // or while user data is being loaded (but only if we need user data)
    if (isLoading || (shouldFetchUser && isUserLoading)) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        )
    }

    // Render children once authentication checks are complete
    return <>{children}</>
}
