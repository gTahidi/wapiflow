'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { useState, useCallback } from 'react'
import { useAuthState } from '~/hooks/use-auth-state'
import { useMutation } from '@tanstack/react-query'
import customInstance from '~/utils/api-client'
import { toast } from 'sonner'

// Define the login response type
interface LoginResponse {
	token: string
	user: {
		id: string
		email: string
		name?: string
	}
}

const formSchema = z.object({
	email: z.string().email({
		message: 'Please enter a valid email.'
	}),
	password: z.string().min(8, {
		message: 'Password must be at least 8 characters.'
	})
})

export default function UserLoginForm() {
	const { setAuthToken, authState } = useAuthState()
	const [isLoading, setIsLoading] = useState(false)

	// Use react-query for login mutation
	const loginMutation = useMutation({
		mutationFn: async (values: z.infer<typeof formSchema>) => {
			const response = await customInstance<LoginResponse>({
				url: '/api/auth/login',
				method: 'POST',
				data: {
					username: values.email,
					password: values.password
				},
				publicRoute: true
			})

			if (!response?.token) {
				throw new Error('Invalid response: Missing token')
			}

			return response
		},
		onMutate: () => {
			setIsLoading(true)
		},
		onSuccess: (response) => {
			try {
				if (!response?.token) {
					throw new Error('Invalid response: Missing token')
				}
				setAuthToken(response.token)
				toast.success('Login successful!')
			} catch (error) {
				console.error('Error processing login response:', error)
				setAuthToken(null)
				toast.error('Error processing login response')
			}
		},
		onError: (error: any) => {
			console.error('Login error:', error)
			const errorMessage = error?.response?.data?.message || error?.message || 'Login failed. Please try again.'
			toast.error(errorMessage)
			setAuthToken(null)
		},
		onSettled: () => {
			setIsLoading(false)
		}
	})

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			password: ''
		}
	})

	async function onSubmit(values: z.infer<typeof formSchema>) {
		if (isLoading) return
		loginMutation.mutate(values)
	}

	// Disable form while loading or if already authenticated
	const isFormDisabled = isLoading || loginMutation.isLoading || authState.isAuthenticated === true

	// Add dev login helper
	const handleDevLogin = useCallback(() => {
		if (process.env.NODE_ENV === 'development') {
			form.setValue('email', 'dev@wapikit.com')
			form.setValue('password', 'devuser')
			onSubmit({
				email: 'dev@wapikit.com',
				password: 'devuser'
			})
		}
	}, [form])

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input 
									placeholder="email" 
									{...field} 
									disabled={isFormDisabled}
									autoComplete="email"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Password</FormLabel>
							<FormControl>
								<Input 
									type="password" 
									placeholder="********" 
									{...field} 
									disabled={isFormDisabled}
									autoComplete="current-password"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="space-y-4">
					<Button 
						type="submit" 
						className="w-full" 
						disabled={isFormDisabled}
					>
						{isLoading ? 'Signing in...' : 'Sign in'}
					</Button>
					{process.env.NODE_ENV === 'development' && (
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={handleDevLogin}
							disabled={isFormDisabled}
						>
							Dev Login
						</Button>
					)}
				</div>
			</form>
		</Form>
	)
}
