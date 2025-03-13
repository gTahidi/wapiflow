'use client'
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
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuthState } from '~/hooks/use-auth-state'
import { AUTH_TOKEN_LS } from '~/constants'
import { useMutation } from '@tanstack/react-query'
import customInstance from '~/utils/api-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Define response types
interface RegisterResponse {
	isOtpSent: boolean
	message?: string
}

interface VerifyOtpResponse {
	token: string
	user?: {
		id: string
		email: string
		name: string
	}
}

const otpFormSchema = z.object({
	otp: z.string().length(6, { message: 'OTP must be 6 characters' })
})

const SignUpFormSchema = z.object({
	email: z.string().email({ message: 'Enter a valid email address' }),
	password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
	confirmPassword: z.string().min(8, { message: 'Password must be at least 8 characters' }),
	name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
	username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
	orgInviteSlug: z.string().optional()
})

type SignUpFormValue = z.infer<typeof SignUpFormSchema>
type OtpFormValue = z.infer<typeof otpFormSchema>

export default function UserSignupForm() {
	const router = useRouter()
	const { setAuthToken } = useAuthState()
	const [isLoading, setIsLoading] = useState(false)
	const [activeForm, setActiveForm] = useState<'registrationDetailsForm' | 'otpForm'>(
		'registrationDetailsForm'
	)
	const [registrationData, setRegistrationData] = useState<SignUpFormValue | null>(null)

	const signUpForm = useForm<SignUpFormValue>({
		resolver: zodResolver(SignUpFormSchema),
		defaultValues: {
			email: '',
			password: '',
			confirmPassword: '',
			name: '',
			username: '',
			orgInviteSlug: ''
		}
	})

	const otpForm = useForm<OtpFormValue>({
		resolver: zodResolver(otpFormSchema),
		defaultValues: {
			otp: ''
		}
	})

	// Register mutation
	const registerMutation = useMutation({
		mutationFn: async (data: SignUpFormValue) => {
			return await customInstance<RegisterResponse>({
				url: '/auth/register',
				method: 'POST',
				data: {
					password: data.password,
					username: data.username,
					email: data.email,
					name: data.name,
					organizationInviteSlug: data.orgInviteSlug || undefined
				},
				publicRoute: true
			})
		},
		onSuccess: (response) => {
			if (response.isOtpSent) {
				toast.success('OTP sent to your email')
				setActiveForm('otpForm')
			} else {
				toast.error(response.message || 'Failed to send OTP')
			}
		},
		onError: (error: any) => {
			console.error('Registration error:', error)
			toast.error(error?.message || 'Something went wrong while creating your account')
		},
		onSettled: () => {
			setIsLoading(false)
		}
	})

	// Verify OTP mutation
	const verifyOtpMutation = useMutation({
		mutationFn: async (data: { formData: SignUpFormValue; otp: string }) => {
			return await customInstance<VerifyOtpResponse>({
				url: '/auth/verify-otp',
				method: 'POST',
				data: {
					password: data.formData.password,
					username: data.formData.username,
					email: data.formData.email,
					name: data.formData.name,
					organizationInviteSlug: data.formData.orgInviteSlug || undefined,
					otp: data.otp
				},
				publicRoute: true
			})
		},
		onSuccess: (response) => {
			if (response.token) {
				setAuthToken(response.token)
				toast.success('Account created successfully!')
				router.push('/')
			} else {
				toast.error('Failed to verify OTP')
			}
		},
		onError: (error: any) => {
			console.error('OTP verification error:', error)
			toast.error(error?.message || 'Failed to verify OTP')
		},
		onSettled: () => {
			setIsLoading(false)
		}
	})

	function initiateRegistration(data: SignUpFormValue) {
		if (data.password !== data.confirmPassword) {
			toast.error('Passwords do not match')
			return
		}

		setIsLoading(true)
		setRegistrationData(data)
		registerMutation.mutate(data)
	}

	function submitOtp(data: OtpFormValue) {
		if (!registrationData) {
			toast.error('Registration data not found')
			return
		}

		setIsLoading(true)
		verifyOtpMutation.mutate({
			formData: registrationData,
			otp: data.otp
		})
	}

	return (
		<>
			{activeForm === 'registrationDetailsForm' ? (
				<Form {...signUpForm}>
					<form
						onSubmit={signUpForm.handleSubmit(initiateRegistration)}
						className="flex w-full flex-col gap-2 space-y-2"
						id="registration-details-form"
					>
						<FormField
							control={signUpForm.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="Enter your email..."
											disabled={isLoading}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={signUpForm.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											placeholder="Enter your name"
											disabled={isLoading}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={signUpForm.control}
							name="username"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Username</FormLabel>
									<FormControl>
										<Input
											placeholder="Enter your username"
											disabled={isLoading}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={signUpForm.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password</FormLabel>
									<FormControl>
										<Input
											type="password"
											placeholder="Enter your password..."
											disabled={isLoading}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={signUpForm.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm Password</FormLabel>
									<FormControl>
										<Input
											type="password"
											placeholder="Confirm your password..."
											disabled={isLoading}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={signUpForm.control}
							name="orgInviteSlug"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Organization Invitation Id (Optional)</FormLabel>
									<FormControl>
										<Input
											placeholder="#########"
											disabled={isLoading}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button disabled={isLoading} className="ml-auto w-full" type="submit">
							{isLoading ? 'Processing...' : 'Sign up'}
						</Button>
					</form>
				</Form>
			) : (
				<Form {...otpForm}>
					<form
						onSubmit={otpForm.handleSubmit(submitOtp)}
						className="flex w-full flex-col gap-2 space-y-2"
						id="otp-form"
					>
						<FormField
							control={otpForm.control}
							name="otp"
							render={({ field }) => (
								<FormItem>
									<FormLabel>OTP</FormLabel>
									<FormControl>
										<Input
											placeholder="Enter the OTP sent to your email"
											disabled={isLoading}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button disabled={isLoading} className="ml-auto w-full" type="submit">
							{isLoading ? 'Verifying...' : 'Verify OTP'}
						</Button>
					</form>
				</Form>
			)}
		</>
	)
}
