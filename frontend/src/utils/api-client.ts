import { AUTH_TOKEN_LS, getBackendUrl } from '~/constants'

// Keep track of pending requests to prevent duplicate calls
const pendingRequests = new Map<string, Promise<any>>()

// Create a request key based on method, url and params
const createRequestKey = (method: string, url: string, params?: any) => {
	return `${method}:${url}:${params ? JSON.stringify(params) : ''}`
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
	'/auth/login',
	'/auth/register',
	'/auth/verify-otp',
	'/health-check'
]

export const customInstance = async <T>({
	url,
	method,
	params,
	data,
	headers: customHeaders = {},
	publicRoute = false
}: {
	url: string
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
	params?: any
	data?: any
	responseType?: string
	signal?: AbortSignal
	headers?: Record<string, string>
	publicRoute?: boolean
}): Promise<T> => {
	// Check if this is a public route that doesn't need authentication
	const isPublicRoute = publicRoute || PUBLIC_ROUTES.some(route => url.includes(route))
	
	// Get auth token from localStorage
	const authToken = localStorage.getItem(AUTH_TOKEN_LS)
	
	// If not a public route and no auth token exists, reject the request
	if (!isPublicRoute && !authToken) {
		return Promise.reject({
			status: 401,
			statusText: 'Unauthorized',
			message: 'Authentication required'
		})
	}
	
	// Create a unique key for this request to deduplicate
	const requestKey = createRequestKey(method, url, params)
	
	// If we already have a pending request for this exact combination, return that promise
	if (pendingRequests.has(requestKey)) {
		return pendingRequests.get(requestKey) as Promise<T>
	}
	
	// Set up headers
	const headers = new Headers(customHeaders)
	headers.set('Content-Type', 'application/json')
	headers.set('Accept', 'application/json')

	if (authToken) {
		headers.set('Authorization', `Bearer ${authToken}`)
	}

	// Don't add /api prefix for auth endpoints
	const apiUrl = url.startsWith('/auth') ? url : url.startsWith('/api') ? url : `/api${url}`

	// Build query string
	const queryParam = params ? new URLSearchParams(params).toString() : ''
	const fullUrl = `${getBackendUrl()}${apiUrl}${queryParam ? `?${queryParam}` : ''}`
	
	// Create the request promise
	const requestPromise = (async () => {
		try {
			const response = await fetch(fullUrl, {
				method,
				...(data ? { body: JSON.stringify(data) } : {}),
				headers: headers,
				credentials: 'include',
				mode: 'cors',
				cache: 'no-cache'
			})

			// Remove from pending requests map once completed
			pendingRequests.delete(requestKey)
			
			if (!response.ok) {
				// Handle 401 Unauthorized - could be expired token
				if (response.status === 401 && !isPublicRoute) {
					localStorage.removeItem(AUTH_TOKEN_LS)
				}
				
				// Handle 429 Too Many Requests
				if (response.status === 429) {
					console.warn('Rate limit exceeded. Backing off...')
				}
				
				// Parse error response
				const errorData = await response.json().catch(() => ({}))
				return Promise.reject({
					status: response.status,
					statusText: response.statusText,
					message: errorData.message || errorData.detail || 'An error occurred',
					response: {
						data: errorData
					}
				})
			}

			// For empty responses (like 204 No Content)
			if (response.status === 204) {
				return {} as T
			}

			const responseData = await response.json()
			return responseData as T
		} catch (error) {
			// Remove from pending requests map on error
			pendingRequests.delete(requestKey)
			return Promise.reject({
				status: 0,
				statusText: 'Network Error',
				message: 'Unable to connect to the server'
			})
		}
	})()
	
	// Store in pending requests map
	pendingRequests.set(requestKey, requestPromise)
	
	return requestPromise
}

export default customInstance
