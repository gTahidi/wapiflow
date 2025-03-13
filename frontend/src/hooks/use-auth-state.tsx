'use client'

import { AUTH_TOKEN_LS } from '~/constants'
import { useCallback, useEffect, useState, useRef } from 'react'
import { z } from 'zod'
import { UserPermissionLevelEnum } from 'root/.generated'
import { decode } from 'jsonwebtoken'
import { UserTokenPayloadSchema } from '~/schema'

const AuthStateSchemaType = z
	.object({
		isAuthenticated: z.literal(true),
		data: z.object({
			user: z.object({
				uniqueId: z.string(),
				email: z.string(),
				role: z.nativeEnum(UserPermissionLevelEnum).or(z.string().nullish()),
				username: z.string(),
				organizationId: z.string().nullish(),
				name: z.string()
			}),
			token: z.string()
		})
	})
	.or(
		z.object({
			isAuthenticated: z.literal(false)
		})
	)
	.or(
		z.object({
			isAuthenticated: z.literal(null)
		})
	)

export type AuthState = z.infer<typeof AuthStateSchemaType>

// Helper function to parse and validate token
const parseAuthToken = (authToken: string | null): AuthState => {
	if (!authToken) {
		return { isAuthenticated: false }
	}

	try {
		// Decode the token
		const payload = decode(authToken)
		const parsedPayload = UserTokenPayloadSchema.safeParse(payload)

		if (!parsedPayload.success) {
			console.warn('Invalid token payload', parsedPayload.error)
			return { isAuthenticated: false }
		}

		return {
			isAuthenticated: true,
			data: {
				token: authToken,
				user: {
					email: parsedPayload.data.email,
					uniqueId: parsedPayload.data.unique_id,
					username: parsedPayload.data.username,
					organizationId: parsedPayload.data.organization_id,
					role: parsedPayload.data.role,
					name: parsedPayload.data.name
				}
			}
		}
	} catch (error) {
		console.error('Error parsing auth token:', error)
		return { isAuthenticated: false }
	}
}

export const useAuthState = () => {
	// Initialize with loading state
	const [authState, setAuthState] = useState<AuthState>({
		isAuthenticated: null
	})
	
	// Use ref for throttling to avoid re-renders
	const lastUpdateTimeRef = useRef(0)
	const pendingUpdateRef = useRef<NodeJS.Timeout | null>(null)
	
	// Deep compare auth states to prevent unnecessary updates
	const compareAuthStates = (prev: AuthState, next: AuthState): boolean => {
		if (prev.isAuthenticated !== next.isAuthenticated) return false
		if (prev.isAuthenticated === true && next.isAuthenticated === true) {
			return prev.data.token === next.data.token &&
				   prev.data.user.uniqueId === next.data.user.uniqueId &&
				   prev.data.user.email === next.data.user.email
		}
		return true
	}

	// Function to update auth state - extracted to avoid recreating in event listeners
	const updateAuthState = useCallback(() => {
		// Throttle updates
		const now = Date.now()
		if (now - lastUpdateTimeRef.current < 300) {
			// If an update is pending, clear it
			if (pendingUpdateRef.current) {
				clearTimeout(pendingUpdateRef.current)
			}
			// Schedule a new update
			pendingUpdateRef.current = setTimeout(() => {
				updateAuthState()
			}, 300)
			return
		}
		lastUpdateTimeRef.current = now
		
		try {
			const authToken = localStorage.getItem(AUTH_TOKEN_LS)
			const newAuthState = parseAuthToken(authToken)
			
			setAuthState(prev => {
				if (!compareAuthStates(prev, newAuthState)) {
					return newAuthState
				}
				return prev
			})
		} catch (error) {
			console.error('Error updating auth state:', error)
			setAuthState({ isAuthenticated: false })
		}
	}, [])

	// Initial auth check and storage event listener
	useEffect(() => {
		updateAuthState()
		
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === AUTH_TOKEN_LS) {
				updateAuthState()
			}
		}
		
		window.addEventListener('storage', handleStorageChange)
		
		// Cleanup function
		return () => {
			if (pendingUpdateRef.current) {
				clearTimeout(pendingUpdateRef.current)
			}
			window.removeEventListener('storage', handleStorageChange)
		}
	}, [updateAuthState])

	// Method to update auth token
	const setAuthToken = useCallback((token: string | null) => {
		try {
			if (token) {
				// Validate token before storing
				const newState = parseAuthToken(token)
				if (newState.isAuthenticated) {
					localStorage.setItem(AUTH_TOKEN_LS, token)
					updateAuthState()
				} else {
					throw new Error('Invalid token format')
				}
			} else {
				localStorage.removeItem(AUTH_TOKEN_LS)
				updateAuthState()
			}
		} catch (error) {
			console.error('Error setting auth token:', error)
			localStorage.removeItem(AUTH_TOKEN_LS)
			setAuthState({ isAuthenticated: false })
		}
	}, [updateAuthState])
	
	const logout = useCallback(() => {
		localStorage.removeItem(AUTH_TOKEN_LS)
		setAuthState({ isAuthenticated: false })
	}, [])

	return {
		authState,
		setAuthToken,
		logout,
		isLoading: authState.isAuthenticated === null
	}
}
